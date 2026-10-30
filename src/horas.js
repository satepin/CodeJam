// "HH:MM" <-> minutos desde 00:00
export function horaAMin(h) {
  if (typeof h === "number") return h;
  const [hh, mm] = String(h).split(":").map(Number);
  return hh * 60 + (mm || 0);
}
export function minAHora(min) {
  const hh = Math.floor(min / 60), mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
