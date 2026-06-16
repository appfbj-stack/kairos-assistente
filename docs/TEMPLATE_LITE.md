# Template Kairos Lite

**Para apps simples com Google Sheets como banco de dados.**

---

## Estrutura de Pastas

```
meu-app-lite/
├── src/
│   ├── components/
│   │   ├── LicenseGate.tsx     # Tela de bloqueio/verificação
│   │   ├── Layout.tsx          # Layout padrão com nav
│   │   ├── BottomNav.tsx       # Navegação mobile
│   │   └── Toast.tsx           # Notificações
│   ├── services/
│   │   ├── license.ts          # Verificação de licença
│   │   └── sheets.ts           # Google Sheets API
│   ├── hooks/
│   │   └── useSheets.ts        # Hook para ler/escrever Sheets
│   ├── pages/                  # Ou app/ se Next.js
│   │   ├── Home.tsx
│   │   └── Configuracoes.tsx
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── .env.example
```

---

## Arquivo: `src/services/license.ts`

```typescript
const KAIROS_ADMIN_URL = import.meta.env.VITE_KAIROS_ADMIN_URL;
const APP_SLUG = import.meta.env.VITE_APP_SLUG; // ex: "vidracaria"
const CACHE_KEY = "kairos_license";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export interface LicenseStatus {
  valid: boolean;
  status: "active" | "trial" | "expired" | "blocked" | "no_license";
  days_remaining?: number;
  client_name?: string;
  message: string;
}

export async function verifyLicense(clientId: string): Promise<LicenseStatus> {
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data;
  }

  const res = await fetch(
    `${KAIROS_ADMIN_URL}/api/license/verify?client_id=${clientId}&app_slug=${APP_SLUG}`
  );
  const data: LicenseStatus = await res.json();

  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
}

export function getStoredClientId(): string | null {
  return localStorage.getItem("kairos_client_id");
}

export function setClientId(id: string) {
  localStorage.setItem("kairos_client_id", id);
  localStorage.removeItem(CACHE_KEY); // Force recheck
}
```

---

## Arquivo: `src/services/sheets.ts`

```typescript
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

// Leitura pública (não precisa de auth, só API Key)
export async function readSheet(range: string): Promise<any[][]> {
  const res = await fetch(`${BASE}/values/${range}?key=${API_KEY}`);
  const data = await res.json();
  return data.values || [];
}

// Converte array de arrays em array de objetos (usando 1ª linha como header)
export function toObjects(rows: any[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map((row) =>
    Object.fromEntries(headers.map((h: string, i: number) => [h, row[i] ?? ""]))
  );
}

// Append de nova linha (requer OAuth via Google Identity Services)
export async function appendRow(sheetName: string, values: any[], token: string) {
  const res = await fetch(`${BASE}/values/${sheetName}:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });
  return res.json();
}

// Atualizar linha específica
export async function updateRow(range: string, values: any[], token: string) {
  const res = await fetch(`${BASE}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });
  return res.json();
}
```

---

## Arquivo: `src/components/LicenseGate.tsx`

```tsx
import { useEffect, useState } from "react";
import { verifyLicense, getStoredClientId, setClientId } from "@/services/license";

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "setup">("loading");
  const [message, setMessage] = useState("");
  const [inputId, setInputId] = useState("");

  useEffect(() => {
    const id = getStoredClientId();
    if (!id) { setStatus("setup"); return; }
    check(id);
  }, []);

  async function check(id: string) {
    setStatus("loading");
    try {
      const result = await verifyLicense(id);
      if (result.valid) {
        setStatus("valid");
      } else {
        setMessage(result.message);
        setStatus("invalid");
      }
    } catch {
      setMessage("Sem conexão com o servidor de licença.");
      setStatus("invalid");
    }
  }

  async function activate() {
    if (!inputId.trim()) return;
    setClientId(inputId.trim());
    check(inputId.trim());
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (status === "setup" || status === "invalid") return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          🔑
        </div>
        <h1 className="text-xl font-bold mb-2">Ativar Licença</h1>
        {message && <p className="text-sm text-red-500 mb-4">{message}</p>}
        <p className="text-sm text-gray-500 mb-6">
          Insira seu código de cliente para ativar o aplicativo.
        </p>
        <input
          className="w-full border rounded-lg px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Cole seu Client ID aqui"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
        />
        <button
          onClick={activate}
          className="w-full bg-blue-500 text-white rounded-lg py-3 font-medium hover:bg-blue-600 transition-colors"
        >
          Ativar
        </button>
        <p className="text-xs text-gray-400 mt-4">
          Não tem código? Entre em contato com o suporte.
        </p>
      </div>
    </div>
  );

  return <>{children}</>;
}
```

---

## Arquivo: `App.tsx`

```tsx
import LicenseGate from "./components/LicenseGate";
import Layout from "./components/Layout";
import Router from "./Router";

export default function App() {
  return (
    <LicenseGate>
      <Layout>
        <Router />
      </Layout>
    </LicenseGate>
  );
}
```

---

## Arquivo: `.env.example`

```env
VITE_KAIROS_ADMIN_URL=http://187.77.229.227:3010
VITE_APP_SLUG=vidracaria
VITE_GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
VITE_GOOGLE_API_KEY=AIzaSy...
```

---

## Arquivo: `package.json`

```json
{
  "name": "kairos-lite-template",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "vite": "^5.1.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## Checklist de Novo App Lite

- [ ] Definir `VITE_APP_SLUG` único (registrar no Kairos Admin)
- [ ] Criar planilha Google Sheets com abas para cada entidade
- [ ] Configurar API Key do Google (leitura pública)
- [ ] Configurar OAuth do Google (para escrita)
- [ ] Implementar `LicenseGate` na raiz do app
- [ ] Registrar app no Kairos Admin (slug + nome + URL)
- [ ] Criar licença trial para o primeiro cliente
- [ ] Deploy no Vercel (conectar repositório GitHub)

---

## Estrutura da Planilha Google Sheets (Exemplo: Vidraçaria)

```
Aba "Clientes":
| id | nome | telefone | email | data_cadastro |

Aba "Pedidos":
| id | cliente_id | descricao | valor | status | data |

Aba "Produtos":
| id | nome | largura | altura | valor_m2 | estoque |

Aba "Config":
| chave | valor |
| nome_empresa | Vidraçaria do João |
| telefone | 11 99999-9999 |
```
