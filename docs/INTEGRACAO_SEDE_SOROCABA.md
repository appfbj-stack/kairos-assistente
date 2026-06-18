# Integração Kairos Sede Sorocaba — Sessão 2026-06-18

Registro completo da integração do 1º app do ecossistema Kairos com o Admin.

---

## Visão Geral

| Item | Valor |
|---|---|
| **App** | Kairos Sede Sorocaba |
| **Slug** | `sede-sorocaba` |
| **App ID (Admin)** | `a778a58e-bf55-4bb6-9328-37a33c38052e` |
| **Cliente** | fernando borges (reusado) |
| **Cliente ID (Admin)** | `27f044ea-9490-433d-9c26-4317416853da` |
| **Licença ID** | `44a8b2b2-b6aa-4dee-948f-f6737df9ecc3` |
| **Status licença** | `trial` — 9 dias restantes (expira 2026-06-28) |
| **Stack app** | FastAPI (Python 3.x) + Vite/React + PostgreSQL |
| **Stack Admin** | Express + tsx + PostgreSQL |
| **Modelo de banco** | 1 Postgres único, multi-schema |
| **Schema no Postgres** | `sede_sorocaba` (9 tabelas) |
| **Rede Docker** | `kairos_network` (bridge externa) |
| **Porta backend** | 8010 |
| **Porta frontend** | 3020 |
| **Domínio frontend (planejado)** | `sede.fbautomacao.space` |
| **Domínio backend (planejado)** | `api.sede.fbautomacao.space` |
| **Container backend** | `kairos-sede-sorocaba-backend-1` |
| **Container frontend** | `kairos-sede-sorocaba-frontend-1` |
| **ADMIN_EMAIL** | `fernandojaborges@gmail.com` |

### Credenciais Admin (Basic Auth + SUPER_ADMIN JWT)

| Item | Valor |
|---|---|
| **Basic Auth (popup navegador)** | `borgesjaf@gmail.com` / `Borges1972@` |
| **SUPER_ADMIN (Core JWT)** | `borgesjaf@gmail.com` / `Borges1972@` |
| **Login (POST JSON)** | `POST /api/core/users/auth/login` |
| **Troca aplicada em** | 2026-06-18 |

> **Nota:** Antes desta data o Basic Auth era `admin` / `XGhi0p2ZEccaMFPxUSp1`. O app sede-sorocaba precisa ter `KAIROS_ADMIN_BASIC_USER=borgesjaf@gmail.com` e `KAIROS_ADMIN_BASIC_PASSWORD=Borges1972@` no `.env`.

### Empresa (tenant multi-tenant)

| Item | Valor |
|---|---|
| **Nome** | OBPC Sorocaba |
| **Empresa ID (Admin)** | `8559f7e3-722e-4d7f-9ed6-521f56bbe420` |
| **Slug** | `obpc-sorocaba-8559f7` |
| **Document** | `00.000.000/0001-00` |

### Módulos ativados para a empresa

| Módulo | Slug | Module ID | Status |
|---|---|---|---|
| Agenda | `agenda` | `454de08f-d8b8-485b-9002-7dbb46c085d0` | ✅ Ativo |
| Batismos | `batismos` | `74e79415-d8e4-41d1-be90-82ccaa9ab828` | ✅ Ativo |
| Carteirinhas | `carteirinhas` | `c7048af7-f0b7-4a99-89e1-25623d41024e` | ✅ Ativo |
| Congregações | `congregacoes` | `4516a7f1-b0df-48a0-8984-f0e9a92bf9d6` | ✅ Ativo |
| Dashboard | `dashboard` | `590904b6-936d-4e37-8142-68dfebf1ceea` | ✅ Ativo |
| Membros | `membros` | `1ba3f517-606f-499c-940f-dbe48cb990d2` | ✅ Ativo |
| Obreiros | `obreiros` | `3c29de27-c4a8-4b81-baa1-b5415980e59a` | ✅ Ativo |
| Patrimônio | `patrimonio` | `f483ff9d-78e2-4ea7-a8fc-47207362b38d` | ✅ Ativo |
| Usuários | `usuarios` | `44f88aa7-f01b-4404-961f-b4fa9efbbd09` | ✅ Ativo |

### SUPER_ADMIN

| Item | Valor |
|---|---|
| **Email** | `borgesjaf@gmail.com` |
| **User ID (Admin)** | `b4934637-7d22-4242-8a1f-f73c266f753f` |
| **Role** | `SUPER_ADMIN` |
| **Login** | `POST /api/core/users/auth/login` (JWT, expira 12h) |

---

## Arquitetura da Integração

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS 187.77.229.227                       │
│                                                             │
│  ┌─────────────────────┐      ┌────────────────────────┐    │
│  │  Kairos Admin       │      │  Kairos Sede Sorocaba  │    │
│  │  ─────────────      │      │  ──────────────────    │    │
│  │  Backend  :3010     │◀────▶│  Backend  :8010        │    │
│  │  Frontend :3008     │ HTTP │  Frontend :3020        │    │
│  └──────────┬──────────┘      └────────────┬───────────┘    │
│             │                              │                │
│             │     kairos_network           │                │
│             └──────────────┬───────────────┘                │
│                            │                                │
│                   ┌────────▼─────────┐                      │
│                   │  PostgreSQL      │                      │
│                   │  DB: kairos      │                      │
│                   │                  │                      │
│                   │  Schemas:        │                      │
│                   │   • public       │ (Admin: 21 tabelas)  │
│                   │   • sede_sorocaba│ (App: 9 tabelas)    │ │
│                   │                  │                      │
│                   │  Users:          │                      │
│                   │   • kairos       │ (Admin)             │
│                   │   • sede_sorocaba│ (App, isolado)      │
│                   └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Mudanças Aplicadas

### 1. Banco de Dados

**Schema criado no Postgres do Admin:**

```sql
CREATE SCHEMA IF NOT EXISTS sede_sorocaba;
```

**User dedicado criado com permissões isoladas:**

```sql
CREATE USER sede_sorocaba WITH PASSWORD 'SedeSorocaba2026!';
GRANT USAGE ON SCHEMA sede_sorocaba TO sede_sorocaba;
ALTER DEFAULT PRIVILEGES IN SCHEMA sede_sorocaba GRANT ALL ON TABLES TO sede_sorocaba;
ALTER DEFAULT PRIVILEGES IN SCHEMA sede_sorocaba GRANT ALL ON SEQUENCES TO sede_sorocaba;
GRANT CREATE ON SCHEMA sede_sorocaba TO sede_sorocaba;
```

**9 tabelas criadas (via SQLAlchemy `create_all`):**
- `tenants` — igrejas clientes
- `usuarios` — usuários autenticados via Google
- `congregacoes` — sub-unidades da igreja
- `membros` — cadastro de membros
- `obreiros` — obreiros/ministros
- `carteirinhas` — carteirinhas com QR
- `patrimonio` — bens da sede
- `eventos` — agenda pastoral
- `batismos` — registro de batismos

### 2. Kairos Admin (registros via API)

```bash
# App criado
POST /api/admin/apps
{
  "name": "Kairos Sede Sorocaba",
  "slug": "sede-sorocaba",
  "description": "Gestao eclesiastica OBPC Sorocaba",
  "url": "https://sede.fbautomacao.space",
  "version": "1.0.0",
  "category": "Eclesiastico",
  "plan": "Pro",
  "status": "active"
}
→ ID: a778a58e-bf55-4bb6-9328-37a33c38052e

# Cliente (já existia, reusado)
GET /api/admin/clients
→ fernando borges, ID: 27f044ea-9490-433d-9c26-4317416853da

# Licença trial criada
POST /api/license/create-trial
{
  "client_name": "fernando borges",
  "email": "fernandojaborges@gmail.com",
  "category": "Eclesiastico",
  "app_slug": "sede-sorocaba"
}
→ License ID: 44a8b2b2-b6aa-4dee-948f-f6737df9ecc3
→ Status: trial, expira 2026-06-28
```

### 3. App sede-sorocaba — arquivos modificados

#### `backend/app/core/database.py`
Adicionado `search_path` via `connect_args` e `MetaData(schema=...)`:

```python
DATABASE_SCHEMA = os.getenv("DATABASE_SCHEMA", "sede_sorocaba")
connect_args = {}
if DATABASE_SCHEMA and not settings.DATABASE_URL.startswith("sqlite"):
    connect_args["options"] = f"-c search_path={DATABASE_SCHEMA},public"
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
metadata = MetaData(schema=DATABASE_SCHEMA)
Base = declarative_base(metadata=metadata)
```

#### `backend/app/services/license.py`
Adicionado Basic Auth nas chamadas para Admin:

```python
auth = (
    os.getenv("KAIROS_ADMIN_BASIC_USER"),
    os.getenv("KAIROS_ADMIN_BASIC_PASSWORD"),
) if os.getenv("KAIROS_ADMIN_BASIC_USER") else None
async with httpx.AsyncClient(timeout=5.0, auth=auth) as client:
    res = await client.get(url, params=params)
```

#### `docker-compose.yml`
Removido serviço `postgres` próprio, apontando para Postgres do Admin via DNS Docker:

```yaml
services:
  backend:
    environment:
      DATABASE_URL: postgresql://sede_sorocaba:${POSTGRES_PASSWORD}@kairos-assistente-kairos-assistente-kgavlc-postgres-1:5432/kairos
      DATABASE_SCHEMA: sede_sorocaba
      KAIROS_ADMIN_URL: ${KAIROS_ADMIN_URL}        # http://kairos-assistente-...:3010 (DNS interno)
      KAIROS_ADMIN_BASIC_USER: ${KAIROS_ADMIN_BASIC_USER}
      KAIROS_ADMIN_BASIC_PASSWORD: ${KAIROS_ADMIN_BASIC_PASSWORD}
      # ... outras vars
    networks:
      - kairos_network  # rede compartilhada com Admin
  frontend:
    # ...
    networks:
      - kairos_network
```

#### `.env` (em `C:\Users\ferna\kairos-assistente\kairos-sede-sorocaba\.env`)
```env
POSTGRES_PASSWORD=SedeSorocaba2026!
SECRET_KEY=433e2158bc8f9b333b26ef2b19ba6d4bfc911b83784bc46b612f9caf6a85c68b
KAIROS_ADMIN_URL=http://kairos-assistente-kairos-assistente-kgavlc-backend-1:3010
KAIROS_ADMIN_BASIC_USER=admin
KAIROS_ADMIN_BASIC_PASSWORD=XGhi0p2ZEccaMFPxUSp1
KAIROS_CLIENT_ID=27f044ea-9490-433d-9c26-4317416853da
ADMIN_EMAIL=fernandojaborges@gmail.com
GOOGLE_CLIENT_ID=__SEU_GOOGLE_CLIENT_ID__
GOOGLE_CLIENT_SECRET=__SEU_GOOGLE_CLIENT_SECRET__
GOOGLE_REDIRECT_URI=https://api.sede.fbautomacao.space/api/auth/google/callback
FRONTEND_URL=https://sede.fbautomacao.space
```

### 4. Deploy

Código copiado para a VPS em `/etc/dokploy/compose/kairos-sede-sorocaba/`.

```bash
cd /etc/dokploy/compose/kairos-sede-sorocaba
docker compose build
docker compose up -d
```

Containers ativos:
- `kairos-sede-sorocaba-backend-1` (Up, porta 8010)
- `kairos-sede-sorocaba-frontend-1` (Up, porta 3020)

Log de inicialização do backend:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Licença Kairos: trial - Acesso liberado.
```

---

## Decisões Técnicas

### 1. Apps acessam Admin via DNS Docker interno (não HTTPS)

**Por quê:** O proxy Caddy do Dokploy estava retornando **HTTP 502** em chamadas internas do container sede-sorocaba → `https://api.admin.fbautomacao.space`. O Caddy resolve DNS externo e o domínio Admin não tem rota interna para o backend.

**Solução:** Apontar `KAIROS_ADMIN_URL` para o DNS Docker interno do container backend do Admin:
```
http://kairos-assistente-kairos-assistente-kgavlc-backend-1:3010
```

Isso é mais rápido (sem TLS overhead) e confiável (rede interna).

### 2. Apps enviam Basic Auth nas chamadas Admin

**Por quê:** O middleware de Basic Auth do Admin protege **todas as rotas** exceto `/api/core`, `/api/health`, `/api`. Sem o header `Authorization: Basic ...`, qualquer chamada retorna `{"error": "Autenticacao necessaria"}`.

**Solução:** Adicionar `KAIROS_ADMIN_BASIC_USER` e `KAIROS_ADMIN_BASIC_PASSWORD` ao `.env` do app, e usar `httpx.AsyncClient(auth=...)`.

### 3. Multi-schema em vez de multi-database

**Por quê:** 1 único Postgres é mais simples de fazer backup, monitorar e mantém isolamento via `search_path` + `GRANT` granular. Cada app tem seu próprio user que só enxerga seu schema.

**Estrutura final:**
```
DB: kairos
├── public (Admin: 21 tabelas, owner: kairos)
└── sede_sorocaba (App sede: 9 tabelas, owner: sede_sorocaba)
    └── futuras tabelas do app vão pra cá
```

### 4. O bug do `migrations.ts` foi corrigido (não era SQLite)

O Admin **sempre usou Postgres** (não SQLite como eu havia documentado inicialmente). O bug crítico era de sintaxe TypeScript no array de migrations:
- **Faltava `},`** entre migration 003 e 004
- **`},` extra** no final do array

Após o fix, as migrations 001-004 foram aplicadas com sucesso.

---

## Sistema de Módulos Ativáveis/Desativáveis

O Admin já tem a infraestrutura nativa para **módulos plugáveis por empresa** (multi-tenant granular):

### Estrutura no Postgres

```sql
-- Catálogo global de módulos (gerenciado pelo SUPER_ADMIN)
modules (
  id TEXT PK,
  name TEXT,
  slug TEXT UNIQUE,
  active BOOLEAN,         -- desativar globalmente oculta o módulo
  created_at, updated_at
)

-- Quais módulos cada empresa tem habilitados
company_modules (
  empresa_id TEXT FK -> empresas(id),
  module_id TEXT FK -> modules(id),
  active BOOLEAN,         -- ativar/desativar para esta empresa
  PRIMARY KEY (empresa_id, module_id)
)
```

### API REST (rotas do Admin)

Todas exigem JWT de `core_users` no header `Authorization: Bearer <token>`. SUPER_ADMIN para escrita; qualquer usuário autenticado para leitura.

```bash
# Login (gera JWT)
POST /api/core/users/auth/login
{ "email": "borgesjaf@gmail.com", "password": "Borges1972@" }
→ { "token": "eyJhbGc...", "user": {...} }

# Catálogo global (SUPER_ADMIN pode criar)
GET    /api/core/modules
POST   /api/core/modules           # { name, slug }
PATCH  /api/core/modules/:id       # { active: true|false }

# Módulos por empresa
GET    /api/core/modules/empresas/:empresaId
POST   /api/core/modules/empresas/:empresaId/:moduleId   # { active: true|false }
```

### Como o app sede-sorocaba pode usar

O frontend do sede-sorocaba pode consultar `GET /api/core/modules/empresas/<empresaId>` (com `Authorization: Bearer <jwt>`) para saber **quais módulos mostrar/ocultar** no menu. Rotas do backend do app que correspondem a módulos desativados devem retornar `403 Forbidden`.

Exemplo de fluxo:
1. Usuário loga no sede-sorocaba via Google
2. Backend do sede-sorocaba tem o `empresa_id` (ou o consulta via Kairos Admin)
3. Frontend chama `GET /api/core/modules/empresas/<empresaId>` com JWT
4. Renderiza apenas os módulos com `active: true`
5. SUPER_ADMIN pode desativar módulos pela UI do Kairos Admin → mudança reflete no app sede-sorocaba no próximo reload

### Estado atual para OBPC Sorocaba

Todos os 9 módulos estão **ativos**. Para testar o sistema, basta fazer:
```bash
# Desativar Membros para OBPC Sorocaba
curl -sk -X POST -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <jwt>" \
  -d '{"active":false}' \
  http://localhost:3010/api/core/modules/empresas/8559f7e3-722e-4d7f-9ed6-521f56bbe420/1ba3f517-606f-499c-940f-dbe48cb990d2
```
O módulo Membros deixará de aparecer em `GET /api/core/modules/empresas/8559f7e3-...` (apenas os com `active=true` aparecem graças ao `WHERE m.active = TRUE`).

---



### 1. Configurar domínios no Dokploy (projeto `kairos-sede-sorocaba`)

- **Frontend**:
  - Host: `sede.fbautomacao.space`
  - Service: `frontend`
  - Port: `3020`
  - HTTPS: Let's Encrypt

- **Backend**:
  - Host: `api.sede.fbautomacao.space`
  - Service: `backend`
  - Port: `8010`
  - HTTPS: Let's Encrypt

### 2. Google Cloud Console

Adicionar URI de redirecionamento OAuth2 autorizada:
```
https://api.sede.fbautomacao.space/api/auth/google/callback
```

Projeto GCP onde foi criado o Client ID (definido via variável de ambiente).

### 3. Testar login end-to-end

1. Acessar `https://sede.fbautomacao.space/` (após Dokploy configurar HTTPS)
2. Clicar em "Login com Google"
3. Logar com `fernandojaborges@gmail.com` (única conta autorizada pelo `ADMIN_EMAIL`)
4. Verificar log do backend: deve aparecer o JWT criado
5. Acessar `/api/dashboard` para confirmar autenticação

---

## Pendências (ações manuais)

### 1. Configurar domínios no Dokploy (projeto `kairos-sede-sorocaba`)

- **Frontend**:
  - Host: `sede.fbautomacao.space`
  - Service: `frontend`
  - Port: `3020`
  - HTTPS: Let's Encrypt

- **Backend**:
  - Host: `api.sede.fbautomacao.space`
  - Service: `backend`
  - Port: `8010`
  - HTTPS: Let's Encrypt

### 2. Google Cloud Console

Adicionar URI de redirecionamento OAuth2 autorizada:
```
https://api.sede.fbautomacao.space/api/auth/google/callback
```

Projeto GCP onde foi criado o Client ID (definido via variável de ambiente).

### 3. Integrar módulos no frontend sede-sorocaba (opcional)

Adicionar hook/middleware que consulta `GET /api/core/modules/empresas/<empresaId>` e renderiza/oculta rotas conforme ativação. Não é bloqueador — todos os 9 módulos já estão ativos.

### 4. Testar login end-to-end

1. Acessar `https://sede.fbautomacao.space/` (após Dokploy configurar HTTPS)
2. Clicar em "Login com Google"
3. Logar com `fernandojaborges@gmail.com` (única conta autorizada pelo `ADMIN_EMAIL`)
4. Verificar log do backend: deve aparecer o JWT criado
5. Acessar `/api/dashboard` para confirmar autenticação

---

## Como Replicar a Integração (outros apps)

Para integrar `kairos-advocacia`, `kairos-politica`, ou `foto-agenda`:

### 1. Registrar no Admin
```bash
curl -sk -u admin:XGhi0p2ZEccaMFPxUSp1 \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "name": "Kairos Advocacia",
    "slug": "kairos-advocacia",
    "description": "Gestao juridica",
    "url": "https://advocacia.fbautomacao.space",
    "version": "1.0.0",
    "category": "Juridico",
    "plan": "Pro",
    "status": "active"
  }' \
  http://localhost:3010/api/admin/apps
```

### 2. Criar schema e user no Postgres
```sql
CREATE SCHEMA kairos_advocacia;
CREATE USER kairos_advocacia WITH PASSWORD '<senha>';
GRANT USAGE ON SCHEMA kairos_advocacia TO kairos_advocacia;
GRANT CREATE ON SCHEMA kairos_advocacia TO kairos_advocacia;
ALTER DEFAULT PRIVILEGES IN SCHEMA kairos_advocacia GRANT ALL ON TABLES TO kairos_advocacia;
ALTER DEFAULT PRIVILEGES IN SCHEMA kairos_advocacia GRANT ALL ON SEQUENCES TO kairos_advocacia;
```

### 3. Criar licença
```bash
curl -sk -u admin:XGhi0p2ZEccaMFPxUSp1 \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "client_name": "fernando borges",
    "email": "fernandojaborges@gmail.com",
    "app_slug": "kairos-advocacia"
  }' \
  http://localhost:3010/api/license/create-trial
```

### 4. Configurar `.env` do app
```env
DATABASE_URL=postgresql://kairos_advocacia:<senha>@kairos-assistente-kairos-assistente-kgavlc-postgres-1:5432/kairos
DATABASE_SCHEMA=kairos_advocacia
KAIROS_ADMIN_URL=http://kairos-assistente-kairos-assistente-kgavlc-backend-1:3010
KAIROS_ADMIN_BASIC_USER=admin
KAIROS_ADMIN_BASIC_PASSWORD=XGhi0p2ZEccaMFPxUSp1
KAIROS_CLIENT_ID=27f044ea-9490-433d-9c26-4317416853da
# + vars específicas do app
```

### 5. Modificar `backend/app/core/database.py` do app
Trocar `sede_sorocaba` por `kairos_advocacia` no `DATABASE_SCHEMA`.

### 6. Modificar `backend/app/services/license.py`
Manter o Basic Auth (já está OK).

### 7. Deploy
```bash
cd /etc/dokploy/compose/kairos-advocacia
docker compose up -d --build
```

---

## Comandos Úteis

### Verificar saúde do sede-sorocaba
```bash
ssh root@187.77.229.227 "curl -s http://localhost:8010/api/health"
# → {"status":"ok","app":"Kairos Sede Sorocaba API"}
```

### Verificar licença manualmente
```bash
ssh root@187.77.229.227 "curl -s -u admin:XGhi0p2ZEccaMFPxUSp1 \
  'http://localhost:3010/api/license/verify?client_id=27f044ea-9490-433d-9c26-4317416853da&app_slug=sede-sorocaba'"
# → {"valid":true,"active":true,"status":"trial","days_remaining":9,...}
```

### Listar tabelas do schema sede_sorocaba
```bash
ssh root@187.77.229.227 "docker exec kairos-assistente-kairos-assistente-kgavlc-postgres-1 \
  env PGPASSWORD=SedeSorocaba2026! psql -U sede_sorocaba -d kairos -c '\dt sede_sorocaba.*'"
```

### Ver logs do sede-sorocaba
```bash
ssh root@187.77.229.227 "docker logs kairos-sede-sorocaba-backend-1 --tail 20"
```

### Restart sede-sorocaba
```bash
ssh root@187.77.229.227 "cd /etc/dokploy/compose/kairos-sede-sorocaba && docker compose restart"
```

---

## Referências

- `docs/APPS_REGISTRADOS.md` — apps do ecossistema
- `docs/DEPLOY_VPS.md` — guia geral de deploy
- `docs/TEMPLATE_PRO.md` — template usado pelo sede-sorocaba
- `kairos-sede-sorocaba/README.md` — doc original do app
- `PROGRESS.md` — histórico da sessão
