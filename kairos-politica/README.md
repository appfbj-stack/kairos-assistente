# Kairos Política

App **Kairos Pro** de gestão de mandato para vereadores e gabinetes
políticos: CRM de cidadãos, lideranças e parceiros, demandas com protocolo
e histórico, agenda do mandato e dashboard executivo, com licenciamento
integrado ao Kairos Admin.

Construído seguindo o `docs/TEMPLATE_PRO.md` do ecossistema Kairos: FastAPI +
PostgreSQL no backend, Vite + React + Tailwind no frontend, multi-tenant
(`Tenant`/`User`), JWT, e verificação de licença via Kairos Admin.

## Perfis de usuário

- **admin** — gerencia a equipe do gabinete, acesso total.
- **vereador** / **assessor** — gerenciam cidadãos, lideranças, parceiros,
  demandas e agenda.
- **cidadao** — portal restrito: vê apenas as próprias demandas (via
  `Cidadao.linked_user_id`) e pode abrir novas demandas.

## O que está implementado (Fase 1)

- Autenticação JWT multi-tenant (`/auth/register`, `/auth/login`, `/auth/me`)
- CRUD de usuários (`/users`) — restrito a `admin`
- CRM político: cidadãos (`/cidadaos`), lideranças (`/liderancas`) e
  parceiros (`/parceiros`)
- Demandas (`/demandas`) com protocolo automático (`AAAA-NNNNN`) e histórico
  de andamentos (`/demandas/{id}/andamentos`)
- Agenda do mandato (`/agenda`) — reuniões, visitas, sessões, eventos,
  audiências
- Dashboard executivo com estatísticas agregadas (`/dashboard/stats`)
- Portal do cidadão "lite": usuários com `role=cidadao` só veem as próprias
  demandas e podem abrir novas solicitações
- Verificação de licença Kairos Admin no login (fail-open se indisponível)

## Fora do escopo desta versão (Fase 2)

- Projetos e Ações (projetos de lei, indicações, requerimentos)
- Mapa de Atuação territorial
- Comunicação avançada (mensagens internas, WhatsApp, e-mail, SMS)
- Portal do Cidadão completo (upload de documentos)
- Assistente de IA de gabinete

## Desenvolvimento local

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ADMIN_EMAIL=admin@gabinete.com ADMIN_PASSWORD=admin123 uvicorn app.main:app --reload

# Frontend (em outro terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Deploy na VPS (Dokploy)

1. Crie o repositório no GitHub e suba este diretório (`kairos-politica/`)
   como raiz do repositório.
2. No Kairos Admin (**Aplicativos**), registre o app:
   - Nome: `Kairos Política`
   - Slug: `kairos-politica`
   - Plano: **Pro**
3. Em **Clientes**, crie (ou selecione) o cliente que vai usar o app e, em
   **Licenças**, crie uma licença trial para esse cliente + app. Copie o
   `client_id` (UUID) gerado.
4. No Dokploy, crie um novo projeto do tipo Docker Compose apontando para
   este repositório, com **Compose Path** = `docker-compose.yml`.
5. Configure as variáveis de ambiente (aba Environment):
   ```
   POSTGRES_PASSWORD=...
   SECRET_KEY=...
   KAIROS_ADMIN_URL=https://api.admin.fbautomacao.space
   KAIROS_CLIENT_ID=<uuid copiado no passo 3>
   ADMIN_EMAIL=admin@gabinete.com
   ADMIN_PASSWORD=...
   VITE_API_URL=https://api.politica.fbautomacao.space
   ```
6. Confirme que a rede externa `kairos_network` existe na VPS
   (`docker network create kairos_network` se ainda não existir).
7. Deploy. As portas reservadas para este app são `8020` (backend) e `3040`
   (frontend) — ver `docs/APPS_REGISTRADOS.md` na raiz do ecossistema antes
   de mudar, para não colidir com outro app já registrado.
8. Na aba **Domains** do recurso (Dokploy), registre os dois domínios
   apontando para os serviços do compose:
   - `politica.fbautomacao.space` → serviço `frontend`, porta `80`
   - `api.politica.fbautomacao.space` → serviço `backend`, porta `8000`
9. Teste o login em `https://politica.fbautomacao.space` com o
   `ADMIN_EMAIL`/`ADMIN_PASSWORD` configurados, e confirme no log do backend
   que a licença foi validada (`✅ Licença Kairos: ...`).
