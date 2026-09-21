import { useEffect, useRef } from "react";
import { Appointment } from "../types";
import { playNotificationSound } from "./notificationSound";
import { showPushNotification } from "./pushNotifications";

interface ReminderEngineProps {
  appointments: Appointment[];
  onTriggerToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
  salonName?: string;
  loggedBarberId?: string;
  role?: string;
}

/**
 * Real-time 30-Minute Advance Reminder Engine
 * Periodically checks today's active appointments and sounds an alarm 30 minutes before arrival.
 */
export function use30MinReminderEngine({
  appointments,
  onTriggerToast,
  salonName = "Barbería",
  loggedBarberId,
  role = "client"
}: ReminderEngineProps) {
  // Keep track of appointments already alerted for 30min reminder today
  const alertedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only active for staff roles (admin, barber, developer)
    if (role !== "admin" && role !== "barber" && role !== "developer") {
      return;
    }

    // Load previously alerted IDs from sessionStorage for today
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentDay = String(now.getDate()).padStart(2, "0");
    const todayDateStr = `${currentYear}-${currentMonth}-${currentDay}`;
    const storageKey = `syncbarber_alerted_30m_${todayDateStr}`;

    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        alertedIdsRef.current = new Set(parsed);
      }
    } catch (e) {
      console.warn("Error reading 30m reminder storage:", e);
    }

    const check30MinReminders = () => {
      const checkNow = new Date();
      const currentMinutes = checkNow.getHours() * 60 + checkNow.getMinutes();

      // Filter today's active appointments
      const todayAppointments = appointments.filter((app) => {
        if (app.date !== todayDateStr) return false;
        if (app.status === "canceled" || app.status === "completed") return false;
        
        // If logged in as specific barber, only alert for this barber's appointments
        if (role === "barber" && loggedBarberId) {
          if (app.barberId !== loggedBarberId) return false;
        }

        return true;
      });

      todayAppointments.forEach((app) => {
        if (alertedIdsRef.current.has(app.id)) return;

        // Parse HH:MM
        const [h, m] = app.time.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return;

        const appMinutes = h * 60 + m;
        const diffMinutes = appMinutes - currentMinutes;

        // If appointment is between 1 and 30 minutes away
        if (diffMinutes >= 1 && diffMinutes <= 30) {
          // Mark as alerted so it doesn't trigger again
          alertedIdsRef.current.add(app.id);

          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(alertedIdsRef.current))
            );
          } catch (e) {
            console.warn(e);
          }

          const isMyOwnAppointment = role === "barber" && loggedBarberId && app.barberId === loggedBarberId;
          const alertTitle = isMyOwnAppointment 
            ? `⏰ ¡Tu Cita Inicia en ${diffMinutes} min!` 
            : `⏰ Cita en ${diffMinutes} min • ${app.barberName || salonName}`;
          
          const alertMessage = `${app.clientName} • ${app.serviceName} a las ${app.time}`;

          // 1. Play 30-min urgent alarm sound
          playNotificationSound("30min_reminder");

          // 2. Trigger in-app toast
          onTriggerToast(alertTitle, alertMessage, "warning");

          // 3. Trigger native Web Push Notification with urgent vibration
          showPushNotification(alertTitle, {
            body: alertMessage,
            tag: `30m-reminder-${app.id}`,
            vibrate: [400, 150, 400, 150, 400, 150, 400],
            requireInteraction: true,
            type: "30min_reminder",
            metadata: {
              clientName: app.clientName,
              time: app.time,
              serviceName: app.serviceName,
              barberName: app.barberName,
              appointmentId: app.id
            }
          });
        }
      });
    };

    // Run check immediately on load/update
    check30MinReminders();

    // Check every 20 seconds for high responsiveness
    const interval = setInterval(check30MinReminders, 20000);

    return () => clearInterval(interval);
  }, [appointments, onTriggerToast, salonName, loggedBarberId, role]);
}
