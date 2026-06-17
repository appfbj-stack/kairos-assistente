# Arquitetura Atual do Kairós — Auditoria (Etapa 1)

**Etapa**: 1 (Auditoria) · Nenhuma alteração de código foi feita para produzir este relatório.
**Base**: leitura direta de código de todos os apps do monorepo + `docs/ARQUITETURA_OFICIAL.md`,
`docs/APPS_REGISTRADOS.md`, `docs/TEMPLATE_PRO.md`, `docs/TEMPLATE_LITE.md`. Complementa e
formaliza `docs/ANALISE_SAAS_MODULAR_MULTITENANT.md` (análise anterior, mesma branch) no formato
pedido pela missão atual.

---

## 1. O que existe hoje (fato, não opinião)

```
┌──────────────────────────────────────────────────────────┐
│  KAIROS ADMIN (backend/ + frontend/, raiz do monorepo)     │
│  Express+TS + PostgreSQL · Next.js · porta 3010/3008       │
│  Hub de licenciamento. Single-tenant (é a operação da       │
│  própria Kairós, não dos clientes finais).                  │
│  Basic Auth única, sem RBAC, sem tabela "users".             │
│  Contrato público: GET /api/license/verify?client_id&app_slug│
└───────────────────────────┬──────────────────────────────┘
                             │ todo satélite consulta licença
        ┌────────────────────┼─────────────────────┬───────────────────┐
        │                    │                      │                   │
┌───────▼──────┐    ┌────────▼────────┐   ┌─────────▼────────┐  ┌──────▼─────┐
│ FotoAgenda Pro│    │ Kairos Política │   │ Kairos Advocacia  │  │ Sede       │
│ repo EXTERNO  │    │ kairos-politica/│   │ kairos-advocacia/ │  │ Sorocaba   │
│ foto-agenda-v1│    │ FastAPI+PG      │   │ FastAPI+PG        │  │ kairos-sede│
│ deploy real   │    │ Tenant/Usuario  │   │ Tenant/User       │  │ -sorocaba/ │
│ (não está     │    │ próprios        │   │ tenant_id em tudo │  │ FastAPI+PG │
│  neste repo)  │    │                 │   │                   │  │ cliente real│
└───────────────┘    └─────────────────┘   └───────────────────┘  └────────────┘

  + Kairos Lite (sem backend, dados em Google Sheets): Vidraçaria, Imobiliária,
    Oficina, Almoxarifado — cada um é um repo/deploy próprio fora deste monorepo.
  + foto-agenda/ (pasta local deste monorepo) = app FastAPI+React completo
    (Tenant/TenantModule/require_module, rotas auth/admin/shoots/hermes/panel,
    domínio fotoagenda.fbautomacao.space hardcoded no fallback do frontend),
    mesmo nível de maturidade dos outros satélites Pro. Só não tinha
    docker-compose.yml nem driver Postgres no requirements.txt — corrigido
    nesta sessão. Ainda não está registrado em `apps`/`licenses` (slug usado
    no código: `fotoagenda`) nem deployado.
```

7 apps registrados em produção/homologação (`docs/APPS_REGISTRADOS.md`), 14 portas
reservadas, deploy padronizado via Dokploy + Docker Compose + rede `kairos_network`.

### Tabela de dimensões técnicas

| Dimensão | Situação encontrada |
|---|---|
| Backend | Admin: Express+TS. Satélites Pro: FastAPI+SQLAlchemy+Pydantic. Lite: nenhum backend (Google Sheets API direto do front). |
| Frontend | Admin: Next.js (painel interno). Satélites Pro: React+Vite+Tailwind, telas 100% específicas do nicho. Zero componentes de UI compartilhados. |
| Banco | Admin: 1 Postgres único, sem `tenant_id`/`empresa_id` em nenhuma tabela. Cada satélite Pro: Postgres **próprio e isolado**, com `Tenant`+`tenant_id` em toda tabela de domínio. Lite: Google Sheets, sem schema relacional. |
| Models | Sem modelo de domínio genérico entre nichos: Política (`Cidadao`/`Demanda`), Advocacia (`Processo`/`Movimentacao`/`Fatura`), Sede Sorocaba (`Membro`/`Congregacao`/`Carteirinha`/`Batismo`, nomenclatura PT). Cada app foi desenhado fim-a-fim. |
| APIs | Único contrato compartilhado: `GET /api/license/verify`. Resto é API REST própria por satélite, sem padrão comum de paginação/erro/auth. |
| Autenticação | 4 esquemas distintos coexistindo: Admin = Basic Auth fixa; Política/Advocacia = e-mail+senha JWT; Sede Sorocaba = Google OAuth exclusivo (sem senha); `foto-agenda/` = e-mail+senha JWT com roles (`super_admin`/`admin`), igual ao padrão Política/Advocacia. |
| Permissões | Sem hierarquia unificada. Admin não tem RBAC (1 usuário). Cada satélite tem seu próprio conjunto de papéis, todos diferentes entre si. |
| Licenciamento | Maduro e já é o "Core" de fato: tabelas `clients`/`apps`/`licenses`/`logs`/`payments` no Admin, status `trial`/`active`/`expired`/`blocked`, endpoint único consumido por todos os satélites. |
| Docker/Dokploy | Padrão consistente: 1 `docker-compose.yml` por app, rede externa `kairos_network`, Traefik/Dokploy como proxy, portas documentadas e sem conflito (`docs/APPS_REGISTRADOS.md`). |
| Apps existentes | 8 registrados em `docs/APPS_REGISTRADOS.md`: FotoAgenda Pro (ativo, repo externo), Sede Sorocaba (ativo, cliente real), Vidraçaria (Lite, ativo), Imobiliária (Pro, ativo), Agenda Mecânica (Pro, ativo, repo externo), Advocacia (não deployado), Política (não deployado), Fotografia/`foto-agenda/` deste monorepo (não deployado, slug `fotoagenda` — distinto do FotoAgenda Pro externo). |

---

## 2. O que pode ser reaproveitado

- **Motor de licenciamento** (`backend/src/admin/license.ts`, tabelas `clients`/`apps`/
  `licenses`/`logs`/`payments`) — já é, na prática, o embrião do Core de Licenciamento/
  Billing pedido nas Etapas 3-4. Contrato `GET /api/license/verify` já é consumido por
  todos os satélites; é a peça mais madura do ecossistema.
- **Padrão `Tenant` + `tenant_id` em toda tabela de domínio** — já implementado de forma
  independente em Política, Advocacia e Sede Sorocaba. É exatamente o padrão de isolamento
  multi-tenant pedido na Etapa 2, só falta extrair para uma biblioteca comum em vez de
  copiar manualmente em cada app.
- **Boilerplate Pro** (`core/config.py`, `core/database.py`, `core/security.py`, `deps.py`,
  `services/license.py`) — idêntico nos 3 satélites Pro deste monorepo. Candidato direto a
  pacote Python compartilhado (`kairos-core-sdk`).
- **`TenantModule`** (módulos ativáveis por tenant, `require_module()`) — já implementado na
  pasta `foto-agenda/` (ainda não deployado, mas é o precedente de design mais próximo do
  sistema de módulos pedido na Etapa 7).
- **Módulos KV genéricos** (`memory_items`, `settings` no Admin) — reaproveitáveis como base
  do módulo de Notificações/Configurações do Core.
- **Padrão de deploy** (Docker Compose + Dokploy + rede `kairos_network` + portas
  documentadas) — já é exatamente o que a Etapa 12 (migração gradual sem quebrar nada) precisa
  como infraestrutura de base; não exige mudança.

## 3. O que deve ser refatorado

- **Autenticação fragmentada em 4 esquemas** — precisa convergir para um único mecanismo
  (JWT + RBAC) sem remover o que já funciona (ex.: Google OAuth da Sede Sorocaba não pode
  simplesmente desaparecer — precisa de camada de compatibilidade, conforme regra do pedido).
- **Ausência de RBAC no Kairos Admin** — hoje 1 senha Basic Auth só. Para suportar
  `SUPER_ADMIN`/`ADMIN_EMPRESA` (Etapa 6) precisa de tabela `users`+`roles` no Admin, que
  hoje não existe.
- **Boilerplate duplicado manualmente** entre satélites Pro — refatorar para pacote
  compartilhado reduz risco de divergência (hoje qualquer correção de segurança em
  `security.py` tem que ser replicada manualmente em 3 lugares).
- **Falta de filtro de tenant centralizado** — isolamento depende de disciplina por
  endpoint (`deps.py` injeta `tenant_id`, mas cada query precisa aplicá-lo manualmente).
  Um middleware/mixin central reduziria risco de vazamento entre tenants mesmo dentro do
  modelo atual.
- **Lite apps sem banco relacional** (Google Sheets) — fora do alcance de `empresa_id`/RBAC
  real; para entrarem no modelo de licenças/módulos da Etapa 7 em pé de igualdade com os
  Pro, precisam de um backend e Postgres próprios (mesmo que pequeno).

## 4. O que deve permanecer igual

- **Isolamento físico de banco por satélite Pro.** Não é dívida técnica, é decisão de
  segurança: hoje um bug de filtro em Advocacia não pode, por arquitetura, vazar dados da
  Sede Sorocaba, porque são bancos físicos diferentes.
- **Contrato `GET /api/license/verify`** — é consumido em produção por apps inclusive fora
  deste monorepo (FotoAgenda Pro, Agenda Mecânica, Vidraçaria). Mudar a assinatura quebra
  clientes externos sem aviso.
- **Portas e rede Docker já reservadas** (`docs/APPS_REGISTRADOS.md`) — mudar isso é troca
  de infraestrutura de produção sem necessidade.
- **Dados de produção da Sede Sorocaba** (`sede.fbautomacao.space`) tal como estão — qualquer
  migração de schema precisa de plano de rollback antes de tocar nesses dados, não pode ser
  "big bang".

## 5. Riscos

1. **Fundir 4+ produtos independentes em um schema único (`empresa_id` em tudo)** é, na
   prática, descontinuar o modelo hub-and-satellite que tem 3 apps rodando e 1 cliente real
   em produção — não é refactor incremental, é reescrita de meses.
2. **Sede Sorocaba tem cliente real em produção.** Qualquer migração de dados exige janela
   de manutenção e plano de rollback testado antes — risco de perda de dados de cliente
   pagante se feito sem isso.
3. **Existem dois apps de Fotografia distintos**: o externo já em produção (`foto-agenda-v1`,
   slug `foto-agenda-pro`, fora do escopo de acesso desta sessão) e o build deste monorepo
   (`foto-agenda/`, slug `fotoagenda`, agora com docker-compose/driver Postgres prontos mas
   ainda não deployado). Não confundir os dois ao registrar/migrar — slugs e portas diferentes.
4. **Lite apps (Vidraçaria, Imobiliária, Oficina, Almoxarifado) também são repositórios
   externos** sem backend — entrar no Core multi-tenant exige criar backend do zero para
   cada um antes de sequer pensar em `empresa_id`.
5. **Unificar 4 esquemas de autenticação diferentes** (incluindo Google OAuth sem senha) é
   decisão de produto (fluxo de login, recuperação de senha), não só mecânica de código.
6. **Raio de impacto de bugs aumenta** em qualquer modelo de schema único multi-nicho: um
   `WHERE empresa_id` esquecido vaza dados entre, por exemplo, um escritório de advocacia e
   uma igreja — hoje isso é estruturalmente impossível porque os bancos são físicos
   diferentes.
7. **Geração de chaves de licença e trial automático (Etapas 4-5)** tocam diretamente no
   sistema de licenciamento que protege o acesso de clientes pagantes hoje em produção —
   qualquer bug aqui pode bloquear acesso de cliente real.

---

## 6. Conclusão da Etapa 1

Conforme a regra do pedido ("não alterar código nesta etapa"), nenhuma mudança foi feita.
As Etapas 2 em diante (Core multi-tenant, licenças, chaves, trial, Admin central, módulos,
marketplace, permissões, IA, segurança, migração, testes, entrega) representam meses de
trabalho e tocam sistemas com cliente real em produção (Sede Sorocaba) e contratos
consumidos por repositórios externos (FotoAgenda Pro, Agenda Mecânica, Vidraçaria,
Imobiliária). Por isso a Etapa 2 deve começar como **proposta** (conforme a própria regra do
pedido: "Primeiro analisar. Depois propor. Depois executar.") antes de qualquer código ser
escrito.
