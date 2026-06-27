"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { fmtDateTime } from "@/lib/utils";
import { Camera, MapPin, CheckCircle2, XCircle } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída p/ almoço",
  retorno_almoco: "Retorno do almoço",
  saida_final: "Saída final",
};

export default function PontoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState("");
  const [hoje, setHoje] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    try {
      setHoje(await api.ponto.hoje());
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
  }

  useEffect(() => {
    carregar();
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoErr("Não foi possível obter sua localização. Habilite o GPS."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        /* câmera opcional — backend trata ausência de selfie conforme config */
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capturarSelfie(): string {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext("2d")?.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL("image/jpeg", 0.7);
  }

  async function registrar(tipo: string) {
    setLoading(true);
    setMsg(null);
    try {
      const selfie = capturarSelfie();
      await api.ponto.registrar({
        tipo,
        gps_lat: coords?.lat,
        gps_lng: coords?.lng,
        selfie,
        dispositivo: navigator.userAgent,
      });
      setMsg({ ok: true, text: `${TIPO_LABEL[tipo]} registrada com sucesso!` });
      await carregar();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  }

  const proximo = hoje?.proximo_tipo;

  return (
    <Shell title="Registrar Ponto">
      <div className="mx-auto max-w-md space-y-4">
        <div className="card flex flex-col items-center">
          <div className="relative mb-3 h-48 w-64 overflow-hidden rounded-xl bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white">
              <Camera size={16} />
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 text-sm">
            <MapPin size={16} className={coords ? "text-green-600" : "text-amber-500"} />
            {coords ? (
              <span className="text-slate-500">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="text-amber-600">{geoErr || "Obtendo localização…"}</span>
            )}
          </div>

          {proximo ? (
            <button className="btn-primary w-full py-3 text-base" disabled={loading} onClick={() => registrar(proximo)}>
              {loading ? "Registrando…" : `Bater ponto: ${TIPO_LABEL[proximo]}`}
            </button>
          ) : (
            <p className="text-sm text-green-600">Todos os pontos do dia foram registrados ✅</p>
          )}

          <div className="mt-3 grid w-full grid-cols-2 gap-2">
            {Object.keys(TIPO_LABEL).map((t) => (
              <button
                key={t}
                className="btn-ghost text-xs"
                disabled={loading}
                onClick={() => registrar(t)}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          {msg && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${msg.ok ? "text-green-600" : "text-red-500"}`}>
              {msg.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {msg.text}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold">Marcações de hoje</h2>
          {hoje?.registros?.length ? (
            <ul className="space-y-2">
              {hoje.registros.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>{TIPO_LABEL[r.tipo]}</span>
                  <span className="text-slate-500">{fmtDateTime(r.registrado_em).slice(-8)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma marcação registrada hoje.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
