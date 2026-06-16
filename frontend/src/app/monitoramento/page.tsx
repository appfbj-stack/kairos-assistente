"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Activity, Server, Clock } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

function GaugeBar({ value, color = "blue" }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };
  const auto = value > 85 ? "red" : value > 65 ? "yellow" : value > 40 ? "blue" : "green";
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all duration-500", colors[color || auto])}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

export default function MonitoramentoPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try { setStats(await api.vps.stats()); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <AdminShell title="VPS · Monitoramento" onRefresh={load}>
      {loading && !stats ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <Server size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : stats ? (
        <div className="space-y-4 max-w-2xl">
          {/* System info */}
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-lg flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{stats.system?.hostname}</p>
                <p className="text-xs text-gray-400">{stats.system?.platform}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Online</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Clock size={14} className="text-gray-400" />
                <span className="text-xs">Uptime: <strong>{stats.system?.uptimeFormatted}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Cpu size={14} className="text-gray-400" />
                <span className="text-xs">Load: <strong>{stats.system?.loadAvg?.join(" · ")}</strong></span>
              </div>
            </div>
          </div>

          {/* CPU */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-blue-500" />
                <p className="text-sm font-medium">CPU</p>
              </div>
              <p className="text-sm font-bold text-blue-600">{stats.cpu?.usage}%</p>
            </div>
            <GaugeBar value={stats.cpu?.usage ?? 0} />
            <p className="text-xs text-gray-400 mt-1">{stats.cpu?.count} cores · {stats.cpu?.model}</p>
          </div>

          {/* Memory */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MemoryStick size={16} className="text-purple-500" />
                <p className="text-sm font-medium">Memória RAM</p>
              </div>
              <p className="text-sm font-bold text-purple-600">{stats.memory?.percent}%</p>
            </div>
            <GaugeBar value={stats.memory?.percent ?? 0} color="blue" />
            <p className="text-xs text-gray-400 mt-1">
              {stats.memory?.usedFormatted} / {stats.memory?.totalFormatted} usados
            </p>
          </div>

          {/* Disk */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-orange-500" />
                <p className="text-sm font-medium">Disco</p>
              </div>
              <p className="text-sm font-bold text-orange-600">{stats.disk?.percent}%</p>
            </div>
            <GaugeBar value={stats.disk?.percent ?? 0} color="blue" />
            <p className="text-xs text-gray-400 mt-1">
              {stats.disk?.usedFormatted} / {stats.disk?.totalFormatted} usados
            </p>
          </div>

          <p className="text-xs text-gray-400 text-center">Atualiza a cada 10 segundos</p>
        </div>
      ) : null}
    </AdminShell>
  );
}
