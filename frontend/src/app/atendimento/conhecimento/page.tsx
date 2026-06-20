"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search, Plus, Edit2, Trash2, Filter } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";

export default function ConhecimentoPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "custom", title: "", content: "", category: "", tags: "" });
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
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      setItems(await api.atendimento.knowledge.list(eid, params));
    } catch {}
    setLoading(false);
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.atendimento.knowledge.update(empresaId, editId, form);
      } else {
        await api.atendimento.knowledge.create(empresaId, form);
      }
      setShowForm(false);
      setEditId(null);
      resetForm();
      load(empresaId);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  function resetForm() {
    setForm({ type: "custom", title: "", content: "", category: "", tags: "" });
  }

  function startEdit(item: any) {
    setForm({ type: item.type, title: item.title, content: item.content, category: item.category || "", tags: item.tags || "" });
    setEditId(item.id);
    setShowForm(true);
  }

  async function deleteItem(id: string) {
    if (!confirm("Excluir este item?")) return;
    try { await api.atendimento.knowledge.delete(empresaId, id); load(empresaId); } catch {}
  }

  const typeLabels: Record<string, string> = {
    faq: "FAQ", service: "Serviço", product: "Produto",
    hours: "Horários", price: "Preço", document: "Documento", custom: "Personalizado",
  };

  return (
    <AdminShell
      title="Base de Conhecimento"
      onRefresh={() => empresaId && load(empresaId)}
      actions={
        <button onClick={() => { setEditId(null); resetForm(); setShowForm(true); }} className="btn-primary text-sm">
          <Plus size={14} className="mr-1" /> Novo Item
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
              <input className="input pl-8 text-sm" placeholder="Buscar..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(empresaId)} />
            </div>
            <select className="input text-sm w-auto" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); }}>
              <option value="">Todos os tipos</option>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhum item cadastrado</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((item: any) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-kairos-500 font-medium">{typeLabels[item.type] || item.type}</span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{item.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(item)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => deleteItem(item.id)} className="btn-icon text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{item.content}</p>
                  {item.category && (
                    <span className="text-[10px] text-gray-400 mt-2 inline-block bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{item.category}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editId ? "Editar Item" : "Novo Item"}
                </h3>
                <div className="space-y-3">
                  <select className="input w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input className="input w-full" placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <textarea className="input w-full" rows={5} placeholder="Conteúdo *" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                  <input className="input w-full" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <input className="input w-full" placeholder="Tags (separadas por vírgula)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
                  <button onClick={save} disabled={saving || !form.title.trim() || !form.content.trim()} className="btn-primary text-sm">
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
