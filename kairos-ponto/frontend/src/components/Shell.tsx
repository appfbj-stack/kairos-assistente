"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import type { SessionUser } from "@/services/api";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_EMPRESA: "Administrador",
  SUPERVISOR: "Supervisor",
  FUNCIONARIO: "Funcionário",
};

export default function Shell({
  children,
  title,
  allowedRoles,
}: {
  children: React.ReactNode;
  title: string;
  allowedRoles?: SessionUser["role"][];
}) {
  const { user, ready, logout } = useAuth(allowedRoles);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kairos_ponto_theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kairos_ponto_theme", next ? "dark" : "light");
  }

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Carregando…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium">{user.name || user.email}</p>
              <p className="text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
