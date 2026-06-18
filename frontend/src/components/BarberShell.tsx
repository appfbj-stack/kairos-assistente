"use client";

import { useState } from "react";
import BarberSidebar from "./BarberSidebar";
import TopBar from "./TopBar";

interface BarberShellProps {
  title: string;
  empresaName?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function BarberShell({ title, empresaName, onRefresh, actions, onLogout, children }: BarberShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <BarberSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} empresaName={empresaName} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} onRefresh={onRefresh} actions={actions} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
