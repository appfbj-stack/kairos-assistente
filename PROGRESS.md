# Projeto: Kairos Core 1.0

## Status
**Sessão**: 15/06/2026 — **Kairos Admin Arquitetura**
**Stack**: Next.js 15 (PWA) + Express + SQLite (sql.js) + OpenRouter LLM

## Arquitetura
```
kairos-core/                # Backend central (Kairos Admin)
├── backend/
│   ├── src/
│   │   ├── main.ts         # Servidor Express (porta 3010)
│   │   ├── database/
│   │   │   ├── database.ts # SQLite (sql.js) com persistência
│   │   │   └── migrations.ts # Migrações automáticas do banco
│   │   ├── admin/
│   │   │   ├── admin.ts    # CRUD clientes, apps, logs, stats
│   │   │   └── license.ts  # Licenciamento (trial 10d, ativação, verificação)
│   │   ├── chat/           # Conversas + LLM via OpenRouter
│   │   ├── agenda/         # Compromissos CRUD
│   │   ├── memory/         # Memória chave-valor
│   │   ├── settings/       # Configurações
│   │   └── llm/            # Integração OpenRouter
│   └── data/kairos.db      # SQLite persistente
├── frontend/               # PWA Next.js
├── docker-compose.yml
└── PROGRESS.md
```

## API Endpoints
### Chat
- `GET /api/chat/conversations` - Listar conversas
- `POST /api/chat/send` - Enviar mensagem
- `GET /api/chat/conversations/:id` - Ver conversa

### Administração (Kairos Admin)
- `GET /api/admin/clients` - Listar clientes
- `POST /api/admin/clients` - Criar cliente
- `GET /api/admin/apps` - Listar apps
- `POST /api/admin/apps` - Cadastrar app
- `GET /api/admin/logs` - Visualizar logs
- `GET /api/admin/stats` - Dashboard (totais)

### Licenciamento
- `POST /api/license/create-trial` - Criar trial (10 dias)
- `GET /api/license/verify` - Verificar licença
- `POST /api/license/activate` - Ativar licença (pós-pagamento)
- `GET /api/license/list` - Listar licenças
- `POST /api/license/check-expired` - Verificar expiradas

## Modelos de Dados
### clientes
id, name, company, phone, email, category, status, created_at, updated_at

### licenses
id, client_id, app_id, status (trial/active/expired/blocked), type (temporary/permanent), start_date, end_date

### apps
id, name, slug, description, created_at

### logs
id, client_id, app_id, action, details, ip, created_at

### payments
id, client_id, license_id, amount, method, status (pending/confirmed/cancelled)

## Licenciamento
- Trial automático de **10 dias** ao cadastrar cliente
- Ao expirar: status = "expired", exibe mensagem de bloqueio
- Após pagamento: status = "active", type = "permanent"
- Todo app consulta `/api/license/verify` ao iniciar
│   │   ├── memory/        # Memória chave-valor
│   │   ├── settings/      # Configurações
│   │   └── llm/           # Integração OpenRouter
│   └── data/kairos.db
├── frontend/              # Next.js PWA
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   ├── sw.js          # Service Worker
│   │   └── icons/         # 192x192, 512x512
│   └── src/
│       ├── app/page.tsx   # Chat + Agenda + Config
│       ├── hooks/         # Speech-to-Text, Text-to-Speech
│       └── services/api.ts
```

## Funcionalidades Implementadas
- [x] Chat com IA (OpenRouter - Llama 3.3 70B free)
- [x] Conversação por voz (Web Speech API: STT + TTS)
- [x] Agenda de compromissos
- [x] Memória persistente (chave-valor)
- [x] Configurações (chave OpenRouter)
- [x] Múltiplas conversas
- [x] PWA (manifest, service worker, ícones)
- [x] SQLite persistente
- [x] Interface mobile-first

## Preparado para Expansões Futuras
Estrutura de pastas e módulos preparados para:
- WhatsApp
- Google Sheets / Gmail / Calendar
- YouTube
- MCP Servers
- Skills
- CRM
- Automações

## Como Rodar
```bash
# Backend
cd backend
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
npx tsx src/main.ts

# Frontend
cd frontend
npx next dev
```

## Próximos Passos
- [ ] Configurar variável de ambiente OPENROUTER_API_KEY
- [ ] Colocar em produção (VPS ou celular)
- [ ] Testar PWA no celular
