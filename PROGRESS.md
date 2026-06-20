# PROGRESS.md — kairos-assistente

## Sessão 2026-06-20 — Deploy proxy route + dashboard fixes

### Problema
Frontend proxy route (`/api/proxy/*`) retornava 502 "socket hang up" ao chamar o backend. Dashboard endpoint também crashava com "Empty reply from server". Backend entrava em restart loop com "password authentication failed".

### O que foi feito

1. **Proxy route (`frontend/src/app/api/proxy/[...slug]/route.ts`)**: Removido `new http.Agent({keepAlive: false})` — `http.request(url_string, {agent, ...})` causa "socket hang up" no Node.js 20 Alpine quando URL string E agent option são passados juntos. O default `http.Agent` já tem `keepAlive: false`.

2. **Root cause DNS collision**: Múltiplos containers `postgres` na mesma rede Docker externa (`kairos_network`):
   - `fotoagenda-postgres` (172.16.10.5)
   - `nosso-postgres` (172.16.10.2)
   - `code-postgres-1` (172.16.10.7)
   - DNS round-robin para `postgres` resolvia para qualquer um deles → quando caía no errado, `password authentication failed`.
   - Fix: `docker-compose.yml` — adicionado `container_name: kairos-assistente-postgres` e `POSTGRES_HOST=kairos-assistente-postgres`.

3. **Dashboard endpoint (`backend/src/atendimento/dashboard.ts`)**:
   - Envolto handler em `try/catch` para retornar 500 em vez de "Empty reply"
   - Convertido `DATE('now', '-7 days')` (SQLite) para `CURRENT_DATE - INTERVAL '7 days'` (PostgreSQL)
   - Adicionado cast `started_at::timestamp` porque coluna é `TEXT`

4. **Database layer (`backend/src/database/database.ts`)**:
   - Adicionado `toPg()` regex para converter `DATE('now', '...')` para PostgreSQL
   - Pool config: `max: 20`, `connectionTimeoutMillis: 5000`
   - Retry loop em `getDb()` para transient auth failures

### Estado atual
- ✅ Proxy `/api/proxy/health` → 200 (via backend 3010)
- ✅ Proxy `/api/proxy/atendimento/dashboard/{id}` → 200 (via backend 3010)
- ✅ Proxy `/api/proxy/core/modules` → 200
- ✅ Backend sem restart loop — DNS único, sem auth race
- ❌ DNS A record `api.kairosai.fbautomacao.space` não existe — admin precisa criar
- ❌ IA Chat não está conectado ao LLM

### Próximos passos
1. Criar DNS A record `api.kairosai.fbautomacao.space` → `187.77.229.227`
2. Wire IA chat ao LLM (OpenRouter/DeepSeek)
3. Testar widget público `/assistente/[slug]`

### Decisões
- `container_name` explícito + `POSTGRES_HOST` único resolve DNS collision em rede Docker externa compartilhada
- Proxy route usa default `http.Agent` (sem custom agent) para evitar bug Node.js 20 Alpine
- Dashboard com try/catch para debug em produção
