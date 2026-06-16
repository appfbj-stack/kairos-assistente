# Prompts Oficiais do Ecossistema Kairos

Estes prompts são a referência para análise, adequação e criação de apps no ecossistema Kairos.

---

## PROMPT 1 — Auditoria de App Existente

Use este prompt para analisar qualquer app e entender o que precisa mudar para entrar no ecossistema Kairos.

```
AUDITORIA KAIROS

Analise completamente este repositório e gere um relatório de auditoria para integração ao ecossistema Kairos.

CONTEXTO:
O ecossistema Kairos tem dois tipos de app:
- Kairos Lite: apps simples, banco = Google Sheets, sem backend próprio
- Kairos Pro: apps robustos, banco = PostgreSQL, backend próprio (FastAPI ou Express)

Todos os apps verificam licença via:
GET {KAIROS_ADMIN_URL}/api/license/verify?client_id={UUID}&app_slug={slug}

ANALISE:

1. STACK ATUAL
   - Linguagens e frameworks usados
   - Banco de dados atual
   - Sistema de autenticação
   - Estrutura de pastas
   - Docker/deploy atual

2. CLASSIFICAÇÃO
   - Este app é Lite ou Pro? Justifique.
   - Se Lite: pode migrar para Google Sheets?
   - Se Pro: tem backend próprio? Tem PostgreSQL?

3. O QUE REAPROVEITAR
   - Componentes de UI
   - Lógica de negócio
   - APIs existentes
   - Docker/deploy

4. O QUE CRIAR
   - LicenseGate (verificação de licença Kairos)
   - Integração com Google Sheets (se Lite)
   - Autenticação JWT + verificação de licença (se Pro)
   - Variáveis de ambiente padronizadas

5. O QUE REMOVER
   - Auth próprio que não segue o padrão Kairos
   - Banco incompatível
   - Código morto ou duplicado

6. RELATÓRIO FINAL
   - Tipo: Lite ou Pro
   - Horas estimadas de adequação
   - Riscos
   - Passos ordenados de migração
```

---

## PROMPT 2 — Adequação ao Template Kairos

Use este prompt após a auditoria para transformar um app existente no padrão Kairos.

```
ADEQUAÇÃO KAIROS

Você analisou este repositório anteriormente. Agora execute a adequação ao padrão Kairos {LITE ou PRO}.

REGRAS OBRIGATÓRIAS:
1. NÃO reescrever do zero — reaproveitar tudo que funciona
2. NÃO remover funcionalidades existentes sem justificativa
3. MANTER compatibilidade com o deploy atual (Docker, VPS)
4. SEGUIR o Template Kairos {Lite/Pro} documentado em TEMPLATE_{LITE/PRO}.md

EXECUTAR:

PASSO 1 — LICENCIAMENTO
- Implementar verificação de licença via Kairos Admin
- Adicionar LicenseGate (Lite) ou check no login (Pro)
- Variáveis: VITE_KAIROS_ADMIN_URL, VITE_APP_SLUG (Lite)
             ou KAIROS_ADMIN_URL, KAIROS_CLIENT_ID (Pro)

PASSO 2 — BANCO DE DADOS {APENAS SE NECESSÁRIO}
- Lite: migrar para Google Sheets (ou criar camada de abstração)
- Pro: garantir PostgreSQL + estrutura tenant/user padrão

PASSO 3 — AUTENTICAÇÃO {APENAS PRO}
- JWT com estrutura padrão Kairos
- Verificação de licença no endpoint de login
- Roles: admin, viewer

PASSO 4 — VARIÁVEIS DE AMBIENTE
- Criar .env.example com todas as variáveis documentadas
- Variáveis obrigatórias Kairos + variáveis específicas do app

PASSO 5 — DOCKER
- Garantir docker-compose.yml com network kairos_network
- Backend na faixa de portas 8010-8090
- Frontend na faixa de portas 3020-3090

PASSO 6 — DOCUMENTAÇÃO
- README.md com: stack, variáveis, como rodar
- Registrar slug do app no Kairos Admin (docs/APPS_REGISTRADOS.md)

ENTREGAR:
- Código modificado com commits descritivos
- Lista do que foi reaproveitado vs. criado
- Instruções de deploy no VPS Kairos
```

---

## PROMPT 3 — Criação de Novo App Kairos

Use este prompt para criar um app novo do zero seguindo o padrão Kairos.

```
NOVO APP KAIROS

Crie um novo aplicativo Kairos seguindo a arquitetura oficial do ecossistema.

DADOS DO APP:
- Nome: {NOME DO APP}
- Slug: {slug-do-app}  (será registrado no Kairos Admin)
- Tipo: {LITE ou PRO}
- Domínio: {ex: gestão de membros de igreja, controle de vidraçaria}
- Clientes-alvo: {ex: igrejas evangélicas de médio porte}

ENTIDADES PRINCIPAIS:
{Listar as entidades de negócio — ex: Membro, Célula, Evento, Oferta}

FUNCIONALIDADES:
{Listar as telas/módulos — ex: Cadastro de membros, Agenda de células, Relatório financeiro}

INSTRUÇÕES:

1. USE O TEMPLATE KAIROS {LITE/PRO} como base
   (documentado em docs/TEMPLATE_{LITE/PRO}.md)

2. ESTRUTURA DE PASTAS
   - Seguir exatamente o template
   - Adaptar apenas o necessário para o domínio

3. BANCO DE DADOS
   - Lite: criar estrutura da planilha Google Sheets
   - Pro: criar models.py com todas as entidades

4. ROTAS/TELAS
   - Criar CRUD completo para cada entidade
   - Dashboard com métricas principais
   - Tela de configurações

5. LICENCIAMENTO
   - Implementar LicenseGate (Lite) ou check no login (Pro)
   - APP_SLUG = {slug-do-app}

6. DESIGN
   - Tailwind CSS obrigatório
   - Paleta Kairos: primary #5c7cfa, dark #4c6ef5
   - Mobile-first, PWA-ready
   - Dark mode: darkMode: "class"

7. DOCKER
   - docker-compose.yml com portas livres
   - Network kairos_network
   - .env.example completo

8. DOCUMENTAÇÃO
   - README.md completo
   - Instruções de como registrar no Kairos Admin

ENTREGAR:
- Repositório completo funcional
- Instruções de deploy
- Como criar a primeira licença trial no Kairos Admin
```

---

## PROMPT 4 — Registro no Kairos Admin

Use este prompt sempre que um novo app for criado, para documentar o registro.

```
REGISTRO NO KAIROS ADMIN

Registre este app no Kairos Admin 2.0 e documente.

APP:
- Nome: {NOME}
- Slug: {slug}
- URL: {url do app em produção}
- Versão: 1.0.0
- Plano: {Lite ou Pro}
- Descrição: {breve descrição}

EXECUTAR:
1. Acessar o Kairos Admin em /aplicativos
2. Criar novo app com os dados acima
3. Anotar o ID gerado
4. Criar cliente de teste
5. Criar trial de 10 dias para o cliente de teste
6. Testar verificação: GET /api/license/verify?client_id={ID}&app_slug={slug}
7. Documentar em docs/APPS_REGISTRADOS.md
```

---

## PROMPT 5 — Análise de Saúde do Ecossistema

Use periodicamente para auditar o estado geral do ecossistema.

```
AUDITORIA DO ECOSSISTEMA KAIROS

Analise o estado atual de todos os apps do ecossistema Kairos.

VERIFICAR PARA CADA APP:
1. Está usando a versão correta do template?
2. Verifica licença via Kairos Admin?
3. Tem .env.example atualizado?
4. Tem docker-compose.yml com kairos_network?
5. README.md está completo?
6. Está registrado no Kairos Admin (/aplicativos)?

VERIFICAR O KAIROS ADMIN:
1. Todos os apps estão cadastrados?
2. Todas as licenças estão com status correto?
3. PostgreSQL está saudável?
4. Backup automático está funcionando?
5. VPS está com recursos suficientes?

GERAR RELATÓRIO:
- Status de cada app (conforme / não-conforme)
- Pendências críticas
- Recomendações de melhoria
```
