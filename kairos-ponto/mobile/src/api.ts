import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "kairos_ponto_token";
const USER_KEY = "kairos_ponto_user";

export interface SessionUser {
  id: string;
  empresa_id: string | null;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN_EMPRESA" | "SUPERVISOR" | "FUNCIONARIO";
  name?: string;
  funcionario_id?: string | null;
}

/** Base URL: env EXPO_PUBLIC_API_URL tem prioridade; senão app.json -> extra.apiUrl. */
export function apiUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    "http://localhost:8040/api"
  );
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<SessionUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(token: string, user: SessionUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function authFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  return fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  }).then(handle);
}

export const api = {
  login: (email: string, password: string) =>
    fetch(`${apiUrl()}/users/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  pontoHoje: () => authFetch("/ponto/registros/hoje"),

  registrarPonto: (data: {
    tipo: string;
    gps_lat?: number;
    gps_lng?: number;
    selfie?: string;
    dispositivo?: string;
  }) => authFetch("/ponto/registros", { method: "POST", body: JSON.stringify(data) }),

  historico: (from: string, to: string) =>
    authFetch(`/ponto/registros?from=${from}&to=${to}`),

  solicitacoes: {
    list: () => authFetch("/solicitacoes"),
    create: (data: { tipo: string; descricao: string }) =>
      authFetch("/solicitacoes", { method: "POST", body: JSON.stringify(data) }),
  },

  bancoSaldo: () => authFetch("/banco-horas/saldo"),

  notificacoes: () => authFetch("/notificacoes"),
};
