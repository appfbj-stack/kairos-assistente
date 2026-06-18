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
5. Compartilhar `https://.../agendar/{slug}` com os clientes.

## Pendências conhecidas (fora do escopo desta primeira leva)

- **Frontend tenant-facing**: hoje só existe a API. O painel da barbearia
  (login da equipe via JWT do Core) e a página pública de agendamento
  precisam ser construídos no Next.js (`frontend/`) — distintos do painel
  interno do Kairos Admin, que usa Basic Auth single-tenant.
- **Notificações (WhatsApp/SMS)**: o PRD pede lembretes automáticos. Não há
  integração configurada (Twilio, WhatsApp Business API etc.) — fora do
  escopo até essas credenciais existirem.
- **Agendamento conversacional via IA**: o PRD descreve o link de
  agendamento como "IA conversacional". A primeira leva entrega a API
  determinística (`/api/barber/public/:slug/...`) que uma camada
  conversacional (bot de WhatsApp, por exemplo) pode chamar — não foi
  construído um agente de IA com efeitos colaterais (criar/cancelar
  agendamento) diretamente, para evitar um LLM tomando ações de escrita sem
  validação determinística por trás.
