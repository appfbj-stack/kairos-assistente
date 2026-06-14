function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3001/api";
    }
    return "http://187.77.229.227:3010/api";
  }
  return "http://backend:3010/api";
}

function getUrl(path: string): string {
  return `${getApiUrl()}${path}`;
}

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(getUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro de conexão" }));
    throw new Error(err.error || "Erro desconhecido");
  }
  return res.json();
}

export const api = {
  health: () => fetchApi("/health"),

  chat: {
    send: (conversation_id: string | null, message: string) =>
      fetchApi("/chat/send", {
        method: "POST",
        body: JSON.stringify({ conversation_id, message }),
      }),
    list: () => fetchApi("/chat/conversations"),
    get: (id: string) => fetchApi(`/chat/conversations/${id}`),
    delete: (id: string) =>
      fetchApi(`/chat/conversations/${id}`, { method: "DELETE" }),
  },

  agenda: {
    list: () => fetchApi("/agenda"),
    create: (title: string, description?: string, date_time?: string) =>
      fetchApi("/agenda", {
        method: "POST",
        body: JSON.stringify({ title, description, date_time }),
      }),
    update: (id: string, data: Record<string, any>) =>
      fetchApi(`/agenda/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/agenda/${id}`, { method: "DELETE" }),
  },

  memory: {
    list: () => fetchApi("/memory"),
    save: (key: string, value: string, category?: string) =>
      fetchApi("/memory", {
        method: "POST",
        body: JSON.stringify({ key, value, category }),
      }),
    delete: (id: string) =>
      fetchApi(`/memory/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => fetchApi("/settings"),
    set: (key: string, value: string) =>
      fetchApi(`/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
  },
};
