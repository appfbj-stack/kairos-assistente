export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8040/api";
}

export function minToHHMM(min: number): string {
  const sign = min < 0 ? "-" : "";
  const a = Math.abs(Math.round(min));
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}h${String(a % 60).padStart(2, "0")}`;
}

export function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
}

export function fmtDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstDayOfMonthISO(): string {
  return new Date().toISOString().slice(0, 8) + "01";
}
