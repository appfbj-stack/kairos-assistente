"use client";

import { useState, useEffect } from "react";
function useAdmin() {
  const BASE = typeof window !== "undefined"
    ? `http://${window.location.hostname}:3010/api`
    : "http://backend:3010/api";

  async function get(path: string) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function post(path: string, data: any) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function del(path: string) {
    const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  return { get, post, del };
}
import { ArrowLeft, Users, AppWindow, Key, FileText, Activity, Plus, Trash2, Check, X, Search } from "lucide-react";
import Link from "next/link";

type AdminTab = "dashboard" | "clients" | "apps" | "licenses" | "logs";

type Stats = { total_clients: number; total_licenses: number; active_licenses: number; trial_licenses: number; expired_licenses: number };
type Client = { id: string; name: string; company: string; phone: string; email: string; category: string; status: string; created_at: string };
type App = { id: string; name: string; slug: string; description: string };
type License = { id: string; client_id: string; app_id: string; status: string; type: string; start_date: string; end_date: string; client_name: string; app_name: string };
type Log = { id: string; client_id: string; app_id: string; action: string; details: string; created_at: string };

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const [newClient, setNewClient] = useState({ name: "", company: "", phone: "", email: "", category: "Outros" });
  const [newApp, setNewApp] = useState({ name: "", slug: "" });
  const [newTrial, setNewTrial] = useState({ client_name: "", company: "", email: "", phone: "", app_slug: "" });
  const [activateId, setActivateId] = useState("");

  const admin = useAdmin();

  const load = {
    stats: () => admin.get("/admin/stats").then(setStats).catch(() => {}),
    clients: () => admin.get("/admin/clients").then(setClients).catch(() => {}),
    apps: () => admin.get("/admin/apps").then(setApps).catch(() => {}),
    licenses: () => admin.get("/license/list").then(setLicenses).catch(() => {}),
    logs: () => admin.get("/admin/logs").then(setLogs).catch(() => {}),
  };

  useEffect(() => { load.stats(); load.clients(); load.apps(); load.licenses(); load.logs(); }, []);

  async function createClient() {
    if (!newClient.name) return;
    await admin.post("/admin/clients", newClient);
    setNewClient({ name: "", company: "", phone: "", email: "", category: "Outros" });
    load.clients(); load.stats();
  }

  async function deleteClient(id: string) {
    await admin.del(`/admin/clients/${id}`);
    load.clients(); load.stats();
  }

  async function createApp() {
    if (!newApp.name || !newApp.slug) return;
    await admin.post("/admin/apps", newApp);
    setNewApp({ name: "", slug: "" });
    load.apps();
  }

  async function createTrial() {
    if (!newTrial.client_name || !newTrial.app_slug) return;
    await admin.post("/license/create-trial", newTrial);
    setNewTrial({ client_name: "", company: "", email: "", phone: "", app_slug: "" });
    load.licenses(); load.clients(); load.stats();
  }

  async function activateLicense() {
    if (!activateId) return;
    await admin.post("/license/activate", { license_id: activateId, amount: 0 });
    setActivateId("");
    load.licenses();
  }

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: Activity },
    { key: "clients", label: "Clientes", icon: Users },
    { key: "apps", label: "Apps", icon: AppWindow },
    { key: "licenses", label: "Licenças", icon: Key },
    { key: "logs", label: "Logs", icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="bg-kairos-500 text-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="btn-icon !w-8 !h-8"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-semibold">Kairos Admin</h1>
      </header>

      <div className="flex gap-1 px-2 py-2 bg-white border-b overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t.key ? "bg-kairos-100 text-kairos-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {tab === "dashboard" && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-2xl font-bold text-kairos-500">{stats.total_clients}</p><p className="text-xs text-gray-500">Clientes</p></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-2xl font-bold text-kairos-500">{stats.total_licenses}</p><p className="text-xs text-gray-500">Licenças</p></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-2xl font-bold text-green-500">{stats.active_licenses}</p><p className="text-xs text-gray-500">Ativas</p></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-2xl font-bold text-yellow-500">{stats.trial_licenses}</p><p className="text-xs text-gray-500">Trial</p></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border col-span-2"><p className="text-2xl font-bold text-red-400">{stats.expired_licenses}</p><p className="text-xs text-gray-500">Expiradas</p></div>
            </div>
            <button onClick={() => { load.stats(); load.clients(); load.apps(); load.licenses(); load.logs(); }}
              className="w-full py-2 bg-gray-100 rounded-lg text-sm text-gray-600">Atualizar</button>
          </>
        )}

        {tab === "clients" && (
          <>
            <div className="bg-white p-3 rounded-xl shadow-sm border space-y-2">
              <h3 className="text-sm font-semibold">Novo Cliente</h3>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Nome*" value={newClient.name} onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" />
                <input placeholder="Empresa" value={newClient.company} onChange={(e) => setNewClient((p) => ({ ...p, company: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" />
                <input placeholder="Telefone" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" />
                <input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" />
                <select value={newClient.category} onChange={(e) => setNewClient((p) => ({ ...p, category: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm">
                  {["Oficina", "Imobiliária", "Vidraçaria", "Igreja", "Kairos Assistente", "Clínica", "Outros"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={createClient} className="w-full py-2 bg-kairos-500 text-white rounded-lg text-sm">Cadastrar</button>
            </div>

            <div className="space-y-2">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.company} · {c.category} · {c.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>{c.status}</span>
                  <button onClick={() => deleteClient(c.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "apps" && (
          <>
            <div className="bg-white p-3 rounded-xl shadow-sm border space-y-2">
              <h3 className="text-sm font-semibold">Novo App</h3>
              <input placeholder="Nome*" value={newApp.name} onChange={(e) => setNewApp((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" />
              <input placeholder="Slug* (ex: oficina)" value={newApp.slug} onChange={(e) => setNewApp((p) => ({ ...p, slug: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" />
              <button onClick={createApp} className="w-full py-2 bg-kairos-500 text-white rounded-lg text-sm">Criar App</button>
            </div>
            <div className="space-y-2">
              {apps.map((a) => (
                <div key={a.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
                  <AppWindow size={18} className="text-kairos-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-gray-400">/{a.slug}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "licenses" && (
          <>
            <div className="bg-white p-3 rounded-xl shadow-sm border space-y-2">
              <h3 className="text-sm font-semibold">Criar Trial (10 dias)</h3>
              <input placeholder="Nome do cliente*" value={newTrial.client_name} onChange={(e) => setNewTrial((p) => ({ ...p, client_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Empresa" value={newTrial.company} onChange={(e) => setNewTrial((p) => ({ ...p, company: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" />
                <input placeholder="Email" value={newTrial.email} onChange={(e) => setNewTrial((p) => ({ ...p, email: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" />
              </div>
              <select value={newTrial.app_slug} onChange={(e) => setNewTrial((p) => ({ ...p, app_slug: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm">
                <option value="">Selecione o app*</option>
                {apps.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
              </select>
              <button onClick={createTrial} className="w-full py-2 bg-yellow-500 text-white rounded-lg text-sm">Criar Trial</button>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-sm border space-y-2">
              <h3 className="text-sm font-semibold">Ativar Licença</h3>
              <input placeholder="ID da licença" value={activateId} onChange={(e) => setActivateId(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
              <button onClick={activateLicense} className="w-full py-2 bg-green-500 text-white rounded-lg text-sm">Ativar (Permanente)</button>
            </div>

            <div className="space-y-2">
              {licenses.map((l) => (
                <div key={l.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{l.client_name} → {l.app_name}</p>
                    <p className="text-xs text-gray-400">{l.type} · {l.start_date?.slice(0, 10)} até {l.end_date?.slice(0, 10)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === "active" ? "bg-green-100 text-green-600" : l.status === "trial" ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600"}`}>{l.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "logs" && (
          <div className="space-y-1">
            {logs.map((l) => (
              <div key={l.id} className="bg-white p-2 rounded-lg border text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-kairos-600">{l.action}</span>
                  <span className="text-gray-400">{l.created_at?.slice(0, 16)}</span>
                </div>
                {l.details && <p className="text-gray-500 mt-0.5">{l.details}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
