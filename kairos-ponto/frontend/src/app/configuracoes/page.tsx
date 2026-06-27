"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { MapPin, ShieldCheck } from "lucide-react";

export default function ConfiguracoesPage() {
  const [empresa, setEmpresa] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const lista = await api.empresas.list();
      setEmpresa(lista[0] || null);
      setLicense(await api.licenseStatus().catch(() => null));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function usarLocalizacaoAtual() {
    navigator.geolocation?.getCurrentPosition((p) =>
      setEmpresa((e: any) => ({ ...e, geofence_lat: p.coords.latitude, geofence_lng: p.coords.longitude }))
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api.empresas.update(empresa.id, {
        geofence_lat: empresa.geofence_lat ? Number(empresa.geofence_lat) : null,
        geofence_lng: empresa.geofence_lng ? Number(empresa.geofence_lng) : null,
        geofence_raio_metros: Number(empresa.geofence_raio_metros),
        geofence_obrigatorio: empresa.geofence_obrigatorio,
        face_obrigatorio: empresa.face_obrigatorio,
      });
      setMsg("Configurações salvas com sucesso.");
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!empresa) return <Shell title="Configurações" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA"]}><p className="text-slate-400">Carregando…</p></Shell>;

  return (
    <Shell title="Configurações" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA"]}>
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={salvar} className="card lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPin size={18} className="text-primary" /> Geofence & Validações
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div>
              <label className="label">Latitude</label>
              <input className="input" value={empresa.geofence_lat ?? ""} onChange={(e) => setEmpresa({ ...empresa, geofence_lat: e.target.value })} />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input className="input" value={empresa.geofence_lng ?? ""} onChange={(e) => setEmpresa({ ...empresa, geofence_lng: e.target.value })} />
            </div>
            <div>
              <label className="label">Raio (metros)</label>
              <input type="number" className="input" value={empresa.geofence_raio_metros ?? 100} onChange={(e) => setEmpresa({ ...empresa, geofence_raio_metros: e.target.value })} />
            </div>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={usarLocalizacaoAtual}>
            <MapPin size={14} /> Usar minha localização atual
          </button>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!empresa.geofence_obrigatorio} onChange={(e) => setEmpresa({ ...empresa, geofence_obrigatorio: e.target.checked })} />
              Bloquear registro fora da área permitida
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!empresa.face_obrigatorio} onChange={(e) => setEmpresa({ ...empresa, face_obrigatorio: e.target.checked })} />
              Exigir reconhecimento facial (selfie) no registro
            </label>
          </div>

          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary">Salvar configurações</button>
        </form>

        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ShieldCheck size={18} className="text-primary" /> Licença Kairos
          </h2>
          {license ? (
            <div className="space-y-1 text-sm">
              <p>
                Status:{" "}
                <span className={`badge ${license.valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {license.status}
                </span>
              </p>
              {license.days_remaining != null && <p className="text-slate-500">Dias restantes: {license.days_remaining}</p>}
              {license.message && <p className="text-xs text-slate-400">{license.message}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sem informação de licença.</p>
          )}
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
            <p><strong>Empresa:</strong> {empresa.name}</p>
            <p><strong>Plano:</strong> {empresa.plan}</p>
            <p><strong>Kairos Client ID:</strong> {empresa.kairos_client_id || "—"}</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
