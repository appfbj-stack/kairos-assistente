# Kairos Ponto — App Mobile (React Native / Expo)

O PRD (seção 3) prevê um app mobile em **React Native + Expo** para o registro
de ponto dos funcionários (entrada/saída com GPS, selfie e dispositivo).

## Status

Nesta primeira leva, o registro de ponto do funcionário já está **funcional via
web** em `frontend/src/app/ponto/page.tsx` — uma página mobile-first (PWA) que
usa a `geolocation` e a câmera (`getUserMedia`) do navegador, batendo na mesma
API que o app nativo consumirá. Isso entrega o fluxo do PRD sem bloquear no
empacotamento nativo.

## Como o app nativo se conecta

O app Expo consome exatamente os mesmos endpoints REST do backend:

| Ação | Endpoint |
|---|---|
| Login | `POST /api/users/auth/login` → guarda o JWT |
| Marcações de hoje + próximo tipo | `GET /api/ponto/registros/hoje` |
| Bater ponto | `POST /api/ponto/registros` `{ tipo, gps_lat, gps_lng, selfie, dispositivo }` |
| Histórico | `GET /api/ponto/registros` |
| Solicitações | `GET/POST /api/solicitacoes` |
| Banco de horas | `GET /api/banco-horas/saldo` |
| Notificações | `GET /api/notificacoes` |

Bibliotecas Expo previstas: `expo-location` (GPS), `expo-camera` (selfie),
`expo-secure-store` (JWT), `expo-notifications` (push — PRD seção 17).

## Scaffold sugerido (próxima fase)

```
mobile/
├── app.json
├── App.tsx
├── src/
│   ├── api.ts          # cliente REST (mesma base do frontend/src/services/api.ts)
│   ├── screens/
│   │   ├── Login.tsx
│   │   ├── BaterPonto.tsx   # expo-location + expo-camera
│   │   ├── Historico.tsx
│   │   └── Solicitacoes.tsx
│   └── hooks/useAuth.ts
```

Como o backend e o contrato de API já estão prontos e estáveis, o app nativo é
uma camada de UI sobre eles — pode ser desenvolvido sem novas mudanças no servidor.
