import { useEffect, useCallback } from "react";
import { Appointment, Barber } from "../types";
import { playNotificationSound } from "./notificationSound";
import { showPushNotification } from "./pushNotifications";

interface ShiftStartOptions {
  appointments: Appointment[];
  barbers: Barber[];
  loggedBarberId?: string;
  role?: string;
  salonName?: string;
  onTriggerToast?: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

export interface ShiftSummaryData {
  totalToday: number;
  upcomingCount: number;
  firstAppointment: Appointment | null;
  barberName: string;
  todayDateStr: string;
}

/**
 * Calculates today's shift appointments summary for a specific barber or all barbers (admin).
 */
export function calculateShiftSummary(
  appointments: Appointment[],
  barbers: Barber[],
  loggedBarberId?: string,
  role?: string
): ShiftSummaryData {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentDay = String(now.getDate()).padStart(2, "0");
  const todayDateStr = `${currentYear}-${currentMonth}-${currentDay}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isBarberOnly = role === "barber" && !!loggedBarberId;
  const currentBarber = barbers.find(b => b.id === loggedBarberId);
  const barberName = currentBarber ? currentBarber.name : (role === "admin" ? "Administrador" : "Barbero");

  // Filter active appointments for today
  const todayAppointments = appointments.filter(app => {
    if (app.date !== todayDateStr) return false;
    if (app.status === "canceled") return false;
    if (isBarberOnly && app.barberId !== loggedBarberId) return false;
    return true;
  });

  // Sort by time
  const sortedAppointments = [...todayAppointments].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  // Find next upcoming appointment
  const upcomingAppointments = sortedAppointments.filter(app => {
    if (app.status === "completed") return false;
    const [h, m] = app.time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return true;
    const appMinutes = h * 60 + m;
    return appMinutes >= (currentMinutes - 15); // Up to 15 min past start
  });

  const firstAppointment = upcomingAppointments.length > 0 
    ? upcomingAppointments[0] 
    : (sortedAppointments.length > 0 ? sortedAppointments[0] : null);

  return {
    totalToday: todayAppointments.length,
    upcomingCount: upcomingAppointments.length,
    firstAppointment,
    barberName,
    todayDateStr
  };
}

/**
 * Hook to automatically trigger Shift Start Alarm & Summary when a barber starts work.
 */
export function useShiftStartEngine({
  appointments,
  barbers,
  loggedBarberId,
  role = "client",
  salonName = "Barbería",
  onTriggerToast
}: ShiftStartOptions) {

  const triggerShiftAlert = useCallback((force = false) => {
    if (role !== "barber" && role !== "admin" && role !== "developer") return;

    const summary = calculateShiftSummary(appointments, barbers, loggedBarberId, role);
    const storageKey = `syncbarber_shift_started_${summary.todayDateStr}_${loggedBarberId || role}`;

    if (!force) {
      try {
        const alreadyTriggered = sessionStorage.getItem(storageKey);
        if (alreadyTriggered) return;
      } catch (e) {
        console.warn(e);
      }
    }

    // Mark as triggered for this session
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch (e) {
      console.warn(e);
    }

    // 1. Synthesize Shift Start Chime
    playNotificationSound("shift_start");

    // 2. Format announcement message
    let title = `☀️ ¡Turno Iniciado! 💈`;
    let body = "";

    if (summary.totalToday === 0) {
      body = `Hola ${summary.barberName}, por ahora no tienes turnos agendados hoy. ¡Listo para recibir clientes!`;
    } else {
      const firstText = summary.firstAppointment
        ? `Primer cliente: ${summary.firstAppointment.clientName} a las ${summary.firstAppointment.time} (${summary.firstAppointment.serviceName}).`
        : "";
      body = `Tienes ${summary.totalToday} ${summary.totalToday === 1 ? "turno agendado" : "turnos agendados"} hoy. ${firstText}`;
    }

    // 3. Trigger In-App Toast
    if (onTriggerToast) {
      onTriggerToast(title, body, "success");
    }

    // 4. Trigger Web Push Notification with vibration
    showPushNotification(`${title} - ${salonName}`, {
      body,
      tag: `shift-start-${summary.todayDateStr}`,
      vibrate: [400, 150, 400, 150, 400],
      requireInteraction: true,
      type: "shift_start",
      metadata: {
        clientName: summary.firstAppointment?.clientName,
        time: summary.firstAppointment?.time,
        barberName: summary.barberName
      }
    });

    return summary;
  }, [appointments, barbers, loggedBarberId, role, salonName, onTriggerToast]);

  useEffect(() => {
    // Check on mount if user is a barber or admin and hasn't had their shift start sound today
    if (role === "barber" || role === "admin" || role === "developer") {
      const timer = setTimeout(() => {
        triggerShiftAlert(false);
      }, 1200); // Small delay to let audio context initialize smoothly
      return () => clearTimeout(timer);
    }
  }, [role, loggedBarberId, triggerShiftAlert]);

  return { triggerShiftAlert };
}
