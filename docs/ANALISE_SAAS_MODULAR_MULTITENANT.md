# Análise: Kairós como Plataforma SaaS Modular Multi-Tenant Única

**Etapa**: 1 (Análise) · Nenhuma alteração de código foi feita para produzir este relatório.

---

## 1. Resumo executivo

O pedido descreve uma arquitetura de **monólito único multi-tenant** (`empresa_id`
em todas as tabelas, módulos ativáveis por empresa, um único Core de
Auth/Empresas/Usuários/Permissões servindo "Apps" como Fotografia, Jurídico,
Imobiliário, Oficina, Igreja).

A arquitetura **real e oficialmente documentada** do Kairós
(`docs/ARQUITETURA_OFICIAL.md`) é outra: um **hub central de licenciamento**
(Kairos Admin) + uma coleção de **apps satélites independentes**, cada um com
seu próprio backend, banco de dados e deploy. Três desses satélites
(`kairos-politica/`, `kairos-advocacia/`, `kairos-sede-sorocaba/`) já são
multi-tenant **dentro do próprio app** (modelo `Tenant`/`Usuario` com
`tenant_id` em toda tabela de domínio) — mas cada um é um produto/deploy
separado, não módulos de uma mesma plataforma.

Não existe um app de "Fotografia" embutido dentro do Kairos Admin — existem
dois apps de Fotografia **separados**:
- Um app satélite real **em produção**, deployado a partir de um repositório
  **externo** (`foto-agenda-v1`, slug `foto-agenda-pro`, portas 3015/8005).
- Uma pasta local `foto-agenda/` neste monorepo: app FastAPI+React completo
  e funcional (não é cópia de trabalho do repo externo acima, é um build
  próprio), com `Tenant`/`TenantModule`/`require_module()`, rotas
  auth/admin/shoots/hermes/panel/google_auth e verificação de licença contra
  o Kairos Admin (slug `fotoagenda`). Só não tinha `docker-compose.yml` nem
  driver Postgres — corrigido nesta sessão (ver §3). Ainda não está
  registrado em `apps`/`licenses` nem deployado.

Isso muda o ponto de partida do pedido: não estamos "extraindo módulos de
dentro de um app de Fotografia monolítico" — estamos decidindo se vale a pena
**fundir 4 produtos já desenvolvidos de forma independente** (um deles com
cliente real em produção) em um único monólito multi-tenant.

---

## 2. Arquitetura atual (confirmada por leitura de código)

```
┌──────────────────────────────────────────────────────────┐
│  KAIROS ADMIN (backend/ + frontend/, raiz do monorepo)     │
│  Express+TS + PostgreSQL · Next.js · porta 3010/3008       │
│  Single-tenant (é a operação da própria Kairós, não dos    │
│  clientes) · Basic Auth única, sem RBAC, sem tabela users  │
│  Expõe: GET /api/license/verify?client_id=&app_slug=       │
└───────────────────────────┬──────────────────────────────┘
                             │ todo satélite consulta licença
        ┌────────────────────┼─────────────────────┬───────────────────┐
        │                    │                      │                   │
┌───────▼──────┐    ┌────────▼────────┐   ┌─────────▼────────┐  ┌──────▼─────┐
│ FotoAgenda Pro│    │ Kairos Política │   │ Kairos Advocacia  │  │ Sede       │
│ repo externo  │    │ kairos-politica/│   │ kairos-advocacia/ │  │ Sorocaba   │
│ (foto-agenda- │    │ FastAPI+PG      │   │ FastAPI+PG        │  │ kairos-sede│
│  v1), deploy  │    │ Tenant/Usuario  │   │ Tenant/User+      │  │ -sorocaba/ │
│  real         │    │ próprios        │   │ tenant_id em tudo │  │ FastAPI+PG │
└───────────────┘    └─────────────────┘   └───────────────────┘  └────────────┘
        +  Lite apps (Vidraçaria, Imobiliária) — sem backend, dados em Google Sheets
```

Cada satélite Pro segue `docs/TEMPLATE_PRO.md` à risca (confirmado nos 3 que
existem neste monorepo): `core/config.py`, `core/database.py`,
`core/security.py`, `deps.py`, `services/license.py` — **literalmente o
mesmo boilerplate copiado e adaptado** a cada novo app, sem nenhum pacote
compartilhado.

---

## 3. O que já é reutilizável hoje

| Componente | Onde está | Reaproveitável como |
|---|---|---|
| Motor de licenciamento (`clients`/`apps`/`licenses`/`payments`, contrato `GET /api/license/verify`) | `backend/src/admin/license.ts` | Core — já é o contrato público usado por todos os satélites, está maduro |
| Boilerplate Pro (`config.py`/`database.py`/`security.py`/`deps.py`/`services/license.py`) | Duplicado manualmente em política/advocacia/sede-sorocaba | Pacote Python compartilhado (`kairos-core-sdk`), hoje é copy-paste |
| Padrão `Tenant`+`tenant_id` em toda tabela de domínio | Já implementado em política/advocacia/sede-sorocaba | Já é o padrão — só falta extrair para biblioteca |
| `TenantModule` (módulos ativáveis por tenant: `hermes`/`financeiro`/`relatorios`/`calendario`) + `require_module()` | Implementado em `foto-agenda/` (app completo, ainda não deployado) | É o precedente de design mais próximo do que o pedido descreve — vale estudar antes de inventar de novo |
| Módulos KV genéricos (`memory_items`, `settings`) | `backend/src/memory`, `backend/src/settings` (Kairos Admin) | Reaproveitável como módulo Core, mas hoje vive só na instância single-tenant do Admin |

---

## 4. O que está fortemente acoplado / é específico do nicho

- **Cada satélite Pro** tem domínio de negócio totalmente diferente e
  campos/nomenclatura específicos: Sede Sorocaba usa nomes em português
  (`nome`, `perfil`, `congregacao_id`, `batismo`, `carteirinha`) e login
  exclusivo via Google OAuth (não tem senha); Advocacia tem
  `Processo`/`Movimentacao`/`Fatura`; Política tem `Cidadao`/`Demanda`. Não
  há um "modelo de domínio genérico" hoje — cada um foi feito como produto
  fim-a-fim, não como módulo de uma plataforma.
- **Autenticação é inconsistente entre os 4 sistemas**: Kairos Admin = Basic
  Auth única; Política/Advocacia = e-mail+senha JWT; Sede Sorocaba = Google
  OAuth (sem senha, sem autocadastro); `foto-agenda/` = JWT com
  roles `super_admin`/`admin`. Unificar isso é, por si só, um projeto à
  parte.
- **Kairos Admin não tem isolamento de dados nem RBAC** — é a ferramenta
  interna da própria operadora da plataforma, com um único usuário
  administrador. Não foi desenhado para virar "Core multi-tenant" sem
  reescrever toda a camada de auth e adicionar filtro de propriedade em
  todas as queries (hoje `chat.ts`/bot do Telegram despejam a tabela
  `clients` inteira no prompt do LLM — seguro hoje por ser single-tenant,
  mas inseguro se o Admin passasse a hospedar dados de várias empresas).
- **Cada satélite tem seu próprio banco PostgreSQL**, isolado por desenho —
  isso não é dívida técnica, é uma decisão de segurança: erro de filtro em
  uma query nunca vaza dados entre um escritório de advocacia e uma igreja,
  porque fisicamente são bancos diferentes.

---

## 5. Riscos da migração para o modelo do pedido (monólito único + `empresa_id`)

1. **Existem dois apps de Fotografia, não um.** O que já está em produção
   vive em outro repositório, fora do escopo de acesso desta sessão
   (`appfbj-stack/foto-agenda-v1`, slug `foto-agenda-pro`). A pasta local
   `foto-agenda/` é um app próprio e completo deste monorepo (slug
   `fotoagenda`), ainda não deployado — não confundir os dois nem tratar um
   como cópia do outro.
2. **Sede Sorocaba tem cliente real.** O app standalone original já está
   em produção (`sede.fbautomacao.space`); a versão migrada neste monorepo
   (`kairos-sede-sorocaba/`) ainda não foi deployada. Fundir esses dados em
   um schema compartilhado com outros nichos é uma migração de dados de
   produção — exige plano de rollback e janela de manutenção, não é refator
   de código puro.
3. **Reescrever 3 sistemas de autenticação diferentes em um só** (Google
   OAuth sem senha vs. e-mail+senha) é um projeto de produto, não um
   refactor mecânico — decide login flow, recuperação de senha, e se
   Google OAuth deixa de ser exclusivo da Sede Sorocaba.
4. **Schema único multi-nicho aumenta o raio de impacto de qualquer bug.**
   Hoje um erro de filtro em Advocacia não pode, por arquitetura, afetar
   dados da Sede Sorocaba (bancos físicos diferentes). Em um monólito com
   `empresa_id`, um único `WHERE` esquecido vaza dados entre um escritório
   de advocacia e uma igreja.
5. **Esforço real é da ordem de meses**, não dias: equivale a reescrever a
   lógica de negócio de 4 produtos (Admin, Política, Advocacia, Sede
   Sorocaba) por trás de uma camada de módulos genéricos, mais migrar dados.
6. **O roadmap oficial já registra isso como item de longo prazo**
   (`PROGRESS.md`: "Longo Prazo: Multi-tenant no Kairos Core"), não como
   próximo passo imediato — sugere que essa decisão já foi conscientemente
   adiada antes.

**Estimativa de impacto: ALTO.** Esse não é um refactor incremental —é,
na prática, descontinuar o modelo "hub + satélites independentes" (que já
tem 3 apps rodando nele e 1 deploy real em produção) em favor de um modelo
"monólito modular", reescrevendo autenticação, banco e lógica de negócio de
cada produto existente.

---

## 6. Duas rotas possíveis a partir daqui

### Rota A — literal: monólito único multi-tenant (`empresa_id`)
É exatamente o que o pedido descreve: um Core (Auth/Empresas/Usuários/
Permissões/Assinaturas) + Módulos (CRM/Agenda/Financeiro/IA/...) + Apps
(Fotografia/Jurídico/Imobiliário/Oficina/Igreja) tudo em uma única base de
código e banco, com módulos ativáveis por empresa.
- Entrega exatamente a visão "centenas de empresas, qualquer nicho, um só
  sistema".
- Custo: meses de trabalho, reescrita de 3-4 produtos existentes,
  migração de dados de cliente real, novo sistema de auth/RBAC do zero.

### Rota B — recomendada: evoluir o hub-and-satellite existente
Mantém o que já funciona (3 apps Pro multi-tenant rodando, 1 satélite real
em produção, contrato de licenciamento maduro) e ataca exatamente os
problemas reais encontrados nesta análise, sem fundir bancos de nichos
diferentes:
- Extrair o boilerplate Pro duplicado (`config.py`/`database.py`/
  `security.py`/`deps.py`/`license.py`) em um pacote Python instalável
  (`kairos-core-sdk`), reduzindo cópia manual entre apps.
- Adotar o padrão `TenantModule` (módulos ativáveis por tenant) já
  prototipado em `foto-agenda/` como biblioteca compartilhada, para
  qualquer satélite que precise de módulos opcionais (financeiro,
  relatórios, IA) dentro do próprio tenant.
- Dar ao Kairos Admin RBAC real (múltiplos administradores, roles) em vez
  de uma única senha Basic Auth — sem precisar virar multi-tenant ele
  mesmo.
- Padronizar (não unificar à força) os métodos de login entre satélites
  Pro, documentando quando usar Google OAuth vs. e-mail+senha por tipo de
  cliente.
- Resultado: "módulos ativáveis, escalável, preparado para centenas de
  empresas" — mas cada nicho continua em seu próprio banco/deploy,
  preservando o isolamento de segurança e sem migrar dados de produção.

---

## 7. Anexo — Análise por dimensão técnica (detalhamento da Etapa 1)

| Dimensão | Situação encontrada |
|---|---|
| **Estrutura de pastas** | Monorepo na raiz: `backend/` + `frontend/` = Kairos Admin (hub). `kairos-politica/`, `kairos-advocacia/`, `kairos-sede-sorocaba/`, `foto-agenda/` = satélites Pro completos (cada um com seu próprio `backend/`+`frontend/`+`docker-compose.yml`). `docs/` = documentação do ecossistema (arquitetura oficial, template Pro, apps registrados, deploy). |
| **Banco de dados** | Kairos Admin: 1 banco Postgres único, tabelas `conversations`/`messages`/`agenda_items`/`memory_items`/`settings`/`clients`/`apps`/`licenses`/`logs`/`payments`, **nenhuma coluna `tenant_id`/`empresa_id`** (confirmado em `backend/src/database/migrations.ts`). Cada satélite Pro: **banco Postgres próprio e isolado**, com `Tenant` + `tenant_id` em toda tabela de domínio. |
| **Models** | Admin: modelos administrativos (`clients`, `apps`, `licenses`, `payments`) — sem conceito de "usuário final" do cliente. Política: `Tenant`/`Usuario`/`Cidadao`/`Demanda`. Advocacia: `Tenant`/`User`/`Cliente`/`Processo`/`Movimentacao`/`Compromisso`/`Fatura`/`Documento`. Sede Sorocaba: `Tenant`/`Usuario`/`Membro`/`Obreiro`/`Congregacao`/`Patrimonio`/`Carteirinha`/`Batismo` (nomenclatura em português, específica do nicho religioso). `foto-agenda/`: `Tenant`/`User`/`TenantModule`/`StudioSettings`/`FotoClient`/`Shoot`/`HermesUsage`. Não há um modelo de domínio genérico reaproveitável entre nichos — cada um foi desenhado fim-a-fim. |
| **APIs** | Admin expõe `GET /api/license/verify?client_id=&app_slug=` (única rota pública) + rotas administrativas internas protegidas por Basic Auth. Cada satélite expõe sua própria API REST FastAPI sob prefixo `/api`, com rotas JWT-protegidas (exceto `/api/auth/*`). Nenhum contrato de API é compartilhado entre satélites alem do `license.verify`. |
| **Serviços** | `services/license.py` (verificação de licença) é **copiado manualmente** em cada satélite a partir do `TEMPLATE_PRO.md` — mesma lógica, arquivos físicos diferentes. `backend/src/admin/license.ts` no Admin é a fonte da verdade real. |
| **Componentes / Telas** | Admin: painel único Next.js (operação interna da Kairós). Cada satélite Pro: frontend próprio React+Vite+Tailwind, com telas específicas do nicho (ex.: Carteirinhas/Batismos na Sede Sorocaba, Processos/Faturas na Advocacia) — zero componentes de UI compartilhados entre apps. |
| **Middleware** | Admin: 1 middleware global de Basic Auth (`backend/src/main.ts`), sem filtro de tenant (não se aplica — single-tenant). Satélites: não há uma camada de "middleware de tenant" separada — o isolamento é feito via dependency JWT (`deps.py`) que injeta o `tenant_id` do usuário autenticado, aplicado manualmente em cada query/router. Ou seja, **hoje depende de disciplina por endpoint**, não de um filtro automático centralizado — ponto de atenção mesmo dentro do modelo atual. |
| **Permissões** | Admin: nenhuma (1 único admin via senha compartilhada). Cada satélite tem seu próprio conjunto de papéis, todos diferentes: Advocacia = `admin`/`advogado`/`assistente_juridico`/`cliente`; `foto-agenda` = `super_admin`/`admin`; Política e Sede Sorocaba têm variações próprias. Não existe hierarquia de papéis unificada entre apps. |
| **Autenticação** | 4 esquemas distintos coexistindo: Admin = Basic Auth (env var fixa); Política/Advocacia/`foto-agenda` = e-mail+senha com JWT; Sede Sorocaba = Google OAuth exclusivo (sem senha, sem autocadastro). |
| **Deploy** | Padrão único e consistente: Dokploy + Docker Compose por app, rede Docker externa compartilhada `kairos_network`, reverse proxy via Traefik/Domains do Dokploy (ou Caddy manual no caso da Advocacia), portas reservadas e documentadas em `docs/APPS_REGISTRADOS.md` (Admin 3008/3010, FotoAgenda Pro externo 3015/8005, Sede Sorocaba 3020/8010, Vidraçaria 3025, Imobiliária 3030, Agenda Mecânica 3035/8015, Política 3040/8020, Advocacia 3045/8025, Fotografia `foto-agenda/` 3050/8030). |
| **Dependências** | Admin: Express+TypeScript+`pg` (backend), Next.js+React (frontend). Satélites Pro: FastAPI+SQLAlchemy+Pydantic+`python-jose`/`passlib` (backend), Vite+React+Tailwind (frontend). **Nenhum pacote compartilhado** entre satélites — cada `requirements.txt`/`package.json` é independente, apesar do boilerplate ser quase idêntico. |

---

## 8. Próximos passos

Este relatório encerra a Etapa 1. Conforme instruído, **nenhuma alteração
de código foi feita**. As Etapas 2-6 do pedido original (multi-tenant
`empresa_id`, módulos Core/Módulos/Apps, sistema de permissões em 6 níveis,
migração seguida de testes, relatório final) só devem começar depois de
decidida a Rota A ou B acima — são planos de trabalho muito diferentes em
escopo, risco e tempo.
