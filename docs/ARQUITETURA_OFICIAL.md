# Arquitetura Oficial Kairos

**Versão**: 2.0 · **Data**: 2025 · **Referência**: Kairos Admin 2.0

---

## 1. Visão Geral do Ecossistema

O ecossistema Kairos é composto por um **hub central de administração** (Kairos Admin) e uma coleção de **aplicativos satélites** (Kairos Lite e Kairos Pro), todos integrados via API de licenciamento.

```
┌─────────────────────────────────────────────────────────┐
│                    KAIROS ADMIN 2.0                      │
│         Hub Central · Clientes · Licenças · IA           │
│              Express.js + PostgreSQL + Next.js            │
└──────────────────────┬──────────────────────────────────┘
                       │ /api/license/verify
          ┌────────────┼────────────┐
          │            │            │
   ┌──────▼──────┐     │    ┌───────▼──────┐
   │ KAIROS LITE │     │    │  KAIROS PRO  │
   │ Google Sheet│     │    │  PostgreSQL  │
   │  Vidraçaria │     │    │    Igreja    │
   │   Oficina   │     │    │  Imobiliária │
   │  Fotografia │     │    │   Clínica    │
   └─────────────┘     │    └──────────────┘
                       │
               ┌───────▼──────┐
               │  FOTOAGENDA  │
               │  (Exemplo Pro│
               │   existente) │
               └──────────────┘
```

---

## 2. Kairos Admin 2.0 — Hub Central

### Stack Implementada

| Camada | Tecnologia | Versão |
|---|---|---|
| Backend | Express.js + TypeScript | 4.21 / 5.7 |
| Database | PostgreSQL | 16 |
| ORM/Driver | pg (node-postgres) | 8.13 |
| Frontend | Next.js + React | 15.1 / 19 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | 0.468 |
| IA | OpenRouter API | — |
| Bot | Telegram (polling) | — |
| Infra | Docker Compose | v3 |

### Módulos Implementados

| Módulo | Rota Backend | Rota Frontend |
|---|---|---|
| Dashboard | `GET /api/admin/stats` | `/dashboard` |
| Clientes | `CRUD /api/admin/clients` | `/clientes` |
| Aplicativos | `CRUD /api/admin/apps` | `/aplicativos` |
| Licenças | `/api/license/*` | `/licencas` |
| Financeiro | `GET /api/admin/financial` | `/financeiro` |
| VPS Monitor | `GET /api/vps/stats` | `/monitoramento` |
| Chat IA | `/api/chat/*` | `/chat` |
| Agenda | `/api/agenda/*` | `/agenda` |
| Memória IA | `/api/memory/*` | `/ia` |
| Logs | `GET /api/admin/logs` | `/logs` |
| Settings | `/api/settings/*` | `/configuracoes` |

### Estrutura de Diretórios

```
backend/src/
├── admin/         # Clientes, licenças, financeiro, logs
├── chat/          # Conversas com LLM
├── agenda/        # Compromissos
├── memory/        # Memória key-value
├── settings/      # Configurações
├── vps/           # Monitoramento do servidor
├── telegram/      # Bot Telegram
├── llm/           # Wrapper OpenRouter
└── database/
    ├── database.ts    # pg Pool (async)
    ├── migrations.ts  # Schema versionado
    └── backup.ts      # JSON export automático

frontend/src/
├── app/           # Next.js App Router
│   ├── dashboard/
│   ├── clientes/
│   ├── aplicativos/
│   ├── licencas/
│   ├── financeiro/
│   ├── monitoramento/
│   ├── chat/
│   ├── agenda/
│   ├── ia/
│   ├── logs/
│   └── configuracoes/
├── components/
│   ├── AdminShell.tsx  # Layout wrapper
│   ├── Sidebar.tsx     # Navegação lateral
│   ├── TopBar.tsx      # Barra superior
│   └── StatCard.tsx    # Cards de métricas
├── services/
│   └── api.ts          # Cliente HTTP centralizado
└── lib/
    └── utils.ts        # Helpers (formatação, etc.)
```

### Schema do Banco (PostgreSQL)

```sql
-- Core
conversations (id, title, created_at, updated_at)
messages (id, conversation_id, role, content, created_at)
agenda_items (id, title, description, date_time, status, ...)
memory_items (id, key, value, category, ...)
settings (id, key, value, ...)

-- Licenciamento
clients (id, name, company, phone, email, category, status, ...)
apps (id, name, slug, description, url, version, category, plan, status, ...)
licenses (id, client_id, app_id, status, type, start_date, end_date, ...)
logs (id, client_id, app_id, action, details, ip, created_at)
payments (id, client_id, license_id, amount, method, status, created_at)
```

### API de Licenciamento (Contrato Público)

Todos os apps satélites devem usar este endpoint para verificar acesso:

```
GET /api/license/verify?client_id={UUID}&app_slug={slug}

Response OK:
{
  "valid": true,
  "status": "active" | "trial",
  "days_remaining": 7,
  "client_name": "João Silva",
  "message": "Acesso liberado."
}

Response Bloqueado:
{
  "valid": false,
  "status": "expired" | "blocked",
  "message": "Período de avaliação encerrado."
}
```

### Deploy

```yaml
# docker-compose.yml
services:
  postgres:      # PostgreSQL 16 com healthcheck
  backend:       # Express.js porta 3010
  frontend:      # Next.js porta 3008
  # + apps satélites adicionais
```

---

## 3. Kairos Lite

### Conceito
Apps simples para pequenos negócios. Banco de dados é uma **planilha Google Sheets** — sem infraestrutura de banco, sem servidor de banco, custo zero de dados.

### Casos de Uso
- Vidraçaria (orçamentos, clientes, pedidos)
- Oficina mecânica (OS, serviços, veículos)
- Fotografia (sessões, clientes, agenda)
- Almoxarifado (estoque, entradas, saídas)
- Barbearia, salão, loja pequena

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite (SPA) |
| Banco de dados | Google Sheets API v4 |
| Autenticação | License key via Kairos Admin |
| Deploy | Vercel (gratuito) ou Nginx estático |
| Backend | **Nenhum** — tudo via Google Sheets |

### Fluxo de Autenticação

```
1. Usuário abre o app
2. App pede Client ID (salvo em localStorage)
3. App chama GET /api/license/verify no Kairos Admin
4. Se valid=true → libera acesso
5. Se valid=false → mostra tela de bloqueio
6. Verificação a cada 24h (cached em localStorage)
```

### Integração Google Sheets

```javascript
const SHEET_ID = "SEU_GOOGLE_SHEET_ID";
const API_KEY = "SUA_API_KEY_GOOGLE";

// Ler dados
fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Clientes?key=${API_KEY}`)

// Escrever dados (requer OAuth ou Service Account)
```

---

## 4. Kairos Pro

### Conceito
Apps robustos para negócios de médio/grande porte. Banco de dados **PostgreSQL próprio**, autenticação JWT, multi-usuário, integração completa com Kairos Admin.

### Casos de Uso
- Igreja (membros, células, finança, eventos)
- Clínica (pacientes, consultas, prontuário)
- Imobiliária (imóveis, clientes, contratos)
- CRM comercial (leads, pipeline, vendas)
- ERP pequeno (estoque, NF, financeiro)

### Stack

| Camada | Tecnologia |
|---|---|
| Backend | FastAPI (Python) ou Express.js (Node.js) |
| Database | PostgreSQL (Docker) |
| ORM | SQLAlchemy (Python) ou pg (Node.js) |
| Auth | JWT + bcrypt |
| Frontend | React + Vite ou Next.js |
| Deploy | Docker Compose no VPS |
| Licença | Verificada via Kairos Admin API |

### Fluxo de Autenticação

```
1. Usuário faz login com email/senha
2. Backend verifica JWT
3. Backend chama Kairos Admin /api/license/verify
4. Se licença válida → acesso liberado
5. Se licença inválida → retorna 403 com mensagem
6. Verificação a cada login (ou a cada 1h)
```

### Estrutura de Banco (Mínima)

```sql
tenants (id, name, slug, active, created_at)
users (id, tenant_id, email, password_hash, name, role)
-- + tabelas específicas do domínio
```

---

## 5. Padrões do Ecossistema

### Padrão de Licença
- `client_id` = UUID único do cliente no Kairos Admin
- `app_slug` = identificador do app (ex: `vidracaria`, `oficina`)
- Todo app verifica licença antes de liberar acesso
- Status possíveis: `trial` (10 dias), `active`, `expired`, `blocked`

### Padrão de Nomenclatura
- Slugs em minúsculo, sem espaço: `fotoagenda`, `oficina`, `igreja-crm`
- Versões semânticas: `1.0.0`, `1.1.0`, `2.0.0`
- Categorias de app: `SaaS`, `Gestão`, `CRM`, `ERP`, `Financeiro`

### Padrão de Deploy
- **Lite**: Vercel (gratuito) ou Nginx estático
- **Pro**: Docker Compose no VPS (mesma máquina que o Kairos Admin)
- Portas: Admin=3008/3010, apps Pro a partir de 3020

### Padrão de UI
- Tailwind CSS obrigatório
- Paleta Kairos: `#5c7cfa` (primary), `#4c6ef5` (dark)
- Dark mode: `darkMode: "class"` no tailwind.config
- Mobile-first, responsivo
- Componentes: cards, badges de status, tabelas com busca

---

## 6. Roadmap

### Fase 1 — Concluída ✅
- Kairos Admin 2.0 (hub central)
- PostgreSQL integrado
- Painel admin completo
- FotoAgenda Pro (app satélite existente)

### Fase 2 — Próxima
- Template Lite gerado e documentado
- Adequar Vidraçaria ao Template Lite
- Adequar Oficina ao Template Lite

### Fase 3 — Futura
- Template Pro gerado
- Google OAuth no Kairos Admin
- Portal do cliente (self-service de licença)
- Stripe/MercadoPago para pagamentos
