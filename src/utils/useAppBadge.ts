import { useEffect, useMemo } from "react";
import { Appointment } from "../types";
import { setAppIconBadge, clearAppIconBadge, isAppBadgeSupported } from "./appBadge";

interface UseAppBadgeOptions {
  appointments: Appointment[];
  loggedBarberId?: string | null;
  clientPhone?: string | null;
  role?: "admin" | "barber" | "client" | "superadmin" | "receptionist";
  salonName?: string;
  enabled?: boolean;
}

/**
 * Hook to synchronize the App Badging API (App Icon Badge) with pending appointments.
 * Calculates active pending/confirmed/in-progress appointments for the current session.
 */
export function useAppBadge({
  appointments,
  loggedBarberId,
  clientPhone,
  role = "admin",
  salonName,
  enabled = true
}: UseAppBadgeOptions) {
  const isSupported = useMemo(() => isAppBadgeSupported(), []);

  // Compute pending appointments for today
  const pendingCount = useMemo(() => {
    if (!enabled || !appointments || appointments.length === 0) return 0;

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    return appointments.filter((app) => {
      // Must not be completed or canceled
      if (app.status === "completed" || app.status === "canceled") return false;

      // Filter by barber if logged in as barber
      if (role === "barber" && loggedBarberId) {
        if (app.barberId !== loggedBarberId) return false;
      }

      // Filter by client phone if logged in as client
      if (role === "client" && clientPhone) {
        const cleanClientPhone = (clientPhone || "").replace(/\D/g, "");
        const cleanAppPhone = (app.clientPhone || "").replace(/\D/g, "");
        if (cleanClientPhone && cleanAppPhone && cleanClientPhone !== cleanAppPhone) {
          return false;
        }
      }

      // We consider today's or future active appointments
      const isTodayOrFuture = !app.date || app.date >= todayStr;
      return isTodayOrFuture;
    }).length;
  }, [appointments, loggedBarberId, clientPhone, role, enabled]);

  useEffect(() => {
    if (!enabled) {
      clearAppIconBadge(salonName);
      return;
    }

    if (pendingCount > 0) {
      setAppIconBadge(pendingCount, salonName);
    } else {
      clearAppIconBadge(salonName);
    }
  }, [pendingCount, salonName, enabled]);

  return {
    badgeCount: pendingCount,
    isSupported,
    clearBadge: () => clearAppIconBadge(salonName),
    setBadge: (count: number) => setAppIconBadge(count, salonName)
  };
}
