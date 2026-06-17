import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, CheckCircle2, Ban } from "lucide-react";
import { api, Cliente, Fatura, Processo } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const empty = { cliente_id: "", processo_id: "", descricao: "", valor: 0, data_emissao: "", data_vencimento: "" };
const today = () => new Date().toISOString().slice(0, 10);

function statusInfo(f: Fatura) {
  if (f.status === "paga") return { label: "Paga", className: "bg-green-100 text-green-700" };
  if (f.status === "cancelada") return { label: "Cancelada", className: "bg-gray-100 text-gray-700" };
  if (f.data_vencimento < today()) return { label: "Atrasada", className: "bg-red-100 text-red-700" };
  return { label: "Pendente", className: "bg-yellow-100 text-yellow-700" };
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function Financeiro() {
  const { user } = useAuth();
  const isStaff = user && ["admin", "advogado", "assistente_juridico"].includes(user.role);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api.faturas.list().then(setFaturas).catch((e) => setError(e.message));
    if (isStaff) {
      api.clientes.list().then(setClientes).catch(() => {});
      api.processos.list().then(setProcessos).catch(() => {});
    }
  }
  useEffect(load, [isStaff]);

  function openNew() { setForm({ ...empty, data_emissao: today() }); setEditingId(null); }
  function openEdit(f: Fatura) { setForm({ ...f, processo_id: f.processo_id ?? "" }); setEditingId(f.id); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = { ...form, processo_id: form.processo_id || null };
    try {
      if (editingId) await api.faturas.update(editingId, payload);
      else await api.faturas.create(payload);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handlePagar(f: Fatura) {
    const forma = prompt("Forma de pagamento (pix, boleto, cartao, transferencia):", "pix");
    if (forma === null) return;
    await api.faturas.pagar(f.id, { forma_pagamento: forma || null }); load();
  }

  async function handleCancelar(f: Fatura) {
    if (!confirm("Cancelar esta fatura?")) return;
    await api.faturas.cancelar(f.id); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta fatura?")) return;
    await api.faturas.delete(id); load();
  }

  function clienteNome(id: string) { return clientes.find((c) => c.id === id)?.nome || id; }

  const aReceber = faturas.filter((f) => f.status === "pendente").reduce((s, f) => s + f.valor, 0);
  const recebido = faturas.filter((f) => f.status === "paga" && (f.data_pagamento || "").startsWith(today().slice(0, 7))).reduce((s, f) => s + f.valor, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Financeiro</h1>
        {isStaff && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
            <Plus className="h-4 w-4" /> Nova Fatura
          </button>
        )}
      </div>

      {isStaff && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-sm text-gray-500 dark:text-gray-400">A receber</span>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{formatBRL(aReceber)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-sm text-gray-500 dark:text-gray-400">Recebido este mês</span>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{formatBRL(recebido)}</p>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">{editingId ? "Editar fatura" : "Nova fatura"}</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Selecione o cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={form.processo_id} onChange={(e) => setForm({ ...form, processo_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Sem processo vinculado</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.numero || p.id}</option>)}
            </select>
            <input required placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="number" step="0.01" required placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <div>
              <label className="mb-1 block text-xs text-gray-500">Emissão</label>
              <input type="date" required value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Vencimento</label>
              <input type="date" required value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              {isStaff && <th className="px-4 py-3">Cliente</th>}
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((f) => {
              const info = statusInfo(f);
              return (
                <tr key={f.id} className="border-t border-gray-100 dark:border-gray-800">
                  {isStaff && <td className="px-4 py-3 text-gray-500">{clienteNome(f.cliente_id)}</td>}
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{f.descricao}</td>
                  <td className="px-4 py-3 text-gray-500">{formatBRL(f.valor)}</td>
                  <td className="px-4 py-3 text-gray-500">{f.data_vencimento}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${info.className}`}>{info.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isStaff && f.status === "pendente" && (
                      <>
                        <button onClick={() => handlePagar(f)} title="Marcar como paga" className="mr-2 text-gray-400 hover:text-green-600"><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={() => handleCancelar(f)} title="Cancelar" className="mr-2 text-gray-400 hover:text-red-600"><Ban className="h-4 w-4" /></button>
                      </>
                    )}
                    {isStaff && (
                      <>
                        <button onClick={() => openEdit(f)} className="mr-2 text-gray-400 hover:text-kairos-600"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {faturas.length === 0 && (
              <tr><td colSpan={isStaff ? 6 : 5} className="px-4 py-6 text-center text-gray-500">Nenhuma fatura cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
