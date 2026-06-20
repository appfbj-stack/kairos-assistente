# PROGRESS.md — kairos-assistente

## Sessão 2026-06-20 — Deploy de correções (Basic Auth + Marketplace)

### Problema
Usuário reportou que cards de apps e módulos do marketplace não apareciam no Admin (`admin.fbautomacao.space`). Root cause: 5 apps existiam no banco e as rotas `/api/core/*` exigiam JWT, mas o frontend enviava apenas Basic Auth.

### O que foi feito

1. **Backend — `backend/src/core/auth.ts`**: `requireCoreAuth` agora aceita Basic Auth como fallback quando JWT não está presente. Valida contra `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` e atribui role `SUPER_ADMIN`.

2. **Frontend — `frontend/src/services/api.ts`**: Adicionado `api.core.empresas.list()` para chamar `/api/core/empresas` via `fetchApi`.

3. **Frontend — `frontend/src/middleware.ts`**: Agora aceita cookie `kairos_auth` (setado no login Basic Auth inicial) em chamadas JS fetch, evitando 401 em rotas `/api/core/*`.

4. **Frontend — `frontend/src/app/marketplace/page.tsx`**: Substituiu `fetch()` cru por `fetchApi()` em todas as chamadas (empresas, módulos, agents, toggles).

5. **Deploy VPS**:
   - Copiado todo `backend/src/` e `frontend/src/` para o VPS
   - Rebuild dos containers backend e frontend
   - Backend retorna 9 módulos e agents via Basic Auth
   - Frontend build inclui rota `/marketplace` (estava faltando)

### Estado atual
- ✅ Backend `api/admin/apps` retorna 5 apps
- ✅ Backend `api/core/modules` retorna módulos (Basic Auth funcional)
- ✅ Backend `api/core/agents` retorna agents
- ✅ Frontend `/marketplace` built e deployado
- ✅ Frontend middleware aceita cookie `kairos_auth`
- ❓ Aguardando usuário testar no browser se os cards aparecem agora

### Próximos passos (sugeridos)
1. Testar `https://admin.fbautomacao.space/aplicativos` no browser
2. Testar `https://admin.fbautomacao.space/marketplace` no browser
3. Se agents tiverem rota, verificar se os dados aparecem corretamente
4. Atualizar banco VPS com migrations 005/006 (Marketplace de Módulos e Agentes) se necessário

### Decisões
- Basic Auth fallback no `requireCoreAuth`: reusa credenciais existentes, sem necessidade de fluxo JWT no frontend
- `fetchApi()` usado em vez de `fetch()` cru para garantir que headers Basic Auth sejam enviados
