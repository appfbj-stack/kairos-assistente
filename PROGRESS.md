# Kairos-Assistente — Sessão Completa 2026-06-18

## Goal

Reparar o backend Kairos-Assistente em produção, **integrar o primeiro app (`kairos-sede-sorocaba`)** ao Kairos Admin, e configurar o sistema de **módulos ativáveis/desativáveis por empresa**.

## Constraints & Preferences

- **Stack Admin**: Express + tsx + PostgreSQL (não SQLite)
- **Stack apps (ex: sede-sorocaba)**: FastAPI + Vite/React + PostgreSQL (mesmo banco, schema separado)
- **Modelo de banco**: 1 Postgres físico, multi-schema
  - `public` — tabelas do Admin (kairos)
  - `sede_sorocaba` — tabelas do app sede-sorocaba
  - Futuros apps ganham seu próprio schema (`kairos_advocacia`, `kairos_politica`, etc.)
- **Multi-tenant**: `empresa_id` (igreja cliente) + `client_id` (instância do app) em todas as tabelas
- **Rede única**: `kairos_network` (bridge Docker externa) para apps conversarem
- **Apps acessam Admin via DNS Docker interno** (bypass do Caddy, que retornava 502 em chamadas internas)
- **Apps enviam Basic Auth do Admin** nas chamadas `verify_license` (proteção de rotas `/api/*` no Express)
- **Autenticação Admin**: Basic Auth (popup) + Core JWT (rotas `/api/core/*`)
- **Autenticação apps**: Google OAuth2 (sem senha local)
- **Servidor**: Dokploy na VPS 187.77.229.227

### Domínios
- **Admin**:
  - `admin.fbautomacao.space` (frontend, 3000 → 3008)
  - `api.admin.fbautomacao.space` (backend, 3010)
- **Sede Sorocaba (planejado HTTPS)**:
  - `sede.fbautomacao.space` (frontend, 3020)
  - `api.sede.fbautomacao.space` (backend, 8010)

### Credenciais (vigentes)
- **Admin Basic Auth** (popup navegador): `borgesjaf@gmail.com` / `Borges1972@` *(trocado nesta sessão)*
- **Admin SUPER_ADMIN (Core JWT)**: `borgesjaf@gmail.com` / `Borges1972@` — login `POST /api/core/users/auth/login`
- **App sede-sorocaba ADMIN_EMAIL (Google)**: `fernandojaborges@gmail.com`
- **Google OAuth** (credenciais via variável de ambiente, não commitadas)
  - ⚠️ Guardadas em memória da sessão (não commitadas em nenhum arquivo)
- **Postgres Admin**: DB `kairos`, user `kairos`, senha `p8gJWVtTHdvokxWYLnRxRj2H`
- **Postgres user do sede-sorocaba**: `sede_sorocaba`, senha `SedeSorocaba2026!`, GRANT USAGE apenas no schema `sede_sorocaba`
- **Sem Telegram no backend**

---

## Progress

### ✅ Done

#### 1. Reparação do Backend Admin
- **Bug crítico de sintaxe em `migrations.ts` corrigido**
  - Causa: faltava `},` entre `migrations[002]` e `migrations[003]` (linha 249) — esbuild rejeitava com `Expected identifier but found "{"`
  - Bug secundário: `},` extra no final do array (que esbuild nunca alcançava por causa do primeiro erro)
  - Fix: edit local (`kairos-assistente\backend\src\database\migrations.ts`) + SCP para VPS + `docker build --no-cache`
- **Variáveis de ambiente Admin configuradas** em `/etc/dokploy/compose/kairos-assistente-kairos-assistente-kgavlc/code/.env`:
  - `APP_NAME`, `ADMIN_DOMAIN`, `POSTGRES_PASSWORD`, `OPENROUTER_API_KEY`
  - `BASIC_AUTH_USER`/`PASSWORD` (ver Credenciais acima)
  - `CORE_SUPERADMIN_EMAIL`/`PASSWORD`/`JWT_SECRET`
  - `TELEGRAM_BOT_TOKEN` removido
- **Migrations Admin executadas** (001-004 no Postgres)
- **SUPER_ADMIN do Core criado** (idempotente via `bootstrapSuperAdmin()`)
- **Backend Admin rodando**: `Kairos Core API rodando na porta 3010`
- **Frontend Admin responde HTTP 200** (Kairos Admin 2.0 Next.js 15 PWA, Tailwind, Shadcn, dark mode, Service Worker)

#### 2. Login do Admin Trocado
- **BASIC_AUTH_USER/PASSWORD trocados** de `admin`/`XGhi0p2ZEccaMFPxUSp1` para `borgesjaf@gmail.com`/`Borges1972@`
- **Auth antiga rejeitada** corretamente (HTTP 401)
- **`KAIROS_ADMIN_BASIC_USER`/`PASSWORD` do sede-sorocaba atualizados** para refletir a mudança
- Dokploy reseta o `.env` em redeploys — workaround: re-editar e `docker compose up -d --force-recreate --no-deps backend`

#### 3. Integração do `Kairos Sede Sorocaba` (1º app)
- **App registrado no Admin via API**:
  - `POST /api/admin/apps` → slug `sede-sorocaba`, ID `a778a58e-bf55-4bb6-9328-37a33c38052e`
- **Cliente reusado**: `fernando borges` (ID `27f044ea-9490-433d-9c26-4317416853da`)
- **Licença trial criada**:
  - `POST /api/license/create-trial` → ID `44a8b2b2-b6aa-4dee-948f-f6737df9ecc3`, expira 2026-06-28
- **Schema `sede_sorocaba` criado** no Postgres Admin (via `CREATE SCHEMA`)
- **9 tabelas criadas** no schema (via SQLAlchemy `create_all` com `search_path`):
  - `tenants`, `usuarios`, `congregacoes`, `membros`, `obreiros`, `carteirinhas`, `patrimonio`, `eventos`, `batismos`
- **Backend FastAPI rodando** em `localhost:8010` (validação de licença no startup)
- **Frontend Vite rodando** em `localhost:3020`
- **Licença validada**: `✅ Licença Kairos: trial - Acesso liberado. days_remaining: 9`

#### 4. Sistema de Módulos Ativáveis
- **Estrutura nativa do Admin descoberta**: tabelas `modules` (catálogo) + `company_modules` (empresa ↔ módulo)
- **9 módulos cadastrados** via `POST /api/core/modules` (autenticado como SUPER_ADMIN):
  - Membros, Obreiros, Carteirinhas, Patrimônio, Agenda, Batismos, Congregações, Usuários, Dashboard
- **Empresa `OBPC Sorocaba` criada** (ID `8559f7e3-722e-4d7f-9ed6-521f56bbe420`)
- **Todos os 9 módulos ativados** para a empresa via `POST /api/core/modules/empresas/{empresaId}/{moduleId}`
- **SUPER_ADMIN via JWT funcionando**: login `POST /api/core/users/auth/login` → token de 12h
- **Endpoints disponíveis**:
  - `GET /api/core/modules` — catálogo
  - `POST /api/core/modules` — criar (SUPER_ADMIN)
  - `PATCH /api/core/modules/:id` — ativar/desativar global
  - `GET /api/core/modules/empresas/:empresaId` — módulos ativos da empresa
  - `POST /api/core/modules/empresas/:empresaId/:moduleId` — ativar/desativar por empresa (SUPER_ADMIN)

### 🔄 In Progress
- **Configurar Dokploy** para o projeto `kairos-sede-sorocaba`:
  - Registrar `sede.fbautomacao.space` → frontend (porta 3020)
  - Registrar `api.sede.fbautomacao.space` → backend (porta 8010)
  - Ativar HTTPS com Let's Encrypt

### ⛔ Blocked
- *(none)*

---

## Key Decisions

| Decisão | Por quê |
|---|---|
| Manter `kairos-assistente` legado em produção | Decisão anterior — substituir por NestJS+PostgreSQL em `C:\Users\ferna\kairos-platform\` depois |
| Remover TELEGRAM do backend | Não era usado |
| Configurar SUPER_ADMIN do Core via env vars | Bootstrap automático no startup |
| Resolver sintaxe TypeScript via `edit` local + `scp` para VPS | `sed` remoto come espaços com escaping PowerShell |
| **Modelo de banco único multi-schema** | 1 só Postgres pra fazer backup/monitor, schemas isolam apps |
| **Reusar credenciais Google OAuth já existentes** | De `Kairos-app/backend/.env` (já configurado antes) |
| **Apps acessam Admin via DNS Docker interno** | Caddy retornava 502 em chamadas HTTPS internas; HTTP direto é mais rápido |
| **Apps enviam Basic Auth do Admin** | Middleware Express protege todas as rotas `/api/*` exceto `/api/core` |
| **Login Admin trocado para `borgesjaf@gmail.com`** | Solicitação do usuário nesta sessão |
| **Dokploy reseta `.env` em redeploys** | Workaround: re-aplicar `sed` no `.env` + `docker compose up -d --force-recreate --no-deps backend` após cada deploy automático. O Dokploy também pode resetar `migrations.ts` para a versão com bug — sempre conferir `sed -n '247,253p'` antes de rebuildar. |

---

## Next Steps

1. **Dokploy**: configurar domínios `sede.fbautomacao.space` e `api.sede.fbautomacao.space` no projeto `kairos-sede-sorocaba` + HTTPS
2. **Google Cloud Console**: adicionar `https://api.sede.fbautomacao.space/api/auth/google/callback` em "URIs de redirecionamento autorizados"
3. **Testar login Google** com `fernandojaborges@gmail.com` no frontend sede-sorocaba
4. **Próximos apps**: `kairos-advocacia`, `kairos-politica`, `foto-agenda` (código já existe em `kairos-assistente/`)
5. ~~**Integrar sistema de módulos** no frontend sede-sorocaba~~ ✅ Concluído
6. **Migrar para `C:\Users\ferna\kairos-platform\`** (NestJS novo) — substituir legado
7. **Deploy**: fazer push e redeploy das alterações de módulos para VPS

---

### Conquistas (parte 2)

- ✅ **Sistema de Módulos completo (backend)**:
  - Models `Module` + `TenantModule` em `models.py` com seed automático
  - `services/modules.py`: `seed_modules()` + `get_active_modules()`
  - `deps.py`: `require_module(slug)` checa módulo ativo por tenant
  - `routes/modules.py`: `GET /api/modules` para o frontend
  - `require_module()` adicionado em todas as 10 rotas

- ✅ **Sistema de Módulos completo (frontend)**:
  - `stores/auth.js`: `carregarModulos()`, `moduloAtivo(slug)`
  - `App.jsx`: `RotaModulo` + carregamento automático
  - `Layout.jsx`: sidebar filtrada por módulo ativo
  - Build verificado (0 erros, 409 KB)

---

## Critical Context

### VPS
- **Endereço**: root@187.77.229.227 (senha: `Borges1972@jane`)
- **Dokploy UI**: http://187.77.229.227:3000

### Containers Ativos (kairos)
- `kairos-assistente-kairos-assistente-kgavlc-backend-1` (porta 3010)
- `kairos-assistente-kairos-assistente-kgavlc-frontend-1` (porta 3008)
- `kairos-assistente-kairos-assistente-kgavlc-postgres-1` (5432, multi-schema)
- `kairos-sede-sorocaba-backend-1` (porta 8010)
- `kairos-sede-sorocaba-frontend-1` (porta 3020)

### Postgres
- **DB**: `kairos`
- **Schemas**:
  - `public` — Admin: 21 tabelas (clients, apps, licenses, empresas, modules, company_modules, etc.)
  - `sede_sorocaba` — App sede: 9 tabelas (owner: `sede_sorocaba`, permissões isoladas)

### Caminhos no VPS
- **Admin**: `/etc/dokploy/compose/kairos-assistente-kairos-assistente-kgavlc/code/`
  - `backend/Dockerfile` (usa `tsx src/main.ts`, esbuild v0.28.1)
  - `backend/src/database/migrations.ts` (corrigido, 288 linhas)
  - `docker-compose.yml`, `.env`
- **Sede Sorocaba**: `/etc/dokploy/compose/kairos-sede-sorocaba/`
  - `backend/`, `frontend/`, `docker-compose.yml`, `.env`

### IDs Importantes
- **App sede-sorocaba**: `a778a58e-bf55-4bb6-9328-37a33c38052e`
- **Cliente fernando borges**: `27f044ea-9490-433d-9c26-4317416853da`
- **Licença trial**: `44a8b2b2-b6aa-4dee-948f-f6737df9ecc3` (expira 2026-06-28)
- **Empresa OBPC Sorocaba**: `8559f7e3-722e-4d7f-9ed6-521f56bbe420`
- **SUPER_ADMIN user**: `b4934637-7d22-4242-8a1f-f73c266f753f`

### Módulos Ativos (9/9)
| Módulo | Slug | Module ID |
|---|---|---|
| Agenda | `agenda` | `454de08f-d8b8-485b-9002-7dbb46c085d0` |
| Batismos | `batismos` | `74e79415-d8e4-41d1-be90-82ccaa9ab828` |
| Carteirinhas | `carteirinhas` | `c7048af7-f0b7-4a99-89e1-25623d41024e` |
| Congregações | `congregacoes` | `4516a7f1-b0df-48a0-8984-f0e9a92bf9d6` |
| Dashboard | `dashboard` | `590904b6-936d-4e37-8142-68dfebf1ceea` |
| Membros | `membros` | `1ba3f517-606f-499c-940f-dbe48cb990d2` |
| Obreiros | `obreiros` | `3c29de27-c4a8-4b81-baa1-b5415980e59a` |
| Patrimônio | `patrimonio` | `f483ff9d-78e2-4ea7-a8fc-47207362b38d` |
| Usuários | `usuarios` | `44f88aa7-f01b-4404-961f-b4fa9efbbd09` |

### Comandos Úteis
```bash
# Health checks
ssh root@187.77.229.227 "curl -s http://localhost:3010/api/health"      # Admin
ssh root@187.77.229.227 "curl -s http://localhost:8010/api/health"      # Sede

# License verify (via Basic Auth novo)
ssh root@187.77.229.227 "curl -s -u 'borgesjaf@gmail.com:Borges1972@' \
  'http://localhost:3010/api/license/verify?client_id=27f044ea-9490-433d-9c26-4317416853da&app_slug=sede-sorocaba'"

# List apps
ssh root@187.77.229.227 "curl -s -u 'borgesjaf@gmail.com:Borges1972@' http://localhost:3010/api/admin/apps"

# Listar tabelas do schema sede_sorocaba
ssh root@187.77.229.227 "docker exec kairos-assistente-kairos-assistente-kgavlc-postgres-1 \
  env PGPASSWORD=SedeSorocaba2026! psql -U sede_sorocaba -d kairos -c '\dt sede_sorocaba.*'"

# Módulos ativos por empresa
ssh root@187.77.229.227 "docker exec kairos-assistente-kairos-assistente-kgavlc-postgres-1 \
  psql -U kairos -d kairos -c \"SELECT m.name, cm.active FROM company_modules cm \
  JOIN modules m ON m.id=cm.module_id WHERE cm.empresa_id='8559f7e3-722e-4d7f-9ed6-521f56bbe420';\""

# Logs
ssh root@187.77.229.227 "docker logs kairos-assistente-kairos-assistente-kgavlc-backend-1 --tail 10"
ssh root@187.77.229.227 "docker logs kairos-sede-sorocaba-backend-1 --tail 10"
```

---

## Relevant Files

### Locais (repositório)
- `C:\Users\ferna\kairos-assistente\PROGRESS.md` — este arquivo
- `C:\Users\ferna\kairos-assistente\backend\src\database\migrations.ts` — corrigido (288 linhas, sintaxe OK)
- `C:\Users\ferna\kairos-assistente\backend\src\admin\admin.ts` — debug removido
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\.env` — configurado (KAIROS_ADMIN_URL via DNS interno, GOOGLE_*, KAIROS_ADMIN_BASIC_*, etc.)
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\docker-compose.yml` — backend 8010 + frontend 3020, `kairos_network`, sem Postgres próprio
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\backend\app\main.py` — debug print removido
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\backend\app\services\license.py` — envia Basic Auth
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\backend\app\core\database.py` — schema `sede_sorocaba` via `search_path`
- `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\KAIROS_MODULOS.md` — guia de integração com sistema de módulos
- `C:\Users\ferna\Kairos-app\backend\.env` — **fonte das credenciais Google OAuth** (não editar)
- `C:\Users\ferna\kairos-assistente\docs\APPS_REGISTRADOS.md` — apps do ecossistema
- `C:\Users\ferna\kairos-assistente\docs\INTEGRACAO_SEDE_SOROCABA.md` — **doc detalhado da integração**
- `C:\Users\ferna\kairos-assistente\docs\DEPLOY_VPS.md` — guia geral
- `C:\Users\ferna\kairos-assistente\docs\TEMPLATE_PRO.md` — template usado pelo sede-sorocaba
- `C:\Users\ferna\kairos-platform\` — futuro substituto NestJS (não publicado)

### VPS
- `/etc/dokploy/compose/kairos-assistente-kairos-assistente-kgavlc/code/.env` — vars Admin
- `/etc/dokploy/compose/kairos-assistente-kairos-assistente-kgavlc/code/docker-compose.yml` — compose Admin
- `/etc/dokploy/compose/kairos-assistente-kairos-assistente-kgavlc/code/backend/src/database/migrations.ts` — corrigido
- `/etc/dokploy/compose/kairos-sede-sorocaba/` — código do app sede
- `/etc/dokploy/compose/kairos-sede-sorocaba/.env` — env do app sede
- `/etc/dokploy/compose/kairos-sede-sorocaba/KAIROS_MODULOS.md` — doc módulos (cópia VPS)
