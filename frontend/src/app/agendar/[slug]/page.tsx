"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Scissors, Clock, CheckCircle2, Calendar as CalendarIcon, Send, Sparkles } from "lucide-react";
import { barberApi } from "@/services/barberApi";
import { formatCurrency } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

export default function AgendarPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [empresa, setEmpresa] = useState<{ name: string } | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Oi! Eu cuido do seu agendamento por aqui. Me diga qual serviço você quer, com quem e para quando 🙂",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    barberApi.public
      .info(slug)
      .then((res) => {
        setEmpresa(res.empresa);
        setServices(res.services);
        setProfessionals(res.professionals);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    setTime("");
    setSlots([]);
    if (!serviceId || !professionalId) return;
    barberApi.public
      .disponibilidade(slug, professionalId, date, serviceId)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([]));
  }, [slug, serviceId, professionalId, date]);

  async function confirmBooking(payload: {
    serviceId: string;
    professionalId: string;
    date: string;
    time: string;
    name: string;
    phone: string;
  }) {
    setError("");
    setSubmitting(true);
    try {
      await barberApi.public.agendar(slug, {
        client_name: payload.name,
        client_phone: payload.phone,
        professional_id: payload.professionalId,
        service_id: payload.serviceId,
        scheduled_at: `${payload.date}T${payload.time}:00`,
      });
      setDone(true);
    } catch (e: any) {
      const message = e.message || "Não foi possível agendar. Tente outro horário.";
      setError(message);
      setChatMessages((prev) => [...prev, { role: "assistant", content: `${message} Pode me dizer outro horário?` }]);
    }
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !time) return;
    await confirmBooking({ serviceId, professionalId, date, time, name, phone });
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatSending || submitting) return;
    const nextHistory: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextHistory);
    setChatInput("");
    setChatSending(true);
    try {
      const res = await barberApi.public.assistente(slug, nextHistory);

      const nextServiceId = res.service_id || serviceId;
      const nextProfessionalId = res.professional_id || professionalId;
      const nextDate =
        typeof res.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(res.date) && res.date >= todayStr()
          ? res.date
          : date;
      const nextTime = typeof res.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(res.time) ? res.time : time;
      const nextName = typeof res.client_name === "string" && res.client_name.trim() ? res.client_name.trim() : name;
      const nextPhone =
        typeof res.client_phone === "string" && res.client_phone.trim() ? res.client_phone.trim() : phone;

      setServiceId(nextServiceId);
      setProfessionalId(nextProfessionalId);
      setDate(nextDate);
      setTime(nextTime);
      setName(nextName);
      setPhone(nextPhone);
      setChatMessages([...nextHistory, { role: "assistant", content: res.reply }]);

      if (res.confirmado && nextServiceId && nextProfessionalId && nextDate && nextTime && nextName && nextPhone) {
        await confirmBooking({
          serviceId: nextServiceId,
          professionalId: nextProfessionalId,
          date: nextDate,
          time: nextTime,
          name: nextName,
          phone: nextPhone,
        });
      }
    } catch {
      setChatMessages([
        ...nextHistory,
        { role: "assistant", content: "Desculpe, tive um problema para responder. Pode tentar de novo?" },
      ]);
    }
    setChatSending(false);
  }

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedProfessional = professionals.find((p) => p.id === professionalId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 text-center">
        <p className="text-gray-400">Barbearia não encontrada.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 text-center">
        <div>
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-white text-lg font-bold mb-2">Agendamento confirmado!</h1>
          <p className="text-gray-400 text-sm">
            {selectedService?.name} com {selectedProfessional?.name}
          </p>
          <p className="text-gray-400 text-sm">
            {date.split("-").reverse().join("/")} às {time} em {empresa?.name}
          </p>
        </div>
      </div>
    );
  }

  const canSubmit = serviceId && professionalId && time && name.trim() && phone.trim();

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-kairos-500 rounded-xl flex items-center justify-center mb-3">
            <Scissors size={22} className="text-white" />
          </div>
          <h1 className="text-white text-lg font-bold">{empresa?.name}</h1>
          <p className="text-gray-400 text-sm">Agende seu horário</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <Sparkles size={12} /> Agende conversando — eu confirmo tudo com você
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3 pr-1">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  m.role === "user"
                    ? "bg-kairos-500 text-white ml-auto"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {m.content}
              </div>
            ))}
            {(chatSending || submitting) && (
              <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-400">
                {submitting ? "Confirmando seu agendamento..." : "Digitando..."}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              disabled={chatSending || submitting}
              placeholder="Ex: quero cortar o cabelo amanhã às 14h"
              className="flex-1 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kairos-500 disabled:opacity-60"
            />
            <button
              onClick={sendChat}
              disabled={chatSending || submitting || !chatInput.trim()}
              className="px-3 py-2.5 bg-kairos-500 text-white rounded-lg hover:bg-kairos-600 transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <p className="text-xs text-gray-500 -mt-1 mb-1">Ou preencha manualmente:</p>
          <div>
            <p className="text-xs text-gray-400 mb-2">1. Escolha o serviço</p>
            <div className="space-y-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    serviceId === s.id ? "bg-kairos-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs opacity-80">
                    {s.duration_minutes}min · {formatCurrency(s.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {serviceId && (
            <div>
              <p className="text-xs text-gray-400 mb-2">2. Escolha o profissional</p>
              <div className="space-y-2">
                {professionals.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfessionalId(p.id)}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                      professionalId === p.id ? "bg-kairos-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {professionalId && (
            <div>
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <CalendarIcon size={12} /> 3. Escolha a data e o horário
              </p>
              <input
                type="date"
                min={todayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-kairos-500"
              />
              {slots.length === 0 ? (
                <p className="text-xs text-gray-500">Sem horários livres nesta data. Tente outro dia.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTime(s)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        time === s ? "bg-kairos-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Clock size={11} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {time && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">4. Seus dados</p>
              <input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kairos-500"
              />
              <input
                placeholder="WhatsApp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kairos-500"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {selectedService && selectedProfessional && time && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full px-4 py-3 bg-kairos-500 text-white rounded-lg text-sm font-medium hover:bg-kairos-600 transition-colors active:scale-95 disabled:opacity-40"
            >
              {submitting ? "Agendando..." : `Confirmar agendamento — ${formatCurrency(selectedService.price)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
