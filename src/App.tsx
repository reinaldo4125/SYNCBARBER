import { useState, useEffect, useRef } from "react";
import { Appointment, Service, SalonConfig, Barber, MembershipPlan, BarberReview, ClientAccount, InventoryItem, ProductSale } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Scissors, 
  User, 
  Shield, 
  Calendar as CalendarIcon, 
  Settings, 
  Bell, 
  Sparkles, 
  Smartphone,
  Phone,
  Clock,
  X,
  Share2,
  Users,
  Coins,
  Cpu,
  Linkedin,
  Package,
  Wine,
  Menu,
  LogOut,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { getLocalDateString, formatTime, formatAppointmentDateLabel } from "./utils/formatters";
import ClientDashboard from "./components/ClientDashboard";
import AdminDashboard from "./components/AdminDashboard";
import SalonSettings from "./components/SalonSettings";
import BarberLogin from "./components/BarberLogin";
import BarberManager from "./components/BarberManager";
import ClientManager from "./components/ClientManager";
import InteractiveCalendar from "./components/InteractiveCalendar";
import CommissionsManager from "./components/CommissionsManager";
import LockedModule from "./components/LockedModule";
import DeveloperPanel from "./components/DeveloperPanel";
import SyncBarberLogo from "./components/SyncBarberLogo";
import InitialSetupWizard from "./components/InitialSetupWizard";
import DemoCenter from "./components/DemoCenter";
import SyncBarberMarketing from "./components/SyncBarberMarketing";
import InventoryManager from "./components/InventoryManager";
import ModoSillaPWA from "./components/ModoSillaPWA";
import ModoKiosco from "./components/ModoKiosco";
import CierreCajaModal from "./components/CierreCajaModal";
import CatalogManager from "./components/CatalogManager";
import VersionModal from "./components/VersionModal";
import NotificationBell from "./components/NotificationBell";
import ActiveAlarmBanner from "./components/ActiveAlarmBanner";
import { CURRENT_APP_VERSION } from "./data/versionHistory";
import { Camera } from "lucide-react";
import { playNotificationSound, NotificationType } from "./utils/notificationSound";
import { showPushNotification } from "./utils/pushNotifications";
import { use30MinReminderEngine } from "./utils/use30MinReminderEngine";
import { useShiftStartEngine } from "./utils/useShiftStartEngine";
import { useAppBadge } from "./utils/useAppBadge";

interface RealTimeToast {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
}

// Global fetch interceptor to inject the current active tenant ID
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, "fetch", {
    value: function (input: any, init: any) {
      const activeTenantId = localStorage.getItem("active_tenant_id") || "bella-barba";
      
      if (typeof input === "string" && input.startsWith("/api/")) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has("x-tenant-id")) {
            init.headers.append("x-tenant-id", activeTenantId);
          }
        } else if (Array.isArray(init.headers)) {
          const hasTenantHeader = init.headers.some(([key]) => key.toLowerCase() === "x-tenant-id");
          if (!hasTenantHeader) {
            init.headers.push(["x-tenant-id", activeTenantId]);
          }
        } else {
          if (!(init.headers as any)["x-tenant-id"]) {
            init.headers = {
              ...init.headers,
              "x-tenant-id": activeTenantId
            };
          }
        }
      }
      return originalFetch.call(this, input, init);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.error("No se pudo interceptar fetch a nivel global, se usará la petición por defecto.", err);
}

export default function App() {
  // Application Roles
  const [currentRole, setCurrentRole] = useState<"client" | "admin" | "barber" | "login" | "developer" | "syncbarber" | "syncbarber">(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSalonId = params.get("salonId") || params.get("salon_id") || params.get("tenant") || params.get("tenantId");
    const activeId = urlSalonId || localStorage.getItem("active_tenant_id") || "bella-barba";
    return activeId !== "bella-barba" ? "client" : "syncbarber";
  });
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [devError, setDevError] = useState("");
  const [adminTab, setAdminTab] = useState<"agenda" | "calendar" | "commissions" | "settings" | "barbers" | "clients" | "inventory" | "catalog">("agenda");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string; username: string; role: 'admin' | 'barber'; barberId?: string; salonId?: string } | null>(null);
  const [isModoSillaActive, setIsModoSillaActive] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "silla" || params.get("pwa") === "1") return true;
    try {
      return localStorage.getItem("syncbarber_modo_silla_active") === "true";
    } catch {
      return false;
    }
  });

  // Keep Modo Silla state synchronized in localStorage across app restarts
  useEffect(() => {
    try {
      if (isModoSillaActive) {
        localStorage.setItem("syncbarber_modo_silla_active", "true");
      } else {
        localStorage.removeItem("syncbarber_modo_silla_active");
      }
    } catch (e) {
      console.error("Error persisting modo silla state:", e);
    }
  }, [isModoSillaActive]);
  const [showKioscoModal, setShowKioscoModal] = useState<boolean>(false);
  const [showCierreCajaModal, setShowCierreCajaModal] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSalonId = params.get("salonId") || params.get("salon_id") || params.get("tenant") || params.get("tenantId");
    if (urlSalonId) {
      localStorage.setItem("active_tenant_id", urlSalonId);
      return urlSalonId;
    }
    return localStorage.getItem("active_tenant_id") || "bella-barba";
  });

  // Synchronize activeTenantId with URL query params to preserve it across page refreshes
  useEffect(() => {
    if (activeTenantId) {
      const params = new URLSearchParams(window.location.search);
      const urlSalonId = params.get("salonId") || params.get("salon_id");
      
      if (activeTenantId !== "bella-barba") {
        if (urlSalonId !== activeTenantId) {
          params.set("salonId", activeTenantId);
          const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
          window.history.replaceState(null, "", newUrl);
        }
      } else if (urlSalonId && currentRole === "syncbarber") {
        // Clean up the URL for the landing page of the demo tenant
        params.delete("salonId");
        params.delete("salon_id");
        const newSearch = params.toString();
        const newUrl = newSearch 
          ? `${window.location.pathname}?${newSearch}${window.location.hash}`
          : `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [activeTenantId, currentRole]);

  // If activeTenantId changes to a custom barberia, automatically transition from marketing view to client view
  useEffect(() => {
    if (activeTenantId !== "bella-barba" && currentRole === "syncbarber") {
      setCurrentRole("client");
    }
  }, [activeTenantId, currentRole]);

  // Core synchronized State from Server
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [reviews, setReviews] = useState<BarberReview[]>([]);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [config, setConfig] = useState<SalonConfig>({
    name: "Cargando...",
    openTime: "09:00",
    closeTime: "22:00",
    workingDays: [1, 2, 3, 4, 5, 6],
    intervalMinutes: 30,
  });

  // Loading and error states
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // PWA Service Worker update state
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleSwUpdate = (e: any) => {
      if (e.detail?.registration) {
        swRegistrationRef.current = e.detail.registration;
      }
      setSwUpdateReady(true);
    };

    window.addEventListener("syncbarber_sw_update_ready", handleSwUpdate);
    return () => {
      window.removeEventListener("syncbarber_sw_update_ready", handleSwUpdate);
    };
  }, []);

  const handleApplyUpdate = () => {
    if (swRegistrationRef.current?.waiting) {
      swRegistrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  // Toast notifications
  const [toasts, setToasts] = useState<RealTimeToast[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync state refs to prevent stale closure access in SSE & interval handlers
  const loggedUserRef = useRef(loggedUser);
  loggedUserRef.current = loggedUser;

  const currentRoleRef = useRef(currentRole);
  currentRoleRef.current = currentRole;

  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  const notifiedAppointmentIdsRef = useRef<Set<string>>(new Set());
  const knownAppointmentIdsRef = useRef<Set<string>>(new Set());

  // Toast controller with audio chime sound options
  const triggerToast = (
    title: string, 
    message: string, 
    type: "success" | "info" | "warning" = "info",
    soundType: NotificationType = "new_booking"
  ) => {
    const id = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6);
    const newToast: RealTimeToast = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);
    
    // Play synthesized Web Audio chime
    playNotificationSound(soundType);

    // Auto delete after 6.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Centralized Barber & Staff Appointment Notification Engine
  const notifyBarberNewAppointment = (appointment: Appointment) => {
    if (!appointment || !appointment.id) return;

    // Prevent duplicate alert triggers for the same appointment ID
    if (notifiedAppointmentIdsRef.current.has(appointment.id)) {
      return;
    }
    notifiedAppointmentIdsRef.current.add(appointment.id);
    knownAppointmentIdsRef.current.add(appointment.id);

    const currentLogged = loggedUserRef.current;
    const currentRoleActive = currentRoleRef.current;

    let storedUser: any = null;
    try {
      const raw = localStorage.getItem("syncbarber_logged_user");
      if (raw) storedUser = JSON.parse(raw);
    } catch (e) {}

    const activeUser = currentLogged || storedUser;
    const activeBarberId = activeUser?.barberId || activeUser?.id;
    const isAssignedToMe = Boolean(activeBarberId && appointment.barberId === activeBarberId);

    // Check staff permissions (admin, barber, developer)
    const isStaff = Boolean(
      (activeUser && (activeUser.role === "admin" || activeUser.role === "barber" || activeUser.role === "developer")) ||
      currentRoleActive === "admin" || currentRoleActive === "barber" || currentRoleActive === "developer"
    );

    const dateInfo = formatAppointmentDateLabel(appointment.date);
    const formattedTimeStr = formatTime(appointment.time);

    // Floating title clearly distinguishing whether the booking is for TODAY or a DIFFERENT DAY
    let notifTitle = "";
    if (isAssignedToMe) {
      if (dateInfo.isToday) {
        notifTitle = "🚨 ¡Nueva Cita Asignada para HOY! 💈";
      } else if (dateInfo.isTomorrow) {
        notifTitle = "🗓️ ¡Nueva Cita Asignada para MAÑANA! 💈";
      } else {
        notifTitle = `🗓️ ¡Nueva Cita Asignada (${dateInfo.shortLabel})! 💈`;
      }
    } else {
      if (dateInfo.isToday) {
        notifTitle = "💈 ¡Nueva Cita Agendada para HOY!";
      } else if (dateInfo.isTomorrow) {
        notifTitle = "🗓️ ¡Nueva Cita Agendada para MAÑANA!";
      } else {
        notifTitle = `🗓️ ¡Nueva Cita Agendada (${dateInfo.shortLabel})!`;
      }
    }

    const barberSuffix = appointment.barberName ? ` • Barbero: ${appointment.barberName}` : "";
    const whenText = dateInfo.isToday 
      ? `HOY a las ${formattedTimeStr}` 
      : `${dateInfo.dayDescription} a las ${formattedTimeStr}`;

    const notifBody = `Cliente: ${appointment.clientName} | ${appointment.serviceName || "Servicio"} | ⏰ ${whenText}${barberSuffix}`;

    // Trigger floating in-app banner for staff/barbers
    if (isStaff) {
      triggerToast(
        notifTitle, 
        notifBody, 
        dateInfo.isToday ? "warning" : "success",
        "new_booking"
      );

      // Native Web Push Notification with vibration pattern
      showPushNotification(notifTitle, {
        body: notifBody,
        tag: `new-app-${appointment.id}-${Date.now()}`,
        vibrate: dateInfo.isToday ? [500, 150, 500, 150, 500] : [300, 100, 300],
        requireInteraction: true,
        metadata: {
          clientName: appointment.clientName,
          time: formattedTimeStr,
          serviceName: appointment.serviceName,
          barberName: appointment.barberName,
          appointmentId: appointment.id
        }
      });
    }

    // Broadcast window event for ModoSilla and other subviews
    window.dispatchEvent(new CustomEvent("syncbarber_new_appointment_received", {
      detail: { appointment, dateInfo, isAssignedToMe }
    }));
  };

  // Real-time 30-Minute Advance Reminder Engine
  use30MinReminderEngine({
    appointments,
    onTriggerToast: (title, message, type) => {
      triggerToast(title, message, type || "warning", "30min_reminder");
    },
    salonName: config.name || "Barbería",
    loggedBarberId: loggedUser?.barberId || loggedUser?.id,
    role: loggedUser?.role || currentRole
  });

  // Shift Start Alarm & Daily Schedule Count Engine
  useShiftStartEngine({
    appointments,
    barbers,
    loggedBarberId: loggedUser?.barberId || loggedUser?.id,
    role: loggedUser?.role || currentRole,
    salonName: config.name || "Barbería",
    onTriggerToast: (title, message, type) => {
      triggerToast(title, message, type || "success", "shift_start");
    }
  });

  // Server-Sent Events (SSE) Real-Time Listener
  useEffect(() => {
    // Clear state when activeTenantId changes to prevent stale data leaking
    setIsLoading(true);
    setAppointments([]);
    setServices([]);
    setBarbers([]);
    setClients([]);
    setReviews([]);
    setConfig({
      name: "Cargando...",
      openTime: "09:00",
      closeTime: "22:00",
      workingDays: [1, 2, 3, 4, 5, 6],
      intervalMinutes: 30,
      needsSetup: false, // Temporarily false until real configuration is fetched
    });

    let eventSource: EventSource | null = null;
    let retryInterval: any = null;
    let lastSseFailureTime = 0;

    const connectSSE = () => {
      console.log("[SSE] Intentando conectar...");
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`/api/events?salonId=${activeTenantId}`);

      eventSource.onopen = () => {
        console.log("[SSE] Conectado exitosamente al canal real-time.");
        setIsConnected(true);
        setIsLoading(false);
        setErrorText("");
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;
          console.log(`[SSE Evento] ${type}`, data);

          if (type === "init") {
            if (data.appointments && Array.isArray(data.appointments)) {
              setAppointments(data.appointments);
              data.appointments.forEach((app: Appointment) => {
                knownAppointmentIdsRef.current.add(app.id);
                notifiedAppointmentIdsRef.current.add(app.id);
              });
            }
            if (data.services) setServices(data.services);
            if (data.config) setConfig(data.config);
            if (data.barbers) setBarbers(data.barbers);
            if (data.memberships) setMemberships(data.memberships);
            if (data.reviews) setReviews(data.reviews);
            if (data.clients) setClients(data.clients);
            if (data.announcements) setAnnouncements(data.announcements);
            if (data.inventory) setInventory(data.inventory);
            if (data.sales) setSales(data.sales);
          } else if (type === "inventory_update") {
            setInventory(data);
          } else if (type === "sales_update") {
            setSales(data);
          } else if (type === "announcement_new") {
            setAnnouncements((prev) => [data, ...prev]);
            triggerToast("📢 Nuevo Anuncio Global", `${data.title}: ${data.message}`, "info");
          } else if (type === "announcements_list") {
            setAnnouncements(data);
          } else if (type === "reviews_update") {
            setReviews(data);
          } else if (type === "clients_list_update") {
            setClients(data);
          } else if (type === "client_updated") {
            setClients((prev) => prev.map((c) => c.id === data.id ? data : c));
            window.dispatchEvent(new CustomEvent("bella_barba_client_updated", { detail: data }));
          } else if (type === "barbers_update") {
            setBarbers(data);
            triggerToast("Barberos Sincronizados", "La lista de personal de la peluquería ha sido actualizada.", "info");
          } else if (type === "config_update") {
            setConfig(data);
            triggerToast("Ajustes Actualizados", "El peluquero actualizó la información de atención del salón.", "info");
          } else if (type === "services_update") {
            setServices(data);
            triggerToast("Catálogo Actualizado", "Los precios y servicios de peluquería han sido actualizados en vivo.", "info");
          } else if (type === "appointment_created") {
            if (data.appointments) {
              setAppointments(data.appointments);
            }
            if (data.appointment) {
              notifyBarberNewAppointment(data.appointment);
            }
          } else if (type === "appointment_updated") {
            setAppointments(data.appointments);

            // Check if client just checked in
            if (data.appointment.checkedIn) {
              triggerToast(
                "📍 ¡Cliente Llegó al Local!",
                `El cliente ${data.appointment.clientName} hizo Check-In en recepción.`,
                "info",
                "checkin_arrived"
              );
              showPushNotification("📍 ¡Cliente en Recepción! 💈", {
                body: `El cliente ${data.appointment.clientName} acaba de llegar para su cita de las ${data.appointment.time}`,
                tag: `checkin-${data.appointment.id}`
              });
            }

            // Check if appointment was canceled
            if (data.appointment.status === "canceled") {
              const currentLogged = loggedUserRef.current;
              const currentRoleActive = currentRoleRef.current;
              const activeBarberId = currentLogged?.barberId || currentLogged?.id;
              const isAssignedToMe = Boolean(activeBarberId && data.appointment.barberId === activeBarberId);
              const isStaff = Boolean(
                (currentLogged && (currentLogged.role === "admin" || currentLogged.role === "barber" || currentLogged.role === "developer")) ||
                currentRoleActive === "admin" || currentRoleActive === "barber" || currentRoleActive === "developer"
              );

              if (isStaff) {
                const title = isAssignedToMe ? "⚠️ Tu Turno Fue Cancelado 💈" : "⚠️ Cita Cancelada";
                const body = `Cita de las ${formatTime(data.appointment.time)} (${data.appointment.clientName}) ha sido cancelada. La silla quedó liberada.`;
                triggerToast(title, body, "warning", "new_booking");
                showPushNotification(title, {
                  body,
                  tag: `cancel-app-${data.appointment.id}`,
                  vibrate: [250, 100, 250]
                });
              }

              // Broadcast cancellation event to ModoSilla and other sub-views
              window.dispatchEvent(new CustomEvent("syncbarber_appointment_canceled_received", {
                detail: { appointment: data.appointment }
              }));
            }

            // Broadcast update event to ModoSilla and other sub-views
            window.dispatchEvent(new CustomEvent("syncbarber_appointment_updated_received", {
              detail: { appointment: data.appointment }
            }));

            // Check if this updated appointment is owned by the client
            const savedIdsStr = localStorage.getItem("bella_barba_appointments");
            const myIds = savedIdsStr ? JSON.parse(savedIdsStr) : [];
            const isMine = myIds.includes(data.appointment.id);

            if (isMine) {
              const statusTranslations: Record<string, string> = {
                confirmed: "CONFIRMADA 💚",
                canceled: "CANCELADA 💔",
                completed: "REALIZADA 🎉",
                pending: "RE-EVALUADA ⏳",
                en_espera: "EN ESPERA EN SALA 📍"
              };
              triggerToast(
                "¡Estado de tu cita cambiado!", 
                `Tu cita para ${data.appointment.serviceName} a las ${data.appointment.time} ahora está: ${statusTranslations[data.appointment.status] || data.appointment.status}`, 
                data.appointment.status === "confirmed" ? "success" : data.appointment.status === "canceled" ? "warning" : "info"
              );
            } else {
              console.log("[SSE Sync] Cita actualizada:", data.appointment.id);
            }
          } else if (type === "appointment_deleted") {
            setAppointments(data.appointments);
          }
        } catch (e) {
          console.error("Error procesando payload de SSE:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("[SSE Error] Conexión interrumpida o demorada. Cambiando a consulta periódica.");
        lastSseFailureTime = Date.now();
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Start checking fallback status with standard fetch polling (15s interval)
        if (!retryInterval) {
          retryInterval = setInterval(() => {
            fetchStateFallback();
          }, 15000);
        }
      };
    };

    // Fallback polling using single consolidated endpoint
    const fetchStateFallback = async () => {
      try {
        const currentActiveTenant = localStorage.getItem("active_tenant_id") || "bella-barba";
        const fallbackHeaders = { "x-tenant-id": currentActiveTenant };
        
        const stateRes = await fetch("/api/state", { headers: fallbackHeaders });
        if (stateRes.ok) {
          const data = await stateRes.json();
          if (data.appointments && Array.isArray(data.appointments)) {
            // If initialized before, notify for any newly arrived appointments
            if (knownAppointmentIdsRef.current.size > 0) {
              data.appointments.forEach((app: Appointment) => {
                if (!knownAppointmentIdsRef.current.has(app.id)) {
                  notifyBarberNewAppointment(app);
                }
              });
            }
            data.appointments.forEach((app: Appointment) => knownAppointmentIdsRef.current.add(app.id));
            setAppointments(data.appointments);
          }
          if (data.services) setServices(data.services);
          if (data.config) setConfig(data.config);
          if (data.barbers) setBarbers(data.barbers);
          if (data.memberships) setMemberships(data.memberships);
          if (data.reviews) setReviews(data.reviews);
          if (data.clients) setClients(data.clients);
          if (data.announcements) setAnnouncements(data.announcements);
          if (data.inventory) setInventory(data.inventory);
          if (data.sales) setSales(data.sales);

          setIsConnected(true);
          setIsLoading(false);
          setErrorText("");
          
          // Try reconnecting SSE only if at least 25 seconds have passed since last failure
          const timeSinceLastFailure = Date.now() - lastSseFailureTime;
          if (timeSinceLastFailure > 25000) {
            if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }
        } else {
          throw new Error("Respuesta no satisfactoria del servidor");
        }
      } catch (err) {
        console.warn("Aviso: Fallback fetch no disponible temporalmente (servidor reiniciando o canal inactivo):", err);
        setIsConnected(false);
        setErrorText("Conexión inestable con el servidor de la peluquería...");
      }
    };

    connectSSE();

    // Initial load safety
    const timeout = setTimeout(() => {
      if (isLoading) {
        fetchStateFallback();
      }
    }, 3000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryInterval) {
        clearInterval(retryInterval);
      }
      clearTimeout(timeout);
    };
  }, [activeTenantId]);

  const fetchInitialData = async () => {
    try {
      const currentActiveTenant = localStorage.getItem("active_tenant_id") || "bella-barba";
      const fallbackHeaders = { "x-tenant-id": currentActiveTenant };
      const stateRes = await fetch("/api/state", { headers: fallbackHeaders });
      if (stateRes.ok) {
        const data = await stateRes.json();
        if (data.appointments && Array.isArray(data.appointments)) {
          if (knownAppointmentIdsRef.current.size > 0) {
            data.appointments.forEach((app: Appointment) => {
              if (!knownAppointmentIdsRef.current.has(app.id)) {
                notifyBarberNewAppointment(app);
              }
            });
          }
          data.appointments.forEach((app: Appointment) => knownAppointmentIdsRef.current.add(app.id));
          setAppointments(data.appointments);
        }
        if (data.services) setServices(data.services);
        if (data.config) setConfig(data.config);
        if (data.barbers) setBarbers(data.barbers);
        if (data.memberships) setMemberships(data.memberships);
        if (data.reviews) setReviews(data.reviews);
        if (data.clients) setClients(data.clients);
        if (data.announcements) setAnnouncements(data.announcements);
        if (data.inventory) setInventory(data.inventory);
        if (data.sales) setSales(data.sales);
      }
    } catch (err) {
      console.warn("Error re-fetching data:", err);
    }
  };

  // Automatically load active tenant and role if specified in the URL query string (QR scans)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSalonId = params.get("salonId") || params.get("salon_id");
    const urlBarberId = params.get("barber") || params.get("barberId");
    
    if (urlSalonId) {
      console.log("[Query Params] Scanning QR code! Switching tenant to:", urlSalonId);
      localStorage.setItem("active_tenant_id", urlSalonId);
      setActiveTenantId(urlSalonId);
      setCurrentRole("client"); // Route directly to Client booking screen
      
      if (urlBarberId) {
        console.log("[Query Params] Direct booking barber selected:", urlBarberId);
        localStorage.setItem("direct_barber_id", urlBarberId);
      }
      
      triggerToast(
        "Escaneo Exitoso", 
        `Bienvenido a la plataforma de reservas de tu barbería.`, 
        "success"
      );
    }
  }, []);

  // REST Mutations Helpers
  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Error al actualizar la cita.");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar la cita.");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Conflicto o error al agendar.");
      }
      const createdApp = await res.json();
      // Ensure instantaneous floating notification for the barber
      if (createdApp && createdApp.id) {
        notifyBarberNewAppointment(createdApp);
      }
      return createdApp;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<SalonConfig>) => {
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Error al guardar ajustes.");
      }
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      } else {
        setConfig((prev) => ({ ...prev, ...newConfig }));
      }
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleCompleteSetup = async (setupData: { config: Partial<SalonConfig>; services: Service[]; barbers: Barber[] }) => {
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al completar la configuración inicial.");
      }
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setServices(data.services);
        setBarbers(data.barbers);
        triggerToast("Configuración Guardada", `La configuración de '${data.config.name}' ha sido establecida de forma exitosa.`, "success");
      }
    } catch (e: any) {
      console.error(e);
      triggerToast("Error de Configuración", e.message || "Fallo al enviar la configuración inicial.", "warning");
      throw e;
    }
  };

  const handleCreateService = async (serviceData: any) => {
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) throw new Error("Error al guardar el servicio.");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateService = async (id: string, updates: Partial<Service>) => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Error al editar el servicio.");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al borrar el servicio.");
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleCreateBarber = async (barberData: any) => {
    try {
      const res = await fetch("/api/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(barberData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear barbero.");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateBarber = async (id: string, updates: Partial<Barber>) => {
    try {
      const res = await fetch(`/api/barbers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al actualizar barbero.");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteBarber = async (id: string) => {
    try {
      const res = await fetch(`/api/barbers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar barbero.");
      }
      return await res.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateClient = async (id: string, updates: Partial<ClientAccount>) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al actualizar el cliente.");
      }
      const data = await res.json();
      const updatedClient = data.client || data;

      if (updatedClient && updatedClient.id) {
        setClients((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updatedClient } : c))
        );

        try {
          const storedClientStr = localStorage.getItem("bella_barba_logged_client") || localStorage.getItem("logged_client");
          if (storedClientStr) {
            const storedClient = JSON.parse(storedClientStr);
            if (storedClient && storedClient.id === id) {
              const merged = { ...storedClient, ...updatedClient };
              localStorage.setItem("bella_barba_logged_client", JSON.stringify(merged));
              localStorage.setItem("logged_client", JSON.stringify(merged));
            }
          }
        } catch (e) {
          console.error("Error updating local stored client:", e);
        }
      }
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleCreateClient = async (clientData: any) => {
    try {
      const res = await fetch("/api/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear el cliente.");
      }
      const data = await res.json();
      triggerToast("Cliente Registrado", `El cliente ${clientData.name} ha sido creado con éxito.`, "success");
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Credenciales incorrectas.");
      }
      const data = await res.json();
      if (data.success) {
        setLoggedUser({
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          role: data.role,
          barberId: data.barberId,
          salonId: data.user.salonId,
        });
        if (data.user.salonId) {
          setActiveTenantId(data.user.salonId);
          localStorage.setItem("active_tenant_id", data.user.salonId);
        }
        setCurrentRole(data.role);
        setAdminTab("agenda");
        triggerToast("Sesión Iniciada", `Bienvenido de nuevo, ${data.user.name}.`, "success");
      }
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setCurrentRole("client");
    setAdminTab("agenda");
    triggerToast("Sesión Cerrada", "Has salido del panel administrativo.", "info");
  };

  // App Badging API: Syncs red bubble counter to phone home screen PWA icon & tab
  const { badgeCount: globalBadgeCount } = useAppBadge({
    appointments,
    loggedBarberId: currentRole === "barber" ? (loggedUser?.barberId || loggedUser?.id) : null,
    role: currentRole as any,
    salonName: config?.name
  });

  // Currency formatter
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Dynamic branding colors helper
  const getBrandColors = () => {
    switch (config.accentColor) {
      case "cyan":
        return { primary: "#06b6d4", hover: "#0891b2" };
      case "emerald":
        return { primary: "#10b981", hover: "#059669" };
      case "blue":
        return { primary: "#3b82f6", hover: "#2563eb" };
      case "violet":
        return { primary: "#8b5cf6", hover: "#7c3aed" };
      case "rose":
        return { primary: "#f43f5e", hover: "#e11d48" };
      case "amber":
        return { primary: "#f59e0b", hover: "#d97706" };
      case "gold":
      default:
        return { primary: "#C5A267", hover: "#B38E54" };
    }
  };

  const brandColors = getBrandColors();

  // Open multi-window test warning helper
  const openDuplicateTab = () => {
    window.open(window.location.href, "_blank");
  };

  return (
    <div className="min-h-screen bg-elegant-bg text-elegant-text font-sans flex flex-col antialiased">
      {/* Estilos dinámicos de marca del inquilino */}
      <style>{`
        :root {
          --color-elegant-gold: ${brandColors.primary} !important;
          --color-elegant-gold-hover: ${brandColors.hover} !important;
          --color-elegant-text-custom: ${config.textColor || "#FFFFFF"} !important;
          --color-elegant-bg: ${config.backgroundColor || "#060A13"} !important;
          --color-elegant-card: ${config.cardColor || "#0E1524"} !important;
          --color-elegant-sub: ${config.subCardColor || "#162237"} !important;
          --color-elegant-border: ${config.borderColor || "#1F314D"} !important;
        }
        .text-custom-brand {
          color: var(--color-elegant-text-custom) !important;
        }
      `}</style>
      
      {/* 1. Header Superior & Switch de Roles con Menú Hamburguesa para Móvil */}
      <header className="sticky top-0 z-40 w-full bg-elegant-card/95 backdrop-blur-md border-b border-elegant-border shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          
          {/* Logo SYNCBARBER & Salon Info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <SyncBarberLogo size={34} showText={true} />
            <div className="h-7 w-[1px] bg-elegant-border hidden xs:block" />
            
            <div className="flex items-center gap-2 min-w-0">
              {config.customLogoUrl && (
                <div className="h-7 w-7 rounded-full bg-elegant-sub border border-elegant-border flex items-center justify-center text-sm overflow-hidden shrink-0">
                  {config.customLogoUrl.startsWith("http") || config.customLogoUrl.startsWith("data:image") ? (
                    <img src={config.customLogoUrl} alt={config.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-sans leading-none">{config.customLogoUrl}</span>
                  )}
                </div>
              )}
              
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white font-sans block max-w-[110px] xs:max-w-[150px] sm:max-w-none truncate">
                    {config.name || "Barberia Demo"}
                  </span>
                  <button
                    onClick={() => setShowVersionModal(true)}
                    className="text-[8.5px] font-mono font-extrabold text-amber-300 bg-amber-950/90 border border-amber-800/80 px-1.5 py-0.2 rounded-full hover:bg-amber-900 transition-all cursor-pointer shrink-0 shadow-xs"
                    title="Ver registro de versión y novedades"
                  >
                    {CURRENT_APP_VERSION}
                  </button>
                </div>
                {config.tagline ? (
                  <p className="text-[7.5px] sm:text-[9px] text-elegant-gold font-bold uppercase mt-0.5 leading-none max-w-[130px] xs:max-w-[190px] sm:max-w-xs truncate" title={config.tagline}>
                    {config.tagline}
                  </p>
                ) : (
                  <p className="text-[7.5px] sm:text-[9px] text-elegant-gold font-bold tracking-widest uppercase mt-0.5 leading-none">
                    Inquilino En Vivo
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Acciones para Móvil & Tablet: Campana + Botón Hamburguesa (ÚNICAMENTE EN MÓVIL) */}
          <div className="flex items-center space-x-2 xl:hidden shrink-0">
            {((loggedUser && (loggedUser.role === "admin" || loggedUser.role === "barber")) || currentRole === "admin" || currentRole === "barber") && (
              <NotificationBell
                announcements={announcements}
                config={config}
                barber={barbers.find(b => b.id === (loggedUser?.barberId || loggedUser?.id))}
                appointments={appointments}
                barbers={barbers}
                onUpdateConfig={handleUpdateConfig}
                onUpdateBarber={handleUpdateBarber}
                loggedBarberId={loggedUser?.barberId || loggedUser?.id}
                isMobileHeader={true}
              />
            )}

            {/* Botón de Menú Hamburguesa */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileMenuOpen
                  ? "bg-elegant-gold text-elegant-bg border-elegant-gold shadow-md font-bold"
                  : "bg-elegant-sub text-elegant-text border-elegant-border hover:bg-elegant-border"
              }`}
              title={mobileMenuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
              aria-label="Menú principal móvil"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Fila Desktop: Selector de Roles y Acciones Rápidas (VISIBLE SOLO EN PANTALLAS GRANDES) */}
          <div className="hidden xl:flex items-center justify-end gap-2 w-auto">
            {/* Selector de Roles Principal Desktop */}
            <div className="bg-elegant-sub p-1 rounded-2xl flex items-center gap-1 border border-elegant-border max-w-full">
              {activeTenantId === "bella-barba" && (
                <button
                  onClick={() => {
                    if (currentRole !== "syncbarber") {
                      setCurrentRole("syncbarber");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    currentRole === "syncbarber"
                      ? "bg-cyan-500 text-elegant-bg shadow-xs font-extrabold"
                      : "text-elegant-text-muted hover:text-cyan-400"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>Conoce SYNCBARBER</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (currentRole !== "client") {
                    setCurrentRole("client");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentRole === "client"
                    ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                    : "text-elegant-text-muted hover:text-elegant-text"
                }`}
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>Vista Cliente</span>
              </button>

              {!loggedUser ? (
                <button
                  onClick={() => setCurrentRole("login")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    currentRole === "login"
                      ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Ingreso Personal</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentRole(loggedUser.role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      currentRole === "admin" || currentRole === "barber"
                        ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                        : "text-elegant-text-muted hover:text-elegant-text"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {loggedUser.role === "admin" ? "Panel" : `${loggedUser.name.split(" ")[0]}`}
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all active:scale-95 shadow-xs whitespace-nowrap"
                    title="Cerrar Sesión / Salir"
                  >
                    Salir
                  </button>
                </div>
              )}

              {currentRole === "developer" && (
                <button
                  onClick={() => setCurrentRole("developer")}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap bg-amber-500 text-elegant-bg shadow-xs font-extrabold"
                >
                  <Cpu className="h-3.5 w-3.5 shrink-0" />
                  <span>Dev</span>
                </button>
              )}
            </div>

            {/* Botones de acción rápidos Desktop */}
            {(() => {
              const activeLicense = config.licenseType || "premium";
              const isStaffUser = loggedUser && (loggedUser.role === "admin" || loggedUser.role === "barber" || loggedUser.role === "developer");
              const isStaffView = currentRole === "admin" || currentRole === "barber" || currentRole === "developer";
              const isBarberOrStaff = isStaffUser || isStaffView;

              const supportsModoSilla = activeLicense === "profesional" || activeLicense === "premium";
              const supportsKiosco = activeLicense === "premium";
              const supportsCierreCaja = activeLicense === "profesional" || activeLicense === "premium";

              const canShowModoSilla = isBarberOrStaff && supportsModoSilla;
              const canShowKiosco = isBarberOrStaff && supportsKiosco;
              const canShowCierreCaja = isBarberOrStaff && supportsCierreCaja;
              const canShowProbarRealTime = currentRole === "developer" || (loggedUser && loggedUser.role === "developer") || (loggedUser && loggedUser.role === "admin");
              const canShowSincro = isBarberOrStaff || !!loggedUser;
              const canShowBell = (loggedUser && (loggedUser.role === "admin" || loggedUser.role === "barber")) || currentRole === "admin" || currentRole === "barber";

              return (
                <div className="flex items-center space-x-2 shrink-0">
                  {canShowModoSilla && (
                    <button
                      onClick={() => setIsModoSillaActive(true)}
                      className="relative px-2.5 py-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                      title={globalBadgeCount > 0 ? `Modo Silla (${globalBadgeCount} turnos pendientes hoy)` : "Abrir Vista Móvil PWA para Barberos en Silla"}
                    >
                      <Smartphone className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                      <span>📱 Modo Silla</span>
                      {globalBadgeCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none shadow-xs shadow-rose-950 animate-pulse">
                          {globalBadgeCount}
                        </span>
                      )}
                    </button>
                  )}

                  {canShowKiosco && (
                    <button
                      onClick={() => setShowKioscoModal(true)}
                      className="px-2.5 py-1.5 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                      title="Abrir Kiosco de Check-in Recepción (Pantalla TV)"
                    >
                      <span>📺 Kiosco</span>
                    </button>
                  )}

                  {canShowCierreCaja && (
                    <button
                      onClick={() => setShowCierreCajaModal(true)}
                      className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/40 text-emerald-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                      title="Abrir Arqueo y Cierre de Caja Automatizado"
                    >
                      <span>💰 Cierre Caja</span>
                    </button>
                  )}

                  {canShowSincro && (
                    <div 
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono whitespace-nowrap ${
                        isConnected 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50" 
                          : "bg-amber-950/40 text-amber-400 border border-amber-800/50 animate-pulse"
                      }`}
                      title={isConnected ? "Sincronizado en tiempo real" : "Conexión inestable..."}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`}></span>
                      <span>{isConnected ? "SINCRO" : "RECONECTANDO"}</span>
                    </div>
                  )}

                  {canShowBell && (
                    <div className="flex items-center">
                      <NotificationBell
                        announcements={announcements}
                        config={config}
                        barber={barbers.find(b => b.id === (loggedUser?.barberId || loggedUser?.id))}
                        appointments={appointments}
                        barbers={barbers}
                        onUpdateConfig={handleUpdateConfig}
                        onUpdateBarber={handleUpdateBarber}
                        loggedBarberId={loggedUser?.barberId || loggedUser?.id}
                      />
                    </div>
                  )}

                  {canShowProbarRealTime && (
                    <button
                      onClick={openDuplicateTab}
                      className="p-2 border border-elegant-border rounded-xl bg-elegant-sub hover:bg-elegant-border text-elegant-text transition-colors active:scale-95 cursor-pointer flex items-center justify-center whitespace-nowrap"
                      title="Abrir otra pestaña para probar en tiempo real"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="inline text-[10px] font-bold ml-1.5 uppercase">Probar Real-time</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

        </div>

        {/* 📱 MENÚ HAMBURGUESA DESPLEGABLE PARA DISPOSITIVOS MÓVILES */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="xl:hidden w-full bg-elegant-card/98 border-t border-elegant-border/80 shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 text-left max-h-[80vh] overflow-y-auto">
                
                {/* 1. Tarjeta de Usuario / Perfil Activo */}
                <div className="bg-elegant-sub/90 border border-elegant-border rounded-2xl p-3.5 shadow-xs">
                  {loggedUser ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-elegant-gold/20 border border-elegant-gold/40 text-elegant-gold flex items-center justify-center font-extrabold text-base shrink-0">
                          {loggedUser.name ? loggedUser.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-extrabold text-sm text-white truncate">
                              {loggedUser.name}
                            </p>
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {loggedUser.role === "admin" ? "Admin" : loggedUser.role === "developer" ? "Dev" : "Barbero"}
                            </span>
                          </div>
                          <p className="text-[11px] text-elegant-text-muted truncate mt-0.5">
                            {loggedUser.email || loggedUser.phone || "Sesión de personal activa"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Botón Destacado para Cerrar Sesión / Perfil */}
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="px-3 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                        title="Cerrar Sesión del Perfil"
                      >
                        <LogOut className="h-3.5 w-3.5 text-rose-300" />
                        <span>Cerrar Perfil</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-9 w-9 rounded-xl bg-elegant-gold/10 border border-elegant-gold/30 text-elegant-gold flex items-center justify-center shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-white">Acceso para Personal</p>
                          <p className="text-[10px] text-elegant-text-muted">Inicia sesión como Barbero o Admin</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentRole("login");
                          setMobileMenuOpen(false);
                        }}
                        className="px-3.5 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Ingresar</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Sección de Vistas Principales & Perfiles */}
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-elegant-text-muted font-bold px-1">
                    Vistas y Perfiles
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTenantId === "bella-barba" && (
                      <button
                        onClick={() => {
                          setCurrentRole("syncbarber");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                          currentRole === "syncbarber"
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs"
                            : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="h-4 w-4 text-cyan-400" />
                          <span>Conoce SYNCBARBER</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-elegant-text-muted" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setCurrentRole("client");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                        currentRole === "client"
                          ? "bg-elegant-gold/20 text-elegant-gold border-elegant-gold/50 shadow-xs"
                          : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-elegant-gold" />
                        <span>Vista Cliente (Reservas)</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-elegant-text-muted" />
                    </button>

                    {loggedUser && (
                      <button
                        onClick={() => {
                          setCurrentRole(loggedUser.role);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                          currentRole === loggedUser.role
                            ? "bg-elegant-gold/20 text-elegant-gold border-elegant-gold/50 shadow-xs"
                            : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="h-4 w-4 text-elegant-gold" />
                          <span>
                            {loggedUser.role === "admin" ? "Panel Administrador" : `Agenda de ${loggedUser.name.split(" ")[0]}`}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-elegant-text-muted" />
                      </button>
                    )}

                    {/* Módulos de Administrador en Menú Móvil */}
                    {loggedUser && (loggedUser.role === "admin" || currentRole === "admin") && (
                      <div className="pt-2 border-t border-elegant-border/50 space-y-1.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-elegant-text-muted font-bold px-1 flex items-center justify-between">
                          <span>Módulos de Administrador</span>
                          <span className="text-elegant-gold font-bold">8 Opciones</span>
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("agenda");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "agenda"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <CalendarIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">Agenda Diaria</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("calendar");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "calendar"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">Calendario</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("inventory");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "inventory"
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Wine className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">Inventario POS</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("commissions");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "commissions"
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Coins className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">Comisiones</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("barbers");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "barbers"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Barberos</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("clients");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "clients"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Clientes</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("catalog");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "catalog"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Camera className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">Lookbook</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentRole("admin");
                              setAdminTab("settings");
                              setMobileMenuOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                              currentRole === "admin" && adminTab === "settings"
                                ? "bg-elegant-gold/20 text-elegant-gold border-elegant-gold/50"
                                : "bg-elegant-sub/60 text-elegant-text border-elegant-border hover:bg-elegant-sub"
                            }`}
                          >
                            <Settings className="h-3.5 w-3.5 text-elegant-gold shrink-0" />
                            <span className="truncate">Ajustes</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Herramientas Rápidas & Modales */}
                {(() => {
                  const activeLicense = config.licenseType || "premium";
                  const isStaffUser = loggedUser && (loggedUser.role === "admin" || loggedUser.role === "barber" || loggedUser.role === "developer");
                  const isStaffView = currentRole === "admin" || currentRole === "barber" || currentRole === "developer";
                  const isBarberOrStaff = isStaffUser || isStaffView;
                  const supportsModoSilla = activeLicense === "profesional" || activeLicense === "premium";
                  const supportsKiosco = activeLicense === "premium";
                  const supportsCierreCaja = activeLicense === "profesional" || activeLicense === "premium";

                  const canShowModoSilla = isBarberOrStaff && supportsModoSilla;
                  const canShowKiosco = isBarberOrStaff && supportsKiosco;
                  const canShowCierreCaja = isBarberOrStaff && supportsCierreCaja;

                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-elegant-text-muted font-bold px-1">
                        Herramientas Rápidas
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {canShowModoSilla && (
                          <button
                            onClick={() => {
                              setIsModoSillaActive(true);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between bg-gradient-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-all text-left cursor-pointer active:scale-95"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Smartphone className="h-5 w-5 text-amber-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-extrabold text-sm">Modo Silla</p>
                                <p className="text-[10px] text-amber-300/70 font-normal">PWA para barberos en sillón</p>
                              </div>
                            </div>
                            {globalBadgeCount > 0 && (
                              <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm shadow-rose-950 animate-pulse shrink-0">
                                {globalBadgeCount} {globalBadgeCount === 1 ? "cita" : "citas"}
                              </span>
                            )}
                          </button>
                        )}

                        {canShowKiosco && (
                          <button
                            onClick={() => {
                              setShowKioscoModal(true);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/50 transition-all text-left cursor-pointer active:scale-95"
                          >
                            <span className="text-lg">📺</span>
                            <div>
                              <p className="font-extrabold text-sm">Pantalla Kiosco</p>
                              <p className="text-[10px] text-cyan-300/70 font-normal">Check-in TV de recepción</p>
                            </div>
                          </button>
                        )}

                        {canShowCierreCaja && (
                          <button
                            onClick={() => {
                              setShowCierreCajaModal(true);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50 transition-all text-left cursor-pointer active:scale-95"
                          >
                            <span className="text-lg">💰</span>
                            <div>
                              <p className="font-extrabold text-sm">Cierre de Caja</p>
                              <p className="text-[10px] text-emerald-300/70 font-normal">Arqueo y balance del día</p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Footer del Menú Móvil con Estado de Sincronización & Multi-pestaña */}
                <div className="pt-3 border-t border-elegant-border/60 flex items-center justify-between text-xs text-elegant-text-muted">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="font-mono text-[11px] font-bold text-emerald-400">
                      {isConnected ? "Sincronizado en tiempo real" : "Reconectando..."}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      openDuplicateTab();
                      setMobileMenuOpen(false);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Multi-pestaña</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Sub-Menú Estructurado con Submódulos para Administradores */}
      {currentRole === "admin" && !config.needsSetup && (
        (() => {
          const activeLicense = config.licenseType || "premium";
          const isCalendarLocked = activeLicense === "basica";
          const isCommissionsLocked = activeLicense === "basica" || activeLicense === "profesional";
          const isClientsLocked = activeLicense === "basica";
          const isInventoryLocked = activeLicense === "basica";

          // Categoría activa inferida según la pestaña de administración seleccionada
          let activeCategory: "citas" | "pos" | "equipo" | "ajustes" = "citas";
          if (adminTab === "agenda" || adminTab === "calendar") activeCategory = "citas";
          else if (adminTab === "inventory" || adminTab === "commissions") activeCategory = "pos";
          else if (adminTab === "barbers" || adminTab === "clients") activeCategory = "equipo";
          else if (adminTab === "settings" || adminTab === "catalog") activeCategory = "ajustes";

          return (
            <div className="bg-elegant-card text-elegant-text border-b border-elegant-border shadow-xs">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 space-y-2">
                {/* Nivel 1: Módulos Principales (Categorías) - Grid 2x2 en móvil para que NINGUNA opción quede oculta */}
                <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (adminTab !== "agenda" && adminTab !== "calendar") {
                        setAdminTab("agenda");
                      }
                    }}
                    className={`px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer border ${
                      activeCategory === "citas"
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-xs font-extrabold"
                        : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                    }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Citas & Agenda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (adminTab !== "inventory" && adminTab !== "commissions") {
                        setAdminTab("inventory");
                      }
                    }}
                    className={`px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer border ${
                      activeCategory === "pos"
                        ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-xs font-extrabold"
                        : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                    }`}
                  >
                    <Wine className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Ventas & POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (adminTab !== "barbers" && adminTab !== "clients") {
                        setAdminTab("barbers");
                      }
                    }}
                    className={`px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer border ${
                      activeCategory === "equipo"
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-xs font-extrabold"
                        : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Equipo & Clientes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminTab("settings")}
                    className={`px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer border ${
                      activeCategory === "ajustes"
                        ? "bg-elegant-gold/20 border-elegant-gold/60 text-elegant-gold shadow-xs font-extrabold"
                        : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5 text-elegant-gold shrink-0" />
                    <span className="truncate">Configuración</span>
                  </button>
                </div>

                {/* Nivel 2: Submódulos Específicos del Módulo Activo */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-elegant-border/40 text-xs">
                  <span className="text-[9.5px] font-extrabold text-elegant-text-muted uppercase tracking-wider shrink-0 mr-1 font-mono">
                    Submódulos:
                  </span>

                  {activeCategory === "citas" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdminTab("agenda")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "agenda"
                            ? "bg-amber-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>Agenda Diaria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("calendar")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "calendar"
                            ? "bg-amber-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span>Calendario</span>
                        {isCalendarLocked && (
                          <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-md font-extrabold">
                            🔒 PRO
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {activeCategory === "pos" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdminTab("inventory")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "inventory"
                            ? "bg-cyan-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Wine className="h-3.5 w-3.5 shrink-0" />
                        <span>Inventario POS</span>
                        {isInventoryLocked && (
                          <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-md font-extrabold">
                            🔒 PRO
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("commissions")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "commissions"
                            ? "bg-cyan-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Coins className="h-3.5 w-3.5 shrink-0" />
                        <span>Comisiones & Propinas</span>
                        {isCommissionsLocked && (
                          <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-md font-extrabold">
                            🔒 VIP
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {activeCategory === "equipo" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdminTab("barbers")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "barbers"
                            ? "bg-emerald-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span>Barberos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("clients")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "clients"
                            ? "bg-emerald-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>Clientes & Membresías</span>
                        {isClientsLocked && (
                          <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-md font-extrabold">
                            🔒 PRO
                          </span>
                        )}
                      </button>
                    </>
                  )}

                  {activeCategory === "ajustes" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdminTab("catalog")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "catalog"
                            ? "bg-amber-400 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Camera className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Lookbook</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("settings")}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold whitespace-nowrap ${
                          adminTab === "settings"
                            ? "bg-elegant-gold text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Settings className="h-3.5 w-3.5 shrink-0" />
                        <span>Ajustes Generales</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* 3. Contenedor Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Warning banner if disconnected */}
        {errorText && (
          <div className="mb-6 p-3 bg-amber-950/30 border border-amber-800/40 text-amber-300 rounded-2xl text-xs flex items-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0 animate-bounce" />
            <p className="font-semibold">{errorText}</p>
          </div>
        )}



        {/* Loading overlay for initial sync */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="p-1 bg-elegant-sub rounded-full animate-spin border-t-2 border-cyan-400">
              <SyncBarberLogo size={80} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-white tracking-wider uppercase font-mono">Cargando SYNC<span className="text-cyan-400">BARBER</span>...</p>
              <p className="text-xs text-elegant-text-muted">Sincronizando base de datos multi-inquilino en tiempo real.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRole + "-" + adminTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {currentRole === "syncbarber" ? (
                <SyncBarberMarketing
                  onEnterApp={(targetRole) => {
                    if (targetRole === "client") {
                      setCurrentRole("client");
                      triggerToast("Ecosistema Demo", "Has ingresado a la Vista Cliente. ¡Explora los salones y reserva un turno en vivo!", "success");
                    } else if (targetRole === "admin") {
                      setCurrentRole("login");
                      triggerToast("Inicio de Personal", "Ingresa tus credenciales para acceder al Panel de Administración o de Barberos.", "info");
                    } else if (targetRole === "developer") {
                      setCurrentRole("developer");
                    }
                  }}
                  formatPrice={formatPrice}
                />
              ) : currentRole === "client" ? (
                <ClientDashboard
                  appointments={appointments}
                  services={services}
                  barbers={barbers}
                  config={config}
                  onCreateAppointment={handleCreateAppointment}
                  onUpdateAppointment={handleUpdateAppointment}
                  formatPrice={formatPrice}
                  memberships={memberships}
                  reviews={reviews}
                  clients={clients}
                />
              ) : currentRole === "login" ? (
                <BarberLogin
                  onLogin={handleLogin}
                  onCancel={() => setCurrentRole("client")}
                />
              ) : currentRole === "developer" ? (
                !isDevUnlocked ? (
                  <div className="max-w-md mx-auto my-12 bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 shadow-2xl text-left space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-950/40 text-amber-500 rounded-2xl border border-amber-900/30">
                        <Cpu className="h-6 w-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base uppercase tracking-wider">Acceso Restringido</h3>
                        <p className="text-xs text-elegant-text-muted">Ambiente de desarrollo y configuración del sistema.</p>
                      </div>
                    </div>

                    <div className="border-t border-elegant-border/60 my-2"></div>

                    <p className="text-xs text-elegant-text-muted leading-relaxed">
                      Este módulo contiene opciones de facturación SaaS, reseteo de bases de datos, cambio de inquilino global y configuraciones críticas reservadas únicamente para el <strong>desarrollador</strong> del sistema.
                    </p>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">Clave de Desarrollador:</label>
                        <input
                          type="password"
                          placeholder="Ingresa la contraseña de desarrollo..."
                          id="dev-pwd-input"
                          className="w-full text-xs p-3 border border-elegant-border rounded-xl bg-elegant-sub text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 tracking-widest"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = ((document.getElementById("dev-pwd-input") as HTMLInputElement)?.value || "").trim();
                              if (val === "Salome2016.") {
                                setIsDevUnlocked(true);
                                setDevError("");
                              } else {
                                setDevError("Clave incorrecta. Acceso denegado.");
                              }
                            }
                          }}
                        />
                        {devError && (
                          <p className="text-[11px] text-rose-400 font-bold">{devError}</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            const val = ((document.getElementById("dev-pwd-input") as HTMLInputElement)?.value || "").trim();
                            if (val === "Salome2016.") {
                              setIsDevUnlocked(true);
                              setDevError("");
                            } else {
                              setDevError("Clave incorrecta. Acceso denegado.");
                            }
                          }}
                          className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors text-center"
                        >
                          Desbloquear Panel
                        </button>
                        <button
                          onClick={() => {
                            setCurrentRole("client");
                            setDevError("");
                          }}
                          className="px-4 py-2.5 bg-elegant-sub border border-elegant-border text-elegant-text hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DeveloperPanel
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    formatPrice={formatPrice}
                    triggerToast={triggerToast}
                  />
                )
              ) : currentRole === "barber" ? (
                <AdminDashboard
                  appointments={appointments}
                  services={services}
                  config={config}
                  onUpdateAppointment={handleUpdateAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                  onCreateAppointment={handleCreateAppointment}
                  formatPrice={formatPrice}
                  isBarberView={true}
                  loggedBarberId={loggedUser?.barberId}
                  barbers={barbers}
                  onUpdateBarber={handleUpdateBarber}
                  clients={clients}
                  onUpdateClient={handleUpdateClient}
                  announcements={announcements}
                  inventory={inventory}
                  onRefresh={() => fetchInitialData()}
                  onOpenModoSilla={() => setIsModoSillaActive(true)}
                />
              ) : (currentRole === "admin" && config.needsSetup) ? (
                <InitialSetupWizard
                  initialConfig={config}
                  initialServices={services}
                  initialBarbers={barbers}
                  onComplete={handleCompleteSetup}
                  formatPrice={formatPrice}
                />
              ) : adminTab === "agenda" ? (
                <AdminDashboard
                  appointments={appointments}
                  services={services}
                  config={config}
                  onUpdateConfig={handleUpdateConfig}
                  onUpdateAppointment={handleUpdateAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                  onCreateAppointment={handleCreateAppointment}
                  formatPrice={formatPrice}
                  isBarberView={false}
                  barbers={barbers}
                  onUpdateBarber={handleUpdateBarber}
                  clients={clients}
                  onUpdateClient={handleUpdateClient}
                  announcements={announcements}
                  inventory={inventory}
                  onRefresh={() => fetchInitialData()}
                  onOpenModoSilla={() => setIsModoSillaActive(true)}
                />
              ) : adminTab === "inventory" ? (
                ((config.licenseType || "premium") === "basica" || config.featureFlags?.enableInventory === false) ? (
                  <LockedModule
                    moduleName="Ventas de Inventario & Nevera POS"
                    requiredLicense="profesional"
                    activeLicense={config.licenseType || "premium"}
                    onNavigateToSettings={() => setAdminTab("settings")}
                  />
                ) : (
                  <InventoryManager
                    inventory={inventory}
                    sales={sales}
                    barbers={barbers}
                    clients={clients}
                    formatPrice={formatPrice}
                    activeLicense={config.licenseType || "premium"}
                    onRefresh={() => fetchInitialData()}
                    triggerToast={triggerToast}
                  />
                )
              ) : adminTab === "calendar" ? (
                ((config.licenseType || "premium") === "basica" || config.featureFlags?.enableOnlineBooking === false) ? (
                  <LockedModule
                    moduleName="Calendario Interactivo"
                    requiredLicense="profesional"
                    activeLicense={config.licenseType || "premium"}
                    onNavigateToSettings={() => setAdminTab("settings")}
                  />
                ) : (
                  <InteractiveCalendar
                    appointments={appointments}
                    clients={clients}
                    barbers={barbers}
                    services={services}
                    config={config}
                    onUpdateAppointment={handleUpdateAppointment}
                    onCreateAppointment={handleCreateAppointment}
                    formatPrice={formatPrice}
                  />
                )
              ) : adminTab === "commissions" ? (
                (((config.licenseType || "premium") === "basica" || (config.licenseType || "premium") === "profesional") || config.featureFlags?.enableCashClosure === false) ? (
                  <LockedModule
                    moduleName="Comisiones & Propinas de Barberos"
                    requiredLicense="premium"
                    activeLicense={config.licenseType || "premium"}
                    onNavigateToSettings={() => setAdminTab("settings")}
                  />
                ) : (
                  <CommissionsManager
                    appointments={appointments}
                    barbers={barbers}
                    inventory={inventory}
                    sales={sales}
                    onUpdateBarber={handleUpdateBarber}
                    onUpdateAppointment={handleUpdateAppointment}
                    formatPrice={formatPrice}
                  />
                )
              ) : adminTab === "barbers" ? (
                <BarberManager
                  barbers={barbers}
                  onCreateBarber={handleCreateBarber}
                  onUpdateBarber={handleUpdateBarber}
                  onDeleteBarber={handleDeleteBarber}
                  activeLicense={config.licenseType || "premium"}
                  config={config}
                />
              ) : adminTab === "clients" ? (
                ((config.licenseType || "premium") === "basica" || config.featureFlags?.enableMemberships === false) ? (
                  <LockedModule
                    moduleName="Clientes & Membresías VIP"
                    requiredLicense="profesional"
                    activeLicense={config.licenseType || "premium"}
                    onNavigateToSettings={() => setAdminTab("settings")}
                  />
                ) : (
                  <ClientManager
                    clients={clients}
                    appointments={appointments}
                    memberships={memberships}
                    onUpdateClient={handleUpdateClient}
                    onCreateClient={handleCreateClient}
                    formatPrice={formatPrice}
                  />
                )
              ) : adminTab === "catalog" ? (
                <CatalogManager
                  services={services}
                  config={config}
                  formatPrice={formatPrice}
                />
              ) : (
                <SalonSettings
                  services={services}
                  config={config}
                  onUpdateConfig={handleUpdateConfig}
                  onCreateService={handleCreateService}
                  onUpdateService={handleUpdateService}
                  onDeleteService={handleDeleteService}
                  formatPrice={formatPrice}
                  triggerToast={triggerToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* 4. Pie de Página */}
      <footer className="bg-elegant-card text-elegant-text-muted border-t border-elegant-border py-8 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-white">{config.name} — Agenda Real-Time</p>
            <p className="text-[11px] text-elegant-text-muted">Diseñado para simplificar turnos entre peluqueros y clientes.</p>
            <p className="text-[11px] mt-1 text-elegant-text-muted">
              Diseñado por{" "}
              <a 
                href="https://www.linkedin.com/in/reinaldo-duran-castro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-elegant-gold hover:underline inline-flex items-center gap-1 font-semibold transition-all"
              >
                <Linkedin className="h-3 w-3" />
                Reinaldo Duran
              </a>
              {" • "}
              <button
                onClick={() => {
                  setCurrentRole("developer");
                  triggerToast("Consola de Desarrollo", "Has ingresado al ambiente técnico de desarrollo.", "info");
                }}
                className="hover:text-amber-400 font-semibold transition-all inline-flex items-center gap-0.5 ml-1 cursor-pointer bg-transparent border-none p-0 text-[10px]"
              >
                <Cpu className="h-2.5 w-2.5 text-amber-500/80" />
                <span>Consola Técnica</span>
              </button>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Contacto Soporte
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Sincronizado UTC
            </span>
          </div>
        </div>
      </footer>

      {/* Banner flotante de Alarma Continua Activa */}
      <ActiveAlarmBanner />

      {/* 5. Contenedor de Toasts Real-Time Flotantes con Prioridad Máxima z-[9999] */}
      <div className="fixed top-4 right-4 sm:top-auto sm:bottom-4 sm:right-4 z-[9999] flex flex-col gap-2.5 max-w-md w-full px-3 sm:px-0 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3.5 backdrop-blur-xl transition-all ${
                t.title.includes("HOY") || t.type === "warning"
                  ? "bg-neutral-950/98 border-amber-500/80 text-amber-50 ring-2 ring-amber-500/30 shadow-amber-950/50"
                  : t.type === "success"
                    ? "bg-neutral-950/98 border-emerald-500/80 text-emerald-50 ring-1 ring-emerald-500/30 shadow-emerald-950/50"
                    : "bg-neutral-950/98 border-cyan-500/60 text-cyan-50 shadow-black/80"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                t.title.includes("HOY") || t.type === "warning"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                  : t.type === "success"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              }`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black tracking-tight uppercase leading-snug">{t.title}</h4>
                </div>
                <p className="text-[12px] opacity-95 leading-relaxed font-medium text-neutral-200 break-words">{t.message}</p>
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="text-neutral-400 hover:text-white shrink-0 self-start p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 6. MÓDULO PWA MODO SILLA BARBERO (Vista Rápida Móvil) */}
      {isModoSillaActive && (
        <ModoSillaPWA
          appointments={appointments}
          clients={clients}
          barbers={barbers}
          services={services}
          config={config}
          inventory={inventory}
          loggedBarberId={loggedUser?.barberId}
          onUpdateAppointment={handleUpdateAppointment}
          onUpdateClient={handleUpdateClient}
          onCreateAppointment={handleCreateAppointment}
          onRefresh={() => fetchInitialData()}
          formatPrice={formatPrice}
          onClose={() => setIsModoSillaActive(false)}
          salonName={config.name}
        />
      )}

      {/* 7. MÓDULO KIOSCO DE RECEPCIÓN (AUTO CHECK-IN & PANTALLA TV) */}
      {showKioscoModal && (
        <ModoKiosco
          appointments={appointments}
          barbers={barbers}
          formatPrice={formatPrice}
          onRefresh={() => fetchInitialData()}
          onClose={() => setShowKioscoModal(false)}
        />
      )}

      {/* 8. MÓDULO ARQUEO Y CIERRE DE CAJA AUTOMATIZADO */}
      {showCierreCajaModal && (
        <CierreCajaModal
          formatPrice={formatPrice}
          onRefresh={() => fetchInitialData()}
          onClose={() => setShowCierreCajaModal(false)}
        />
      )}

      {/* 9. MODAL HISTORIAL Y NOVEDADES DE LA VERSIÓN */}
      <VersionModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
      />

      {/* 10. AVISO FLOTANTE DE NUEVA VERSIÓN PWA DISPONIBLE */}
      <AnimatePresence>
        {swUpdateReady && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-5 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999] bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-black p-4 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-neutral-900 animate-spin" />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-black">¡Nueva Actualización v2.6.5!</p>
                <p className="text-[11px] font-semibold text-neutral-900 leading-tight">Se descargaron nuevas funciones de turnos y alertas.</p>
              </div>
            </div>
            <button
              onClick={handleApplyUpdate}
              className="px-3.5 py-2 bg-black hover:bg-neutral-900 text-amber-400 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Actualizar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DemoCenter removed per user request */}

    </div>
  );
}
