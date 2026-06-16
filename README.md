# Kairos Admin 2.0

Plataforma SaaS de administração para gerenciar clientes, licenças, aplicativos e infraestrutura do ecossistema Kairos.

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | Express.js + TypeScript + PostgreSQL |
| Frontend | Next.js 15 + React 19 + Tailwind CSS |
| IA | OpenRouter API (multi-modelo) |
| Infra | Docker Compose + VPS |
| Bot | Telegram (polling) |

## Módulos

### Administração
- **Dashboard** — métricas em tempo real (clientes, licenças, receita, VPS)
- **Clientes** — cadastro completo com busca e edição
- **Aplicativos** — catálogo de apps (Lite/Pro) com URL e versão
- **Licenças** — trial/ativo/bloqueado/expirado com toggle rápido
- **Financeiro** — pagamentos e receita mensal/total
- **VPS** — CPU, RAM, disco e uptime em tempo real

### Ferramentas
- **Chat IA** — conversa com LLM + STT/TTS + histórico
- **Agenda** — compromissos com status

### Sistema
- **IA & Modelos** — chave API OpenRouter, modelo, memória
- **Logs** — auditoria completa de todas as ações
- **Configurações** — informações do sistema

## Iniciando (desenvolvimento local)

```bash
# Backend
cp backend/.env.example backend/.env
cd backend && npm install && npm run dev

# Frontend
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

Ou via Docker Compose local (sem Traefik):
```bash
POSTGRES_PASSWORD=kairos123 OPENROUTER_API_KEY=sk-or-v1-... docker compose up -d --build
```

## Deploy em produção (VPS / Dokploy)

O `docker-compose.yml` da raiz é o usado em produção: roteamento por
domínio via Traefik, rede externa `kairos_network` compartilhada com os
apps satélites, e todo o painel/API (exceto `/api/license/verify`, que
precisa ficar público para os apps satélites) protegido por HTTP Basic
Auth no proxy — o backend ainda não tem login próprio.

Passo a passo completo, variáveis de cada serviço e checklist de DNS:
veja **[docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md)**.

## Variáveis de Ambiente (produção)

```env
ADMIN_DOMAIN=admin.fbautomacao.space
POSTGRES_PASSWORD=...
OPENROUTER_API_KEY=sk-or-v1-...
TELEGRAM_BOT_TOKEN=...
TRAEFIK_AUTH_USERS=usuario:$$apr1$$salt$$hash   # ver docs/DEPLOY_VPS.md
```

## Verificar Licença

```bash
curl "https://admin.fbautomacao.space/api/license/verify?client_id=UUID&app_slug=fotoagenda"
```

## Arquitetura

```
kairos-assistente/
├── backend/          # Express.js API (TypeScript + PostgreSQL)
│   └── src/
│       ├── admin/    # Clientes, licenças, logs, financeiro
│       ├── chat/     # Conversas com LLM
│       ├── agenda/   # Compromissos
│       ├── memory/   # Memória key-value
│       ├── settings/ # Configurações
│       ├── vps/      # Monitoramento do servidor
│       └── database/ # PostgreSQL (pg pool)
├── frontend/         # Next.js 15 Admin Dashboard
│   └── src/
│       ├── app/      # Páginas (App Router)
│       └── components/ # Sidebar, TopBar, StatCard
├── foto-agenda/      # FotoAgenda Pro (Python/FastAPI + React)
└── docker-compose.yml
```
