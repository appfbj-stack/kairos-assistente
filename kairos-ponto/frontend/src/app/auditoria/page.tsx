"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { fmtDateTime } from "@/lib/utils";

export default function AuditoriaPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setLista(await api.auditoria(action ? { action } : {}));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Auditoria" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA"]}>
      <div className="mb-4 flex items-end gap-3">
        <div>
          <label className="label">Filtrar por ação</label>
          <input className="input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex: ponto.registrar" />
        </div>
        <button className="btn-primary" onClick={load}>
          Filtrar
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
              <th className="py-2">Data/Hora</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Detalhes</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800/60">
                <td className="py-2">{fmtDateTime(l.created_at)}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td>{l.entity || "—"}</td>
                <td className="max-w-xs truncate text-slate-500">{l.details || "—"}</td>
                <td className="text-xs text-slate-400">{l.ip || "—"}</td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Sem eventos de auditoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
