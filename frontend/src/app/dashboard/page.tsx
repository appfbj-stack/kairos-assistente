"use client";

import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  CheckSquare, Database, Users, Zap,
  MessageSquare, FileText, Volume2,
  Activity, Check, Loader2, Church, Wrench,
  LayoutGrid, DollarSign, Star, BarChart2,
  ArrowRight, Globe, Keyboard, Mic, Send,
  Plus, Grid3X3, Image,
} from "lucide-react";

export default function DashboardPage() {
  const [input, setInput] = useState("");

  const statCards = [
    { icon: CheckSquare, value: "3", label: "Tarefas pendentes", color: "#60a5fa" },
    { icon: Database, value: "2", label: "Backups realizados", color: "#60a5fa" },
    { icon: Users, value: "5", label: "Aniversariantes hoje", color: "#60a5fa" },
    { icon: Zap, value: "100%", label: "Sistemas ativos", color: "#facc15" },
  ];

  const recentActivity = [
    { icon: Church, title: "Cadastrar novo membro", sub: "Sistema Igreja", time: "09:45", done: true, color: "#60a5fa" },
    { icon: Wrench, title: "Orcamento de servico", sub: "Sistema Oficina", time: "09:30", done: true, color: "#94a3b8" },
    { icon: FileText, title: "Analise de PDF", sub: "Relatorio_abril.pdf", time: "09:15", done: true, color: "#60a5fa" },
    { icon: LayoutGrid, title: "Organizar pasta", sub: "Acao no computador", time: "08:50", done: true, color: "#facc15" },
    { icon: BarChart2, title: "Relatorio financeiro", sub: "Sistema Financeiro", time: "08:30", done: false, color: "#60a5fa" },
    { icon: Database, title: "Backup completo", sub: "Todos os sistemas", time: "Ontem", done: true, color: "#60a5fa" },
  ];

  const connectedSystems = [
    { icon: Church, name: "Igreja" },
    { icon: Wrench, name: "Oficina" },
    { icon: LayoutGrid, name: "Vidracaria" },
    { icon: DollarSign, name: "Financeiro" },
  ];

  const suggestions = [
    { icon: BarChart2, title: "Gerar relatorio mensal", sub: "Financeiro", color: "#60a5fa" },
    { icon: FileText, title: "Importar dados do Excel", sub: "Membros", color: "#34d399" },
    { icon: Database, title: "Fazer backup agora", sub: "Proteja seus dados", color: "#60a5fa" },
  ];

  const actionCards = [
    { icon: MessageSquare, title: "Conversar", desc: "Bate-papo inteligente", color: "#60a5fa", bg: "rgba(59,130,246,0.1)", href: "/chat" },
    { icon: FileText, title: "Analisar documento", desc: "Leia e extraia informacoes", color: "#34d399", bg: "rgba(16,185,129,0.1)", tc: "#34d399", href: "/documentos" },
    { icon: Image, title: "Analisar imagem", desc: "Entenda o que voce ve", color: "#c084fc", bg: "rgba(139,92,246,0.1)", href: "/documentos" },
    { icon: Zap, title: "Executar tarefa", desc: "Automatize processos", color: "#facc15", bg: "rgba(234,179,8,0.1)", tc: "#facc15", href: "/ferramentas" },
    { icon: Volume2, title: "Falar", desc: "Converse por voz", color: "#60a5fa", bg: "rgba(59,130,246,0.07)", href: "/chat" },
  ];

  return (
    <AdminShell title="Inicio">
      <div className="space-y-5 animate-fade-in">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-white leading-tight">
              Bom dia, <span style={{ color: "#f59e0b" }}>Fernando!</span> 👋
            </h1>
            <p className="text-[14px] mt-1" style={{ color: "#94a3b8" }}>
              Estou aqui para ajudar voce a fazer mais, em menos tempo.
            </p>
          </div>
          <div className="relative flex-shrink-0 hidden xl:block" style={{ width: "110px", height: "110px" }}>
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, rgba(59,130,246,0.5), rgba(139,92,246,0.3), transparent 70%)", boxShadow: "0 0 50px rgba(59,130,246,0.35)" }} />
            <div className="absolute inset-3 rounded-full animate-spin-slow" style={{ background: "conic-gradient(from 0deg, transparent 60%, rgba(59,130,246,0.9) 80%, rgba(245,158,11,0.8) 90%, transparent 100%)" }} />
            <div className="absolute rounded-full" style={{ inset: "14px", background: "radial-gradient(circle at 35% 30%, rgba(147,197,253,0.7), rgba(59,130,246,0.4))" }} />
            <div className="absolute rounded-full" style={{ inset: "30px", background: "radial-gradient(circle at 35% 35%, #bfdbfe, #3b82f6, #1e40af)", boxShadow: "0 0 15px rgba(147,197,253,0.9)" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card flex flex-col gap-2">
              <s.icon size={18} style={{ color: s.color }} />
              <div className="text-[24px] font-bold text-white leading-none">{s.value}</div>
              <div className="text-[12px]" style={{ color: "#64748b" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[18px] px-5 py-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) window.location.href = "/chat?q=" + encodeURIComponent(input.trim()); }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Como posso ajudar voce hoje?"
              className="w-full bg-transparent text-white text-[14px] outline-none mb-3 placeholder-slate-500"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" className="btn-icon-ghost p-1"><Plus size={18} /></button>
                <button type="button" className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-400">
                  <Grid3X3 size={14} />Ferramentas
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-icon-ghost p-1.5"><Mic size={17} /></button>
                <button type="submit" className="btn-send"><Send size={16} /></button>
              </div>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actionCards.map((a, i) => (
            <button key={i} onClick={() => { window.location.href = a.href; }} className="action-card flex flex-col gap-3" style={{ background: a.bg }}>
              <a.icon size={22} style={{ color: a.color }} />
              <div>
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: (a as any).tc || "#f1f5f9" }}>{a.title}</div>
                <div className="text-[11px]" style={{ color: "#64748b" }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="section-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: "#60a5fa" }} />
                <span className="text-[14px] font-semibold text-white">Atividade recente</span>
              </div>
              <button className="text-[12px]" style={{ color: "#3b82f6" }}>Ver tudo</button>
            </div>
            <div className="flex flex-col gap-0.5">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.03]">
                  <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: "30px", height: "30px", background: "rgba(255,255,255,0.05)" }}>
                    <item.icon size={13} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-white truncate">{item.title}</div>
                    <div className="text-[11px] truncate" style={{ color: "#64748b" }}>{item.sub}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px]" style={{ color: "#475569" }}>{item.time}</span>
                    {item.done
                      ? <Check size={13} style={{ color: "#22c55e" }} />
                      : <Loader2 size={13} className="animate-spin" style={{ color: "#60a5fa" }} />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={13} style={{ color: "#60a5fa" }} />
                  <span className="text-[14px] font-semibold text-white">Sistemas conectados</span>
                </div>
                <button className="text-[12px]" style={{ color: "#3b82f6" }}>Ver todos</button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {connectedSystems.map((sys, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/[0.03]">
                    <sys.icon size={13} style={{ color: "#64748b" }} />
                    <span className="text-[12px] text-white flex-1">{sys.name}</span>
                    <span className="status-online" />
                    <span className="text-[10px]" style={{ color: "#22c55e" }}>Online</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star size={13} style={{ color: "#f59e0b" }} />
                  <span className="text-[14px] font-semibold text-white">Sugestoes para voce</span>
                </div>
                <button className="text-[12px]" style={{ color: "#3b82f6" }}>Ver todas</button>
              </div>
              <div className="flex flex-col gap-1">
                {suggestions.map((sug, i) => (
                  <button key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.04] w-full text-left">
                    <sug.icon size={15} style={{ color: sug.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-white">{sug.title}</div>
                      <div className="text-[11px]" style={{ color: "#64748b" }}>{sug.sub}</div>
                    </div>
                    <ArrowRight size={13} style={{ color: "#475569" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="voice-bar px-5 py-3">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-[12px] rounded-full hover:bg-white/[0.05] px-2 py-1" style={{ color: "#64748b" }}>
              <Keyboard size={13} />Teclado
            </button>
            <div className="flex-1 flex justify-center">
              <button className="btn-mic"><Mic size={18} /></button>
            </div>
            <button className="flex items-center gap-1.5 text-[12px] rounded-full hover:bg-white/[0.05] px-2 py-1" style={{ color: "#64748b" }}>
              <Globe size={13} />Idioma
            </button>
          </div>
          <p className="text-center text-[11px] mt-2" style={{ color: "#475569" }}>Clique ou fale para conversar</p>
        </div>

        <div className="text-center text-[11px] pb-2" style={{ color: "#334155" }}>Kairos Assistente Inteligente v1.0.0</div>

      </div>
    </AdminShell>
  );
}
