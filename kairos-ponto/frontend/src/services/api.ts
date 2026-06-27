import { getApiUrl } from "@/lib/utils";

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

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function authFetch(path: string, options?: RequestInit) {
  const token = getToken();
  return fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  }).then(handle);
}

/** empresa_id efetivo: SUPER_ADMIN escolhe; demais usam o da própria sessão. */
function eid(empresaId?: string): string {
  return empresaId || getUser()?.empresa_id || "";
}

export const api = {
  login: (email: string, password: string) =>
    fetch(`${getApiUrl()}/users/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  me: () => authFetch("/users/me"),

  dashboard: (empresaId?: string) => authFetch(`/dashboard?empresa_id=${eid(empresaId)}`),

  empresas: {
    list: () => authFetch("/empresas"),
    create: (data: any) => authFetch("/empresas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/empresas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  users: {
    list: () => authFetch("/users"),
    create: (data: any) => authFetch("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  funcionarios: {
    list: (search = "", empresaId?: string) =>
      authFetch(`/funcionarios?empresa_id=${eid(empresaId)}&search=${encodeURIComponent(search)}`),
    get: (id: string) => authFetch(`/funcionarios/${id}`),
    create: (data: any) => authFetch("/funcionarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/funcionarios/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => authFetch(`/funcionarios/${id}`, { method: "DELETE" }),
  },

  escalas: {
    list: (empresaId?: string) => authFetch(`/escalas?empresa_id=${eid(empresaId)}`),
    create: (data: any) => authFetch("/escalas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/escalas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  ponto: {
    hoje: (funcionarioId?: string) =>
      authFetch(`/ponto/registros/hoje${funcionarioId ? `?funcionario_id=${funcionarioId}` : ""}`),
    registrar: (data: any) => authFetch("/ponto/registros", { method: "POST", body: JSON.stringify(data) }),
    historico: (params: Record<string, string>, empresaId?: string) => {
      const q = new URLSearchParams({ empresa_id: eid(empresaId), ...params }).toString();
      return authFetch(`/ponto/registros?${q}`);
    },
    ajuste: (data: any) => authFetch("/ponto/registros/ajuste", { method: "POST", body: JSON.stringify(data) }),
  },

  solicitacoes: {
    list: (status = "", empresaId?: string) =>
      authFetch(`/solicitacoes?empresa_id=${eid(empresaId)}${status ? `&status=${status}` : ""}`),
    create: (data: any) => authFetch("/solicitacoes", { method: "POST", body: JSON.stringify(data) }),
    decidir: (id: string, status: string, resposta: string) =>
      authFetch(`/solicitacoes/${id}`, { method: "PATCH", body: JSON.stringify({ status, resposta }) }),
  },

  bancoHoras: {
    saldo: (funcionarioId: string) => authFetch(`/banco-horas/saldo?funcionario_id=${funcionarioId}`),
    movimentos: (funcionarioId: string) => authFetch(`/banco-horas/movimentos?funcionario_id=${funcionarioId}`),
    apurar: (data: any) => authFetch("/banco-horas/apurar", { method: "POST", body: JSON.stringify(data) }),
  },

  relatorios: {
    espelho: (funcionarioId: string, from: string, to: string, empresaId?: string) =>
      authFetch(`/relatorios/espelho?empresa_id=${eid(empresaId)}&funcionario_id=${funcionarioId}&from=${from}&to=${to}`),
    frequencia: (from: string, to: string, empresaId?: string) =>
      authFetch(`/relatorios/frequencia?empresa_id=${eid(empresaId)}&from=${from}&to=${to}`),
    espelhoCsvUrl: (funcionarioId: string, from: string, to: string, empresaId?: string) =>
      `${getApiUrl()}/relatorios/espelho.csv?empresa_id=${eid(empresaId)}&funcionario_id=${funcionarioId}&from=${from}&to=${to}`,
  },

  ia: {
    chat: (message: string, empresaId?: string) =>
      authFetch("/ia", { method: "POST", body: JSON.stringify({ message, empresa_id: eid(empresaId) }) }),
    insights: (empresaId?: string) => authFetch(`/ia/insights?empresa_id=${eid(empresaId)}`),
  },

  auditoria: (params: Record<string, string> = {}, empresaId?: string) => {
    const q = new URLSearchParams({ empresa_id: eid(empresaId), ...params }).toString();
    return authFetch(`/auditoria?${q}`);
  },

  notificacoes: {
    list: () => authFetch("/notificacoes"),
    marcarTodas: () => authFetch("/notificacoes/marcar-todas", { method: "POST" }),
  },

  licenseStatus: (empresaId?: string) => authFetch(`/license/status?empresa_id=${eid(empresaId)}`),
};
