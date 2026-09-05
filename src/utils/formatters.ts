/**
 * Convierte un string de hora en formato HH:MM (militar/24h) a formato 12 horas con AM/PM
 * o lo mantiene si timeFormat es '24h'.
 *
 * Ejemplos con timeFormat = '12h':
 *   "08:00" -> "8:00 AM"
 *   "12:30" -> "12:30 PM"
 *   "14:00" -> "2:00 PM"
 *   "20:15" -> "8:15 PM"
 */
export function formatTime(timeStr: string | undefined | null, timeFormat: '12h' | '24h' = '12h'): string {
  if (!timeStr) return "";
  const str = String(timeStr).trim();
  if (timeFormat === '24h') return str;

  // Si ya tiene AM/PM, devolver tal cual
  if (str.toUpperCase().includes("AM") || str.toUpperCase().includes("PM")) {
    return str;
  }

  const parts = str.split(":");
  if (parts.length < 2) return str;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return str;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${ampm}`;
}
