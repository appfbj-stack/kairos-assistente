"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, getUser } from "@/services/api";
import { Plus, Search } from "lucide-react";

const EMPTY = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  cargo: "",
  departamento: "",
  matricula: "",
  data_admissao: "",
  escala_id: "",
  criar_acesso: false,
  senha_acesso: "",
};

export default function FuncionariosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = ["SUPER_ADMIN", "ADMIN_EMPRESA"].includes(getUser()?.role || "");

  async function load() {
    try {
      setLista(await api.funcionarios.list(search));
      setEscalas(await api.escalas.list());
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.funcionarios.create({ ...form, escala_id: form.escala_id || null });
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Shell title="Funcionários" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome, CPF, matrícula…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setOpen(!open)}>
            <Plus size={16} /> Novo funcionário
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {open && (
        <form onSubmit={salvar} className="card mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["nome", "Nome *"],
            ["cpf", "CPF *"],
            ["email", "E-mail"],
            ["telefone", "Telefone"],
            ["cargo", "Cargo"],
            ["departamento", "Departamento"],
            ["matricula", "Matrícula"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input
                className="input"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                required={label.includes("*")}
              />
            </div>
          ))}
          <div>
            <label className="label">Data de admissão</label>
            <input type="date" className="input" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
          </div>
          <div>
            <label className="label">Escala</label>
            <select className="input" value={form.escala_id} onChange={(e) => setForm({ ...form, escala_id: e.target.value })}>
              <option value="">—</option>
              {escalas.map((es) => (
                <option key={es.id} value={es.id}>
                  {es.nome} ({es.tipo})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.criar_acesso} onChange={(e) => setForm({ ...form, criar_acesso: e.target.checked })} />
              Criar acesso (app)
            </label>
          </div>
          {form.criar_acesso && (
            <div>
              <label className="label">Senha de acesso</label>
              <input className="input" value={form.senha_acesso} onChange={(e) => setForm({ ...form, senha_acesso: e.target.value })} placeholder="padrão: 6 primeiros dígitos do CPF" />
            </div>
          )}
          <div className="col-span-full flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary">Salvar</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
              <th className="py-2">Nome</th>
              <th>CPF</th>
              <th>Cargo</th>
              <th>Departamento</th>
              <th>Escala</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="py-2 font-medium">{f.nome}</td>
                <td>{f.cpf}</td>
                <td>{f.cargo || "—"}</td>
                <td>{f.departamento || "—"}</td>
                <td>{f.escala_nome || "—"}</td>
                <td>
                  <span className={`badge ${f.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                    {f.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Nenhum funcionário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
