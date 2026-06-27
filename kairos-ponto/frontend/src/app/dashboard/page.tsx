"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import StatCard from "@/components/StatCard";
import { api } from "@/services/api";
import { minToHHMM } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <Shell title="Dashboard" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      {error && <p className="text-red-500">{error}</p>}
      {!data ? (
        <p className="text-slate-400">Carregando métricas…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Funcionários ativos" value={data.funcionarios_ativos} />
            <StatCard label="Presentes hoje" value={data.presentes} accent="text-green-600" />
            <StatCard label="Ausentes" value={data.ausentes} accent="text-amber-600" />
            <StatCard label="Atrasados" value={data.atrasados} accent="text-red-500" />
            <StatCard label="Horas extras (mês)" value={minToHHMM(data.horas_extras_mes_min)} />
            <StatCard label="Banco de horas" value={minToHHMM(data.banco_horas_saldo_min)} />
            <StatCard label="Registros suspeitos hoje" value={data.registros_suspeitos_hoje} accent="text-red-500" />
            <StatCard label="Solicitações pendentes" value={data.solicitacoes_pendentes} accent="text-primary" />
          </div>

          <div className="card mt-6">
            <h2 className="mb-4 text-sm font-semibold">Frequência — últimos 7 dias</h2>
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {data.grafico_frequencia_7d?.length ? (
                data.grafico_frequencia_7d.map((d: any) => {
                  const max = Math.max(...data.grafico_frequencia_7d.map((x: any) => Number(x.presentes)), 1);
                  const h = (Number(d.presentes) / max) * 130;
                  return (
                    <div key={d.data} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-primary" style={{ height: Math.max(4, h) }} />
                      <span className="text-[10px] text-slate-400">{d.data.slice(5)}</span>
                      <span className="text-[10px] font-medium">{d.presentes}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">Sem registros no período.</p>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
