# PROGRESS.md — kairos-sede-sorocaba

## Sessão 2026-06-20 — Conformidade LGPD + Cadastro Eclesiástico Completo

### Problema
App coleta CPF, endereço, telefone, e-mail, dados eclesiásticos de membros sem conformidade LGPD (Lei 13.709/2018). Sem política de privacidade, termo de consentimento, auditoria, canal do titular, controle granular de acesso. Cadastro eclesiástico limitado (sem familiares, saúde, formação, histórico de cargos, transferências, ministérios).

### O que foi feito

1. **PRD** em `docs/PRD_LGPD.md` com escopo completo, base legal, decisões técnicas, critérios de aceite.

2. **Backend — Modelos novos** (`backend/app/models.py`):
   - `ConsentimentoLGPD` — histórico de aceites por versão do termo
   - `AuditoriaLog` — log de acesso/criação/alteração/remoção em dados pessoais
   - `SolicitacaoLGPD` — canal do titular (Art. 18) sem auth
   - `TransferenciaMembro` — cartório eclesiástico de transferências
   - `HistoricoCargo` — cronológico de cargos por congregação
   - `MinisterioMembro` — participação em ministérios
   - `CursoFormacao` — formação teológica e secular
   - **Membro expandido**: +20 campos (email, naturalidade, profissao, escolaridade, nome_pai/mae, conjuge, data_casamento, num_filhos, tipo_sanguineo, alergias, necessidades_especiais, contato_emergencia_*, batismo_espirito_santo_em, data_entrada_congregacao, consagracao_*, formacao_teologica, + lgpd_aceite, lgpd_data_aceite, lgpd_ip, lgpd_user_agent, lgpd_versao_termo)
   - Novos perfis: `secretario`, `lider_ministerio` (em `PERFIS`)
   - `PERFIS_SENITIVE_ACCESS = ["sede", "pastor"]` — define quem vê CPF/RG/endereço

3. **Backend — Config** (`backend/app/core/config.py`):
   - `LGPD_VERSAO_TERMO`, `LGPD_DPO_EMAIL`, `LGPD_RETENCAO_MESES`, `LGPD_CONTROLADORA_*`

4. **Backend — Deps** (`backend/app/deps.py`):
   - `can_see_sensitive()` helper para checar perfil
   - `registrar_auditoria()` helper para criar log sem quebrar fluxo

5. **Backend — Service LGPD** (`backend/app/services/lgpd.py`):
   - `get_politica_privacidade_html()` — texto completo da política
   - `get_termos_uso_html()` — termos de uso
   - `get_consentimento_membro_html()` — termo de consentimento do membro
   - `registrar_aceite_membro()` — atualiza Membro + cria ConsentimentoLGPD
   - `precisa_reaceite()` — verifica se versão do termo mudou

6. **Backend — Routes** (`backend/app/routes/lgpd.py`):
   - `GET /api/lgpd/politica` (público, HTML)
   - `GET /api/lgpd/termos` (público, HTML)
   - `GET /api/lgpd/consentimento-membro` (público, HTML)
   - `POST /api/lgpd/solicitacao` (público, form do titular)
   - `GET /api/lgpd/solicitacoes` (sede)
   - `PATCH /api/lgpd/solicitacoes/:id` (sede — atendida/recusada)
   - `GET /api/lgpd/auditoria` (sede)
   - `GET /api/lgpd/consentimentos/:membro_id` (auth)

7. **Backend — Routes Membros** (`backend/app/routes/membros.py`) reescrito:
   - CRUD principal com 20+ novos campos
   - `lgpd_aceite` obrigatório no POST; reaceite exigido no PUT se versão mudou
   - Mascaramento por perfil (CPF/RG/email/endereço/nome_pai/mae/saúde → `***`)
   - Auditoria automática em POST/PUT/DELETE/GET individual
   - Sub-endpoints:
     - `GET/POST /membros/:id/transferencias`
     - `GET/POST /membros/:id/historico-cargos`
     - `GET/POST /membros/:id/ministerios`
     - `GET/POST /membros/:id/cursos`

8. **Backend — Auth** (`backend/app/routes/auth.py`):
   - Captura IP + User-Agent no callback Google
   - Cria `ConsentimentoLGPD` com `finalidade="login_sistema"` a cada login
   - Loga auditoria de login

9. **Backend — Main** (`backend/app/main.py`):
   - Inclui router `lgpd`
   - Versão bumped para `1.1.0`
   - `/api/health` retorna `lgpd_versao`
   - Módulo `lgpd` adicionado ao seed em `services/modules.py`

10. **Frontend — Auth store** (`src/stores/auth.js`):
    - `isSede`, `isPastor`, `isSecretario`, `isLiderMinisterio`
    - `canSeeSensitive()`, `canAdminLgpd()`

11. **Frontend — App.jsx**:
    - Rotas públicas: `/politica-de-privacidade`, `/termos-de-uso`, `/consentimento-lgpd`, `/solicitar-exclusao-de-dados`
    - Rotas admin: `/lgpd/solicitacoes`, `/lgpd/auditoria` (só sede)
    - Rota `/membros/:id` para FichaMembro

12. **Frontend — Layout** (`src/components/layout/Layout.jsx`):
    - Item "LGPD" no sidebar para sede, com ícone `ShieldCheck`

13. **Frontend — Páginas LGPD** (`src/pages/lgpd/`):
    - `PoliticaPrivacidade.jsx` — renderiza HTML do backend
    - `TermosUso.jsx` — renderiza HTML
    - `Consentimento.jsx` — exibe termo do membro
    - `SolicitarExclusao.jsx` — form do titular (5 tipos: acesso, retificação, exclusão, portabilidade, revogação)
    - `Solicitacoes.jsx` (admin) — listagem + atender com resposta
    - `Auditoria.jsx` (admin) — filtros por ação/recurso, tabela com IP/detalhes

14. **Frontend — FormMembro** (`src/pages/membros/FormMembro.jsx`) reescrito:
    - 6 seções: Dados Pessoais, Contato, Família, Saúde (LGPD Art. 11), Dados Eclesiásticos, Observações
    - Checkbox LGPD obrigatório com link para termo
    - Exibe aceite já registrado (data + versão) quando editando

15. **Frontend — FichaMembro** (`src/pages/membros/FichaMembro.jsx`) — novo:
    - Página de detalhe com 8 abas: Resumo, Dados Pessoais, Eclesiásticos, Histórico de Cargos, Transferências, Ministérios, Cursos, Consentimentos
    - Mascaramento adaptado por perfil
    - Formulários inline para adicionar sub-entidades
    - Histórico de consentimentos com IP e versão

16. **Frontend — Membros.jsx** atualizado:
    - Linha clicável abre ficha completa
    - Coluna CPF mascarada por perfil
    - Aviso amber para perfis sem acesso a dados sensíveis
    - Ícone ⚠ para membros sem aceite LGPD

17. **Frontend — utils.js** atualizado:
    - `formatarData(data, comHora)` com segundo parâmetro
    - `mascararCpf`, `mascararEmail` helpers

18. **requirements.txt**: adicionado `pydantic[email]==2.7.1` para `EmailStr`.

19. **`.env.example`**: adicionadas variáveis LGPD.

### Verificações

- ✅ `python -m py_compile` em todos os .py modificados — passou
- ✅ `vite build` — passou (458 kB bundle, 501 kB precache PWA)
- ✅ `eslint src/...` — 0 erros, 2 warnings pré-existentes (react-hooks/exhaustive-deps no App.jsx)
- ✅ `@babel/parser` em todos os 13 arquivos JSX/JS — 0 erros

### Pendências (Next Steps)

1. **Deploy** — `docker compose up -d --force-recreate --no-deps` no VPS após commit (Dokploy reseta .env em redeploys — workaround já conhecido)
2. **Configurar `.env` de produção**:
   - `LGPD_DPO_EMAIL=dpo@obpcsorocaba.com.br`
   - `LGPD_CONTROLADORA_CNPJ=...` (pegar com a contabilidade)
   - `LGPD_CONTROLADORA_ENDERECO=...`
   - `CORS_ORIGINS=https://sede.fbautomacao.space,...`
3. **Testar fluxo completo**:
   - Criar membro sem marcar LGPD → deve dar 400
   - Criar membro marcando LGPD → sucesso, registro em `consentimentos_lgpd`
   - Logar como secretario → CPF deve aparecer mascarado
   - Acessar `/politica-de-privacidade` sem login → deve renderizar
   - Submeter `/solicitar-exclusao-de-dados` → deve criar solicitação
   - Sede acessar `/lgpd/solicitacoes` → ver e atender solicitação
   - Sede acessar `/lgpd/auditoria` → ver logs
4. **Migrar membros existentes**: precisam de aceite LGPD (na próxima edição, será obrigatório reaceitar)
5. **Replicar para outros apps Kairos** (kairos-advocacia, kairos-politica, foto-agenda): o padrão LGPD é reutilizável — copiar `services/lgpd.py`, `routes/lgpd.py`, models, páginas frontend e adaptar.

### Decisões-chave registradas

- Mascaramento no serializer (Pydantic), não no banco — dado armazenado completo
- Auditoria em falha silenciosa — nunca quebra o fluxo principal
- Versão do termo hardcoded em config — bump manual a cada alteração legal
- Reaceite automático em PUT de membro quando `lgpd_versao_termo` difere
- Páginas públicas não usam Layout — layout próprio minimalista com header azul
- Sub-entidades (transferências, cargos, ministérios, cursos) como sub-rotas sob `/membros/:id/...`

### IDs e Credenciais (Sessão anterior — válidos)
- App sede-sorocaba: `a778a58e-bf55-4bb6-9328-37a33c38052e`
- Cliente fernando borges: `27f044ea-9490-433d-9c26-4317416853da`
- Licença trial: `44a8b2b2-b6aa-4dee-948f-f6737df9ecc3` (expira 2026-06-28)
- Empresa OBPC Sorocaba: `8559f7e3-722e-4d7f-9ed6-521f56bbe420`
- SUPER_ADMIN: `b4934637-7d22-4242-8a1f-f73c266f753f` (borgesjaf@gmail.com)
- Postgres user sede: `sede_sorocaba` / `SedeSorocaba2026!`
