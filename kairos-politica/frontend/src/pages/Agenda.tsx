import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api, Compromisso } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const empty = { titulo: "", tipo: "outro", data_hora: "", local: "", status: "pendente", observacoes: "" };
const tipoLabel: Record<string, string> = { reuniao: "Reunião", visita: "Visita", sessao: "Sessão", evento: "Evento", audiencia: "Audiência", outro: "Outro" };
const statusLabel: Record<string, string> = { pendente: "Pendente", concluido: "Concluído", cancelado: "Cancelado" };

export default function Agenda() {
  const { user } = useAuth();
  const isStaff = user && ["admin", "vereador", "assessor"].includes(user.role);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState("");

  function load() { api.agenda.list().then(setCompromissos).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.agenda.create(form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este compromisso?")) return;
    await api.agenda.delete(id); load();
  }

  async function toggleStatus(c: Compromisso) {
    const status = c.status === "pendente" ? "concluido" : "pendente";
    await api.agenda.update(c.id, { ...c, status }); load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Agenda</h1>
        {isStaff && (
          <button onClick={() => setForm({ ...empty })} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
            <Plus className="h-4 w-4" /> Novo Compromisso
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">Novo compromisso</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="datetime-local" required value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input placeholder="Local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <textarea placeholder="Observações" value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="space-y-3">
        {compromissos.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="text-xs font-medium uppercase text-kairos-600">{tipoLabel[c.tipo] || c.tipo} · {new Date(c.data_hora).toLocaleString("pt-BR")}</div>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{c.titulo}</p>
              {c.local && <p className="text-xs text-gray-500">{c.local}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleStatus(c)} className={`rounded-full px-2 py-1 text-xs font-medium ${c.status === "concluido" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {statusLabel[c.status] || c.status}
              </button>
              {isStaff && <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
        {compromissos.length === 0 && <p className="text-sm text-gray-500">Nenhum compromisso cadastrado.</p>}
      </div>
    </div>
  );
}
