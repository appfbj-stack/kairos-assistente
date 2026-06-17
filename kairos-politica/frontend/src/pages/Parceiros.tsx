import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api, Parceiro } from "../lib/api";

const empty = { nome: "", tipo: "empresa", contato: "", observacoes: "" };
const tipoLabel: Record<string, string> = { empresa: "Empresa", associacao: "Associação", instituicao: "Instituição", projeto_social: "Projeto Social" };

export default function Parceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() { api.parceiros.list().then(setParceiros).catch((e) => setError(e.message)); }
  useEffect(load, []);

  function openNew() { setForm({ ...empty }); setEditingId(null); }
  function openEdit(p: Parceiro) { setForm({ ...p }); setEditingId(p.id); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.parceiros.update(editingId, form);
      else await api.parceiros.create(form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este parceiro?")) return;
    await api.parceiros.delete(id); load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Parceiros</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
          <Plus className="h-4 w-4" /> Novo Parceiro
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">{editingId ? "Editar parceiro" : "Novo parceiro"}</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Contato" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <textarea placeholder="Observações" value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {parceiros.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{p.nome}</td>
                <td className="px-4 py-3 text-gray-500">{tipoLabel[p.tipo] || p.tipo}</td>
                <td className="px-4 py-3 text-gray-500">{p.contato || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="mr-2 text-gray-400 hover:text-kairos-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {parceiros.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum parceiro cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
