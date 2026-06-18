import { queryAll } from "../database/database.js";

const SLOT_STEP_MINUTES = 15;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function getAvailableSlots(
  empresaId: string,
  professionalId: string,
  date: string,
  serviceDurationMinutes: number,
  professional: { working_days: string; working_start: string; working_end: string }
): Promise<string[]> {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  const workingDays = professional.working_days.split(",").map((d) => Number(d.trim()));
  if (!workingDays.includes(weekday)) return [];

  const dayStart = toMinutes(professional.working_start);
  const dayEnd = toMinutes(professional.working_end);

  const booked = await queryAll(
    `SELECT scheduled_at, duration_minutes FROM barber_appointments
     WHERE empresa_id = ? AND professional_id = ? AND status != 'cancelado'
       AND scheduled_at >= ? AND scheduled_at < ?`,
    [empresaId, professionalId, `${date}T00:00:00`, `${date}T23:59:59`]
  );

  const busyRanges = booked.map((b: any) => {
    const start = toMinutes(String(b.scheduled_at).slice(11, 16));
    return { start, end: start + Number(b.duration_minutes) };
  });

  const slots: string[] = [];
  for (let start = dayStart; start + serviceDurationMinutes <= dayEnd; start += SLOT_STEP_MINUTES) {
    const end = start + serviceDurationMinutes;
    const overlaps = busyRanges.some((b) => start < b.end && end > b.start);
    if (!overlaps) slots.push(toHHMM(start));
  }
  return slots;
}
