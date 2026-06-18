"use client";

import { useEffect, useState } from "react";
import { Calendar, TrendingUp, Clock } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import StatCard from "@/components/StatCard";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";
import { formatCurrency } from "@/lib/utils";

export default function BarberDashboardPage() {
  const { user, ready, logout } = useBarberAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      setData(await barberApi.dashboard(user.empresa_id));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  if (!ready) return null;

  return (
    <BarberShell title="Dashboard" onRefresh={load} onLogout={logout}>
      {loading || !data ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard title="Agendamentos hoje" value={data.agendamentos_hoje} icon={Calendar} color="blue" />
            <StatCard title="Agendamentos na semana" value={data.agendamentos_semana} icon={Clock} color="purple" />
            <StatCard title="Faturamento do mês" value={formatCurrency(data.faturamento_mes)} icon={TrendingUp} color="green" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">Serviços mais vendidos</h3>
              {data.top_servicos.length === 0 ? (
                <p className="text-xs text-gray-400">Sem dados ainda</p>
              ) : (
                <div className="space-y-2">
                  {data.top_servicos.map((s: any) => (
                    <div key={s.name} className="flex justify-between text-sm">
                      <span>{s.name}</span>
                      <span className="text-gray-400">{s.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3">Agendamentos por status</h3>
              {data.por_status.length === 0 ? (
                <p className="text-xs text-gray-400">Sem dados ainda</p>
              ) : (
                <div className="space-y-2">
                  {data.por_status.map((s: any) => (
                    <div key={s.status} className="flex justify-between text-sm">
                      <span className="capitalize">{s.status}</span>
                      <span className="text-gray-400">{s.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BarberShell>
  );
}
