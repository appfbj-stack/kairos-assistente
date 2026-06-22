"use client";

import { useEffect, useState } from "react";
import { Plus, ExternalLink, Copy, Edit2, Trash2, AppWindow, Check, MessageSquare, Bot, Link } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

const CHAT_DOMAIN = "https://assistentetop.fbautomacao.space";

export default function AplicativosPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", url: "", version: "1.0.0", category: "SaaS", plan: "Lite" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [empresaSlug, setEmpresaSlug] = useState("");

  async function load() {
    setLoading(true);
    try {
      setApps(await api.admin.apps.list());
    } catch {}
    // Busca slug da empresa para montar URL do chat
    try {
      const eid = localStorage.getItem("empresa_id") || "";
      if (eid) {
        const empresas = await api.core.empresas.list();
        const empresa = empresas.find((e: any) => e.id === eid);
        if (empresa?.slug) setEmpresaSlug(empresa.slug);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.admin.apps.update(editId, form);
      } else {
        await api.admin.apps.create(form);
      }
      setShowForm(false);
      setEditId(null);
      resetForm();
      await load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  function resetForm() {
    setForm({ name: "", slug: "", description: "", url: "", version: "1.0.0", category: "SaaS", plan: "Lite" });
  }

  function startEdit(a: any) {
    setForm({ name: a.name, slug: a.slug, description: a.description || "", url: a.url || "", version: a.version || "1.0.0", category: a.category || "SaaS", plan: a.plan || "Lite" });
    setEditId(a.id);
    setShowForm(true);
  }

  async function deleteApp(id: string) {
    if (!confirm("Excluir este aplicativo?")) return;
    try { await api.admin.apps.delete(id); await load(); } catch (e: any) { alert(e.message); }
  }

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const chatUrl = empresaSlug ? `${CHAT_DOMAIN}/assistente/${empresaSlug}` : "";

  return (
    <AdminShell
      title="Aplicativos"
      onRefresh={load}
      actions={
        <button onClick={() => { resetForm(); setEditId(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo App
        </button>
      }
    >
      <div className="space-y-4">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">{editId ? "Editar App" : "Novo Aplicativo"}</h2>
              <div className="space-y-3">
                <input className="input" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="input" placeholder="Slug (ex: fotoagenda) *" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} disabled={!!editId} />
                <input className="input" placeholder="URL (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                <input className="input" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Versão" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                  <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                    <option>Lite</option>
                    <option>Pro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={save} disabled={saving || !form.name || !form.slug} className="btn-primary flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card fixo: Chat de Atendimento IA */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Apps Incluídos</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card p-4 border border-kairos-500/30 bg-kairos-50/5 dark:bg-kairos-900/10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-kairos-500 rounded-lg flex items-center justify-center">
                  <Bot size={20} className="text-white" />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-kairos-100 text-kairos-600 dark:bg-kairos-900/40 dark:text-kairos-400">
                  Incluído
                </span>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Chat de Atendimento IA</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Chat público com IA. Coloque o link no WhatsApp, Instagram ou onde quiser — o cliente clica e conversa.
              </p>

              {chatUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <Link size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{chatUrl}</span>
                    <button
                      onClick={() => copyUrl(chatUrl, "chat")}
                      className="flex-shrink-0 text-kairos-500 hover:text-kairos-600 transition-colors"
                      title="Copiar link"
                    >
                      {copied === "chat" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={chatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-kairos-500/40 text-kairos-500 hover:bg-kairos-50 dark:hover:bg-kairos-900/20 transition-colors"
                    >
                      <ExternalLink size={12} /> Abrir Chat
                    </a>
                    <a
                      href="/atendimento/assistentes"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Configurar
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Configure sua empresa para gerar o link.
                  </p>
                  <a
                    href="/atendimento/assistentes"
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-kairos-500/40 text-kairos-500 hover:bg-kairos-50 dark:hover:bg-kairos-900/20 transition-colors"
                  >
                    Configurar Assistente
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Apps do registro */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Outros Aplicativos</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-kairos-50 dark:bg-kairos-900/20 rounded-lg flex items-center justify-center text-kairos-500">
                      <AppWindow size={20} />
                    </div>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", a.plan === "Pro" ? "bg-purple-100 text-purple-600" : "bg-blue-50 text-blue-600")}>
                      {a.plan}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{a.name}</h3>
                  {a.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{a.description}</p>
                  )}
                  {a.url && (
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 mb-2">
                      <Link size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{a.url}</span>
                      <button
                        onClick={() => copyUrl(a.url, a.id)}
                        className="flex-shrink-0 text-kairos-500 hover:text-kairos-600 transition-colors"
                      >
                        {copied === a.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto pt-2">
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-kairos-500 hover:text-kairos-600">
                        <ExternalLink size={12} /> Abrir
                      </a>
                    )}
                    <button onClick={() => startEdit(a)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto">
                      <Edit2 size={12} /> Editar
                    </button>
                    <button onClick={() => deleteApp(a.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </AdminShell>
  );
}
