"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, MessageSquare, Wrench, FileText,
  Settings, Cpu, Zap, History, BarChart2,
  ChevronDown, Sun, LogOut, X, Bot,
  Database, BookOpen,
} from "lucide-react";

const kairosNavItems = [
  { label: "Inicio", href: "/dashboard", icon: Home, group: "main" },
  { label: "Conversas", href: "/chat", icon: MessageSquare, group: "main" },
  { label: "Agentes", href: "/agentes", icon: Bot, group: "main" },
  { label: "Ferramentas", href: "/ferramentas", icon: Wrench, group: "main" },
  { label: "Documentos", href: "/documentos", icon: FileText, group: "main" },
  { label: "MCPs", href: "/mcps", icon: Cpu, group: "main" },
  { label: "Skills", href: "/skills", icon: Zap, group: "main" },
  { label: "Historico", href: "/historico", icon: History, group: "system" },
  { label: "Painel", href: "/painel", icon: BarChart2, group: "system" },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings, group: "system" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const groups = [
    { id: "main", label: "" },
    { id: "system", label: "Sistema" },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={[
          "fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto",
        ].join(" ")}
        style={{ width: "185px", background: "#06061a", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col items-center px-4 pt-6 pb-5">
          <div className="relative flex items-center justify-center mb-3" style={{ width: "68px", height: "68px", borderRadius: "50%" }}>
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(59,130,246,0.5), rgba(6,6,26,0.9))", boxShadow: "0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.15)" }} />
            <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ background: "conic-gradient(from 0deg, transparent 60%, rgba(59,130,246,0.9) 80%, rgba(245,158,11,0.8) 90%, transparent 100%)" }} />
            <div className="absolute rounded-full" style={{ inset: "3px", background: "radial-gradient(circle at 35% 35%, #1e3a8a, #06061a)" }} />
            <div className="relative z-10 rounded-full" style={{ width: "34px", height: "34px", background: "radial-gradient(circle at 35% 30%, #bfdbfe, #3b82f6, #1e40af)", boxShadow: "0 0 15px rgba(147,197,253,0.9), 0 0 30px rgba(59,130,246,0.5)" }} />
          </div>
          <h2 className="font-bold text-white text-[17px] tracking-wide">Kairos</h2>
          <p className="text-[11px] text-center mt-0.5 leading-tight" style={{ color: "#64748b" }}>
            Inteligencia que age<br />no momento certo.
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group) => {
            const items = kairosNavItems.filter((i) => i.group === group.id);
            return (
              <div key={group.id} className="mb-3">
                {group.label && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: "#334155" }}>
                    {group.label}
                  </p>
                )}
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
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl">
            <div className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-semibold text-white" style={{ width: "30px", height: "30px", background: "linear-gradient(135deg, #1e40af, #3b82f6)", boxShadow: "0 0 10px rgba(59,130,246,0.4)" }}>F</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Fernando</p>
              <p className="text-[11px] truncate" style={{ color: "#64748b" }}>Administrador</p>
            </div>
            <ChevronDown size={13} style={{ color: "#475569", flexShrink: 0 }} />
          </div>
        </div>

        <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="status-online" />
            <span className="text-[12px] font-semibold" style={{ color: "#22c55e" }}>Kairos Online</span>
          </div>
          <p className="text-[11px] pl-4" style={{ color: "#475569" }}>Todos os sistemas operando</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button className="btn-icon-ghost"><Sun size={15} /></button>
          <button className="btn-icon-ghost lg:hidden" onClick={onClose}><X size={15} /></button>
          <button className="btn-icon-ghost"><LogOut size={15} /></button>
        </div>
      </aside>
    </>
  );
}
