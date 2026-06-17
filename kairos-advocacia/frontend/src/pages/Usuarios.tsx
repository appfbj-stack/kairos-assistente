import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { api, User } from "../lib/api";

const empty = { name: "", email: "", password: "", role: "advogado", active: true };
const roleLabel: Record<string, string> = { admin: "Administrador", advogado: "Advogado", assistente_juridico: "Assistente Jurídico", cliente: "Cliente" };

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  function load() { api.users.list().then(setUsers).catch((e) => setError(e.message)); }
  useEffect(load, []);

  function openNew() { setForm({ ...empty }); setEditingId(null); }
  function openEdit(u: User) { setForm({ ...u, password: "" }); setEditingId(u.id); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.users.update(editingId, form);
      else await api.users.create(form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover este usuário?")) return;
    try { await api.users.delete(id); load(); } catch (err: any) { setError(err.message); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Usuários</h1>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-white">{editingId ? "Editar usuário" : "Novo usuário"}</h2>
            <button type="button" onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="password" placeholder={editingId ? "Nova senha (opcional)" : "Senha"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{roleLabel[u.role] || u.role}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${(u as any).active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {(u as any).active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)} className="mr-2 text-gray-400 hover:text-kairos-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhum usuário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
