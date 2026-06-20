"use client";

import { useEffect, useState } from "react";
import { Store, Bot, Plus, Edit2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import { fetchApi } from "@/lib/utils";

type Tab = "modules" | "agents";

const MODULE_ICONS: Record<string, string> = {
  Users: "👥", Calendar: "📅", CalendarCheck: "📆", DollarSign: "💰",
  ScrollText: "📋", BookOpen: "📖", Megaphone: "📢", Globe: "🌐",
  Heart: "❤️", Contact: "📇", BarChart3: "📊", Music: "🎵",
  HandCoins: "🤝", Brain: "🧠",
};

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("modules");
  const [modules, setModules] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
  const [empresaModules, setEmpresaModules] = useState<any[]>([]);
  const [empresaAgents, setEmpresaAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", slug: "", description: "", icon: "", category: "geral", tier: "pro" });
  const [saving, setSaving] = useState(false);

  const [moduleForm, setModuleForm] = useState({ name: "", slug: "", description: "", icon: "", category: "geral", tier: "pro" });
  const [agentForm, setAgentForm] = useState({ name: "", slug: "", description: "", icon: "", category: "produtividade", tier: "pro" });

  async function loadAll() {
    setLoading(true);
    try {
      const [mods, ags, emps] = await Promise.all([
        api.core.modules.list(),
        api.core.agents.list(),
        api.core.empresas.list().catch(() => []),
      ]);
      setModules(mods);
      setAgents(ags);
      setEmpresas(emps);
      if (emps.length > 0 && !selectedEmpresa) setSelectedEmpresa(emps[0].id);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadEmpresaModules(empresaId: string) {
    if (!empresaId) return;
    try {
      const mods = await fetchApi(`/core/modules/empresas/${empresaId}`);
      setEmpresaModules(mods);
    } catch {}
  }

  async function loadEmpresaAgents(empresaId: string) {
    if (!empresaId) return;
    try {
      const ags = await fetchApi(`/core/agents/empresas/${empresaId}`);
      setEmpresaAgents(ags);
    } catch {}
  }

  useEffect(() => {
    if (selectedEmpresa) {
      loadEmpresaModules(selectedEmpresa);
      loadEmpresaAgents(selectedEmpresa);
    }
  }, [selectedEmpresa]);

  async function toggleModule(moduleId: string, active: boolean) {
    if (!selectedEmpresa) return;
    try {
      await fetchApi(`/core/modules/empresas/${selectedEmpresa}/${moduleId}`, {
        method: "POST",
        body: JSON.stringify({ active }),
      });
      await loadEmpresaModules(selectedEmpresa);
    } catch (e: any) { alert(e.message); }
  }

  async function toggleAgent(agentId: string, active: boolean) {
    if (!selectedEmpresa) return;
    try {
      await fetchApi(`/core/agents/empresas/${selectedEmpresa}/${agentId}`, {
        method: "POST",
        body: JSON.stringify({ active }),
      });
      await loadEmpresaAgents(selectedEmpresa);
    } catch (e: any) { alert(e.message); }
  }

  async function saveModule() {
    if (!moduleForm.name.trim() || !moduleForm.slug.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.core.modules.update(editId, moduleForm);
      } else {
        await api.core.modules.create(moduleForm);
      }
      setShowForm(false);
      setEditId(null);
      setModuleForm({ name: "", slug: "", description: "", icon: "", category: "geral", tier: "pro" });
      await loadAll();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  async function saveAgent() {
    if (!agentForm.name.trim() || !agentForm.slug.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.core.agents.update(editId, agentForm);
      } else {
        await api.core.agents.create(agentForm);
      }
      setShowForm(false);
      setEditId(null);
      setAgentForm({ name: "", slug: "", description: "", icon: "", category: "produtividade", tier: "pro" });
      await loadAll();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  function startEditModule(m: any) {
    setModuleForm({ name: m.name, slug: m.slug, description: m.description || "", icon: m.icon || "", category: m.category || "geral", tier: m.tier || "pro" });
    setEditId(m.id);
    setShowForm(true);
  }

  function startEditAgent(a: any) {
    setAgentForm({ name: a.name, slug: a.slug, description: a.description || "", icon: a.icon || "", category: a.category || "produtividade", tier: a.tier || "pro" });
    setEditId(a.id);
    setShowForm(true);
  }

  const filteredModules = modules.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.slug.includes(search.toLowerCase())
  );

  const filteredAgents = agents.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.slug.includes(search.toLowerCase())
  );

  const moduleActiveMap = Object.fromEntries(
    empresaModules.map((m: any) => [m.id, m.active])
  );
  const agentActiveMap = Object.fromEntries(
    empresaAgents.map((a: any) => [a.id, a.active])
  );

  return (
    <AdminShell
      title={tab === "modules" ? "Marketplace de Módulos" : "Marketplace de Agentes"}
      onRefresh={loadAll}
      actions={
        <div className="flex items-center gap-2">
          <select
            className="input text-sm py-1.5 w-auto"
            value={selectedEmpresa}
            onChange={(e) => setSelectedEmpresa(e.target.value)}
          >
            <option value="">Selecione empresa...</option>
            {empresas.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditId(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Novo
          </button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab("modules")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "modules"
              ? "border-kairos-500 text-kairos-600 dark:text-kairos-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Store size={16} /> Módulos
        </button>
        <button
          onClick={() => setTab("agents")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "agents"
              ? "border-kairos-500 text-kairos-600 dark:text-kairos-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Bot size={16} /> Agentes de IA
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder={tab === "modules" ? "Buscar módulos..." : "Buscar agentes..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md p-5">
            <h2 className="text-base font-semibold mb-4">
              {editId ? "Editar" : "Novo"} {tab === "modules" ? "Módulo" : "Agente"}
            </h2>
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Nome *"
                value={tab === "modules" ? moduleForm.name : agentForm.name}
                onChange={(e) => tab === "modules"
                  ? setModuleForm({ ...moduleForm, name: e.target.value, slug: editId ? moduleForm.slug : e.target.value.toLowerCase().replace(/\s+/g, "-") })
                  : setAgentForm({ ...agentForm, name: e.target.value, slug: editId ? agentForm.slug : e.target.value.toLowerCase().replace(/\s+/g, "-") })
                }
              />
              <input
                className="input"
                placeholder="Slug *"
                value={tab === "modules" ? moduleForm.slug : agentForm.slug}
                onChange={(e) => tab === "modules"
                  ? setModuleForm({ ...moduleForm, slug: e.target.value })
                  : setAgentForm({ ...agentForm, slug: e.target.value })
                }
                disabled={!!editId}
              />
              <textarea
                className="input"
                placeholder="Descrição"
                rows={2}
                value={tab === "modules" ? moduleForm.description : agentForm.description}
                onChange={(e) => tab === "modules"
                  ? setModuleForm({ ...moduleForm, description: e.target.value })
                  : setAgentForm({ ...agentForm, description: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Ícone (lucide name)"
                  value={tab === "modules" ? moduleForm.icon : agentForm.icon}
                  onChange={(e) => tab === "modules"
                    ? setModuleForm({ ...moduleForm, icon: e.target.value })
                    : setAgentForm({ ...agentForm, icon: e.target.value })
                  }
                />
                <select
                  className="input"
                  value={tab === "modules" ? moduleForm.tier : agentForm.tier}
                  onChange={(e) => tab === "modules"
                    ? setModuleForm({ ...moduleForm, tier: e.target.value })
                    : setAgentForm({ ...agentForm, tier: e.target.value })
                  }
                >
                  <option value="free">Free</option>
                  <option value="lite">Lite</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <select
                className="input"
                value={tab === "modules" ? moduleForm.category : agentForm.category}
                onChange={(e) => tab === "modules"
                  ? setModuleForm({ ...moduleForm, category: e.target.value })
                  : setAgentForm({ ...agentForm, category: e.target.value })
                }
              >
                {tab === "modules" ? (
                  <>
                    <option value="geral">Geral</option>
                    <option value="gestao">Gestão</option>
                    <option value="comunicacao">Comunicação</option>
                    <option value="ferramentas">Ferramentas</option>
                  </>
                ) : (
                  <>
                    <option value="produtividade">Produtividade</option>
                    <option value="pastoral">Pastoral</option>
                    <option value="gestao">Gestão</option>
                    <option value="comunicacao">Comunicação</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={tab === "modules" ? saveModule : saveAgent}
                disabled={saving || !(tab === "modules" ? moduleForm.name : agentForm.name) || !(tab === "modules" ? moduleForm.slug : agentForm.slug)}
                className="btn-primary flex-1"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "modules" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((m: any) => {
            const active = selectedEmpresa ? moduleActiveMap[m.id] : null;
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-kairos-50 dark:bg-kairos-900/20 rounded-lg flex items-center justify-center text-lg">
                    {MODULE_ICONS[m.icon] || "📦"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                      m.tier === "free" ? "bg-green-100 text-green-600" :
                      m.tier === "lite" ? "bg-blue-100 text-blue-600" :
                      "bg-purple-100 text-purple-600"
                    }`}>{m.tier}</span>
                    {active !== null && (
                      <button
                        onClick={() => toggleModule(m.id, !active)}
                        className={`p-1 rounded transition-colors ${active ? "text-green-500 hover:text-green-600" : "text-gray-300 hover:text-gray-400"}`}
                        title={active ? "Desativar" : "Ativar"}
                      >
                        {active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{m.name}</h3>
                <p className="text-[10px] text-gray-400 mb-1.5">{m.slug} · {m.category}</p>
                {m.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-1 mt-auto">
                  <button onClick={() => startEditModule(m)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded"><Edit2 size={13} /></button>
                </div>
              </div>
            );
          })}
          {filteredModules.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">
              {search ? "Nenhum módulo encontrado" : "Nenhum módulo cadastrado"}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((a: any) => {
            const active = selectedEmpresa ? agentActiveMap[a.id] : null;
            return (
              <div key={a.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-500">
                    <Bot size={20} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                      a.tier === "free" ? "bg-green-100 text-green-600" :
                      a.tier === "lite" ? "bg-blue-100 text-blue-600" :
                      "bg-purple-100 text-purple-600"
                    }`}>{a.tier}</span>
                    {active !== null && (
                      <button
                        onClick={() => toggleAgent(a.id, !active)}
                        className={`p-1 rounded transition-colors ${active ? "text-green-500 hover:text-green-600" : "text-gray-300 hover:text-gray-400"}`}
                        title={active ? "Desativar" : "Ativar"}
                      >
                        {active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{a.name}</h3>
                <p className="text-[10px] text-gray-400 mb-1.5">{a.slug} · {a.category}</p>
                {a.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{a.description}</p>}
                <div className="flex items-center gap-1 mt-auto">
                  <button onClick={() => startEditAgent(a)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded"><Edit2 size={13} /></button>
                </div>
              </div>
            );
          })}
          {filteredAgents.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">
              {search ? "Nenhum agente encontrado" : "Nenhum agente cadastrado"}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}