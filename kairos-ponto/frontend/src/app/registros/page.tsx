"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { fmtDateTime, todayISO, firstDayOfMonthISO } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída almoço",
  retorno_almoco: "Retorno almoço",
  saida_final: "Saída final",
};

export default function RegistrosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setLista(await api.ponto.historico({ from, to }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Registros de Ponto" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
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
              <th className="py-2">Funcionário</th>
              <th>Tipo</th>
              <th>Data/Hora</th>
              <th>Geofence</th>
              <th>Facial</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id} className={`border-b border-slate-100 dark:border-slate-800/60 ${r.suspeito ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                <td className="py-2 font-medium">{r.funcionario_nome}</td>
                <td>{TIPO_LABEL[r.tipo] || r.tipo}</td>
                <td>{fmtDateTime(r.registrado_em)}</td>
                <td>
                  {r.dentro_geofence == null ? (
                    <span className="text-slate-400">—</span>
                  ) : r.dentro_geofence ? (
                    <span className="text-green-600">Dentro</span>
                  ) : (
                    <span className="text-red-500">Fora ({Math.round(r.distancia_metros)}m)</span>
                  )}
                </td>
                <td>{r.face_verificada ? <span className="text-green-600">OK</span> : <span className="text-amber-500">Pendente</span>}</td>
                <td className="uppercase text-xs text-slate-400">{r.origem}</td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Nenhum registro no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
