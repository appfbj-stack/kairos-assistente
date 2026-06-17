import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api, Andamento, Demanda } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const categoriaLabel: Record<string, string> = {
  iluminacao: "Iluminação", saude: "Saúde", transporte: "Transporte",
  infraestrutura: "Infraestrutura", educacao: "Educação", seguranca: "Segurança", outro: "Outro",
};
const statusLabel: Record<string, string> = {
  recebida: "Recebida", analisada: "Analisada", encaminhada: "Encaminhada",
  em_andamento: "Em andamento", resolvida: "Resolvida",
};

export default function DemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStaff = user && ["admin", "vereador", "assessor"].includes(user.role);
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [andamentos, setAndamentos] = useState<Andamento[]>([]);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState("");

  function load() {
    if (!id) return;
    api.demandas.get(id).then(setDemanda).catch((e) => setError(e.message));
    api.demandas.andamentos.list(id).then(setAndamentos).catch(() => {});
  }
  useEffect(load, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await api.demandas.andamentos.create(id, form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  if (!demanda) return <p className="text-gray-500">{error || "Carregando..."}</p>;

  return (
    <div>
      <Link to="/demandas" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-kairos-600">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Protocolo {demanda.protocolo}</h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500 sm:grid-cols-4">
          <span>Categoria: {categoriaLabel[demanda.categoria] || demanda.categoria}</span>
          <span>Bairro: {demanda.bairro || "-"}</span>
          <span>Status: {statusLabel[demanda.status] || demanda.status}</span>
          <span>Prazo: {demanda.prazo || "-"}</span>
        </div>
        {demanda.descricao && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{demanda.descricao}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Andamentos</h2>
        {isStaff && (
          <button onClick={() => setForm({ descricao: "" })} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-kairos-700">
            <Plus className="h-4 w-4" /> Novo andamento
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <textarea required placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <div className="mt-3 flex items-center gap-2">
            <button type="submit" className="rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Adicionar</button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {andamentos.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="text-xs font-medium uppercase text-kairos-600">{a.data}</div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{a.descricao}</p>
            </div>
          </div>
        ))}
        {andamentos.length === 0 && <p className="text-sm text-gray-500">Nenhum andamento registrado.</p>}
      </div>
    </div>
  );
}
