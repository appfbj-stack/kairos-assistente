"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, Scissors, UserCog, Brain, LogOut, X, Sparkles } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { label: "Dashboard", href: "/barber", icon: LayoutDashboard },
  { label: "Agenda", href: "/barber/agenda", icon: Calendar },
  { label: "Clientes", href: "/barber/clientes", icon: Users },
  { label: "Serviços", href: "/barber/servicos", icon: Scissors },
  { label: "Profissionais", href: "/barber/profissionais", icon: UserCog },
  { label: "IA do Gestor", href: "/barber/ia", icon: Brain },
];

interface BarberSidebarProps {
  open: boolean;
  onClose: () => void;
  empresaName?: string;
  onLogout: () => void;
}

export default function BarberSidebar({ open, onClose, empresaName, onLogout }: BarberSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 bg-kairos-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Kairos Barber</p>
              <p className="text-[10px] text-gray-400 truncate">{empresaName || ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/barber" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                  active
                    ? "bg-kairos-50 text-kairos-600 font-medium dark:bg-kairos-900/30 dark:text-kairos-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                )}
              >
                <item.icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-red-500 dark:hover:bg-gray-800 dark:hover:text-red-400"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
