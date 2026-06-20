export function getApiUrl(): string {
  return process.env.INTERNAL_API_URL || "http://backend:3010/api";
}

function getBasicAuth(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)kairos_auth=([^;]*)/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export async function fetchApi(path: string, options?: RequestInit) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // On the server, call backend directly.
  // On the client, use the Next.js proxy route to avoid mixed-content / CORS.
  if (typeof window === "undefined") {
    const apiUrl = process.env.INTERNAL_API_URL || "http://backend:3010/api";
    const user = process.env.BASIC_AUTH_USER || "borgesjaf@gmail.com";
    const password = process.env.BASIC_AUTH_PASSWORD || "Borges1972@";
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${password}`).toString("base64");

    const res = await fetch(`${apiUrl}${path}`, { headers, ...options });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  const res = await fetch(`/api/proxy${path}`, {
    headers,
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
