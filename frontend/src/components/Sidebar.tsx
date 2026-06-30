"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home, MessageSquare, Bot, Wrench, FileText,
    Settings, Cpu, Zap, History, BarChart2,
    ChevronDown, Sun, LogOut, X,
    LayoutDashboard, Users, AppWindow, Key,
    DollarSign, Server, Brain, ScrollText, Calendar,
} from "lucide-react";

const navItems = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Conversas", href: "/chat", icon: MessageSquare },
  { label: "Agentes", href: "/agentes", icon: Bot },
  { label: "Ferramentas", href: "/ferramentas", icon: Wrench },
  { label: "Documentos", href: "/documentos", icon: FileText },
  { label: "MCPs", href: "/aion", icon: Cpu },
  { label: "Skills", href: "/skills", icon: Zap },
  { label: "Historico", href: "/historico", icon: History },
  { label: "Painel", href: "/painel", icon: BarChart2 },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings },
  ];

// Admin nav items (para o AdminShell)
const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { label: "Clientes", href: "/clientes", icon: Users, group: "main" },
  { label: "Aplicativos", href: "/aplicativos", icon: AppWindow, group: "main" },
  { label: "Licencas", href: "/licencas", icon: Key, group: "main" },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, group: "main" },
  { label: "VPS", href: "/monitoramento", icon: Server, group: "main" },
  { label: "Chat IA", href: "/chat", icon: MessageSquare, group: "tools" },
  { label: "Agenda", href: "/agenda", icon: Calendar, group: "tools" },
  { label: "IA & Modelos", href: "/ia", icon: Brain, group: "system" },
  { label: "Logs", href: "/logs", icon: ScrollText, group: "system" },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings, group: "system" },
  ];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();

  const groups = [
    { id: "main", label: "Administracao" },
    { id: "tools", label: "Ferramentas" },
    { id: "system", label: "Sistema" },
      ];

  return (
        <>
          {/* Mobile overlay */}
          {open && (
                  <div
                              className="fixed inset-0 z-30 lg:hidden"
                              style={{ background: "rgba(0,0,0,0.6)" }}
                              onClick={onClose}
                            />
                )}
        
          {/* Sidebar */}
              <aside
                        className={[
                                    "fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300",
                                    open ? "translate-x-0" : "-translate-x-full",
                                    "lg:translate-x-0 lg:static lg:z-auto",
                                  ].join(" ")}
                        style={{
                                    width: "185px",
                                    background: "#06061a",
                                    borderRight: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                {/* Logo */}
                      <div className="flex flex-col items-center px-4 pt-6 pb-5">
                                <div
                                              className="relative flex items-center justify-center mb-3"
                                              style={{
                                                              width: "68px",
                                                              height: "68px",
                                                              borderRadius: "50%",
                                              }}
                                            >
                                  {/* Outer glow */}
                                            <div
                                                            className="absolute inset-0 rounded-full"
                                                            style={{
                                                                              background: "radial-gradient(circle at 35% 35%, rgba(59,130,246,0.5), rgba(6,6,26,0.9))",
                                                                              boxShadow: "0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.15)",
                                                            }}
                                                          />
                                  {/* Spinning ring */}
                                            <div
                                                            className="absolute inset-0 rounded-full animate-spin-slow"
                                                            style={{
                                                                              background: "conic-gradient(from 0deg, transparent 60%, rgba(59,130,246,0.9) 80%, rgba(245,158,11,0.8) 90%, transparent 100%)",
                                                            }}
                                                          />
                                  {/* Inner circle */}
                                            <div
                                                            className="absolute rounded-full"
                                                            style={{
                                                                              inset: "3px",
                                                                              background: "radial-gradient(circle at 35% 35%, #1e3a8a, #06061a)",
                                                            }}
                                                          />
                                  {/* Orb */}
                                            <div
                                                            className="relative z-10 rounded-full"
                                                            style={{
                                                                              width: "34px",
                                                                              height: "34px",
                                                                              background: "radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6, #1e40af)",
                                                                              boxShadow: "0 0 15px rgba(147,197,253,0.9), 0 0 30px rgba(59,130,246,0.5)",
                                                            }}
                                                          />
                                </div>div>
                                <h2 className="font-bold text-white text-[17px] tracking-wide">Kairos</h2>h2>
                                <p className="text-[11px] text-center mt-0.5 leading-tight" style={{ color: "#64748b" }}>
                                            Inteligencia que age<br />no momento certo.
                                </p>p>
                      </div>div>
              
                {/* Nav - Admin items */}
                      <nav className="flex-1 overflow-y-auto px-3 py-2">
                        {groups.map((group) => {
                                    const items = adminNavItems.filter((i) => i.group === group.id);
                                    return (
                                                    <div key={group.id} className="mb-3">
                                                                    <p
                                                                                        className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1"
                                                                                        style={{ color: "#334155", letterSpacing: "0.08em" }}
                                                                                      >
                                                                      {group.label}
                                                                    </p>p>
                                                      {items.map((item) => {
                                                                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                                                        return (
                                                                                              <Link
                                                                                                                      key={item.href}
                                                                                                                      href={item.href}
                                                                                                                      onClick={onClose}
                                                                                                                      className={["sidebar-nav-item", isActive ? "active" : ""].join(" ")}
                                                                                                                    >
                                                                                                                    <item.icon size={15} className="flex-shrink-0" />
                                                                                                                    <span>{item.label}</span>span>
                                                                                                </Link>Link>
                                                                                            );
                                                    })}
                                                    </div>div>
                                                  );
                      })}
                      </nav>nav>
              
                {/* User profile */}
                      <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                <div
                                              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                                              style={{ transition: "background 0.2s" }}
                                            >
                                            <div
                                                            className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-semibold text-white"
                                                            style={{
                                                                              width: "30px",
                                                                              height: "30px",
                                                                              background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                                                                              boxShadow: "0 0 10px rgba(59,130,246,0.4)",
                                                            }}
                                                          >
                                                          A
                                            </div>div>
                                            <div className="flex-1 min-w-0">
                                                          <p className="text-[13px] font-semibold text-white truncate">Admin</p>p>
                                                          <p className="text-[11px] truncate" style={{ color: "#64748b" }}>Administrador</p>p>
                                            </div>div>
                                            <ChevronDown size={13} style={{ color: "#475569", flexShrink: 0 }} />
                                </div>div>
                      </div>div>
              
                {/* Kairos Online status */}
                      <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                <div className="flex items-center gap-2 mb-0.5">
                                            <span className="status-online" />
                                            <span className="text-[12px] font-semibold" style={{ color: "#22c55e" }}>Kairos Online</span>span>
                                </div>div>
                                <p className="text-[11px] pl-4" style={{ color: "#475569" }}>Todos os sistemas operando</p>p>
                      </div>div>
              
                {/* Bottom actions */}
                      <div
                                  className="flex items-center justify-between px-4 py-3"
                                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                                >
                                <button className="btn-icon-ghost">
                                            <Sun size={15} />
                                </button>button>
                                <button className="btn-icon-ghost lg:hidden" onClick={onClose}>
                                            <X size={15} />
                                </button>button>
                                <button className="btn-icon-ghost">
                                            <LogOut size={15} />
                                </button>button>
                      </div>div>
              </aside>aside>
        </>>
      );
}</>
