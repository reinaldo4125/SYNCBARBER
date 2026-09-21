// Utility to generate Google Calendar links and .ics calendar files for appointments

interface CalendarEventData {
  title: string;
  description: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
}

export function createGoogleCalendarUrl(event: CalendarEventData): string {
  const { title, description, location = "", startDate, startTime, durationMinutes } = event;
  
  try {
    const [year, month, day] = startDate.split("-").map(Number);
    const [hours, minutes] = startTime.split(":").map(Number);

    const start = new Date(year, month - 1, day, hours, minutes, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatGCalDate = (d: Date) => 
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const datesParam = `${formatGCalDate(start)}/${formatGCalDate(end)}`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: datesParam,
      details: description,
      location: location
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (e) {
    console.error("Error creating Google Calendar link:", e);
    return "#";
  }
}

export function downloadIcsFile(event: CalendarEventData) {
  const { title, description, location = "", startDate, startTime, durationMinutes } = event;

  try {
    const [year, month, day] = startDate.split("-").map(Number);
    const [hours, minutes] = startTime.split(":").map(Number);

    const start = new Date(year, month - 1, day, hours, minutes, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatIcsDate = (d: Date) => 
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const now = new Date();
    const dtstamp = formatIcsDate(now);
    const dtstart = formatIcsDate(start);
    const dtend = formatIcsDate(end);
    const uid = `syncbarber-${Date.now()}@syncbarber.app`;

    const cleanDesc = description.replace(/\n/g, "\\n").replace(/,/g, "\\,");
    const cleanTitle = title.replace(/,/g, "\\,");
    const cleanLocation = location.replace(/,/g, "\\,");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SYNCBARBER//Appointment Booking//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      `LOCATION:${cleanLocation}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Recordatorio de Cita en Peluquería",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cita-peluqueria-${startDate}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Error generating .ics calendar file:", e);
  }
}
