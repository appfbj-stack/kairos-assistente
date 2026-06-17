import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api, Cidadao, Demanda } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const empty = { cidadao_id: "", categoria: "outro", descricao: "", bairro: "", status: "recebida", prazo: "" };

const categoriaLabel: Record<string, string> = {
  iluminacao: "Iluminação", saude: "Saúde", transporte: "Transporte",
  infraestrutura: "Infraestrutura", educacao: "Educação", seguranca: "Segurança", outro: "Outro",
};
const statusLabel: Record<string, string> = {
  recebida: "Recebida", analisada: "Analisada", encaminhada: "Encaminhada",
  em_andamento: "Em andamento", resolvida: "Resolvida",
};
const statusClass: Record<string, string> = {
  recebida: "bg-gray-100 text-gray-700", analisada: "bg-blue-100 text-blue-700",
  encaminhada: "bg-yellow-100 text-yellow-700", em_andamento: "bg-orange-100 text-orange-700",
  resolvida: "bg-green-100 text-green-700",
};

export default function Demandas() {
  const { user } = useAuth();
  const isStaff = user && ["admin", "vereador", "assessor"].includes(user.role);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [cidadaos, setCidadaos] = useState<Cidadao[]>([]);
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api.demandas.list().then(setDemandas).catch((e) => setError(e.message));
    if (isStaff) api.cidadaos.list().then(setCidadaos).catch(() => {});
  }
  useEffect(load, [isStaff]);

  function openNew() { setForm({ ...empty }); setEditingId(null); }
  function openEdit(d: Demanda) { setForm({ ...d, prazo: d.prazo ?? "" }); setEditingId(d.id); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.demandas.update(editingId, form);
      else await api.demandas.create(form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta demanda?")) return;
    await api.demandas.delete(id); load();
  }

  function cidadaoNome(id: string) { return cidadaos.find((c) => c.id === id)?.nome || id; }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{isStaff ? "Demandas" : "Minhas Demandas"}</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
          <Plus className="h-4 w-4" /> Nova Demanda
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">{editingId ? "Editar demanda" : "Nova demanda"}</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isStaff && (
              <select required value={form.cidadao_id} onChange={(e) => setForm({ ...form, cidadao_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="">Selecione o cidadão</option>
                {cidadaos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(categoriaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            {isStaff && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
            <input type="date" placeholder="Prazo" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <textarea required placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Protocolo</th>
              {isStaff && <th className="px-4 py-3">Cidadão</th>}
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {demandas.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <Link to={`/demandas/${d.id}`} className="font-medium text-kairos-600 hover:underline">{d.protocolo}</Link>
                </td>
                {isStaff && <td className="px-4 py-3 text-gray-500">{cidadaoNome(d.cidadao_id)}</td>}
                <td className="px-4 py-3 text-gray-500">{categoriaLabel[d.categoria] || d.categoria}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[d.status] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabel[d.status] || d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isStaff && (
                    <>
                      <button onClick={() => openEdit(d)} className="mr-2 text-gray-400 hover:text-kairos-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {demandas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhuma demanda cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
