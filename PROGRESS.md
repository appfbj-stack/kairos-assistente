# Projeto: Kairos Core 1.0

## Status
**Sessão**: Inicial (14/06/2026) — **MVP CRIADO**
**Stack**: Next.js 15 (PWA) + Express + SQLite (sql.js) + OpenRouter LLM

## Arquitetura
```
kairos-core/
├── backend/               # API Express + SQLite
│   ├── src/
│   │   ├── main.ts        # Servidor Express (porta 3001)
│   │   ├── database/      # SQLite (sql.js) com WAL
│   │   ├── chat/          # Conversas + LLM via OpenRouter
│   │   ├── agenda/        # Compromissos CRUD
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
