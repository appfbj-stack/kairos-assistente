"use client";

import { useEffect, useState } from "react";
import { Key, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

export default function LicenciamentoPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [tenantLicense, setTenantLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    const empresaName = localStorage.getItem("empresa_name") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const lic = await api.core.supervisor.status(eid);
      setTenantLicense(lic.tenant_license || lic);
    } catch {}
    setLoading(false);
  }

  const statusIcon: Record<string, any> = {
    ATIVA: CheckCircle,
    TRIAL: Clock,
    SUSPENSA: XCircle,
    EXPIRADA: AlertTriangle,
    BLOQUEADA: XCircle,
  };

  const statusColor: Record<string, string> = {
    ATIVA: "text-green-500",
    TRIAL: "text-yellow-500",
    SUSPENSA: "text-red-500",
    EXPIRADA: "text-orange-500",
    BLOQUEADA: "text-red-500",
  };

  function daysUntil(expiresAt: string) {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <AdminShell title="Licenciamento" onRefresh={() => empresaId && load(empresaId)}>
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="max-w-xl space-y-4">
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !tenantLicense ? (
              <div className="text-center text-gray-400 text-sm py-8">
                Nenhuma licença encontrada para esta empresa
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={clsx(statusColor[tenantLicense.status] || "text-gray-400")}>
                      {(statusIcon[tenantLicense.status] || Key)({ size: 32 })}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tenantLicense.status}
                      </h3>
                      <p className="text-xs text-gray-400">Plano: {tenantLicense.plan}</p>
                    </div>
                  </div>
                  <span className={clsx("badge text-sm", statusColor[tenantLicense.status])}>
                    {tenantLicense.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Trial</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {tenantLicense.trial ? "Sim" : "Não"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Expira em</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {tenantLicense.expires_at ? (
                        <>
                          {tenantLicense.expires_at?.slice(0, 10)}
                          {daysUntil(tenantLicense.expires_at) !== null && (
                            <span className="text-xs text-gray-400 ml-2">
                              ({daysUntil(tenantLicense.expires_at)} dias)
                            </span>
                          )}
                        </>
                      ) : "Sem expiração"}
                    </p>
                  </div>
                </div>

                {tenantLicense.blocked && tenantLicense.blocked_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Motivo: {tenantLicense.blocked_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Módulo Atendimento IA</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              O módulo de Atendimento IA requer o plano <strong>Pro</strong> para ser ativado.
              Consulte o administrador para fazer upgrade do seu plano.
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
