import { useState, useEffect } from "react";
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
  Wine
} from "lucide-react";
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
import { CURRENT_APP_VERSION } from "./data/versionHistory";
import { Camera } from "lucide-react";

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
    const urlSalonId = params.get("salonId") || params.get("salon_id");
    const activeId = urlSalonId || localStorage.getItem("active_tenant_id") || "bella-barba";
    return activeId !== "bella-barba" ? "client" : "syncbarber";
  });
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [devError, setDevError] = useState("");
  const [adminTab, setAdminTab] = useState<"agenda" | "calendar" | "commissions" | "settings" | "barbers" | "clients" | "inventory" | "catalog">("agenda");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string; username: string; role: 'admin' | 'barber'; barberId?: string; salonId?: string } | null>(null);
  const [isModoSillaActive, setIsModoSillaActive] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "silla" || params.get("pwa") === "1";
  });
  const [showKioscoModal, setShowKioscoModal] = useState<boolean>(false);
  const [showCierreCajaModal, setShowCierreCajaModal] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSalonId = params.get("salonId") || params.get("salon_id");
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
    closeTime: "19:00",
    workingDays: [1, 2, 3, 4, 5, 6],
    intervalMinutes: 30,
  });

  // Loading and error states
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // Toast notifications
  const [toasts, setToasts] = useState<RealTimeToast[]>([]);

  // Sound chime for notifications (using Web Audio API so it's fully client-side and doesn't rely on external assets)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Chime note 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);

      // Chime note 2 slightly staggered
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 100);
    } catch (e) {
      console.warn("Audio Context not allowed or failed:", e);
    }
  };

  // Toast controller
  const triggerToast = (title: string, message: string, type: "success" | "info" | "warning" = "info") => {
    const id = Date.now().toString();
    const newToast: RealTimeToast = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);
    playNotificationSound();

    // Auto delete after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
      closeTime: "19:00",
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
            setAppointments(data.appointments);
            setServices(data.services);
            setConfig(data.config);
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
            setAppointments(data.appointments);
            // Notify if admin
            triggerToast(
              "Nueva Cita Solicitada", 
              `Cliente: ${data.appointment.clientName} agendó para ${data.appointment.serviceName} a las ${data.appointment.time}.`, 
              "success"
            );
          } else if (type === "appointment_updated") {
            setAppointments(data.appointments);

            // Check if this updated appointment is owned by the client
            const savedIdsStr = localStorage.getItem("bella_barba_appointments");
            const myIds = savedIdsStr ? JSON.parse(savedIdsStr) : [];
            const isMine = myIds.includes(data.appointment.id);

            if (isMine) {
              const statusTranslations: Record<string, string> = {
                confirmed: "CONFIRMADA 💚",
                canceled: "CANCELADA 💔",
                completed: "REALIZADA 🎉",
                pending: "RE-EVALUADA ⏳"
              };
              triggerToast(
                "¡Estado de tu cita cambiado!", 
                `Tu cita para ${data.appointment.serviceName} a las ${data.appointment.time} ahora está: ${statusTranslations[data.appointment.status]}`, 
                data.appointment.status === "confirmed" ? "success" : data.appointment.status === "canceled" ? "warning" : "info"
              );
            } else {
              // General update (useful for refreshing slots in client view)
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
          if (data.appointments) setAppointments(data.appointments);
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
        if (data.appointments) setAppointments(data.appointments);
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
      return await res.json();
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
      
      {/* 1. Header Superior & Switch de Roles */}
      <header className="sticky top-0 z-40 w-full bg-elegant-card/95 backdrop-blur-md border-b border-elegant-border shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:h-16 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          
          {/* Logo SYNCBARBER & Salon Info */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0">
            <div className="flex items-center space-x-2.5">
              <SyncBarberLogo size={34} showText={true} />
              <div className="h-7 w-[1px] bg-elegant-border hidden xs:block" />
              
              <div className="flex items-center gap-2">
                {config.customLogoUrl && (
                  <div className="h-7 w-7 rounded-full bg-elegant-sub border border-elegant-border flex items-center justify-center text-sm overflow-hidden shrink-0">
                    {config.customLogoUrl.startsWith("http") || config.customLogoUrl.startsWith("data:image") ? (
                      <img src={config.customLogoUrl} alt={config.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-sans leading-none">{config.customLogoUrl}</span>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white font-sans block max-w-[100px] xs:max-w-[140px] sm:max-w-none truncate">
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
                    <p className="text-[7px] sm:text-[9px] text-elegant-gold font-bold uppercase mt-0.5 leading-none max-w-[140px] xs:max-w-[200px] sm:max-w-xs truncate" title={config.tagline}>
                      {config.tagline}
                    </p>
                  ) : (
                    <p className="text-[7px] sm:text-[9px] text-elegant-gold font-bold tracking-widest uppercase mt-0.5 leading-none">
                      Inquilino En Vivo
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action for mobile */}
            <div className="flex items-center space-x-1.5 md:hidden">
              <button
                onClick={openDuplicateTab}
                className="p-1.5 border border-elegant-border rounded-xl bg-elegant-sub hover:bg-elegant-border text-elegant-text transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Probar en otra pestaña"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Selector de Roles Principal - Desplazable horizontalmente en celulares */}
          <div className="bg-elegant-sub p-1 rounded-2xl flex items-center space-x-1 border border-elegant-border overflow-x-auto max-w-full scrollbar-none shrink-0 self-stretch md:self-auto">
            {activeTenantId === "bella-barba" && (
              <button
                onClick={() => {
                  if (currentRole !== "syncbarber") {
                    setCurrentRole("syncbarber");
                  }
                }}
                className={`px-2.5 py-1.5 xs:px-3 rounded-xl text-[10px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentRole === "syncbarber"
                    ? "bg-cyan-500 text-elegant-bg shadow-xs font-extrabold"
                    : "text-elegant-text-muted hover:text-cyan-400"
                }`}
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Conoce SYNCBARBER</span>
              </button>
            )}

            <button
              onClick={() => {
                if (currentRole !== "client") {
                  setCurrentRole("client");
                }
              }}
              className={`px-2.5 py-1.5 xs:px-3 rounded-xl text-[10px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                currentRole === "client"
                  ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                  : "text-elegant-text-muted hover:text-elegant-text"
              }`}
            >
              <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Vista Cliente</span>
            </button>

            {!loggedUser ? (
              <button
                onClick={() => setCurrentRole("login")}
                className={`px-2.5 py-1.5 xs:px-3 rounded-xl text-[10px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  currentRole === "login"
                    ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                    : "text-elegant-text-muted hover:text-elegant-text"
                }`}
              >
                <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Ingreso Personal</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setCurrentRole(loggedUser.role)}
                  className={`px-2.5 py-1.5 xs:px-3 rounded-xl text-[10px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    currentRole === "admin" || currentRole === "barber"
                      ? "bg-elegant-gold text-elegant-bg shadow-xs font-extrabold"
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>
                    {loggedUser.role === "admin" ? "Panel" : `${loggedUser.name.split(" ")[0]}`}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 border border-rose-950 hover:bg-rose-950/40 text-rose-400 rounded-xl text-[9px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                >
                  Salir
                </button>
              </>
            )}

            {currentRole === "developer" && (
              <button
                onClick={() => setCurrentRole("developer")}
                className="px-2.5 py-1.5 xs:px-3 rounded-xl text-[10px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap bg-amber-500 text-elegant-bg shadow-xs font-extrabold"
              >
                <Cpu className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Desarrollador</span>
              </button>
            )}
          </div>

          {/* Botones de acción rápidos para Desktop / Mobile (filtrados por Perfil y Licencia) */}
          {(() => {
            const activeLicense = config.licenseType || "premium";
            const isStaffUser = loggedUser && (loggedUser.role === "admin" || loggedUser.role === "barber" || loggedUser.role === "developer");
            const isStaffView = currentRole === "admin" || currentRole === "barber" || currentRole === "developer";
            const isAdminOrDev = (loggedUser && (loggedUser.role === "admin" || loggedUser.role === "developer")) || currentRole === "admin" || currentRole === "developer";
            const isBarberOrStaff = isStaffUser || isStaffView;

            const supportsModoSilla = activeLicense === "profesional" || activeLicense === "premium";
            const supportsKiosco = activeLicense === "premium";
            const supportsCierreCaja = activeLicense === "profesional" || activeLicense === "premium";

            const canShowModoSilla = isBarberOrStaff && supportsModoSilla;
            const canShowKiosco = isAdminOrDev && supportsKiosco;
            const canShowCierreCaja = isBarberOrStaff && supportsCierreCaja;
            const canShowProbarRealTime = currentRole === "developer" || (loggedUser && loggedUser.role === "developer") || (loggedUser && loggedUser.role === "admin");
            const canShowSincro = isBarberOrStaff || !!loggedUser;

            return (
              <div className="flex items-center space-x-2 shrink-0">
                {/* Botón PWA Modo Silla */}
                {canShowModoSilla && (
                  <button
                    onClick={() => setIsModoSillaActive(true)}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 rounded-xl text-[10px] xs:text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Abrir Vista Móvil PWA para Barberos en Silla"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span>📱 Modo Silla</span>
                  </button>
                )}

                {/* Botón Kiosco Recepción */}
                {canShowKiosco && (
                  <button
                    onClick={() => setShowKioscoModal(true)}
                    className="px-2.5 py-1.5 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 rounded-xl text-[10px] xs:text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Abrir Kiosco de Check-in Recepción (Pantalla TV)"
                  >
                    <span>📺 Kiosco</span>
                  </button>
                )}

                {/* Botón Cierre de Caja */}
                {canShowCierreCaja && (
                  <button
                    onClick={() => setShowCierreCajaModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/40 text-emerald-300 rounded-xl text-[10px] xs:text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Abrir Arqueo y Cierre de Caja Automatizado"
                  >
                    <span>💰 Cierre Caja</span>
                  </button>
                )}

                {/* Live Indicator Dot */}
                {canShowSincro && (
                  <div 
                    className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
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

                {/* Probar doble ventana */}
                {canShowProbarRealTime && (
                  <button
                    onClick={openDuplicateTab}
                    className="hidden md:flex p-2 border border-elegant-border rounded-xl bg-elegant-sub hover:bg-elegant-border text-elegant-text transition-colors active:scale-95 cursor-pointer items-center justify-center"
                    title="Abrir otra pestaña para probar en tiempo real"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden lg:inline text-[10px] font-bold ml-1.5 uppercase">Probar Real-time</span>
                  </button>
                )}
              </div>
            );
          })()}

        </div>
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
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 space-y-2">
                {/* Nivel 1: Módulos Principales (Categorías) */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5">
                  <div className="flex items-center space-x-1.5 xs:space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (adminTab !== "agenda" && adminTab !== "calendar") {
                          setAdminTab("agenda");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                        activeCategory === "citas"
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-xs font-extrabold"
                          : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span>📅 Citas & Agenda</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (adminTab !== "inventory" && adminTab !== "commissions") {
                          setAdminTab("inventory");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                        activeCategory === "pos"
                          ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-xs font-extrabold"
                          : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <Wine className="h-3.5 w-3.5 text-cyan-400" />
                      <span>💰 Ventas & POS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (adminTab !== "barbers" && adminTab !== "clients") {
                          setAdminTab("barbers");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                        activeCategory === "equipo"
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-xs font-extrabold"
                          : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span>👥 Equipo & Clientes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminTab("settings")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                        activeCategory === "ajustes"
                          ? "bg-elegant-gold/20 border-elegant-gold/60 text-elegant-gold shadow-xs font-extrabold"
                          : "bg-elegant-sub/60 border-elegant-border text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <Settings className="h-3.5 w-3.5 text-elegant-gold" />
                      <span>⚙️ Configuración</span>
                    </button>
                  </div>
                </div>

                {/* Nivel 2: Submódulos Específicos del Módulo Activo */}
                <div className="flex items-center space-x-2 pt-1 border-t border-elegant-border/40 overflow-x-auto scrollbar-none text-xs">
                  <span className="text-[10px] font-extrabold text-elegant-text-muted uppercase tracking-wider shrink-0 mr-1 font-mono">
                    Submódulos:
                  </span>

                  {activeCategory === "citas" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdminTab("agenda")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "agenda"
                            ? "bg-amber-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>Control de Agenda Diaria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("calendar")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "calendar"
                            ? "bg-amber-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Calendario Interactivo</span>
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "inventory"
                            ? "bg-cyan-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Wine className="h-3.5 w-3.5" />
                        <span>Inventario & Nevera POS</span>
                        {isInventoryLocked && (
                          <span className="text-[8px] bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded-md font-extrabold">
                            🔒 PRO
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("commissions")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "commissions"
                            ? "bg-cyan-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Coins className="h-3.5 w-3.5" />
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "barbers"
                            ? "bg-emerald-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>Administrar Barberos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("clients")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "clients"
                            ? "bg-emerald-500 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" />
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "catalog"
                            ? "bg-amber-400 text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Camera className="h-3.5 w-3.5 text-amber-500" />
                        <span>Catálogo de Cortes & Lookbook</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminTab("settings")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer shrink-0 font-bold ${
                          adminTab === "settings"
                            ? "bg-elegant-gold text-black shadow-xs font-extrabold"
                            : "bg-elegant-sub/80 text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Configuración del Salón</span>
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

      {/* 5. Contenedor de Toasts Real-Time Flotantes */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-lg border flex items-start gap-3 backdrop-blur-md ${
                t.type === "success" 
                  ? "bg-emerald-950/95 border-emerald-800 text-emerald-100" 
                  : t.type === "warning" 
                    ? "bg-rose-950/95 border-rose-800 text-rose-100" 
                    : "bg-elegant-card/95 border-elegant-border text-elegant-text"
              }`}
            >
              <div className="p-1 bg-white/10 rounded-lg shrink-0 mt-0.5">
                <Bell className="h-4 w-4 text-elegant-gold" />
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <h4 className="text-xs font-bold tracking-tight">{t.title}</h4>
                <p className="text-[11px] opacity-90 leading-relaxed">{t.message}</p>
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="text-white/40 hover:text-white shrink-0 self-start p-0.5"
              >
                <X className="h-3.5 w-3.5" />
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

      {/* DemoCenter removed per user request */}

    </div>
  );
}
