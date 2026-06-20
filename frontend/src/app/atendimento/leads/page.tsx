"use client";

import { useEffect, useState } from "react";
import { Users, Search, Phone, Mail, Plus, Edit2, Trash2 } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

export default function LeadsPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", interest: "", source: "web", status: "new", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      setLeads(await api.atendimento.leads.list(eid, params));
    } catch {}
    setLoading(false);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.atendimento.leads.update(empresaId, editId, form);
      } else {
        await api.atendimento.leads.create(empresaId, form);
      }
      setShowForm(false);
      setEditId(null);
      resetForm();
      load(empresaId);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  function resetForm() {
    setForm({ name: "", phone: "", whatsapp: "", email: "", interest: "", source: "web", status: "new", notes: "" });
  }

  function startEdit(l: any) {
    setForm({ name: l.name, phone: l.phone || "", whatsapp: l.whatsapp || "", email: l.email || "", interest: l.interest || "", source: l.source || "web", status: l.status || "new", notes: l.notes || "" });
    setEditId(l.id);
    setShowForm(true);
  }

  async function deleteLead(id: string) {
    if (!confirm("Excluir este lead?")) return;
    try { await api.atendimento.leads.delete(empresaId, id); load(empresaId); } catch {}
  }

  return (
    <AdminShell
      title="Leads"
      onRefresh={() => empresaId && load(empresaId)}
      actions={
        <button onClick={() => { setEditId(null); resetForm(); setShowForm(true); }} className="btn-primary text-sm">
          <Plus size={14} className="mr-1" /> Novo Lead
        </button>
      }
    >
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                className="input pl-8 text-sm"
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(empresaId)}
              />
            </div>
            <select className="input text-sm w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }}>
              <option value="">Todos os status</option>
              <option value="new">Novo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Qualificado</option>
              <option value="converted">Convertido</option>
              <option value="lost">Perdido</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhum lead encontrado</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                      <th className="text-left px-4 py-3 font-medium">Nome</th>
                      <th className="text-left px-4 py-3 font-medium">Contato</th>
                      <th className="text-left px-4 py-3 font-medium">Interesse</th>
                      <th className="text-left px-4 py-3 font-medium">Origem</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Data</th>
                      <th className="text-right px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {leads.map((l: any) => (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{l.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {l.phone && <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1"><Phone size={12} />{l.phone}</span>}
                            {l.email && <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1"><Mail size={12} />{l.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.interest || "-"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.source}</td>
                        <td className="px-4 py-3">
                          <span className={clsx("badge", statusColors[l.status] || statusColors.new)}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{l.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(l)} className="btn-icon"><Edit2 size={14} /></button>
                          <button onClick={() => deleteLead(l.id)} className="btn-icon text-red-500"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editId ? "Editar Lead" : "Novo Lead"}
                </h3>
                <div className="space-y-3">
                  <input className="input w-full" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input w-full" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input className="input w-full" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                  <input className="input w-full" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <input className="input w-full" placeholder="Interesse" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <select className="input w-full" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                      <option value="web">Web</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="referral">Indicação</option>
                      <option value="landing">Landing Page</option>
                      <option value="other">Outro</option>
                    </select>
                    <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="new">Novo</option>
                      <option value="contacted">Contactado</option>
                      <option value="qualified">Qualificado</option>
                      <option value="converted">Convertido</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </div>
                  <textarea className="input w-full" rows={3} placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
                  <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary text-sm">
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
