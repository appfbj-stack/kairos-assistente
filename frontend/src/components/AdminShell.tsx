"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface AdminShellProps {
  title: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminShell({ title, onRefresh, actions, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#07071a" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} onRefresh={onRefresh} actions={actions} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6" style={{ background: "#07071a" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
