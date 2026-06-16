"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  AppWindow,
  Key,
  DollarSign,
  Server,
  Brain,
  ScrollText,
  Settings,
  MessageSquare,
  Calendar,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { label: "Clientes", href: "/clientes", icon: Users, group: "main" },
  { label: "Aplicativos", href: "/aplicativos", icon: AppWindow, group: "main" },
  { label: "Licenças", href: "/licencas", icon: Key, group: "main" },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, group: "main" },
  { label: "VPS", href: "/monitoramento", icon: Server, group: "main" },
  { label: "Chat IA", href: "/chat", icon: MessageSquare, group: "tools" },
  { label: "Agenda", href: "/agenda", icon: Calendar, group: "tools" },
  { label: "IA & Modelos", href: "/ia", icon: Brain, group: "system" },
  { label: "Logs", href: "/logs", icon: ScrollText, group: "system" },
  { label: "Configurações", href: "/configuracoes", icon: Settings, group: "system" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const groups = [
    { id: "main", label: "Administração" },
    { id: "tools", label: "Ferramentas" },
    { id: "system", label: "Sistema" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-kairos-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Kairos Admin</p>
              <p className="text-[10px] text-gray-400">v2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {groups.map((group) => {
            const items = navItems.filter((i) => i.group === group.id);
            return (
              <div key={group.id} className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </p>
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
                      {active && <ChevronRight size={14} className="opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 text-center">Kairos Admin 2.0 © 2025</p>
        </div>
      </aside>
    </>
  );
}
