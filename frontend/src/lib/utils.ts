export function getApiUrl(): string {
  // No browser, usa proxy interno do Next.js para evitar CORS com Basic Auth
  if (typeof window !== "undefined") {
    // Usa proxy interno para todas as rotas admin (evita CORS com Basic Auth)
    return "/api/proxy";
  }
  // Server-side: usa URL direta do backend
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://backend:3010/api";
}

export async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(getApiUrl() + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexao" }));
    throw new Error(err.error || "HTTP " + res.status);
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
