export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3010/api";
    }
    return `http://${host}:3010/api`;
  }
  return "http://backend:3010/api";
}

function getBasicAuth(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)kairos_auth=([^;]*)/);
  return match ? match[1] : null;
}

export async function fetchApi(path: string, options?: RequestInit) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = getBasicAuth();
  if (auth) headers["Authorization"] = "Basic " + auth;

  const res = await fetch(`${getApiUrl()}${path}`, {
    headers,
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "active": return "badge-active";
    case "trial": return "badge-trial";
    case "expired": return "badge-expired";
    case "blocked": return "badge-blocked";
    default: return "badge-blocked";
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Ativo",
    trial: "Trial",
    expired: "Expirado",
    blocked: "Bloqueado",
    pending: "Pendente",
    confirmed: "Confirmado",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}
