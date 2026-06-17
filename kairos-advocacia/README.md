# Kairos Advocacia

App **Kairos Pro** de gestão para escritórios de advocacia: clientes, processos,
agenda jurídica e dashboard, com licenciamento integrado ao Kairos Admin.

Construído seguindo o `docs/TEMPLATE_PRO.md` do ecossistema Kairos: FastAPI +
PostgreSQL no backend, Vite + React + Tailwind no frontend, multi-tenant
(`Tenant`/`User`), JWT, e verificação de licença via Kairos Admin.

## Perfis de usuário

- **admin** — gerencia usuários do escritório, acesso total.
- **advogado** / **assistente_juridico** — gerenciam clientes, processos e agenda.
- **cliente** — portal restrito: vê apenas os processos vinculados a ele
  (via `Cliente.linked_user_id`) e seus próprios compromissos.

## O que está implementado (Fase 1)

- Autenticação JWT multi-tenant (`/auth/register`, `/auth/login`, `/auth/me`)
- CRUD de usuários (`/users`) — restrito a `admin`
- CRUD de clientes (`/clientes`) — pessoa física/jurídica
- CRUD de processos (`/processos`) com linha do tempo de movimentações
  (`/processos/{id}/movimentacoes`)
- Agenda jurídica (`/agenda`) — audiências, prazos, reuniões
- Dashboard com estatísticas agregadas (`/dashboard/stats`)
- Financeiro (`/faturas`) — faturas com emissão, vencimento, pagamento e
  cancelamento; indicadores de "a receber" e "recebido no mês" no dashboard
- Portal do cliente "lite": usuários com `role=cliente` só veem os próprios
  processos, compromissos e faturas
- Verificação de licença Kairos Admin no login (fail-open se indisponível)

## Fora do escopo desta versão (Fase 2)

- Gestão de documentos com upload/MinIO e assinatura digital
- Chat interno entre equipe e cliente
- Assistente de IA jurídica
- Login social (OAuth Google)

## Desenvolvimento local

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ADMIN_EMAIL=admin@escritorio.com ADMIN_PASSWORD=admin123 uvicorn app.main:app --reload

# Frontend (em outro terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## Deploy na VPS (Dokploy)

1. Crie o repositório no GitHub e suba este diretório (`kairos-advocacia/`)
   como raiz do repositório.
2. No Kairos Admin (**Aplicativos**), registre o app:
   - Nome: `Kairos Advocacia`
   - Slug: `kairos-advocacia`
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
   ADMIN_EMAIL=admin@escritorio.com
   ADMIN_PASSWORD=...
   VITE_API_URL=https://api.advocacia.fbautomacao.space
   ```
6. Confirme que a rede externa `kairos_network` existe na VPS
   (`docker network create kairos_network` se ainda não existir).
7. Deploy. As portas padrão são `8010` (backend) e `3020` (frontend) — ajuste
   no `docker-compose.yml` se já estiverem em uso.
8. **Esta VPS usa Caddy manual (não o Traefik/Domains do Dokploy)** — após o
   deploy, adicione ao `Caddyfile` e recarregue:
   ```
   advocacia.fbautomacao.space {
       reverse_proxy 127.0.0.1:3020
   }
   api.advocacia.fbautomacao.space {
       reverse_proxy 127.0.0.1:8010
   }
   ```
   ```bash
   systemctl reload caddy
   ```
9. Teste o login em `https://advocacia.fbautomacao.space` com o
   `ADMIN_EMAIL`/`ADMIN_PASSWORD` configurados, e confirme no log do backend
   que a licença foi validada (`✅ Licença Kairos: ...`).
