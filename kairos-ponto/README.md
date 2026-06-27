# Kairos Ponto

Módulo SaaS **multiempresa** de controle de jornada de trabalho do ecossistema
**Kairos 2.0**. App **separado**, com **banco de dados PostgreSQL próprio** —
integra-se ao Kairos Admin apenas via a API de licenciamento centralizada.

- **Backend:** Node.js + TypeScript + Express + PostgreSQL (porta `8040`)
- **Frontend:** Next.js 15 + React 19 + TailwindCSS (porta `3060`)
- **Mobile:** React Native + Expo (ver [`mobile/README.md`](mobile/README.md))

## Como rodar

### Com Docker (recomendado)
```bash
cp backend/.env.example backend/.env   # ajuste segredos
docker compose up --build
# Frontend: http://localhost:3060   |   API: http://localhost:8040/api
```
> Em dev, sem o Kairos Admin na rede, defina `LICENSE_FAIL_OPEN=true` (padrão).
> A rede externa `kairos_network` é opcional localmente — remova-a do
> `docker-compose.yml` se não estiver rodando o Kairos Admin junto.

### Manual
```bash
# Backend
cd backend && npm install && npm run dev
# Frontend (outro terminal)
cd frontend && npm install && npm run dev
```

Primeiro acesso: o `SUPER_ADMIN` é criado a partir de `SUPER_ADMIN_EMAIL` /
`SUPER_ADMIN_PASSWORD` (padrão `admin@kairosponto.com` / `admin123`).

## Fluxo de uso
1. `SUPER_ADMIN` cria a **empresa** (`/empresas`) e seu `ADMIN_EMPRESA` (`/users`).
2. `ADMIN_EMPRESA` configura **geofence/validações** (`/configuracoes`), cria
   **escalas** (`/escalas`) e **funcionários** (`/funcionarios`, marcando
   "criar acesso" para gerar o login do colaborador).
3. **Funcionário** loga e **bate ponto** em `/ponto` (GPS + selfie) — ou pelo app
   mobile, que usa a mesma API.
4. Gestores acompanham `/dashboard`, tratam `/solicitacoes`, geram `/relatorios`,
   consultam `/auditoria` e usam a `/ia` (IA Kairos).

## Mapa PRD → implementação

| PRD | Onde |
|---|---|
| 3. Backend Node/TS/PostgreSQL | `backend/` |
| 4. Multiempresa (isolamento) | `core/auth.ts` (`scopeEmpresaId`), `empresa_id` em todas as tabelas |
| 5. Perfis de usuário | `core/types.ts`, `core/auth.ts` (`requireRole`) |
| 6. Cadastro de funcionários | `funcionarios/funcionarios.ts`, `/funcionarios` |
| 7. Registro de ponto | `ponto/registros.ts`, `/ponto` |
| 8. Reconhecimento facial | `ponto/face.ts` (provider plugável) |
| 9. Geolocalização / geofence | `ponto/geo.ts` (Haversine), `/configuracoes` |
| 10. Escalas (5x2/6x1/12x36/custom) | `escalas/escalas.ts` |
| 11. Banco de horas | `bancohoras/` (`apuracao.ts`, `bancohoras.ts`) |
| 12. Horas extras | `bancohoras/apuracao.ts`, `feriados/` |
| 13. Solicitações (fluxo de aprovação) | `solicitacoes/solicitacoes.ts` |
| 14. Dashboard | `dashboard/dashboard.ts`, `/dashboard` |
| 15. Relatórios + export | `relatorios/relatorios.ts` (`/espelho`, `/espelho.csv`, `/frequencia`) |
| 16. Auditoria | `core/audit.ts`, `auditoria/auditoria.ts` |
| 17. Notificações | `notificacoes/notificacoes.ts` |
| 18. IA Kairos | `ia/ia.ts`, `llm/llm.ts` |
| 19. Segurança (JWT, rate limit, logs) | `core/auth.ts`, `core/rateLimit.ts`, `core/audit.ts` |
| 21. Padrão Kairos 2.0 | licença centralizada `core/license.ts` |

## Integração com o Kairos Admin (licenciamento)
Cada empresa guarda `kairos_client_id`. O backend verifica a licença no hub via
`GET {KAIROS_ADMIN_URL}/api/license/verify?client_id=...&app_slug=kairos-ponto`
(`core/license.ts`). Registre o app no Kairos Admin com o slug **`kairos-ponto`**.

## Reconhecimento facial
O provider padrão (`FACE_PROVIDER=none`) **armazena a selfie e marca o registro
como pendente de revisão manual** — não finge uma verificação que não existe.
Para verificação automática 1:1, configure `FACE_PROVIDER=rekognition` e
implemente a integração em `ponto/face.ts` (ponto de extensão já preparado).

## Notas
- Export de relatório em **CSV/Excel** está pronto; **PDF** pode ser feito via
  "Imprimir → Salvar como PDF" a partir do espelho na tela (próxima iteração:
  geração server-side).
- Notificações in-app prontas; **e-mail/WhatsApp** são integrações futuras (PRD 17/20).
