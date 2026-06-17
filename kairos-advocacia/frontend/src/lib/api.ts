function normalizeBase(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return normalizeBase(configured);
  if (import.meta.env.DEV) return "http://localhost:8000";
  return "";
}

const BASE = resolveBaseUrl();

function getToken() { return localStorage.getItem("adv_token") || ""; }
export function setToken(t: string) { localStorage.setItem("adv_token", t); }
export function clearToken() { localStorage.removeItem("adv_token"); }
export function isLoggedIn() { return !!getToken(); }

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers },
    });
  } catch {
    throw new Error("Falha de conexão com a API. Verifique o deploy do backend e a URL pública da API.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const e: any = new Error(err.detail || "Erro na requisição");
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface User { id: number; name: string; email: string; role: string; tenant_id: number }
export interface Cliente {
  id: string; tipo: string; nome: string; documento: string;
  email: string; telefone: string; endereco?: string | null; observacoes?: string | null;
}
export interface Processo {
  id: string; numero: string; cliente_id: string; advogado_id?: number | null;
  area: string; tribunal: string; vara: string; status: string;
  valor_causa: number; data_distribuicao: string; descricao?: string | null;
}
export interface Movimentacao { id: string; processo_id: string; data: string; tipo: string; descricao: string }
export interface Compromisso {
  id: string; titulo: string; tipo: string; data_hora: string; local: string;
  processo_id?: string | null; responsavel_id?: number | null; status: string; observacoes?: string | null;
}
export interface Fatura {
  id: string; cliente_id: string; processo_id?: string | null; descricao: string;
  valor: number; data_emissao: string; data_vencimento: string; status: string;
  data_pagamento?: string | null; forma_pagamento?: string | null;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; email: string; password: string; escritorio_name: string }) =>
    req<{ access_token: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => req<User>("/auth/me"),

  users: {
    list: () => req<User[]>("/users"),
    create: (data: any) => req<User>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/users/${id}`, { method: "DELETE" }),
  },

  clientes: {
    list: () => req<Cliente[]>("/clientes"),
    get: (id: string) => req<Cliente>(`/clientes/${id}`),
    create: (data: any) => req<Cliente>("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Cliente>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/clientes/${id}`, { method: "DELETE" }),
  },

  processos: {
    list: () => req<Processo[]>("/processos"),
    get: (id: string) => req<Processo>(`/processos/${id}`),
    create: (data: any) => req<Processo>("/processos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Processo>(`/processos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/processos/${id}`, { method: "DELETE" }),
    movimentacoes: {
      list: (processoId: string) => req<Movimentacao[]>(`/processos/${processoId}/movimentacoes`),
      create: (processoId: string, data: any) =>
        req<Movimentacao>(`/processos/${processoId}/movimentacoes`, { method: "POST", body: JSON.stringify(data) }),
      delete: (processoId: string, movId: string) =>
        req<void>(`/processos/${processoId}/movimentacoes/${movId}`, { method: "DELETE" }),
    },
  },

  agenda: {
    list: () => req<Compromisso[]>("/agenda"),
    create: (data: any) => req<Compromisso>("/agenda", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Compromisso>(`/agenda/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/agenda/${id}`, { method: "DELETE" }),
  },

  faturas: {
    list: () => req<Fatura[]>("/faturas"),
    create: (data: any) => req<Fatura>("/faturas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Fatura>(`/faturas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    pagar: (id: string, data: any) => req<Fatura>(`/faturas/${id}/pagar`, { method: "POST", body: JSON.stringify(data) }),
    cancelar: (id: string) => req<Fatura>(`/faturas/${id}/cancelar`, { method: "POST" }),
    delete: (id: string) => req<void>(`/faturas/${id}`, { method: "DELETE" }),
  },

  dashboard: {
    stats: () => req<any>("/dashboard/stats"),
  },
};
