# Kairos Barber (módulo embutido)

Kairos Barber é um **módulo da Plataforma Kairos**, não um app satélite. Por
exigência do PRD original, ele não tem backend, banco, autenticação ou
repositório próprios — vive inteiramente dentro do Kairos Admin
(`backend/src/barber/`), reutilizando Core (`empresas`, `core_users`,
`modules`/`company_modules`), o JWT do Core e a infraestrutura de IA
(`backend/src/llm/llm.ts`).

## Modelo de dados (migração `006_kairos_barber`)

Todas as tabelas são `empresa_id`-scoped (FK para `empresas`, `ON DELETE
CASCADE`):

- `barber_services` — catálogo de serviços (nome, duração, preço)
- `barber_professionals` — profissionais, com `user_id` opcional apontando
  para `core_users` (login da equipe) e horário de trabalho
  (`working_days`/`working_start`/`working_end`)
- `barber_clients` — clientes da barbearia (não confundir com `clients`, a
  tabela legada de clientes do próprio Kairos Admin)
- `barber_appointments` — agendamentos (`status`:
  `agendado|confirmado|concluido|cancelado|faltou`), com `price` e
  `duration_minutes` congelados no momento do agendamento (snapshot do
  serviço, para não distorcer relatórios se o preço do serviço mudar depois)

A migração `005_core_roles_profissional_atendente` estende o enum de
`core_users.role` para incluir `PROFISSIONAL` e `ATENDENTE` — isso é uma
extensão da plataforma inteira (não só do Barber), documentada aqui porque
foi motivada por este módulo.

## Rotas (montadas em `/api/barber`, isentas do Basic Auth do painel — ver `main.ts`)

| Rota | Auth | Descrição |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/barber/services` | JWT Core (`ADMIN_EMPRESA`/`GERENTE`/`SUPER_ADMIN` para escrita) | Catálogo de serviços |
| `GET/POST/PATCH/DELETE /api/barber/professionals` | idem | Profissionais |
| `GET/POST/PATCH /api/barber/clients` | JWT Core (escrita também por `ATENDENTE`/`PROFISSIONAL`) | Clientes |
| `GET /api/barber/appointments` | JWT Core | Lista agendamentos (filtros `from`, `to`, `professional_id`, `status`) |
| `GET /api/barber/appointments/disponibilidade` | JWT Core | Horários livres de um profissional num dia |
| `GET /api/barber/appointments/dashboard` | JWT Core | Métricas: agendamentos hoje/semana, faturamento do mês, top serviços/status |
| `POST/PATCH /api/barber/appointments` | JWT Core | Criar/atualizar agendamento |
| `POST /api/barber/ia` | JWT Core | IA do Gestor — chat com contexto dos dados da barbearia (reaproveita `chatCompletion()`) |
| `GET /api/barber/public/:slug` | **sem auth** | Dados públicos da barbearia (nome, serviços, profissionais ativos) — `:slug` é o `empresas.slug` |
| `GET /api/barber/public/:slug/disponibilidade` | **sem auth** | Horários livres (mesma lógica da rota autenticada, mas por slug) |
| `POST /api/barber/public/:slug/assistente` | **sem auth** | Chat de apoio ao agendamento (extração de intenção via IA, ver seção abaixo) |
| `POST /api/barber/public/:slug/agendar` | **sem auth** | Cliente final agenda direto pelo link (cria o cliente se o telefone não existir ainda) |

## Link de agendamento público

Decisão tomada: roteamento **por slug/path**, não por subdomínio — o link a
ser colado no WhatsApp Business da barbearia é
`https://admin.fbautomacao.space/agendar/{slug-da-empresa}` (frontend ainda
precisa ser criado — hoje só a API em `/api/barber/public/:slug` existe).
Evita depender de DNS wildcard/proxy por empresa, que a VPS atual não tem
configurado.

## Como ativar o módulo para uma empresa

Não há seed automático (mesma convenção do restante do Core). Passo a passo:

1. `POST /api/core/modules` (SUPER_ADMIN) com `{"name": "Kairos Barber", "slug": "kairos-barber"}` — feito **uma vez** para a plataforma toda.
2. `POST /api/core/modules/empresas/:empresaId/:moduleId` com `{"active": true}` — uma vez por empresa que for usar o Barber.
3. Criar usuários da empresa com `role` `ADMIN_EMPRESA`/`GERENTE`/`PROFISSIONAL`/`ATENDENTE` via `POST /api/core/users`.
4. Cadastrar serviços e profissionais via `/api/barber/services` e `/api/barber/professionals`.
5. Fazer login do usuário criado em `https://.../barber/login`.
6. Compartilhar `https://.../agendar/{slug}` com os clientes (ex: link fixo no WhatsApp Business da barbearia).

## Frontend

- **Painel da equipe** (`frontend/src/app/barber/*`): login próprio via JWT
  do Core (`/barber/login`), dashboard, agenda, clientes, serviços,
  profissionais e IA do Gestor. Sessão guardada em `localStorage`
  (`kairos_barber_token`/`kairos_barber_user`) — ver
  `frontend/src/hooks/use-barber-auth.ts` e `frontend/src/services/barberApi.ts`.
  Distinto do painel interno do Kairos Admin (Basic Auth single-tenant).
- **Página pública de agendamento** (`frontend/src/app/agendar/[slug]/page.tsx`):
  sem login, mobile-first. Tem um painel de chat opcional no topo (descrito
  abaixo) e, em seguida, o fluxo guiado serviço → profissional → data/horário
  → dados do cliente → confirmação — o chat só acelera o preenchimento desse
  mesmo fluxo, nunca o substitui.
- `frontend/src/middleware.ts` isenta `/barber*` e `/agendar*` do Basic Auth
  do Admin (cada um tem seu próprio mecanismo de acesso — JWT ou nenhum).

## Assistente conversacional de agendamento

O PRD descreve o link de agendamento como "IA conversacional". O chat é hoje
o fluxo principal da página pública: o cliente conversa, a IA reúne serviço,
profissional, data, horário, nome e telefone, recapitula tudo e só depois que
o cliente confirma explicitamente ("sim", "confirmo" etc.) o sistema cria o
agendamento — sem precisar clicar em botões (o formulário por etapas continua
disponível abaixo do chat como alternativa manual).

Implementado com uma separação estrita entre **interpretar linguagem
natural** (LLM) e **executar a ação** (rotas determinísticas já existentes):

- `POST /api/barber/public/:slug/assistente` (`backend/src/barber/assistant.ts`,
  `runBookingAssistant()`) recebe o histórico da conversa, monta um prompt com
  os serviços/profissionais reais da empresa e pede ao `chatCompletion()` uma
  resposta em JSON estrito: `{"reply", "service_name", "professional_name",
  "date", "time", "client_name", "client_phone", "confirmado"}`. O backend
  resolve `service_name`/`professional_name` para IDs reais via `SELECT ...
  WHERE name ILIKE ?` (só aceita correspondência exata com algo cadastrado;
  caso contrário retorna `null`). `confirmado` só deve vir `true` depois que
  a IA recapitular o agendamento e o cliente confirmar — isso é reforçado via
  prompt, não validado no backend (a IA pode errar; o pior caso é pedir
  confirmação de novo, nunca criar algo sem checagem de disponibilidade).
- A IA **nunca** chama `/disponibilidade` ou `/agendar` diretamente — ela só
  propõe os campos acima. O frontend (`frontend/src/app/agendar/[slug]/page.tsx`)
  acumula esses valores no mesmo state usado pelo fluxo manual e, somente
  quando `confirmado: true` e todos os campos obrigatórios estão presentes,
  chama `barberApi.public.agendar()` — a mesma rota determinística que valida
  o horário contra a disponibilidade real e cria o registro. Se o horário não
  estiver mais livre, a resposta de erro é repassada ao chat e a conversa
  continua até um novo resumo ser confirmado. Isso preserva a regra de nunca
  deixar um LLM tomar ações de escrita sem validação determinística por trás.

## Pendências conhecidas (fora do escopo desta primeira leva)

- **Notificações (WhatsApp/SMS)**: o PRD pede lembretes automáticos. Não há
  integração configurada (Twilio, WhatsApp Business API etc.) — fora do
  escopo até essas credenciais existirem.
