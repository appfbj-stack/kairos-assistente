import { fetchApi } from "@/lib/utils";

export const api = {
  health: () => fetchApi("/health"),

  chat: {
    send: (conversation_id: string | null, message: string) =>
      fetchApi("/chat/send", { method: "POST", body: JSON.stringify({ conversation_id, message }) }),
    list: () => fetchApi("/chat/conversations"),
    get: (id: string) => fetchApi(`/chat/conversations/${id}`),
    delete: (id: string) => fetchApi(`/chat/conversations/${id}`, { method: "DELETE" }),
  },

  agenda: {
    list: () => fetchApi("/agenda"),
    create: (title: string, description?: string, date_time?: string) =>
      fetchApi("/agenda", { method: "POST", body: JSON.stringify({ title, description, date_time }) }),
    update: (id: string, data: Record<string, any>) =>
      fetchApi(`/agenda/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/agenda/${id}`, { method: "DELETE" }),
  },

  memory: {
    list: () => fetchApi("/memory"),
    save: (key: string, value: string, category?: string) =>
      fetchApi("/memory", { method: "POST", body: JSON.stringify({ key, value, category }) }),
    delete: (id: string) => fetchApi(`/memory/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => fetchApi("/settings"),
    set: (key: string, value: string) =>
      fetchApi(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
  },

  admin: {
    stats: () => fetchApi("/admin/stats"),
    financial: () => fetchApi("/admin/financial"),

    clients: {
      list: () => fetchApi("/admin/clients"),
      get: (id: string) => fetchApi(`/admin/clients/${id}`),
      create: (data: any) => fetchApi("/admin/clients", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        fetchApi(`/admin/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => fetchApi(`/admin/clients/${id}`, { method: "DELETE" }),
    },

    apps: {
      list: () => fetchApi("/admin/apps"),
      create: (data: any) => fetchApi("/admin/apps", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        fetchApi(`/admin/apps/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => fetchApi(`/admin/apps/${id}`, { method: "DELETE" }),
    },

    licenses: {
      list: (params?: { status?: string; client_id?: string }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/license/list${q ? `?${q}` : ""}`);
      },
      updateStatus: (id: string, status: string) =>
        fetchApi(`/admin/licenses/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
      createTrial: (data: any) =>
        fetchApi("/license/create-trial", { method: "POST", body: JSON.stringify(data) }),
      activate: (license_id: string, amount?: number, method?: string) =>
        fetchApi("/license/activate", { method: "POST", body: JSON.stringify({ license_id, amount, method }) }),
    },

    logs: (params?: { client_id?: string; app_id?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return fetchApi(`/admin/logs${q ? `?${q}` : ""}`);
    },
  },

  vps: {
    stats: () => fetchApi("/vps/stats"),
  },
};
