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

## Iniciando

```bash
# Clonar e configurar
cp .env.example .env
# editar .env com suas chaves

# Subir todos os serviços
docker compose up -d --build

# Ver logs
docker compose logs -f backend
```

## Variáveis de Ambiente

```env
OPENROUTER_API_KEY=sk-or-v1-...
TELEGRAM_BOT_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

## Portas

| Serviço | Porta |
|---|---|
| Kairos Admin (Frontend) | 3008 |
| Kairos Core (Backend) | 3010 |
| PostgreSQL | 5432 |
| FotoAgenda Frontend | 3015 |
| FotoAgenda Backend | 8005 |

## Verificar Licença

```bash
curl "http://localhost:3010/api/license/verify?client_id=UUID&app_slug=fotoagenda"
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
