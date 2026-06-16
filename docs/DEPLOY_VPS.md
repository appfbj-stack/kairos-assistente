# Deploy do Ecossistema Kairos na VPS (Dokploy)

Guia de referência para subir o **Kairos Admin** e os apps satélites já adequados
(`foto-agenda-v1`, `sede-sorocaba`, `vidra-aria-top`, `imobiliaria-inteligente`,
`agenda-mecanica`) na VPS via Dokploy + Traefik.

> Os valores reais de senha/segredo gerados para esta VPS **não ficam neste
> arquivo** (evita vazar segredo no histórico do git). Eles foram entregues
> diretamente no chat da sessão que preparou o deploy — copie de lá para o
> Dokploy.

---

## 0. Pré-requisitos (uma vez por VPS)

1. **Rede compartilhada do Traefik**: todos os apps do ecossistema (Admin +
   satélites) precisam estar na mesma rede Docker externa para o Traefik
   enxergar os containers e rotear por domínio:
   ```bash
   docker network create kairos_network
   ```
   Se a rede já existir (`docker network ls`), não faça nada.

2. **DNS** — crie um registro `A` para cada domínio abaixo apontando para o
   IP da VPS:

   | Domínio | App |
   |---|---|
   | `admin.fbautomacao.space` | Kairos Admin (UI + API) |
   | `fotografia.fbautomacao.space` | FotoAgenda Pro (frontend) |
   | `api.fotografia.fbautomacao.space` | FotoAgenda Pro (backend) |
   | `sede.fbautomacao.space` | Sede Sorocaba (frontend) |
   | `api.sede.fbautomacao.space` | Sede Sorocaba (backend) |
   | `vidracaria.fbautomacao.space` | Orçamentos Vidraçaria (Lite) |
   | `imobiliaria.fbautomacao.space` | Imobiliária Inteligente |
   | `mecanica.fbautomacao.space` | Agenda Mecânica Pro (frontend) |
   | `api.mecanica.fbautomacao.space` | Agenda Mecânica Pro (backend) |

3. Confirme que o Traefik do Dokploy tem o `certresolver=letsencrypt`
   configurado (padrão do Dokploy) — todos os `docker-compose.yml` do
   ecossistema já assumem esse resolver.

---

## 1. Deploy do Kairos Admin (primeiro, sempre)

O Admin precisa estar no ar **antes** dos apps satélites, porque cada um
depende de um `KAIROS_CLIENT_ID` gerado no painel dele.

1. No Dokploy: **Novo Projeto → Docker Compose** apontando para o repositório
   `kairos-assistente` (branch de deploy).
2. Cole na aba **Environment** as variáveis (nomes abaixo — valores reais
   foram entregues no chat):

   ```env
   ADMIN_DOMAIN=admin.fbautomacao.space
   POSTGRES_PASSWORD=<gerado>
   OPENROUTER_API_KEY=<sua chave OpenRouter>
   TELEGRAM_BOT_TOKEN=<seu token do bot, opcional>
   TRAEFIK_AUTH_USERS=<usuario>:<hash-apr1-com-$$-duplicado>
   ```

   > **Importante sobre `TRAEFIK_AUTH_USERS`**: o valor é um hash `htpasswd`
   > (formato `usuario:$apr1$salt$hash`). Como o Dokploy injeta isso como
   > variável de ambiente que o Docker Compose substitui dentro de um
   > `label`, **todo caractere `$` precisa estar duplicado (`$$`)**, senão o
   > Compose tenta interpretar pedaços do hash como variáveis e quebra a
   > senha. Use o valor já formatado que foi gerado para você.

3. Deploy. O backend aplica as migrações automaticamente no boot
   (`runMigrations()`), e o frontend builda com `NEXT_PUBLIC_API_URL`
   apontando para `https://admin.fbautomacao.space/api` (mesma domínio,
   Traefik separa por path).

4. **Proteção de acesso**: como o painel administrativo (clientes, licenças,
   financeiro) hoje **não tem login próprio** (OAuth ficou para depois,
   por decisão consciente desta rodada), o domínio inteiro
   (`admin.fbautomacao.space`) e toda a API exceto `/api/license/verify`
   ficam atrás de **HTTP Basic Auth no Traefik**. Sem isso, qualquer pessoa
   na internet veria seus clientes e licenças. `/api/license/verify` fica
   público de propósito — é o endpoint que os apps satélites consultam sem
   credencial.

5. Teste:
   ```bash
   # Deve pedir usuário/senha (painel protegido)
   curl -I https://admin.fbautomacao.space

   # Deve responder sem senha (endpoint público de licença)
   curl "https://admin.fbautomacao.space/api/license/verify?client_id=teste&app_slug=teste"
   ```

---

## 2. Registrar cada app satélite no Kairos Admin

Para cada app (FotoAgenda, Sede Sorocaba, Vidraçaria, Imobiliária, Agenda
Mecânica):

1. No painel **Aplicativos** → cadastrar nome, `slug` (igual ao `APP_SLUG`/
   `VITE_APP_SLUG` do app), URL pública, versão, plano (Lite/Pro).
2. No painel **Clientes** → cadastrar o cliente (igreja, vidraçaria, etc.).
3. **Licenças** → criar trial de 10 dias (ou ativa direto) vinculando
   cliente + app.
4. Copiar o `client_id` (UUID do cliente) — esse é o valor de
   `KAIROS_CLIENT_ID` / `VITE_KAIROS_CLIENT_ID` do app correspondente.

---

## 3. Deploy de cada app satélite

Todos seguem o mesmo padrão: projeto Docker Compose no Dokploy apontando
para o repositório do app, variáveis coladas na aba Environment, rede
`kairos_network` (já existe do passo 0).

### FotoAgenda Pro (`foto-agenda-v1`)
```env
POSTGRES_PASSWORD=<gerado>
SECRET_KEY=<gerado>
HERMES_API_URL=
HERMES_EMAIL=
HERMES_PASSWORD=
KAIROS_ADMIN_URL=https://admin.fbautomacao.space
KAIROS_CLIENT_ID=<copiado do passo 2>
ADMIN_EMAIL=admin@fotoagenda.com
ADMIN_PASSWORD=<defina uma senha forte>
```
> O `docker-compose.yml` deste app só tem rota Traefik para o **backend**
> (`api.fotografia.fbautomacao.space`). Adicione um serviço/rota de frontend
> com `Host(\`fotografia.fbautomacao.space\`)` antes do deploy, ou aponte o
> domínio do frontend para onde ele já está hospedado hoje.

### Sede Sorocaba (`sede-sorocaba`)
```env
GOOGLE_CLIENT_ID=<do Google Cloud Console>
GOOGLE_CLIENT_SECRET=<do Google Cloud Console>
JWT_SECRET=<gerado>
OPENROUTER_API_KEY=<sua chave, opcional — usado no módulo IA>
KAIROS_ADMIN_URL=https://admin.fbautomacao.space
KAIROS_CLIENT_ID=<copiado do passo 2>
ADMIN_EMAIL=<email do super admin da sede>
```
Domínios já fixados no `docker-compose.yml`: `sede.fbautomacao.space` (UI) e
`api.sede.fbautomacao.space` (API + callback do Google OAuth).

### Orçamentos Vidraçaria (`vidra-aria-top`, Lite)
```env
VITE_SHEETS_API_URL=http://187.77.229.227:3335/api/apps/vidracaria
GEMINI_API_KEY=<opcional>
VITE_KAIROS_ADMIN_URL=https://admin.fbautomacao.space
VITE_KAIROS_CLIENT_ID=<copiado do passo 2>
```
`VITE_*` são embutidas no bundle em tempo de build — configure antes do
deploy, não dá para trocar depois sem rebuild.

### Imobiliária Inteligente (`imobiliaria-inteligente`)
```env
GEMINI_API_KEY=<sua chave>
VITE_KAIROS_ADMIN_URL=https://admin.fbautomacao.space
VITE_KAIROS_CLIENT_ID=<copiado do passo 2>
```

### Agenda Mecânica Pro (`agenda-mecanica`)
```env
DB_PASSWORD=<gerado>
SECRET_KEY=<gerado>
ADMIN_EMAIL=<email do super admin>
ADMIN_PASSWORD=<senha forte>
HERMES_API_URL=
HERMES_EMAIL=
HERMES_PASSWORD=
KAIROS_ADMIN_URL=https://admin.fbautomacao.space
KAIROS_CLIENT_ID=<copiado do passo 2>
```

---

## 4. Checklist final

- [ ] `kairos_network` criada na VPS
- [ ] DNS de todos os domínios da tabela do passo 0 apontando para a VPS
- [ ] Kairos Admin no ar, painel acessível só com usuário/senha
- [ ] `/api/license/verify` respondendo sem autenticação
- [ ] Cada app satélite registrado em **Aplicativos** + cliente/licença criados
- [ ] `KAIROS_CLIENT_ID` colado no `.env` de cada app
- [ ] Cada app sobe e a tela de bloqueio/liberação de licença funciona
      (testável mudando o status da licença para `blocked` no painel e
      confirmando que o app correspondente bloqueia o acesso)
