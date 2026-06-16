# Kairos Admin 2.0 — Progress

## Status: Em Desenvolvimento Ativo

---

## ✅ Concluído

### Backend (API)
- [x] Migração SQLite → PostgreSQL (pg pool, async)
- [x] Módulo Chat IA (async, histórico por conversa)
- [x] Módulo Agenda (CRUD)
- [x] Módulo Memória (key-value)
- [x] Módulo Settings
- [x] Módulo Admin — Clientes, Apps, Licenças, Logs
- [x] Módulo Licenças — Trial, Ativo, Bloqueado, Expirado
- [x] Módulo Financeiro — Pagamentos, Receita
- [x] Módulo VPS — CPU, RAM, Disco, Uptime
- [x] Módulo Backup — JSON export automático
- [x] Telegram Bot (async)
- [x] Docker Compose com PostgreSQL healthcheck
- [x] Docker Compose de produção: Traefik + rede `kairos_network` + HTTP Basic Auth no painel/API
- [x] Fix contrato de licença: `/api/license/verify` agora retorna `active` (além de `valid`) — bug que fazia o bloqueio de licença nunca funcionar nos 5 apps satélites

### Frontend (Admin Dashboard)
- [x] Layout com Sidebar moderna (grupos: Admin / Ferramentas / Sistema)
- [x] TopBar com toggle dark/light
- [x] Dashboard — cards de métricas + atividade recente
- [x] Clientes — lista, busca, criar/editar/deletar
- [x] Aplicativos — catálogo, Lite/Pro, URL, versão
- [x] Licenças — filtro por status, trial rápido, toggle de status
- [x] Financeiro — receita mensal/total, histórico de pagamentos
- [x] VPS Monitoramento — gauges CPU/RAM/Disco + uptime
- [x] Chat IA — histórico de conversas + STT + TTS
- [x] Agenda — compromissos com status
- [x] IA & Modelos — API key, seleção de modelo, memória
- [x] Logs — tabela filtrável de auditoria
- [x] Configurações — sobre o sistema, atalhos rápidos
- [x] Tema escuro/claro persistido no localStorage
- [x] Mobile responsivo (sidebar toggle)

---

## 🔧 Pendências

### Curto Prazo
- [ ] Google OAuth (Login com Google)
- [ ] Renovação automática de licença por pagamento
- [ ] Notificações push (trial expirando)

### Médio Prazo
- [ ] Migrar FotoAgenda para PostgreSQL compartilhado
- [ ] Stripe/MercadoPago para pagamentos
- [ ] Relatórios exportáveis (CSV/PDF)

### Longo Prazo
- [ ] Multi-tenant no Kairos Core
- [ ] Webhooks por evento de licença
- [ ] Portal do cliente (self-service)

---

## Portas

| Serviço | Porta |
|---|---|
| Kairos Admin Frontend | 3008 |
| Kairos Core Backend | 3010 |
| PostgreSQL | 5432 |
| FotoAgenda Frontend | 3015 |
| FotoAgenda Backend | 8005 |
