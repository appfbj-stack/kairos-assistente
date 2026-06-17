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

function getToken() { return localStorage.getItem("pol_token") || ""; }
export function setToken(t: string) { localStorage.setItem("pol_token", t); }
export function clearToken() { localStorage.removeItem("pol_token"); }
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
export interface Cidadao {
  id: string; nome: string; telefone: string; whatsapp: string;
  endereco?: string; bairro?: string; cidade?: string; observacoes?: string | null;
}
export interface Lideranca {
  id: string; nome: string; regiao: string; comunidade: string;
  area_atuacao: string; contato: string; observacoes?: string | null;
}
export interface Parceiro {
  id: string; nome: string; tipo: string; contato: string; observacoes?: string | null;
}
export interface Demanda {
  id: string; protocolo: string; cidadao_id: string; responsavel_id?: number | null;
  categoria: string; descricao: string; bairro: string; status: string; prazo?: string | null;
}
export interface Andamento { id: string; demanda_id: string; data: string; descricao: string }
export interface Compromisso {
  id: string; titulo: string; tipo: string; data_hora: string; local: string;
  responsavel_id?: number | null; status: string; observacoes?: string | null;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; email: string; password: string; gabinete_name: string }) =>
    req<{ access_token: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => req<User>("/auth/me"),

  users: {
    list: () => req<User[]>("/users"),
    create: (data: any) => req<User>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/users/${id}`, { method: "DELETE" }),
  },

  cidadaos: {
    list: () => req<Cidadao[]>("/cidadaos"),
    get: (id: string) => req<Cidadao>(`/cidadaos/${id}`),
    create: (data: any) => req<Cidadao>("/cidadaos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Cidadao>(`/cidadaos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/cidadaos/${id}`, { method: "DELETE" }),
  },

  liderancas: {
    list: () => req<Lideranca[]>("/liderancas"),
    create: (data: any) => req<Lideranca>("/liderancas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Lideranca>(`/liderancas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/liderancas/${id}`, { method: "DELETE" }),
  },

  parceiros: {
    list: () => req<Parceiro[]>("/parceiros"),
    create: (data: any) => req<Parceiro>("/parceiros", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Parceiro>(`/parceiros/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/parceiros/${id}`, { method: "DELETE" }),
  },

  demandas: {
    list: () => req<Demanda[]>("/demandas"),
    get: (id: string) => req<Demanda>(`/demandas/${id}`),
    create: (data: any) => req<Demanda>("/demandas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Demanda>(`/demandas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/demandas/${id}`, { method: "DELETE" }),
    andamentos: {
      list: (demandaId: string) => req<Andamento[]>(`/demandas/${demandaId}/andamentos`),
      create: (demandaId: string, data: any) =>
        req<Andamento>(`/demandas/${demandaId}/andamentos`, { method: "POST", body: JSON.stringify(data) }),
    },
  },

  agenda: {
    list: () => req<Compromisso[]>("/agenda"),
    create: (data: any) => req<Compromisso>("/agenda", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => req<Compromisso>(`/agenda/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/agenda/${id}`, { method: "DELETE" }),
  },

  dashboard: {
    stats: () => req<any>("/dashboard/stats"),
  },
};
