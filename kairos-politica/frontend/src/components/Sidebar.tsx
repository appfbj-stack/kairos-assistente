import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Handshake, Building2, ClipboardList, CalendarDays, UserCog, LogOut, Landmark } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-kairos-600 text-white" : "text-gray-600 hover:bg-kairos-50 dark:text-gray-300 dark:hover:bg-gray-800"
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isStaff = user && ["admin", "vereador", "assessor"].includes(user.role);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Landmark className="h-6 w-6 text-kairos-600" />
        <span className="text-lg font-bold text-gray-800 dark:text-white">Kairos Política</span>
      </div>

      <nav className="flex-1 space-y-1">
        <NavLink to="/" className={linkClass} end>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </NavLink>
        {isStaff && (
          <NavLink to="/cidadaos" className={linkClass}>
            <Users className="h-4 w-4" /> Cidadãos
          </NavLink>
        )}
        {isStaff && (
          <NavLink to="/liderancas" className={linkClass}>
            <Handshake className="h-4 w-4" /> Lideranças
          </NavLink>
        )}
        {isStaff && (
          <NavLink to="/parceiros" className={linkClass}>
            <Building2 className="h-4 w-4" /> Parceiros
          </NavLink>
        )}
        <NavLink to="/demandas" className={linkClass}>
          <ClipboardList className="h-4 w-4" /> {isStaff ? "Demandas" : "Minhas Demandas"}
        </NavLink>
        <NavLink to="/agenda" className={linkClass}>
          <CalendarDays className="h-4 w-4" /> Agenda
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/equipe" className={linkClass}>
            <UserCog className="h-4 w-4" /> Equipe
          </NavLink>
        )}
      </nav>

      <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
        <div className="px-2 pb-2 text-sm text-gray-500 dark:text-gray-400">{user?.name}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
