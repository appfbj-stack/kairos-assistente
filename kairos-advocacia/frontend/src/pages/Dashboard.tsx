import { useEffect, useState } from "react";
import { Briefcase, Users, CalendarClock, Scale } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className="h-5 w-5 text-kairos-600" />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { api.dashboard.stats().then(setStats).catch(() => setStats({})); }, []);

  if (!stats) return <p className="text-gray-500">Carregando...</p>;

  if (user?.role === "cliente") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">Meu Painel</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Meus processos" value={stats.meus_processos ?? 0} icon={Briefcase} />
          <StatCard label="Processos ativos" value={stats.processos_ativos ?? 0} icon={Scale} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes" value={stats.total_clientes ?? 0} icon={Users} />
        <StatCard label="Processos ativos" value={stats.processos_ativos ?? 0} icon={Briefcase} />
        <StatCard label="Valor das causas ativas" value={`R$ ${Number(stats.valor_causas_ativas ?? 0).toLocaleString("pt-BR")}`} icon={Scale} />
        <StatCard label="Compromissos pendentes" value={stats.compromissos_pendentes ?? 0} icon={CalendarClock} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Próximos compromissos</h2>
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {(stats.proximos_compromissos ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">Nenhum compromisso pendente.</p>
          )}
          {(stats.proximos_compromissos ?? []).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-200">{c.titulo}</span>
              <span className="text-sm text-gray-500">{new Date(c.data_hora).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
