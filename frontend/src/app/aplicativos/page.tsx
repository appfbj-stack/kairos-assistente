"use client";

import { useEffect, useState } from "react";
import { Plus, ExternalLink, Copy, Edit2, Trash2, AppWindow, Tag } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

export default function AplicativosPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", url: "", version: "1.0.0", category: "SaaS", plan: "Lite" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setApps(await api.admin.apps.list()); } catch {}
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

  function copySlug(slug: string) {
    navigator.clipboard.writeText(slug);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

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

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum aplicativo cadastrado</div>
        ) : (
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
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{a.name}</h3>
                <p className="text-xs text-gray-400 mb-2">v{a.version} · {a.category}</p>
                {a.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{a.description}</p>}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copySlug(a.slug)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-kairos-500 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <Copy size={11} />
                    {copied === a.slug ? "Copiado!" : a.slug}
                  </button>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-kairos-500 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 transition-colors ml-auto">
                      <ExternalLink size={11} /> Abrir
                    </a>
                  )}
                  <div className="flex gap-1 ml-auto">
                    <button onClick={() => startEdit(a)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded"><Edit2 size={13} /></button>
                    <button onClick={() => deleteApp(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
