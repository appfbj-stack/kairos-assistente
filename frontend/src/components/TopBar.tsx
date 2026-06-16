"use client";

import { Menu, Moon, Sun, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export default function TopBar({ title, onMenuClick, onRefresh, actions }: TopBarProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="h-16 flex items-center px-4 gap-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-base font-semibold text-gray-900 dark:text-white flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Alternar tema"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
