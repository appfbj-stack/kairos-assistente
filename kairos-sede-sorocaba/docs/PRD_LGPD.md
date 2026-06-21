# PRD — Conformidade LGPD + Cadastro Completo de Membros/Obreiros

**App:** Kairos Sede Sorocaba (OBPC Sorocaba)
**Data:** 2026-06-20
**Base legal:** Lei 13.709/2018 (LGPD)

---

## 1. Problema

O app coleta CPF, nome, endereço, telefone, e-mail, dados eclesiásticos e foto de membros. Sem LGPD, a igreja (controladora) e a Kairos (operadora) estão sujeitas a:
- Multas ANPD (até 2% do faturamento, R$ 50M por incidente)
- Ações civis por danos morais
- Bloqueio de operação

Hoje o app **não tem**: política de privacidade, termo de consentimento, log de auditoria, canal do titular, controle granular de acesso a dados sensíveis, nem dados eclesiásticos completos para fins de cartório ministerial.

## 2. Objetivos

1. **Adequar o app à LGPD** com consentimento registrado, transparência, segurança e direitos do titular.
2. **Expandir o cadastro de membros/obreiros** para servir como ficha eclesiástica completa (cartório ministerial).

## 3. Escopo

### 3.1 LGPD — Backend
- Novos modelos: `ConsentimentoLGPD`, `AuditoriaLog`, `SolicitacaoLGPD`
- Campos no `Membro`: `email`, `lgpd_aceite`, `lgpd_data_aceite`, `lgpd_ip`, `lgpd_user_agent`, `lgpd_versao_termo`
- Captura automática de IP e User-Agent no aceite
- Versionamento de termos (`LGPD_VERSAO_TERMO`) — mudança de versão exige reaceite
- Middleware de auditoria: logar acesso/alteração a Membros, Obreiros, Carteirinhas
- Mascaramento por perfil: `secretario`/`lider_ministerio` não veem CPF/RG/endereço completo
- Novos perfis: `secretario`, `lider_ministerio`
- Endpoints públicos (sem auth): política, termos, solicitação do titular
- Endpoints admin (sede): listar/atender solicitações, ver auditoria

### 3.2 LGPD — Frontend
- Páginas públicas: `/politica-de-privacidade`, `/termos-de-uso`, `/consentimento-lgpd`, `/solicitar-exclusao-de-dados`
- Modal de aceite LGPD no FormMembro (checkbox + data + IP auto)
- Páginas admin: `/lgpd/solicitacoes`, `/lgpd/auditoria`
- Item LGPD no sidebar (sede)

### 3.3 Cadastro Eclesiástico Completo — Backend
- Campos pessoais extras no `Membro`: `email`, `naturalidade`, `profissao`, `escolaridade`, `nome_pai`, `nome_mae`, `conjuge_nome`, `data_casamento`, `num_filhos`, `tipo_sanguineo`, `alergias_medicacoes`, `contato_emergencia_nome`, `contato_emergencia_telefone`, `necessidades_especiais`
- Campos eclesiásticos extras no `Membro`: `batismo_espirito_santo_em`, `data_entrada_congregacao`, `consagracao_data`, `consagracao_oficiante`, `formacao_teologica`, `naturalizado_em` (data de chegada à congregação atual)
- Novos modelos relacionados:
  - `TransferenciaMembro` — origem, destino, data, motivo, documento_comprovante_url
  - `HistoricoCargo` — cargo, congregacao_id, data_inicio, data_fim, oficializado_por
  - `MinisterioMembro` — ministerio, funcao, data_inicio, data_fim
  - `CursoFormacao` — curso, instituicao, data_conclusao, certificacao_url
- Sub-endpoints sob `/api/membros/{id}/...`

### 3.4 Cadastro Eclesiástico Completo — Frontend
- FormMembro com seções: Dados Pessoais, Contato, Família, Saúde, Dados Eclesiásticos, Observações, LGPD
- Página `FichaMembro` com abas: Resumo, Dados Pessoais, Eclesiásticos, Histórico de Cargos, Transferências, Ministérios, Cursos, Consentimentos, Auditoria
- Link "Ver ficha completa" na listagem

## 4. Fora do Escopo (Fase 2)

- Criptografia em repouso (coluna-level) — usar PGCrypt ou app-layer
- Anonimização automática após `LGPD_RETENCAO_MESES`
- Portal do titular autenticado (hoje: solicitação por e-mail via form público)
- Assinatura digital do termo (hoje: checkbox + IP basta como prova)
- Cookie banner (não usamos cookies de tracking)
- Integração com Mapa ANPD

## 5. Decisões Técnicas

- **Banco**: SQLite dev / PostgreSQL prod — uso de `DateTime(timezone=True)` já padronizado
- **Migrações**: `Base.metadata.create_all` (já existe, sem Alembic). Novas tabelas criadas automaticamente.
- **Auth Google OAuth**: já existe — não adicionar senha própria (LGPD Art. 46 exige segurança, OAuth Google é suficiente)
- **JWT expira em 7 dias**: manter, mas adicionar `iat` e `jti` para auditoria
- **IP/User-Agent**: capturados em cada request via `Request.client.host` e header `User-Agent`
- **Versão do termo**: hardcoded em `config.py` — bump manual a cada alteração legal
- **Mascaramento por perfil**: feito no serializer (Pydantic), não no banco — dado é armazenado completo
- **Auditoria**: grava em tabela `auditoria_logs` — rotação por job externo (não no escopo)

## 6. Critérios de Aceite

- [ ] Membro não pode ser salvo sem `lgpd_aceite=true` (exceto seed admin)
- [ ] Ao editar membro existente sem aceite prévio, exigir aceite
- [ ] Listagem de membros: `secretario`/`lider_ministerio` não veem CPF/RG/endereço
- [ ] Todo acesso a `/membros/{id}` gera log em `auditoria_logs`
- [ ] Todo POST/PUT/DELETE em membros gera log
- [ ] Form público em `/solicitar-exclusao-de-dados` cria registro em `solicitacoes_lgpd`
- [ ] Sede consegue atender solicitação (status: recebida → em_andamento → concluida)
- [ ] Política e termos acessíveis sem login
- [ ] Versão do termo registrada em cada aceite
- [ ] Novos campos de membro persistem e validam
- [ ] Sub-entidades (transferências, cargos, ministérios, cursos) CRUD funcionando

## 7. Estrutura de Dados (Resumo)

```
Membro (tabela existente, expandida)
├── lgpd_aceite, lgpd_data_aceite, lgpd_ip, lgpd_user_agent, lgpd_versao_termo
├── email, naturalidade, profissao, escolaridade
├── nome_pai, nome_mae, conjuge_nome, data_casamento, num_filhos
├── tipo_sanguineo, alergias_medicacoes, contato_emergencia_*
├── batismo_espirito_santo_em, data_entrada_congregacao
├── consagracao_data, consagracao_oficiante, formacao_teologica
│
├── TransferenciaMembro (n) — origem, destino, data, motivo, doc_url
├── HistoricoCargo (n) — cargo, congregacao, datas, oficializado_por
├── MinisterioMembro (n) — ministerio, funcao, datas
├── CursoFormacao (n) — curso, instituicao, conclusao, certificado_url
└── ConsentimentoLGPD (n) — versao_termo, aceite, data, ip, user_agent

AuditoriaLog (tabela nova)
└── usuario_id, acao (acesso|criacao|alteracao|remocao)
    recurso, recurso_id, ip, user_agent, detalhes_json, data

SolicitacaoLGPD (tabela nova)
└── titular_nome, titular_email, tipo (acesso|retificacao|exclusao|portabilidade)
    descricao, status (recebida|em_andamento|concluida|recusada)
    atendido_por, atendido_em, resposta, criado_em
```

## 8. Páginas e Rotas

### Públicas (sem login)
| Rota | Componente | Descrição |
|---|---|---|
| `/politica-de-privacidade` | PoliticaPrivacidade | Política de privacidade |
| `/termos-de-uso` | TermosUso | Termos de uso |
| `/consentimento-lgpd` | Consentimento | Termo de consentimento explicado |
| `/solicitar-exclusao-de-dados` | SolicitarExclusao | Form do titular |

### Autenticadas
| Rota | Componente | Perfil |
|---|---|---|
| `/membros/:id` | FichaMembro | sede, pastor, secretario, lider_ministerio |
| `/lgpd/solicitacoes` | Solicitacoes | sede |
| `/lgpd/auditoria` | Auditoria | sede |

## 9. Riscos

- **R1**: Texto legal genérico pode não cobrir caso específico — mitigar com disclaimer "consulte advogado"
- **R2**: Reaceite em mudança de versão pode frustrar usuários — mitigar com banner explicativo
- **R3**: Auditoria pode inflar banco — mitigar com rotação prevista em Fase 2
- **R4**: Mascaramento no serializer pode ser bypassado por bug — mitigar com testes

## 10. Métricas pós-implantação

- % de membros com aceite LGPD registrado
- Tempo médio de atendimento de solicitações
- Nº de acessos a dados sensíveis por perfil
- Nº de solicitações recebidas vs concluídas
