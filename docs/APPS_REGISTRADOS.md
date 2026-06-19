# Apps Registrados no Ecossistema Kairos

Mantenha este arquivo atualizado sempre que um novo app for criado ou registrado no Kairos Admin.

> **Detalhe da integração ativa mais recente (sede-sorocaba)**: ver [`INTEGRACAO_SEDE_SOROCABA.md`](./INTEGRACAO_SEDE_SOROCABA.md). Inclui:
> - IDs (app, cliente, licença) gerados via API
> - Schema dedicado no Postgres Admin + user com permissões isoladas
> - Como apps acessam o Admin (DNS Docker interno + Basic Auth)
> - Como replicar a integração para outros apps (kairos-advocacia, kairos-politica, foto-agenda)

---

## Apps Ativos

| App | Slug | Tipo | Porta Frontend | Porta Backend | Repositório | Status |
|---|---|---|---|---|---|---|
| FotoAgenda Pro | `foto-agenda-pro` | Pro | 3015 | 8005 | [foto-agenda-v1](https://github.com/appfbj-stack/foto-agenda-v1) | ✅ Ativo |
| Sede Sorocaba | `sede-sorocaba` | Pro | 3020 | 8010 | `kairos-sede-sorocaba/` (neste repositório, migrado de [sede-sorocaba](https://github.com/appfbj-stack/sede-sorocaba)) | ✅ Ativo (containers up, licença validada, pendente: HTTPS Dokploy + redirect Google) |
| Orçamentos Vidraçaria | `vidra-aria-top` | Lite | 3025 | — | [vidra-aria-top](https://github.com/appfbj-stack/vidra-aria-top) | ✅ Ativo |
| Imobiliária Inteligente | `imobiliaria-inteligente` | Pro | 3030 | — | [imobiliaria-inteligente](https://github.com/appfbj-stack/imobiliaria-inteligente) | ✅ Ativo |
| Agenda Mecânica Pro | `agenda-mecanica-pro` | Pro | 3035 | 8015 | [agenda-mecanica](https://github.com/appfbj-stack/agenda-mecanica) | ✅ Ativo |
| Kairos Advocacia | `kairos-advocacia` | Pro | 3045 | 8025 | `kairos-advocacia/` (neste repositório) | ✅ Ativo (containers up, licença validada, pendente: HTTPS Dokploy) |
| Kairos Política | `kairos-politica` | Pro | 3040 | 8020 | `kairos-politica/` (neste repositório) | ✅ Ativo (containers up, licença validada, pendente: HTTPS Dokploy) |
| Fotografia (Kairos) | `fotoagenda` | Pro | 3050 | 8030 | `foto-agenda/` (neste repositório — build próprio, distinto do FotoAgenda Pro externo acima) | 🚧 Não deployado |
| Kairos Barber | `kairos-barber` | Módulo embutido | — | — (rotas em `backend/src/barber/`, dentro do Kairos Admin) | 🚧 Não deployado |

> **Fotografia (Kairos):** o código em `foto-agenda/backend/app/main.py` já manda `app_slug=fotoagenda` fixo na verificação de licença. Ao registrar este app no Kairos Admin (passo 2 abaixo), o slug **precisa ser exatamente `fotoagenda`** — não confundir com o slug `foto-agenda-pro` do app externo já ativo.

> **Kairos Barber:** diferente de todos os apps acima, não é um satélite com backend/frontend/banco próprios — é um módulo embutido no próprio Kairos Admin (`backend/src/barber/`), seguindo a regra do PRD de não criar infraestrutura separada. Não ocupa porta nem entra no `docker-compose.yml`. Ver `docs/KAIROS_BARBER.md` para o modelo de dados, rotas e como ativar o módulo para uma empresa.

---

## Portas Reservadas

| Serviço | Porta |
|---|---|
| Kairos Admin Frontend | 3008 |
| Kairos Admin Backend | 3010 |
| PostgreSQL (Kairos) | 5432 |
| FotoAgenda Pro Frontend | 3015 |
| FotoAgenda Pro Backend | 8005 |
| Sede Sorocaba Frontend | 3020 |
| Sede Sorocaba Backend | 8010 |
| Orçamentos Vidraçaria (Lite) | 3025 |
| Imobiliária Inteligente | 3030 |
| Agenda Mecânica Pro Frontend | 3035 |
| Agenda Mecânica Pro Backend | 8015 |
| Kairos Política Frontend | 3040 |
| Kairos Política Backend | 8020 |
| Kairos Advocacia Frontend | 3045 |
| Kairos Advocacia Backend | 8025 |
| Fotografia (Kairos) Frontend | 3050 |
| Fotografia (Kairos) Backend | 8030 |

### Faixa livre para novos apps
- **Frontend**: 3055, 3060...
- **Backend**: 8035, 8040...

---

## Como Registrar um Novo App

1. Acessar o Kairos Admin → **Aplicativos** → **Novo App**
2. Preencher: Nome, Slug, URL, Versão, Plano (Lite/Pro)
3. Anotar o ID gerado
4. Criar cliente de teste → criar trial de 10 dias
5. Testar: `curl "http://localhost:3010/api/license/verify?client_id={ID}&app_slug={slug}"`
6. Adicionar entrada neste arquivo
7. Documentar porta usada na tabela acima

---

## Template de Entrada

```markdown
| {Nome} | `{slug}` | {Lite/Pro} | {porta-frontend} | {porta-backend} | ✅ Ativo |
```
