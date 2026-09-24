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
/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del dispositivo.
 * Evita el problema común de toISOString().split("T")[0] que al operar en UTC
 * salta prematuramente al día siguiente durante la tarde/noche en husos horarios de América.
 */
export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAppointmentDateLabel(dateStr: string | undefined | null): {
  isToday: boolean;
  isTomorrow: boolean;
  isDifferentDay: boolean;
  badge: string;
  dayDescription: string;
  shortLabel: string;
} {
  if (!dateStr) {
    return {
      isToday: false,
      isTomorrow: false,
      isDifferentDay: false,
      badge: "Cita",
      dayDescription: "",
      shortLabel: ""
    };
  }

  const cleanDate = dateStr.trim();
  const todayStr = getLocalDateString();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowObj);

  if (cleanDate === todayStr) {
    return {
      isToday: true,
      isTomorrow: false,
      isDifferentDay: false,
      badge: "⚡ PARA HOY",
      dayDescription: "Hoy",
      shortLabel: "Hoy"
    };
  }

  if (cleanDate === tomorrowStr) {
    const parts = cleanDate.split("-");
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const day = parts[2] ? parseInt(parts[2], 10) : "";
    const mName = parts[1] ? (months[parseInt(parts[1], 10) - 1] || parts[1]) : "";
    const dateFormatted = day ? `${day} ${mName}` : cleanDate;

    return {
      isToday: false,
      isTomorrow: true,
      isDifferentDay: true,
      badge: "🗓️ PARA MAÑANA",
      dayDescription: `Mañana (${dateFormatted})`,
      shortLabel: `Mañana`
    };
  }

  // Future or different day
  const parts = cleanDate.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let dayFormatted = cleanDate;
  if (parts.length === 3) {
    const dayNum = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const mName = months[mIdx] || parts[1];
    dayFormatted = `${dayNum} de ${mName}`;
  }

  return {
    isToday: false,
    isTomorrow: false,
    isDifferentDay: true,
    badge: `🗓️ DÍA DISTINTO (${dayFormatted})`,
    dayDescription: `el ${dayFormatted}`,
    shortLabel: dayFormatted
  };
}

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
