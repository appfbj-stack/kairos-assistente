# Apps Registrados no Ecossistema Kairos

Mantenha este arquivo atualizado sempre que um novo app for criado ou registrado no Kairos Admin.

---

## Apps Ativos

| App | Slug | Tipo | Porta Frontend | Porta Backend | Repositório | Status |
|---|---|---|---|---|---|---|
| FotoAgenda Pro | `foto-agenda-pro` | Pro | 3015 | 8005 | [foto-agenda-v1](https://github.com/appfbj-stack/foto-agenda-v1) | ✅ Ativo |

---

## Portas Reservadas

| Serviço | Porta |
|---|---|
| Kairos Admin Frontend | 3008 |
| Kairos Admin Backend | 3010 |
| PostgreSQL (Kairos) | 5432 |
| FotoAgenda Pro Frontend | 3015 |
| FotoAgenda Pro Backend | 8005 |

### Faixa livre para novos apps
- **Frontend**: 3020, 3025, 3030, 3035, 3040...
- **Backend**: 8010, 8015, 8020, 8025, 8030...

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
