"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Clock,
  FileText,
  Inbox,
  Bot,
  ShieldCheck,
  Building2,
  Settings,
  Fingerprint,
} from "lucide-react";
import type { SessionUser } from "@/services/api";

interface Item {
  href: string;
  label: string;
  icon: any;
  roles: SessionUser["role"][];
}

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/funcionarios", label: "Funcionários", icon: Users, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/escalas", label: "Escalas", icon: CalendarClock, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA"] },
  { href: "/registros", label: "Registros", icon: Clock, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/solicitacoes", label: "Solicitações", icon: Inbox, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/relatorios", label: "Relatórios", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/ia", label: "IA Kairos", icon: Bot, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"] },
  { href: "/auditoria", label: "Auditoria", icon: ShieldCheck, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA"] },
  { href: "/empresas", label: "Empresas", icon: Building2, roles: ["SUPER_ADMIN"] },
  { href: "/ponto", label: "Registrar Ponto", icon: Fingerprint, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR", "FUNCIONARIO"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN_EMPRESA"] },
];

export default function Sidebar({ role }: { role: SessionUser["role"] }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.roles.includes(role));

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-3 md:block dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Kairos Ponto</p>
          <p className="text-[10px] text-slate-400">Ecossistema Kairos 2.0</p>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((i) => {
          const active = pathname === i.href;
          const Icon = i.icon;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              {i.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
