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

  const statusIcon: Record<string, React.ElementType> = {
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

  // Fix: renderiza o icone como JSX em vez de chamar como funcao
  function StatusIcon({ status }: { status: string }) {
        const Icon = statusIcon[status] || Key;
        return <Icon size={32} />;
  }

  return (
        <AdminShell title="Licenciamento" onRefresh={() => empresaId && load(empresaId)}>
          {!empresaId ? (
                  <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>div>
                ) : (
                  <div className="max-w-xl space-y-4">
                            <div className="card p-6">
                              {loading ? (
                                  <div className="flex items-center justify-center h-20">
                                                  <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
                                  </div>div>
                                ) : !tenantLicense ? (
                                  <div className="text-center text-gray-400 text-sm py-8">
                                                  Nenhuma licenca encontrada para esta empresa
                                  </div>div>
                                ) : (
                                  <div className="space-y-4">
                                                  <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                                        <div className={clsx(statusColor[tenantLicense.status] || "text-gray-400")}>
                                                                                                              <StatusIcon status={tenantLicense.status} />
                                                                                          </div>div>
                                                                                        <div>
                                                                                                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                                                                {tenantLicense.status}
                                                                                                                </h3>h3>
                                                                                                              <p className="text-xs text-gray-400">Plano: {tenantLicense.plan}</p>p>
                                                                                          </div>div>
                                                                    </div>div>
                                                                    <span className={clsx("badge text-sm", statusColor[tenantLicense.status])}>
                                                                      {tenantLicense.status}
                                                                    </span>span>
                                                  </div>div>
                                  
                                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                                        <p className="text-gray-400">Trial</p>p>
                                                                                        <p className="text-gray-900 dark:text-white font-medium">
                                                                                          {tenantLicense.trial ? "Sim" : "Nao"}
                                                                                          </p>p>
                                                                    </div>div>
                                                                    <div>
                                                                                        <p className="text-gray-400">Expira em</p>p>
                                                                                        <p className="text-gray-900 dark:text-white font-medium">
                                                                                          {tenantLicense.expires_at ? (
                                                            <>
                                                              {tenantLicense.expires_at?.slice(0, 10)}
                                                              {daysUntil(tenantLicense.expires_at) !== null && (
                                                                                          <span className="text-xs text-gray-400 ml-2">
                                                                                                                        ({daysUntil(tenantLicense.expires_at)} dias)
                                                                                            </span>span>
                                                                                      )}
                                                            </>>
                                                          ) : (
                                                            "Sem expiracao"
                                                          )}
                                                                                          </p>p>
                                                                    </div>div>
                                                  </div>div>
                                  
                                    {tenantLicense.blocked && tenantLicense.blocked_reason && (
                                                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                                                          <p className="text-sm text-red-700 dark:text-red-400">
                                                                                                Motivo: {tenantLicense.blocked_reason}
                                                                          </p>p>
                                                      </div>div>
                                                  )}
                                  </div>div>
                                        )}
                            </div>div>
                  
                    {/* Modulos licenciados */}
                    {tenantLicense?.modules && tenantLicense.modules.length > 0 && (
                                <div className="card p-6">
                                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                              Modulos Licenciados
                                              </h4>h4>
                                              <ul className="space-y-2">
                                                {tenantLicense.modules.map((mod: string) => (
                                                    <li key={mod} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                      {mod}
                                                    </li>li>
                                                  ))}
                                              </ul>ul>
                                </div>div>
                            )}
                  </div>div>
              )}
        </AdminShell>AdminShell>
      );
}</></div>
