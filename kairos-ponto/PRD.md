# PRD – KAIROS PONTO

## 1. Visão Geral
O Kairos Ponto é um módulo SaaS multiempresa para controle de jornada de trabalho, integrado ao ecossistema Kairos 2.0. Permite registro de ponto digital via app móvel e painel web, com geolocalização, reconhecimento facial, auditoria completa e relatórios gerenciais. Segue os padrões do núcleo Kairos 2.0.

## 2. Objetivos
- Eliminar controle manual de ponto.
- Garantir autenticidade do colaborador.
- Registrar localização exata.
- Gerar relatórios automáticos.
- Atender pequenas e médias empresas.
- Integrar com demais módulos Kairos.

## 3. Arquitetura
- **Backend:** Node.js, TypeScript, API REST, PostgreSQL (banco próprio).
- **Frontend:** React, Next.js, TailwindCSS.
- **Mobile:** React Native, Expo (ver `mobile/README.md`).
- **Infra:** Docker, VPS, Dokploy.

## 4. Multiempresa
Cada empresa tem usuários, funcionários, relatórios e configurações próprios. Nenhuma empresa visualiza dados de outra (isolamento por `empresa_id`).

## 5. Perfis de Usuário
- **Super Admin** (`SUPER_ADMIN`): empresas, planos, licenças, métricas globais.
- **Administrador** (`ADMIN_EMPRESA`): funcionários, escalas, aprovações, relatórios.
- **Supervisor** (`SUPERVISOR`): visualizar equipe, aprovar solicitações.
- **Funcionário** (`FUNCIONARIO`): registrar ponto, consultar histórico, solicitar ajustes.

## 6–20.
Cadastro de funcionários, registro de ponto (entrada/saída almoço/retorno/saída final com GPS, selfie, dispositivo), reconhecimento facial, geolocalização/geofence, escalas (5x2, 6x1, 12x36, personalizada), banco de horas, horas extras, solicitações, dashboard, relatórios (espelho, banco de horas, extras, faltas, atrasos, frequência; export PDF/Excel), auditoria, notificações, IA Kairos, segurança (JWT, criptografia, permissões, rate limit, logs) e integrações futuras.

## 21. Padrão Kairos 2.0
Autenticação centralizada, multiempresa, licenciamento, auditoria padrão, dashboard padrão, IA Kairos e componentes reutilizáveis. Nenhuma funcionalidade fora do padrão Kairos.

> Ver `README.md` para o mapeamento detalhado de cada seção do PRD para a implementação.
