"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Smartphone, Palette, MessageSquare } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";

export default function ConfiguracoesPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [configs, setConfigs] = useState<any>({ configs: [], whatsapp: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState({
    widget_title: "Atendimento",
    widget_subtitle: "Olá! Como podemos ajudar?",
    widget_color: "#8B5CF6",
    widget_position: "right",
  });
  const [whatsappConfig, setWhatsappConfig] = useState({
    provider: "evolution",
    phone_number: "",
    api_key: "",
    webhook_url: "",
    webhook_secret: "",
    active: false,
  });

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const data = await api.atendimento.configs.get(eid);
      setConfigs(data);
      const cfgMap: Record<string, string> = {};
      (data.configs || []).forEach((c: any) => { cfgMap[c.key] = c.value; });
      setWidgetConfig({
        widget_title: cfgMap.widget_title || "Atendimento",
        widget_subtitle: cfgMap.widget_subtitle || "Olá! Como podemos ajudar?",
        widget_color: cfgMap.widget_color || "#8B5CF6",
        widget_position: cfgMap.widget_position || "right",
      });
      const wa = data.whatsapp?.[0];
      if (wa) {
        setWhatsappConfig({
          provider: wa.provider || "evolution",
          phone_number: wa.phone_number || "",
          api_key: wa.api_key || "",
          webhook_url: wa.webhook_url || "",
          webhook_secret: wa.webhook_secret || "",
          active: wa.active || false,
        });
      }
    } catch {}
    setLoading(false);
  }

  async function saveWidget() {
    setSaving(true);
    try {
      await Promise.all([
        api.atendimento.configs.set(empresaId, "widget_title", widgetConfig.widget_title),
        api.atendimento.configs.set(empresaId, "widget_subtitle", widgetConfig.widget_subtitle),
        api.atendimento.configs.set(empresaId, "widget_color", widgetConfig.widget_color),
        api.atendimento.configs.set(empresaId, "widget_position", widgetConfig.widget_position),
      ]);
      alert("Configurações salvas!");
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  async function saveWhatsapp() {
    setSaving(true);
    try {
      await api.atendimento.configs.whatsapp.update(empresaId, whatsappConfig);
      alert("Configurações do WhatsApp salvas!");
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  return (
    <AdminShell title="Configurações" onRefresh={() => empresaId && load(empresaId)}>
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-kairos-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Widget de Atendimento</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Título</label>
                <input className="input w-full" value={widgetConfig.widget_title}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, widget_title: e.target.value })} />
              </div>
              <div>
                <label className="label">Subtítulo</label>
                <input className="input w-full" value={widgetConfig.widget_subtitle}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, widget_subtitle: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cor do tema</label>
                  <input type="color" className="input w-full h-10" value={widgetConfig.widget_color}
                    onChange={(e) => setWidgetConfig({ ...widgetConfig, widget_color: e.target.value })} />
                </div>
                <div>
                  <label className="label">Posição</label>
                  <select className="input w-full" value={widgetConfig.widget_position}
                    onChange={(e) => setWidgetConfig({ ...widgetConfig, widget_position: e.target.value })}>
                    <option value="right">Direita</option>
                    <option value="left">Esquerda</option>
                  </select>
                </div>
              </div>
              <button onClick={saveWidget} disabled={saving} className="btn-primary text-sm mt-2">
                <Save size={14} className="mr-1" /> Salvar Widget
              </button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-kairos-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">WhatsApp / Evolution API</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Provedor</label>
                <select className="input w-full" value={whatsappConfig.provider}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value })}>
                  <option value="evolution">Evolution API</option>
                  <option value="meta">Meta (WhatsApp Cloud)</option>
                </select>
              </div>
              <div>
                <label className="label">Número de telefone</label>
                <input className="input w-full" placeholder="5511999999999" value={whatsappConfig.phone_number}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phone_number: e.target.value })} />
              </div>
              <div>
                <label className="label">API Key</label>
                <input className="input w-full" type="password" value={whatsappConfig.api_key}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, api_key: e.target.value })} />
              </div>
              <div>
                <label className="label">Webhook URL</label>
                <input className="input w-full" value={whatsappConfig.webhook_url}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhook_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wa_active" checked={whatsappConfig.active}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, active: e.target.checked })} />
                <label htmlFor="wa_active" className="text-sm text-gray-700 dark:text-gray-300">Ativo</label>
              </div>
              <button onClick={saveWhatsapp} disabled={saving} className="btn-primary text-sm mt-2">
                <Save size={14} className="mr-1" /> Salvar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
