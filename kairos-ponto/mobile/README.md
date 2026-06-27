# Kairos Ponto — App Mobile (Expo / React Native)

App do **funcionário** para bater ponto pelo celular: login, registro de ponto
com **GPS + selfie** (reconhecimento facial), histórico com banco de horas e
solicitações. Consome a mesma API REST do backend (`../backend`).

Stack: **Expo SDK 52** + **expo-router** (file-based) + `expo-location` +
`expo-camera` + `expo-secure-store`.

## Rodar no celular (desenvolvimento)

1. Instale o **Expo Go** no seu celular (Play Store / App Store).
2. Configure a URL da API acessível pelo celular (o backend precisa estar
   rodando e o celular na **mesma rede Wi‑Fi** do seu computador):
   ```bash
   cp .env.example .env
   # edite EXPO_PUBLIC_API_URL com o IP da sua máquina, ex: http://192.168.0.10:8040/api
   ```
   > Use o IP da máquina, **não** `localhost` (no celular, localhost é o próprio
   > telefone). Descubra com `ip addr` (Linux) / `ipconfig` (Windows) / `ifconfig` (Mac).
3. Instale e inicie:
   ```bash
   npm install
   npm start
   ```
4. Escaneie o QR Code que aparece no terminal com o **Expo Go**. O app abre no celular.

## Gerar APK / app instalável (produção)

Com [EAS Build](https://docs.expo.dev/build/introduction/) (build na nuvem da Expo):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gera um APK para instalar direto
eas build -p ios --profile preview       # requer conta Apple Developer
```

Defina a URL de produção da API antes do build (no `app.json` → `extra.apiUrl`
ou via variável `EXPO_PUBLIC_API_URL` no perfil do EAS).

## Estrutura

```
mobile/
├── app/
│   ├── _layout.tsx            # Stack raiz
│   ├── index.tsx              # redireciona conforme sessão (SecureStore)
│   ├── login.tsx
│   └── (app)/
│       ├── _layout.tsx        # Tabs (Bater Ponto / Histórico / Solicitações) + sair
│       ├── ponto.tsx          # câmera (selfie) + GPS + registro
│       ├── historico.tsx      # marcações do mês + saldo de banco de horas
│       └── solicitacoes.tsx   # criar e acompanhar solicitações
├── src/
│   ├── api.ts                 # cliente REST + sessão (expo-secure-store)
│   └── theme.ts
├── app.json                   # permissões iOS/Android, plugins, extra.apiUrl
└── .env.example
```

## Permissões

- **Localização** (quando em uso): valida o geofence no registro de ponto.
- **Câmera**: selfie do reconhecimento facial.

Declaradas em `app.json` (iOS `infoPlist` + Android `permissions`) e solicitadas
em runtime nas telas.

## Contrato de API usado

| Tela | Endpoint |
|---|---|
| Login | `POST /api/users/auth/login` |
| Bater ponto | `GET /api/ponto/registros/hoje` · `POST /api/ponto/registros` |
| Histórico | `GET /api/ponto/registros` · `GET /api/banco-horas/saldo` |
| Solicitações | `GET` / `POST /api/solicitacoes` |
