"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, getToken } from "@/services/api";
import { minToHHMM, todayISO, firstDayOfMonthISO } from "@/lib/utils";
import { Download } from "lucide-react";

export default function RelatoriosPage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [funcId, setFuncId] = useState("");
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [espelho, setEspelho] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.funcionarios.list().then(setFuncionarios).catch((e) => setError(e.message));
  }, []);

  async function gerar() {
    setError("");
    if (!funcId) return setError("Selecione um funcionário.");
    try {
      setEspelho(await api.relatorios.espelho(funcId, from, to));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function baixarCsv() {
    const url = api.relatorios.espelhoCsvUrl(funcId, from, to);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `espelho_${funcId}_${from}_${to}.csv`;
    a.click();
  }

  return (
    <Shell title="Relatórios" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <label className="label">Funcionário</label>
          <select className="input" value={funcId} onChange={(e) => setFuncId(e.target.value)}>
            <option value="">Selecione…</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">De</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={gerar}>
          Gerar espelho
        </button>
        {espelho && (
          <button className="btn-ghost" onClick={baixarCsv}>
            <Download size={16} /> CSV/Excel
          </button>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {espelho && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="card"><p className="text-xs text-slate-500">Trabalhado</p><p className="text-lg font-bold">{minToHHMM(espelho.totais.trabalhado_min)}</p></div>
            <div className="card"><p className="text-xs text-slate-500">Saldo</p><p className="text-lg font-bold">{minToHHMM(espelho.totais.saldo_min)}</p></div>
            <div className="card"><p className="text-xs text-slate-500">Extras</p><p className="text-lg font-bold">{minToHHMM(espelho.totais.extra_min)}</p></div>
            <div className="card"><p className="text-xs text-slate-500">Faltas</p><p className="text-lg font-bold text-red-500">{espelho.totais.faltas}</p></div>
            <div className="card"><p className="text-xs text-slate-500">Atrasos</p><p className="text-lg font-bold text-amber-600">{espelho.totais.atrasos}</p></div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                  <th className="py-2">Data</th>
                  <th>Entrada</th>
                  <th>S. Almoço</th>
                  <th>R. Almoço</th>
                  <th>Saída</th>
                  <th>Trabalhado</th>
                  <th>Saldo</th>
                  <th>Obs</th>
                </tr>
              </thead>
              <tbody>
                {espelho.linhas.map((l: any) => (
                  <tr key={l.data} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-2">{l.data.slice(8)}/{l.data.slice(5, 7)}</td>
                    <td>{l.entrada || "—"}</td>
                    <td>{l.saida_almoco || "—"}</td>
                    <td>{l.retorno_almoco || "—"}</td>
                    <td>{l.saida_final || "—"}</td>
                    <td>{l.trabalhado}</td>
                    <td className={l.saldo.startsWith("-") ? "text-red-500" : "text-green-600"}>{l.saldo}</td>
                    <td className="text-xs">
                      {l.falta && <span className="badge bg-red-100 text-red-700">Falta</span>}
                      {l.atraso_min > 0 && <span className="badge bg-amber-100 text-amber-700">Atraso {l.atraso_min}min</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
