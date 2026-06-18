import { getApiUrl } from "@/lib/utils";

const TOKEN_KEY = "kairos_barber_token";
const USER_KEY = "kairos_barber_user";

export function getBarberToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getBarberUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setBarberSession(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearBarberSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function authFetch(path: string, options?: RequestInit) {
  const token = getBarberToken();
  return fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  }).then(handle);
}

function publicFetch(path: string, options?: RequestInit) {
  return fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  }).then(handle);
}

export const barberApi = {
  login: (email: string, password: string) =>
    publicFetch("/core/users/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  dashboard: (empresaId: string) => authFetch(`/barber/appointments/dashboard?empresa_id=${empresaId}`),

  services: {
    list: (empresaId: string) => authFetch(`/barber/services?empresa_id=${empresaId}`),
    create: (data: any) => authFetch("/barber/services", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      authFetch(`/barber/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => authFetch(`/barber/services/${id}`, { method: "DELETE" }),
  },

  professionals: {
    list: (empresaId: string) => authFetch(`/barber/professionals?empresa_id=${empresaId}`),
    create: (data: any) => authFetch("/barber/professionals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      authFetch(`/barber/professionals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => authFetch(`/barber/professionals/${id}`, { method: "DELETE" }),
  },

  clients: {
    list: (empresaId: string, search?: string) =>
      authFetch(`/barber/clients?empresa_id=${empresaId}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
    create: (data: any) => authFetch("/barber/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      authFetch(`/barber/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  appointments: {
    list: (empresaId: string, params?: Record<string, string>) => {
      const q = new URLSearchParams({ empresa_id: empresaId, ...(params || {}) }).toString();
      return authFetch(`/barber/appointments?${q}`);
    },
    disponibilidade: (empresaId: string, professionalId: string, date: string, serviceId: string) =>
      authFetch(
        `/barber/appointments/disponibilidade?empresa_id=${empresaId}&professional_id=${professionalId}&date=${date}&service_id=${serviceId}`
      ),
    create: (data: any) => authFetch("/barber/appointments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      authFetch(`/barber/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  ia: (empresaId: string, message: string) =>
    authFetch("/barber/ia", { method: "POST", body: JSON.stringify({ empresa_id: empresaId, message }) }),

  public: {
    info: (slug: string) => publicFetch(`/barber/public/${slug}`),
    disponibilidade: (slug: string, professionalId: string, date: string, serviceId: string) =>
      publicFetch(
        `/barber/public/${slug}/disponibilidade?professional_id=${professionalId}&date=${date}&service_id=${serviceId}`
      ),
    agendar: (slug: string, data: any) =>
      publicFetch(`/barber/public/${slug}/agendar`, { method: "POST", body: JSON.stringify(data) }),
  },
};
