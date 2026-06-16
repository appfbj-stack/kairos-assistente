"use client";

import { Settings, Info, Database, Shield } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

export default function ConfiguracoesPage() {
  return (
    <AdminShell title="Configurações">
      <div className="space-y-4 max-w-2xl">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-kairos-500" />
            <h2 className="text-sm font-semibold">Sobre o Sistema</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700">
              <span className="text-gray-500">Versão</span>
              <span className="font-medium">Kairos Admin 2.0</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700">
              <span className="text-gray-500">Backend</span>
              <span className="font-medium">Express.js + PostgreSQL</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700">
              <span className="text-gray-500">Frontend</span>
              <span className="font-medium">Next.js 15 + React 19</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">LLM</span>
              <span className="font-medium">OpenRouter API</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-kairos-500" />
            <h2 className="text-sm font-semibold">Atalhos Rápidos</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/ia", label: "🤖 Configurar LLM" },
              { href: "/logs", label: "📋 Ver Logs" },
              { href: "/licencas", label: "🔑 Gerenciar Licenças" },
              { href: "/monitoramento", label: "🖥️ Monitorar VPS" },
              { href: "/financeiro", label: "💰 Relatório Financeiro" },
              { href: "/clientes", label: "👥 Clientes" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-kairos-500" />
            <h2 className="text-sm font-semibold">Banco de Dados</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">PostgreSQL · Backup automático a cada 6 horas</p>
          <p className="text-xs text-gray-400">O backup é exportado como JSON para o volume Docker.</p>
        </div>
      </div>
    </AdminShell>
  );
}
