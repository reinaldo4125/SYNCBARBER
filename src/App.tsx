import { useState, useEffect } from "react";
import { Appointment, Service, SalonConfig, Barber, MembershipPlan, BarberReview, ClientAccount } from "./types";
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
  Cpu
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
  const [currentRole, setCurrentRole] = useState<"client" | "admin" | "barber" | "login" | "developer">("client");
  const [adminTab, setAdminTab] = useState<"agenda" | "calendar" | "commissions" | "settings" | "barbers" | "clients">("agenda");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string; username: string; role: 'admin' | 'barber'; barberId?: string; salonId?: string } | null>(null);

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return localStorage.getItem("active_tenant_id") || "bella-barba";
  });

  // Core synchronized State from Server
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [reviews, setReviews] = useState<BarberReview[]>([]);
  const [clients, setClients] = useState<ClientAccount[]>([]);
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
        
        // Start checking fallback status with standard fetch polling
        if (!retryInterval) {
          retryInterval = setInterval(() => {
            fetchStateFallback();
          }, 4000);
        }
      };
    };

    // Fallback polling in case SSE breaks or is blocked by specific firewall setups
    const fetchStateFallback = async () => {
      try {
        const [appRes, servRes, confRes, barbRes, membRes, revRes, cliRes] = await Promise.all([
          fetch("/api/appointments"),
          fetch("/api/services"),
          fetch("/api/config"),
          fetch("/api/barbers"),
          fetch("/api/memberships"),
          fetch("/api/reviews"),
          fetch("/api/clients"),
        ]);
        if (appRes.ok && servRes.ok && confRes.ok && barbRes.ok && membRes.ok && revRes.ok && cliRes.ok) {
          const apps = await appRes.json();
          const servs = await servRes.json();
          const conf = await confRes.json();
          const barbs = await barbRes.json();
          const membs = await membRes.json();
          const revs = await revRes.json();
          const clis = await cliRes.json();
          
          setAppointments(apps);
          setServices(servs);
          setConfig(conf);
          setBarbers(barbs);
          setMemberships(membs);
          setReviews(revs);
          setClients(clis);
          setIsConnected(true);
          setIsLoading(false);
          setErrorText("");
          
          // Try reconnecting SSE only if at least 20 seconds have passed since last failure
          const timeSinceLastFailure = Date.now() - lastSseFailureTime;
          if (timeSinceLastFailure > 20000) {
            if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }
        } else {
          throw new Error("Respuesta no satisfactoria del servidor");
        }
      } catch (err) {
        console.error("Fallback fetch failed:", err);
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
      if (!res.ok) throw new Error("Error al guardar ajustes.");
      return await res.json();
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
      return await res.json();
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

  // Open multi-window test warning helper
  const openDuplicateTab = () => {
    window.open(window.location.href, "_blank");
  };

  return (
    <div className="min-h-screen bg-elegant-bg text-elegant-text font-sans flex flex-col antialiased">
      
      {/* 1. Header Superior & Switch de Roles */}
      <header className="sticky top-0 z-40 w-full bg-elegant-card/95 backdrop-blur-md border-b border-elegant-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo SYNCBARBER & Salon Info */}
          <div className="flex items-center space-x-3 shrink-0">
            <SyncBarberLogo size={38} showText={true} />
            <div className="h-8 w-[1px] bg-elegant-border hidden xs:block" />
            <div className="flex flex-col">
              {loggedUser ? (
                <span className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight text-white font-sans block max-w-[90px] xs:max-w-[140px] sm:max-w-none truncate">
                  {config.name || "Cargando..."}
                </span>
              ) : (
                <select
                  value={activeTenantId}
                  onChange={(e) => {
                    const nextTenant = e.target.value;
                    setActiveTenantId(nextTenant);
                    localStorage.setItem("active_tenant_id", nextTenant);
                    triggerToast(
                      "Cambiando Salón",
                      `Cargando información de ${
                        nextTenant === "bella-barba"
                          ? "Bella & Barba Studio"
                          : nextTenant === "el-figaro"
                          ? "Peluquería El Fígaro"
                          : "Estilo & Tijera"
                      }`,
                      "info"
                    );
                  }}
                  className="bg-elegant-sub border border-elegant-border text-white text-[10px] sm:text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-elegant-gold cursor-pointer font-sans"
                >
                  <option value="bella-barba">Bella & Barba Studio</option>
                  <option value="el-figaro">Peluquería El Fígaro</option>
                  <option value="estilo-tijera">Estilo & Tijera</option>
                </select>
              )}
              <p className="text-[7px] sm:text-[9px] text-elegant-gold font-bold tracking-widest uppercase mt-0.5">
                Inquilino En Vivo
              </p>
            </div>
          </div>

          {/* Selector de Roles Principal */}
          <div className="bg-elegant-sub p-1 rounded-2xl flex items-center space-x-1 border border-elegant-border shrink-0">
            <button
              onClick={() => {
                if (currentRole !== "client") {
                  setCurrentRole("client");
                }
              }}
              className={`px-2.5 py-1.5 xs:px-3 py-1.5 md:px-4 rounded-xl text-[11px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
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
                className={`px-2.5 py-1.5 xs:px-3 py-1.5 md:px-4 rounded-xl text-[11px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
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
                  className={`px-2.5 py-1.5 xs:px-3 py-1.5 md:px-4 rounded-xl text-[11px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
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
                  className="px-2 py-1 border border-rose-950 hover:bg-rose-950/40 text-rose-400 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Salir
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentRole("developer")}
              className={`px-2.5 py-1.5 xs:px-3 py-1.5 md:px-4 rounded-xl text-[11px] xs:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                currentRole === "developer"
                  ? "bg-amber-500 text-elegant-bg shadow-xs font-extrabold"
                  : "text-elegant-text-muted hover:text-elegant-text"
              }`}
            >
              <Cpu className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Desarrollador</span>
            </button>
          </div>

          {/* Botones de acción rápidos */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Live Indicator Dot */}
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

            {/* Probar doble ventana */}
            <button
              onClick={openDuplicateTab}
              className="p-2 border border-elegant-border rounded-xl bg-elegant-sub hover:bg-elegant-border text-elegant-text transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
              title="Abrir otra pestaña para probar en tiempo real"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden lg:inline text-[10px] font-bold ml-1.5 uppercase">Probar Real-time</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Sub-Menú para Administradores (Agenda vs Barberos vs Config) */}
      {currentRole === "admin" && (
        (() => {
          const activeLicense = config.licenseType || "premium";
          const isCalendarLocked = activeLicense === "basica";
          const isCommissionsLocked = activeLicense === "basica" || activeLicense === "profesional";
          const isClientsLocked = activeLicense === "basica";

          return (
            <div className="bg-elegant-card text-elegant-text border-b border-elegant-border">
              <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center space-x-4 h-12 text-xs overflow-x-auto">
                <button
                  onClick={() => setAdminTab("agenda")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "agenda" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Control de Agenda Diaria</span>
                </button>
                <button
                  onClick={() => setAdminTab("calendar")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "calendar" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-elegant-gold" />
                  <span>Calendario Interactivo</span>
                  {isCalendarLocked && (
                    <span className="text-[8px] bg-rose-950/40 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                      🔒 PRO
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAdminTab("commissions")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "commissions" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Coins className="h-4 w-4 text-elegant-gold" />
                  <span>Comisiones & Propinas</span>
                  {isCommissionsLocked && (
                    <span className="text-[8px] bg-rose-950/40 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                      🔒 VIP
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAdminTab("barbers")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "barbers" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Administrar Barberos</span>
                </button>
                <button
                  onClick={() => setAdminTab("clients")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "clients" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Clientes & Membresías</span>
                  {isClientsLocked && (
                    <span className="text-[8px] bg-rose-950/40 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                      🔒 PRO
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAdminTab("settings")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    adminTab === "settings" 
                      ? "bg-elegant-sub text-elegant-gold font-bold" 
                      : "text-elegant-text-muted hover:text-elegant-text"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configuración del Salón</span>
                </button>
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

        {loggedUser?.role === "admin" && config.needsSetup && (
          <InitialSetupWizard
            initialConfig={config}
            initialServices={services}
            initialBarbers={barbers}
            onComplete={handleCompleteSetup}
            formatPrice={formatPrice}
          />
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
              {currentRole === "client" ? (
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
                />
              ) : currentRole === "login" ? (
                <BarberLogin
                  onLogin={handleLogin}
                  onCancel={() => setCurrentRole("client")}
                />
              ) : currentRole === "developer" ? (
                <DeveloperPanel
                  config={config}
                  onUpdateConfig={handleUpdateConfig}
                  formatPrice={formatPrice}
                  triggerToast={triggerToast}
                />
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
                />
              ) : adminTab === "agenda" ? (
                <AdminDashboard
                  appointments={appointments}
                  services={services}
                  config={config}
                  onUpdateAppointment={handleUpdateAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                  onCreateAppointment={handleCreateAppointment}
                  formatPrice={formatPrice}
                  isBarberView={false}
                  barbers={barbers}
                  onUpdateBarber={handleUpdateBarber}
                />
              ) : adminTab === "calendar" ? (
                (config.licenseType || "premium") === "basica" ? (
                  <LockedModule
                    moduleName="Calendario Interactivo"
                    requiredLicense="profesional"
                    activeLicense={config.licenseType || "premium"}
                    onNavigateToSettings={() => setAdminTab("settings")}
                  />
                ) : (
                  <InteractiveCalendar
                    appointments={appointments}
                    barbers={barbers}
                    services={services}
                    config={config}
                    onUpdateAppointment={handleUpdateAppointment}
                    onCreateAppointment={handleCreateAppointment}
                    formatPrice={formatPrice}
                  />
                )
              ) : adminTab === "commissions" ? (
                ((config.licenseType || "premium") === "basica" || (config.licenseType || "premium") === "profesional") ? (
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
                />
              ) : adminTab === "clients" ? (
                (config.licenseType || "premium") === "basica" ? (
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

    </div>
  );
}
