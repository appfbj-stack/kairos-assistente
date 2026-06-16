"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, UserCheck, UserX, Search, Phone, Mail, Building2 } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import { formatDate } from "@/lib/utils";
import clsx from "clsx";

const CATEGORIES = ["Oficina", "Imobiliária", "Vidraçaria", "Igreja", "Clínica", "Kairos Assistente", "Outros"];

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", category: "Outros" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setClients(await api.admin.clients.list()); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.admin.clients.update(editId, form);
      } else {
        await api.admin.clients.create(form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", company: "", phone: "", email: "", category: "Outros" });
      await load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  async function deleteClient(id: string) {
    if (!confirm("Excluir este cliente e todas as suas licenças?")) return;
    try { await api.admin.clients.delete(id); await load(); } catch (e: any) { alert(e.message); }
  }

  function startEdit(c: any) {
    setForm({ name: c.name, company: c.company || "", phone: c.phone || "", email: c.email || "", category: c.category || "Outros" });
    setEditId(c.id);
    setShowForm(true);
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell
      title="Clientes"
      onRefresh={load}
      actions={
        <button onClick={() => { setEditId(null); setForm({ name: "", company: "", phone: "", email: "", category: "Outros" }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">{editId ? "Editar Cliente" : "Novo Cliente"}</h2>
              <div className="space-y-3">
                <input className="input" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="input" placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <input className="input" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="card p-4 flex items-start gap-3">
                <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", c.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
                  {c.status === "active" ? <UserCheck size={16} /> : <UserX size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{c.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {c.company && <span className="flex items-center gap-1 text-xs text-gray-400"><Building2 size={11} />{c.company}</span>}
                    {c.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={11} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={11} />{c.email}</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Cadastrado em {formatDate(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteClient(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
