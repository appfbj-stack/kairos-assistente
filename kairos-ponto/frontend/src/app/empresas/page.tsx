"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { Plus } from "lucide-react";

export default function EmpresasPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", document: "", kairos_client_id: "", plan: "TRIAL" });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLista(await api.empresas.list());
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.empresas.create(form);
      setOpen(false);
      setForm({ name: "", document: "", kairos_client_id: "", plan: "TRIAL" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Shell title="Empresas" allowedRoles={["SUPER_ADMIN"]}>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setOpen(!open)}>
          <Plus size={16} /> Nova empresa
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {open && (
        <form onSubmit={salvar} className="card mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">CNPJ/Documento</label>
            <input className="input" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          </div>
          <div>
            <label className="label">Plano</label>
            <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option value="TRIAL">Trial</option>
              <option value="PRO">Pro</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Kairos Client ID (licença)</label>
            <input className="input" value={form.kairos_client_id} onChange={(e) => setForm({ ...form, kairos_client_id: e.target.value })} placeholder="UUID do cliente no Kairos Admin" />
          </div>
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
              <th className="py-2">Empresa</th>
              <th>Documento</th>
              <th>Plano</th>
              <th>Geofence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="py-2 font-medium">{e.name}</td>
                <td>{e.document || "—"}</td>
                <td>{e.plan}</td>
                <td>{e.geofence_lat ? `${e.geofence_raio_metros}m` : "não configurado"}</td>
                <td>
                  <span className={`badge ${e.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                    {e.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
