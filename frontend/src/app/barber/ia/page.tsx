"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function BarberIaPage() {
  const { user, ready, logout } = useBarberAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Sou a IA do Gestor do Kairos Barber. Pergunte sobre faturamento, agendamentos ou desempenho dos profissionais." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setSending(true);
    try {
      const res = await barberApi.ia(user.empresa_id, userMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${e.message}` }]);
    }
    setSending(false);
  }

  if (!ready) return null;

  return (
    <BarberShell title="IA do Gestor" onLogout={logout}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "message-user" : "message-assistant"}>
              {m.content}
            </div>
          ))}
          {sending && <div className="message-assistant">Pensando...</div>}
        </div>
        <div className="flex gap-2 pt-2">
          <input
            className="input flex-1"
            placeholder="Pergunte sobre faturamento, agenda, profissionais..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button onClick={send} disabled={sending || !input.trim()} className="btn-primary px-4">
            <Send size={16} />
          </button>
        </div>
      </div>
    </BarberShell>
  );
}
