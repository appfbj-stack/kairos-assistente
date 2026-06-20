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

  core: {
    empresas: {
      list: () => fetchApi("/core/empresas"),
    },
    modules: {
      list: () => fetchApi("/core/modules"),
      create: (data: any) => fetchApi("/core/modules", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) => fetchApi(`/core/modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      perms: {
        list: (moduleId: string) => fetchApi(`/core/modules/${moduleId}/permissions`),
        create: (moduleId: string, data: any) => fetchApi(`/core/modules/${moduleId}/permissions`, { method: "POST", body: JSON.stringify(data) }),
        delete: (moduleId: string, permId: string) => fetchApi(`/core/modules/${moduleId}/permissions/${permId}`, { method: "DELETE" }),
      },
      deps: {
        list: (moduleId: string) => fetchApi(`/core/modules/${moduleId}/dependencies`),
        create: (moduleId: string, data: any) => fetchApi(`/core/modules/${moduleId}/dependencies`, { method: "POST", body: JSON.stringify(data) }),
        delete: (moduleId: string, depId: string) => fetchApi(`/core/modules/${moduleId}/dependencies/${depId}`, { method: "DELETE" }),
      },
      configs: {
        list: (empresaId: string) => fetchApi(`/core/modules/configs/${empresaId}`),
        set: (empresaId: string, moduleId: string, key: string, value: string) =>
          fetchApi(`/core/modules/configs/${empresaId}/${moduleId}/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
        delete: (empresaId: string, moduleId: string, key: string) =>
          fetchApi(`/core/modules/configs/${empresaId}/${moduleId}/${key}`, { method: "DELETE" }),
      },
      logs: (params?: { empresa_id?: string; module_id?: string; limit?: number }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/core/modules/logs${q ? `?${q}` : ""}`);
      },
    },
    agents: {
      list: () => fetchApi("/core/agents"),
      create: (data: any) => fetchApi("/core/agents", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) => fetchApi(`/core/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      tools: {
        list: (agentId: string) => fetchApi(`/core/agents/${agentId}/tools`),
        create: (agentId: string, data: any) => fetchApi(`/core/agents/${agentId}/tools`, { method: "POST", body: JSON.stringify(data) }),
        delete: (agentId: string, toolId: string) => fetchApi(`/core/agents/${agentId}/tools/${toolId}`, { method: "DELETE" }),
      },
      modules: {
        list: (agentId: string) => fetchApi(`/core/agents/${agentId}/modules`),
        link: (agentId: string, moduleId: string) => fetchApi(`/core/agents/${agentId}/modules/${moduleId}`, { method: "POST" }),
        unlink: (agentId: string, moduleId: string) => fetchApi(`/core/agents/${agentId}/modules/${moduleId}`, { method: "DELETE" }),
      },
      logs: (params?: { empresa_id?: string; agent_id?: string; limit?: number }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/core/agents/logs${q ? `?${q}` : ""}`);
      },
    },
    supervisor: {
      status: (empresaId: string) => fetchApi(`/core/supervisor/${empresaId}`),
    },
  },

  atendimento: {
    dashboard: (empresaId: string) => fetchApi(`/atendimento/dashboard/${empresaId}`),

    assistants: {
      list: (empresaId: string) => fetchApi(`/atendimento/assistants/${empresaId}`),
      create: (empresaId: string, data: any) =>
        fetchApi(`/atendimento/assistants/${empresaId}`, { method: "POST", body: JSON.stringify(data) }),
      update: (empresaId: string, id: string, data: any) =>
        fetchApi(`/atendimento/assistants/${empresaId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (empresaId: string, id: string) =>
        fetchApi(`/atendimento/assistants/${empresaId}/${id}`, { method: "DELETE" }),
    },

    knowledge: {
      list: (empresaId: string, params?: { type?: string; search?: string }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/atendimento/knowledge/${empresaId}${q ? `?${q}` : ""}`);
      },
      create: (empresaId: string, data: any) =>
        fetchApi(`/atendimento/knowledge/${empresaId}`, { method: "POST", body: JSON.stringify(data) }),
      update: (empresaId: string, id: string, data: any) =>
        fetchApi(`/atendimento/knowledge/${empresaId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (empresaId: string, id: string) =>
        fetchApi(`/atendimento/knowledge/${empresaId}/${id}`, { method: "DELETE" }),
    },

    conversations: {
      list: (empresaId: string, params?: { status?: string; channel?: string }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/atendimento/conversations/${empresaId}${q ? `?${q}` : ""}`);
      },
      get: (empresaId: string, convId: string) =>
        fetchApi(`/atendimento/conversations/${empresaId}/${convId}`),
      update: (empresaId: string, convId: string, data: any) =>
        fetchApi(`/atendimento/conversations/${empresaId}/${convId}`, { method: "PATCH", body: JSON.stringify(data) }),
    },

    chat: {
      send: (data: any) =>
        fetchApi("/atendimento/chat/message", { method: "POST", body: JSON.stringify(data) }),
    },

    leads: {
      list: (empresaId: string, params?: { status?: string; source?: string; search?: string }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/atendimento/leads/${empresaId}${q ? `?${q}` : ""}`);
      },
      get: (empresaId: string, leadId: string) =>
        fetchApi(`/atendimento/leads/${empresaId}/${leadId}`),
      create: (empresaId: string, data: any) =>
        fetchApi(`/atendimento/leads/${empresaId}`, { method: "POST", body: JSON.stringify(data) }),
      update: (empresaId: string, leadId: string, data: any) =>
        fetchApi(`/atendimento/leads/${empresaId}/${leadId}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (empresaId: string, leadId: string) =>
        fetchApi(`/atendimento/leads/${empresaId}/${leadId}`, { method: "DELETE" }),
    },

    configs: {
      get: (empresaId: string) => fetchApi(`/atendimento/configs/${empresaId}`),
      set: (empresaId: string, key: string, value: string) =>
        fetchApi(`/atendimento/configs/${empresaId}/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
      whatsapp: {
        update: (empresaId: string, data: any) =>
          fetchApi(`/atendimento/configs/whatsapp/${empresaId}`, { method: "PUT", body: JSON.stringify(data) }),
      },
    },

    reports: {
      get: (empresaId: string, params?: { start_date?: string; end_date?: string }) => {
        const q = new URLSearchParams(params as any).toString();
        return fetchApi(`/atendimento/reports/${empresaId}${q ? `?${q}` : ""}`);
      },
    },
  },

  vps: {
    stats: () => fetchApi("/vps/stats"),
  },
};
