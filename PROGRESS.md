# Projeto: Kairos Core 1.0

## Status
**Sessão**: 15/06/2026 — **Arquitetura completa com FotoAgenda**
**Stack**: Next.js 15 (PWA) + Express + SQLite + OpenRouter + FastAPI + React + Vite + Nginx

## Arquitetura do Ecossistema Kairos

```
kairos-core/                    # Projeto central
├── backend/                    # API principal (porta 3010)
│   ├── src/
│   │   ├── main.ts             # Servidor Express
│   │   ├── database/           # SQLite + Migrações + Backup
│   │   ├── admin/              # Admin API (clientes, apps, licenças, backup)
│   │   ├── chat/               # Conversas + LLM OpenRouter
│   │   ├── agenda/             # Compromissos
│   │   ├── memory/             # Memória chave-valor
│   │   ├── settings/           # Configurações
│   │   └── llm/                # LLM (GPT-OSS 120B free)
│   └── data/kairos.db          # SQLite persistente
│
├── frontend/                   # PWA Next.js (porta 3008)
│   ├── src/app/
│   │   ├── page.tsx            # Chat + Agenda + Config + Admin (abas)
│   │   └── layout.tsx          # PWA manifest + Service Worker
│   └── public/
│       ├── icons/              # 192x192, 512x512
│       ├── manifest.json
│       └── sw.js
│
├── foto-agenda/                # App FotoAgenda Pro
│   ├── backend/                # FastAPI (porta 8005)
│   │   └── app/                # SQLite + JWT + Licenciamento Kairos
│   └── frontend/               # React + Vite + Nginx (porta 3015)
│       ├── components/         # UI Components
│       ├── services/           # API + Storage
│       └── public/             # PWA icons + manifest
│
└── docker-compose.yml
```

## Serviços Rodando na VPS (187.77.229.227)

| Serviço | Porta | Acesso |
|---------|-------|--------|
| Kairos API (Admin) | 3010 | `http://187.77.229.227:3010/api/health` |
| Kairos Frontend | 3008 | `http://187.77.229.227:3008` |
| FotoAgenda API | 8005 | `http://187.77.229.227:8005/health` |
| FotoAgenda Frontend | 3015 | `http://187.77.229.227:3015` |

## Domínios (Caddy)

| Domínio | Proxy | Status |
|---------|-------|--------|
| `kairoassistente.fbautomacao.space` | → 127.0.0.1:3008 | ✅ HTTPS |
| `fotoagenda.fbautomacao.space` | → 127.0.0.1:3015 | ✅ Caddy configurado |
| Outros | vidro, imobiliaria, oficina, etc | Existentes |

## Apps Registrados no Admin

| App | Slug | ID |
|-----|------|----|
| Kairos Assistente | kairos-assistente | ✅ |
| Oficina | oficina | ✅ |
| Vidraçaria | vidracaria | ✅ |
| Imobiliária | imobiliaria | ✅ |
| Igreja | igreja | ✅ |
| FotoAgenda Pro | fotoagenda | ✅ |

## Licenciamento

| Cliente | App | Status | Validade |
|---------|-----|--------|----------|
| Oficina Teste | Kairos Assistente | Trial → Ativo | 10 dias |
| FotoStudio Teste | FotoAgenda | Trial | 10 dias |

- **Trial automático**: 10 dias ao cadastrar
- **Ativação**: via admin (Teste / Ativo / Bloqueado)
- **Verificação**: app consulta `/api/license/verify` no startup

## Kairos Admin (aba no chat 🛡️)

- Dashboard com stats (clientes, licenças ativas/trial/expiradas)
- Cadastro de clientes (categorias: Oficina, Imobiliária, Vidraçaria, Igreja, Kairos Assistente, Clínica, Outros)
- Gerenciamento de apps
- Licenças com status toggle: Teste | 🟢 Ativo | 🔴 Bloqueado
- Logs de ações
- Backup automático a cada 6h (30 backups retidos)

## LLM

- **Modelo**: GPT-OSS 120B (free) via OpenRouter
- **Contexto**: entende dados do Admin (clientes, licenças, apps)
- **TTS**: resposta falada automaticamente
- **STT**: microfone envia automaticamente

## YouTube Auto Upload

**Projeto separado**: `C:\Users\ferna\Videos\YouTube\`

| Conta | Horários | Status |
|-------|----------|--------|
| fernandojaborges@gmail.com | 08:00, 12:00, 18:00 | ✅ Ativo |
| secretariaobpc33@gmail.com | 08:30, 12:30, 18:30 | ✅ Ativo (descrição OBPC) |

## Pendências / Próximos Passos

- [ ] Configurar DNS para `fotoagenda.fbautomacao.space`
- [ ] Migrar apps existentes (Oficina, Imobiliária, Vidraçaria, Igreja) para arquitetura única
- [ ] Google Sheets como camada de relatórios
- [ ] Frontend Kairos Admin completo (painel web dedicado)
- [ ] Sistema de pagamentos
