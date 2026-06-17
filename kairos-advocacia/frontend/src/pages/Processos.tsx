import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api, Cliente, Processo } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const empty = { numero: "", cliente_id: "", area: "", tribunal: "", vara: "", status: "ativo", valor_causa: 0, data_distribuicao: "", descricao: "" };

const statusLabel: Record<string, string> = { ativo: "Ativo", suspenso: "Suspenso", arquivado: "Arquivado", encerrado: "Encerrado" };
const statusClass: Record<string, string> = {
  ativo: "bg-green-100 text-green-700", suspenso: "bg-yellow-100 text-yellow-700",
  arquivado: "bg-gray-100 text-gray-700", encerrado: "bg-red-100 text-red-700",
};

export default function Processos() {
  const { user } = useAuth();
  const isStaff = user && ["admin", "advogado", "assistente_juridico"].includes(user.role);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api.processos.list().then(setProcessos).catch((e) => setError(e.message));
    if (isStaff) api.clientes.list().then(setClientes).catch(() => {});
  }
  useEffect(load, [isStaff]);

  function openNew() { setForm({ ...empty }); setEditingId(null); }
  function openEdit(p: Processo) { setForm({ ...p }); setEditingId(p.id); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.processos.update(editingId, form);
      else await api.processos.create(form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este processo?")) return;
    await api.processos.delete(id); load();
  }

  function clienteNome(id: string) { return clientes.find((c) => c.id === id)?.nome || id; }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{isStaff ? "Processos" : "Meus Processos"}</h1>
        {isStaff && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
            <Plus className="h-4 w-4" /> Novo Processo
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">{editingId ? "Editar processo" : "Novo processo"}</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input placeholder="Número do processo" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Selecione o cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input placeholder="Área (Cível, Trabalhista...)" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input placeholder="Tribunal" value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input placeholder="Vara" value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" step="0.01" placeholder="Valor da causa" value={form.valor_causa} onChange={(e) => setForm({ ...form, valor_causa: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="date" value={form.data_distribuicao} onChange={(e) => setForm({ ...form, data_distribuicao: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <textarea placeholder="Descrição" value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Número</th>
              {isStaff && <th className="px-4 py-3">Cliente</th>}
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {processos.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <Link to={`/processos/${p.id}`} className="font-medium text-kairos-600 hover:underline">{p.numero || "(sem número)"}</Link>
                </td>
                {isStaff && <td className="px-4 py-3 text-gray-500">{clienteNome(p.cliente_id)}</td>}
                <td className="px-4 py-3 text-gray-500">{p.area || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[p.status] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabel[p.status] || p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isStaff && (
                    <>
                      <button onClick={() => openEdit(p)} className="mr-2 text-gray-400 hover:text-kairos-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {processos.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhum processo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
