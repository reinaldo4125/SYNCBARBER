import React, { useState, useEffect } from "react";
import { 
  Terminal as TerminalIcon, 
  Key, 
  Cpu, 
  Layers, 
  Activity, 
  Sparkles, 
  Copy, 
  Plus, 
  Play, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Globe, 
  Database, 
  ShieldAlert,
  Clock,
  ExternalLink,
  Lock,
  Unlock,
  Check,
  Server,
  UserCheck,
  Code,
  Network,
  Calendar,
  Users
} from "lucide-react";
import { SalonConfig } from "../types";

interface DeveloperPanelProps {
  config: SalonConfig;
  onUpdateConfig: (newConfig: Partial<SalonConfig>) => Promise<any>;
  formatPrice: (price: number) => string;
  triggerToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

interface License {
  key: string;
  salonName: string;
  licenseType: 'basica' | 'profesional' | 'premium';
  createdAt: string;
  activatedAt?: string;
  status: 'active' | 'pending' | 'expired';
}

export default function DeveloperPanel({
  config,
  onUpdateConfig,
  formatPrice,
  triggerToast
}: DeveloperPanelProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Demo Multi-Tenant selection
  const [activeTab, setActiveTab] = useState<"licenses" | "multitenant">("licenses");
  const [selectedDemoTenant, setSelectedDemoTenant] = useState<"bella-barba" | "el-figaro" | "estilo-tijera">("bella-barba");

  // Real multi-tenant states
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Admin and Tenant form states
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newAdminSalon, setNewAdminSalon] = useState("bella-barba");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [updatingLicense, setUpdatingLicense] = useState(false);

  // Form State
  const [salonNameInput, setSalonNameInput] = useState("");
  const [licenseTypeInput, setLicenseTypeInput] = useState<'basica' | 'profesional' | 'premium'>("premium");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual Activation Input
  const [activationInput, setActivationInput] = useState("");
  const [activating, setActivating] = useState(false);

  // Simulated Telemetry logs
  const [logs, setLogs] = useState<{ id: string; timestamp: string; tag: string; text: string; type: "info" | "success" | "warn" | "error" }[]>([]);

  // Statistics
  const [activeConnections, setActiveConnections] = useState(3); // Simulated default

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await fetch("/api/developer/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants);
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al cargar inquilinos del servidor", "error");
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch("/api/developer/admins");
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data.admins);
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al cargar administradores del servidor", "error");
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleUpdateTenantLicense = async (tenantId: string, type: 'basica' | 'profesional' | 'premium') => {
    try {
      setUpdatingLicense(true);
      addLog("LICENCIA", `Actualizando licencia de '${tenantId}' a ${type.toUpperCase()}...`, "info");
      const res = await fetch(`/api/developer/tenants/${tenantId}/license`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseType: type })
      });

      if (res.ok) {
        triggerToast("Licencia Actualizada", `Licencia para el salón fue modificada a ${type.toUpperCase()}`, "success");
        addLog("LICENCIA", `Licencia de '${tenantId}' actualizada a ${type.toUpperCase()} en servidor`, "success");
        await fetchTenants();
        fetchLicenses(true);
      } else {
        const err = await res.json();
        triggerToast("Fallo al Actualizar", err.error || "No se pudo actualizar.", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al comunicar actualización de licencia", "error");
    } finally {
      setUpdatingLicense(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminUser.trim() || !newAdminPass.trim()) {
      triggerToast("Campos Faltantes", "Todos los campos de administrador son obligatorios.", "warning");
      return;
    }

    try {
      setCreatingAdmin(true);
      addLog("ADMINISTRADOR", `Creando administrador '${newAdminUser}' para barbería '${newAdminSalon}'...`, "info");
      const res = await fetch("/api/developer/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAdminName.trim(),
          username: newAdminUser.trim(),
          password: newAdminPass.trim(),
          salonId: newAdminSalon
        })
      });

      if (res.ok) {
        triggerToast("Administrador Creado", `El usuario administrador '${newAdminUser}' fue creado con éxito.`, "success");
        addLog("ADMINISTRADOR", `Administrador de barbería creado con éxito: ${newAdminUser}`, "success");
        setNewAdminName("");
        setNewAdminUser("");
        setNewAdminPass("");
        await fetchAdmins();
      } else {
        const err = await res.json();
        triggerToast("Error de Creación", err.error || "Fallo en el servidor.", "warning");
        addLog("ADMINISTRADOR", `Fallo al crear administrador: ${err.error || "Fallo"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo de comunicación al registrar administrador", "error");
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Load licenses from server
  const fetchLicenses = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch("/api/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses);
        addLog("API", `GET /api/licenses - Cargadas ${data.licenses.length} licencias con éxito`, "info");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al conectar con la API de licencias", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    fetchTenants();
    fetchAdmins();
    
    // Setup initial developer terminal logs
    const initialLogs = [
      { id: "1", timestamp: new Date(Date.now() - 3600 * 1000).toLocaleTimeString(), tag: "SYS", text: "Controlador de Microservicios Iniciado", type: "info" as const },
      { id: "2", timestamp: new Date(Date.now() - 3000 * 1000).toLocaleTimeString(), tag: "LICENCIA", text: "Licencia Premium activa validada en servidor", type: "success" as const },
      { id: "3", timestamp: new Date(Date.now() - 1500 * 1000).toLocaleTimeString(), tag: "SSE", text: "Real-time SSE event pipeline conectado", type: "info" as const },
    ];
    setLogs(initialLogs);

    // Dynamic logging simulation
    const interval = setInterval(() => {
      const randomLogs = [
        { tag: "SSE", text: "Enviando ping de telemetría para mantener canal abierto", type: "info" as const },
        { tag: "SYS", text: "Comprobando integridad de slots de tiempo...", type: "info" as const },
        { tag: "API", text: "GET /api/appointments - Sincronizado", type: "info" as const },
      ];
      const selected = randomLogs[Math.floor(Math.random() * randomLogs.length)];
      addLog(selected.tag, selected.text, selected.type);
      setActiveConnections(prev => Math.max(1, prev + (Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0)));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const addLog = (tag: string, text: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      { id: Date.now().toString() + Math.random(), timestamp, tag, text, type },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Helper for multi-tenant simulation database view
  const getSimulatedBarbers = (tenant: string) => {
    switch (tenant) {
      case "el-figaro":
        return [
          { id: "eb1", name: "Enzo Rossi", username: "enzo", salon_id: "el-figaro" },
          { id: "eb2", name: "Giovanni Di Barber", username: "giovanni", salon_id: "el-figaro" },
        ];
      case "estilo-tijera":
        return [
          { id: "et1", name: "Elena Tijera", username: "elena", salon_id: "estilo-tijera" },
        ];
      default:
        return [
          { id: "b1", name: "Carlos Barber", username: "carlos", salon_id: "bella-barba" },
          { id: "b2", name: "Mateo Estilos", username: "mateo", salon_id: "bella-barba" },
          { id: "b3", name: "Andrés Cortes", username: "andres", salon_id: "bella-barba" },
        ];
    }
  };

  const getSimulatedAppointments = (tenant: string) => {
    switch (tenant) {
      case "el-figaro":
        return [
          { id: "da1", clientName: "Roberto Gómez", serviceName: "Afeitado Tradicional", barberName: "Enzo Rossi", date: "2026-07-08", time: "10:30", price: 15000, salon_id: "el-figaro" },
          { id: "da2", clientName: "Lucía Fernández", serviceName: "Corte Bob", barberName: "Giovanni Di Barber", date: "2026-07-08", time: "14:00", price: 30000, salon_id: "el-figaro" },
        ];
      case "estilo-tijera":
        return [
          { id: "da3", clientName: "Mateo López", serviceName: "Corte Clásico", barberName: "Elena Tijera", date: "2026-07-08", time: "11:30", price: 12000, salon_id: "estilo-tijera" },
        ];
      default:
        return [
          { id: "da4", clientName: "Carlos Gómez", serviceName: "Corte de Cabello Premium", barberName: "Carlos Barber", date: "2026-07-08", time: "09:30", price: 18000, salon_id: "bella-barba" },
          { id: "da5", clientName: "María Camila", serviceName: "Corte de Cabello Estilo", barberName: "Mateo Estilos", date: "2026-07-08", time: "10:30", price: 25000, salon_id: "bella-barba" },
          { id: "da6", clientName: "Juan David Castro", serviceName: "Perfilado de Barba", barberName: "Carlos Barber", date: "2026-07-08", time: "12:00", price: 12000, salon_id: "bella-barba" },
        ];
    }
  };

  // Generate License
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonNameInput.trim()) {
      triggerToast("Error", "Debes ingresar el nombre del salón titular.", "warning");
      return;
    }

    try {
      setGenerating(true);
      addLog("LICENCIA", `Generando clave de licencia para '${salonNameInput}'...`, "info");
      const res = await fetch("/api/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: salonNameInput.trim(),
          licenseType: licenseTypeInput
        })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Licencia Generada", `Se generó una licencia de tipo ${licenseTypeInput.toUpperCase()}`, "success");
        triggerToast("Admin Auto-Creado", `Usuario: admin-${data.tenantId} | Clave: admin`, "info");
        addLog("LICENCIA", `Nueva clave generada exitosamente: ${data.license.key}`, "success");
        addLog("SaaS", `Inquilino '${data.tenantId}' registrado. Admin auto-creado: admin-${data.tenantId} (Clave: admin)`, "success");
        setSalonNameInput("");
        fetchLicenses(true);
        await fetchTenants();
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al generar llave de licencia", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Activate license by key
  const handleActivateLicense = async (keyToActivate: string) => {
    try {
      setActivating(true);
      addLog("LICENCIA", `Enviando solicitud de activación para llave: ${keyToActivate}`, "info");
      const res = await fetch("/api/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToActivate })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Licencia Activada", `El salón ahora opera bajo la licencia ${data.license.licenseType.toUpperCase()}`, "success");
        addLog("LICENCIA", `Licencia activada con éxito para el salón: ${data.config.name} (${data.license.licenseType})`, "success");
        setActivationInput("");
        fetchLicenses(true);
        await fetchTenants();
      } else {
        const errData = await res.json();
        triggerToast("Activación Fallida", errData.error || "La licencia no es válida.", "warning");
        addLog("LICENCIA", `Intento de activación fallido: ${errData.error || "No válida"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error en el pipeline de activación", "error");
    } finally {
      setActivating(false);
    }
  };

  // Revoke License
  const handleRevokeLicense = async (keyToRevoke: string) => {
    if (!confirm(`¿Estás seguro de revocar la licencia ${keyToRevoke}? Esto degradará el salón si está en uso.`)) {
      return;
    }

    try {
      addLog("LICENCIA", `Solicitando revocación de licencia: ${keyToRevoke}`, "warn");
      const res = await fetch("/api/licenses/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToRevoke })
      });

      if (res.ok) {
        triggerToast("Licencia Revocada", "La licencia seleccionada ha sido inhabilitada.", "info");
        addLog("LICENCIA", `Licencia revocada con éxito.`, "warn");
        fetchLicenses(true);
        await fetchTenants();
      } else {
        throw new Error("Fallo al revocar");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo de comunicación al revocar licencia", "error");
    }
  };

  // Simulate Guest booking injection
  const handleSimulateBooking = async () => {
    try {
      addLog("SIMULACIÓN", "Inyectando cita de cliente simulada...", "info");
      
      const mockNames = ["Andrés Felipe", "Diana Carolina", "Mateo Gómez", "Valentina Ríos", "Santiago López", "Gabriel Restrepo", "Mariana Vélez"];
      const mockPhones = ["3004561234", "3128765432", "3159081273", "3204981122", "3105554433"];
      const mockNotes = ["Corte degradado bajo", "Arreglo de barba con navaja", "Servicio rápido, llego sobre el tiempo", "Sin observaciones"];

      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const randomPhone = mockPhones[Math.floor(Math.random() * mockPhones.length)];
      const randomNote = mockNotes[Math.floor(Math.random() * mockNotes.length)];
      
      // Select barber b1, b2, or b3
      const randomBarberNum = Math.floor(1 + Math.random() * 3);
      const barberId = `b${randomBarberNum}`;
      const barberNames: Record<string, string> = { b1: "Carlos Barber", b2: "Mateo Estilos", b3: "Andrés Cortes" };

      // Set date to today
      const todayStr = new Date().toISOString().split("T")[0];
      
      // Pick a random time during working hours
      const hour = Math.floor(9 + Math.random() * 10);
      const min = Math.random() > 0.5 ? "00" : "30";
      const timeStr = `${hour.toString().padStart(2, "0")}:${min}`;

      const serviceRes = await fetch("/api/services");
      const servicesList = await serviceRes.json();
      const randomService = servicesList[Math.floor(Math.random() * servicesList.length)] || { id: "s1", name: "Corte Premium", price: 18000, duration: 30 };

      const appointmentData = {
        clientName: randomName,
        clientPhone: randomPhone,
        serviceId: randomService.id,
        serviceName: randomService.name,
        price: randomService.price,
        date: todayStr,
        time: timeStr,
        duration: randomService.duration,
        barberId,
        barberName: barberNames[barberId],
        notes: randomNote
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData)
      });

      if (res.ok) {
        addLog("SIMULACIÓN", `Cita simulada creada para '${randomName}' en tiempo real`, "success");
      } else {
        const err = await res.json();
        addLog("SIMULACIÓN", `Fallo al agendar cita simulada: ${err.message || "Conflicto de horario"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al inyectar cita simulada", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    triggerToast("Clave Copiada", "La clave se copió al portapapeles.", "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getLicenseBadge = (type: string) => {
    switch (type) {
      case "premium":
        return <span className="text-[10px] bg-amber-950 text-elegant-gold border border-amber-800/80 px-2 py-0.5 rounded-full font-bold">🥇 Premium</span>;
      case "profesional":
        return <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full font-bold">🥈 Profesional</span>;
      default:
        return <span className="text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full font-bold">🥉 Básica</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Activa</span>;
      case "expired":
        return <span className="text-[9px] bg-rose-950/80 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Revocada</span>;
      default:
        return <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-scaleUp">
      
      {/* 1. Header del Dashboard de Desarrollo */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
          <Cpu className="h-32 w-32" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-500/10 text-elegant-gold rounded-lg border border-amber-500/20 text-xs font-bold px-2 py-0.5 font-mono">
                SUPERUSER PORTAL
              </span>
              <span className="flex items-center text-emerald-400 gap-1 text-[10px] font-mono font-bold bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Consola Lista
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Panel de Control del Desarrollador & Licencias
            </h1>
            <p className="text-xs text-elegant-text-muted leading-relaxed max-w-2xl">
              Como administrador global o desarrollador del software SaaS SYNCBARBER, puedes emitir nuevas licencias, activar suscripciones para salones de belleza y monitorizar la telemetría del servidor en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchLicenses()}
              className="p-3 bg-elegant-sub border border-elegant-border hover:bg-elegant-card rounded-2xl text-elegant-text-muted hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Refrescar Servidor"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <div className="bg-elegant-sub border border-elegant-border px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] text-elegant-text-muted font-bold font-mono">SSE CLIENTS</span>
              <span className="text-sm font-extrabold text-white font-mono flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-400 animate-pulse" />
                {activeConnections}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Consola */}
      <div className="flex border-b border-elegant-border/80 gap-6">
        <button
          onClick={() => setActiveTab("licenses")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 px-1 ${
            activeTab === "licenses"
              ? "border-elegant-gold text-elegant-gold font-extrabold"
              : "border-transparent text-elegant-text-muted hover:text-white"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Licencias & Telemetría en Vivo</span>
        </button>
        <button
          onClick={() => setActiveTab("multitenant")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 px-1 ${
            activeTab === "multitenant"
              ? "border-elegant-gold text-elegant-gold font-extrabold"
              : "border-transparent text-elegant-text-muted hover:text-white"
          }`}
        >
          <Network className="h-4 w-4" />
          <span>Arquitectura SaaS Multi-Inquilino</span>
        </button>
      </div>

      {activeTab === "licenses" ? (
        <>
          {/* 2. Grid de Acción Rápida */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Generador de Licencias (Izquierda) */}
        <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-elegant-border pb-3">
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <Key className="h-4.5 w-4.5 text-elegant-gold" />
                Generar Llave de Licencia
              </h2>
              <p className="text-[11px] text-elegant-text-muted">
                Emite un token de suscripción cifrado para un nuevo salón de belleza.
              </p>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Nombre del Salón / Peluquería:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Barbería Don Carlos"
                  value={salonNameInput}
                  onChange={(e) => setSalonNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Módulo / Nivel de Suscripción:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["basica", "profesional", "premium"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLicenseTypeInput(type)}
                      className={`py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                        licenseTypeInput === type
                          ? "bg-elegant-gold border-elegant-gold text-elegant-bg"
                          : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700"
                      }`}
                    >
                      {type === "premium" ? "🥇 Premium" : type === "profesional" ? "🥈 Pro" : "🥉 Básica"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-elegant-gold hover:bg-amber-500 disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{generating ? "Generando..." : "Generar & Guardar Licencia"}</span>
              </button>
            </form>
          </div>

          {/* Quick Activate Card */}
          <div className="bg-elegant-sub/50 border border-elegant-border rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                Activador Manual de Licencias
              </h3>
              <p className="text-[10px] text-elegant-text-muted mt-0.5">
                Pega una llave de suscripción para simular la activación en este salón.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pega la licencia (ej. LIC-PREM-...)"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-elegant-card border border-elegant-border text-white text-[11px] font-mono rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 uppercase"
              />
              <button
                type="button"
                disabled={activating || !activationInput}
                onClick={() => handleActivateLicense(activationInput)}
                className="px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Activar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Simulador y Telemetría en Vivo (Derecha) */}
        <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs flex flex-col space-y-4">
          <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-emerald-400" />
                Simulador de Eventos & Telemetría
              </h2>
              <p className="text-[11px] text-elegant-text-muted">
                Prueba la reactividad en tiempo real de tu plataforma e inyecta eventos.
              </p>
            </div>

            <button
              onClick={handleSimulateBooking}
              className="px-3 py-1.5 bg-elegant-sub border border-elegant-border hover:border-emerald-600 hover:text-emerald-400 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Play className="h-3 w-3 shrink-0" />
              <span>Inyectar Cita Cliente</span>
            </button>
          </div>

          {/* Terminal Logs view */}
          <div className="flex-1 min-h-[220px] bg-neutral-950 rounded-2xl border border-neutral-900 p-4 font-mono text-[10px] leading-relaxed text-emerald-500 overflow-y-auto max-h-[280px] flex flex-col-reverse shadow-inner">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-1.5 py-0.5 hover:bg-white/5 px-1 rounded transition-colors">
                  <span className="text-neutral-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 select-none ${
                    log.type === "success" 
                      ? "text-emerald-400" 
                      : log.type === "error" 
                        ? "text-rose-500 font-extrabold" 
                        : log.type === "warn" 
                          ? "text-amber-500" 
                          : "text-blue-400"
                  }`}>
                    [{log.tag}]
                  </span>
                  <span className={
                    log.type === "error" 
                      ? "text-rose-400" 
                      : log.type === "warn" 
                        ? "text-amber-300" 
                        : log.type === "success" 
                          ? "text-emerald-300" 
                          : "text-neutral-300"
                  }>
                    {log.text}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-neutral-700 italic">No hay registros de terminal disponibles.</p>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-elegant-text-muted bg-elegant-sub/30 p-2.5 rounded-xl border border-elegant-border">
            <span className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-elegant-gold" />
              <span>Base de Datos: <span className="font-bold text-white font-mono">SQLite (In-Memory)</span></span>
            </span>
            <span className="font-mono">UTC Sync Live</span>
          </div>
        </div>

      </div>

      {/* 3. Tabla / Listado de Licencias Emitidas */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="border-b border-elegant-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-elegant-gold" />
              Historial de Licencias & Activaciones
            </h2>
            <p className="text-[11px] text-elegant-text-muted mt-0.5">
              Lista general de claves generadas para la simulación del negocio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-elegant-text-muted font-bold font-mono">
              TOTAL EMITIDAS: {licenses.length}
            </span>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-elegant-text-muted">Cargando licencias del servidor...</div>
        ) : licenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-elegant-text-muted italic">No se han emitido licencias de software todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-elegant-border text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                  <th className="py-3 px-4">Salón de Belleza</th>
                  <th className="py-3 px-4">Módulo de Plan</th>
                  <th className="py-3 px-4">Clave de Licencia</th>
                  <th className="py-3 px-4">Emitido</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones de Simulación</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => {
                  const isActiveOnThisSalon = config.activeLicenseKey === lic.key;
                  return (
                    <tr 
                      key={lic.key} 
                      className={`border-b border-elegant-border/60 hover:bg-elegant-sub/20 transition-colors ${
                        isActiveOnThisSalon ? "bg-emerald-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-white flex items-center gap-1.5">
                          {lic.salonName}
                          {isActiveOnThisSalon && (
                            <span className="text-[9px] bg-emerald-500 text-elegant-bg px-1.5 py-0.5 rounded-md font-black">
                              Este Salón
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="py-3 px-4">{getLicenseBadge(lic.licenseType)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-elegant-sub border border-elegant-border px-2 py-1 rounded-lg text-[10px]">
                            {lic.key}
                          </span>
                          <button
                            onClick={() => copyToClipboard(lic.key)}
                            className="text-elegant-text-muted hover:text-white p-1 transition-colors hover:bg-elegant-sub rounded-lg"
                            title="Copiar llave"
                          >
                            {copiedKey === lic.key ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-elegant-text-muted text-[11px]">
                        {new Date(lic.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(lic.status)}</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {lic.status !== "expired" ? (
                          <>
                            {/* Fast application action */}
                            {!isActiveOnThisSalon ? (
                              <button
                                onClick={() => handleActivateLicense(lic.key)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Activar esta licencia en este salón inmediatamente"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span>Aplicar</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold font-mono px-2 inline-flex items-center gap-1 bg-emerald-950/40 py-1 rounded-lg border border-emerald-850">
                                <Check className="h-3 w-3" /> Activo
                              </span>
                            )}
                            
                            {/* Revoke option */}
                            <button
                              onClick={() => handleRevokeLicense(lic.key)}
                              className="px-2 py-1.5 bg-elegant-sub hover:bg-rose-950/60 text-rose-400 border border-elegant-border hover:border-rose-900 text-[10px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Inhabilitar llave"
                            >
                              <span>Revocar</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-elegant-text-muted italic">No disponible</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="space-y-6 animate-scaleUp">
          
          {/* 1. Arquitectura de Aislamiento Explicativa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Col 1: Cómo se identifica el Cliente */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">1. Portal de Clientes</h3>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">Por Slug de URL</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Cada barbería afiliada tiene un identificador único o <strong>slug</strong> de negocio (ej: <code className="font-mono text-white bg-neutral-900 px-1 py-0.5 rounded">bella-barba</code>). El cliente ingresa a:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] font-mono font-bold text-neutral-400 break-all select-all flex items-center justify-between">
                  <span>{`https://bellaybarba.com/c/${selectedDemoTenant}`}</span>
                  <ExternalLink className="h-3 w-3 text-neutral-600 shrink-0" />
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  El frontend lee este slug, solicita la configuración de ese salón al servidor (<code>GET /api/config?salonId={selectedDemoTenant}</code>), y carga la marca, servicios y agenda de ese inquilino.
                </p>
              </div>
            </div>

            {/* Col 2: Cómo se identifica el Barbero / Admin */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">2. Login del Personal</h3>
                    <span className="text-[9px] font-mono text-blue-400 font-bold uppercase">Por ID de Inquilino</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Cuando los barberos o administradores inician sesión con su usuario, el sistema en el backend verifica a qué <strong>ID de Inquilino (salon_id)</strong> pertenece su cuenta:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] space-y-1 font-mono text-neutral-400">
                  <p className="text-blue-400 font-bold"># Barbero Autenticado:</p>
                  <p className="text-[9px]">nombre: <span className="text-white">Carlos Barber</span></p>
                  <p className="text-[9px]">salon_id: <span className="text-elegant-gold">"{selectedDemoTenant}"</span></p>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  El servidor emite un token de sesión JWT que contiene el <code>salon_id</code> inmutable. Todas las consultas posteriores se restringen automáticamente a este ID.
                </p>
              </div>
            </div>

            {/* Col 3: Aislamiento en Base de Datos */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">3. Base de Datos</h3>
                    <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">Aislamiento Lógico (SaaS)</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Los datos de todas las barberías residen en las mismas tablas (Appointments, Barbers, Clients), pero cada fila tiene una columna <strong>salon_id</strong>.
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] font-mono text-neutral-400 leading-relaxed">
                  <p className="text-emerald-500">-- Consulta aislada:</p>
                  <code className="text-neutral-300">
                    SELECT * FROM appointments <br />
                    WHERE <span className="text-elegant-gold font-bold">salon_id = '{selectedDemoTenant}'</span>;
                  </code>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  ¡Un barbero de <em>Peluquería El Fígaro</em> nunca podrá ver la agenda de <em>SyncBarber Studio</em> porque el backend impone este filtro inmutable!
                </p>
              </div>
            </div>

          </div>

          {/* 2. Simulador Interactivo de Base de Datos SaaS */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-6">
            
            {/* Selector de Inquilino Demo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-elegant-border/70 pb-5">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="h-4.5 w-4.5 text-elegant-gold animate-pulse" />
                  Simulador de Consultas SaaS en Tiempo Real
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Selecciona una barbería para simular la petición de su Base de Datos y ver cómo cambian sus barberos y citas.
                </p>
              </div>

              {/* Botones de Selección */}
              <div className="flex flex-wrap gap-2">
                {(["bella-barba", "el-figaro", "estilo-tijera"] as const).map((tenant) => {
                  const label = tenant === "bella-barba" ? "SyncBarber Studio (Premium)" : tenant === "el-figaro" ? "Peluquería El Fígaro (Pro)" : "Estilo & Tijera (Básica)";
                  return (
                    <button
                      key={tenant}
                      onClick={() => setSelectedDemoTenant(tenant)}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                        selectedDemoTenant === tenant
                          ? "bg-elegant-gold text-elegant-bg border-elegant-gold shadow-sm font-black"
                          : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Tablas Simuladas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Tabla Barberos (Izquierda) */}
              <div className="lg:col-span-4 bg-elegant-sub/30 border border-elegant-border/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-elegant-border/60 pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    Tabla: <code className="text-white text-[10px] bg-neutral-950 px-1 py-0.5 rounded">Barbers</code>
                  </h3>
                  <span className="text-[9px] font-mono text-elegant-text-muted">SELECT</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {getSimulatedBarbers(selectedDemoTenant).map((b) => (
                    <div key={b.id} className="p-2.5 bg-neutral-950 border border-neutral-900 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[9px] text-elegant-text-muted font-mono">Usuario: {b.username}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold bg-blue-950/80 text-blue-400 border border-blue-900/60 px-1.5 py-0.5 rounded">
                          {b.salon_id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla Citas (Derecha) */}
              <div className="lg:col-span-8 bg-elegant-sub/30 border border-elegant-border/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-elegant-border/60 pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    Tabla: <code className="text-white text-[10px] bg-neutral-950 px-1 py-0.5 rounded">Appointments</code>
                  </h3>
                  <span className="text-[9px] font-mono text-elegant-text-muted">SELECT</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[9px] font-bold uppercase text-elegant-text-muted">
                        <th className="py-2">Cliente</th>
                        <th className="py-2">Servicio</th>
                        <th className="py-2">Barbero</th>
                        <th className="py-2">Fecha/Hora</th>
                        <th className="py-2">Precio</th>
                        <th className="py-2 text-right">Inquilino (SaaS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSimulatedAppointments(selectedDemoTenant).map((app) => (
                        <tr key={app.id} className="border-b border-neutral-900/40 hover:bg-neutral-950/30">
                          <td className="py-2 font-bold text-white">{app.clientName}</td>
                          <td className="py-2 text-neutral-300">{app.serviceName}</td>
                          <td className="py-2 text-neutral-400">{app.barberName}</td>
                          <td className="py-2 text-neutral-400 font-mono">{app.date} {app.time}</td>
                          <td className="py-2 text-white font-bold">{formatPrice(app.price)}</td>
                          <td className="py-2 text-right">
                            <span className="text-[8px] bg-amber-950/80 text-elegant-gold border border-amber-900/60 font-bold px-1.5 py-0.5 rounded">
                              {app.salon_id}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* 3. Administración Real de Inquilinos & Licencias SaaS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Formulario Crear Administrador */}
            <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-4.5 w-4.5 text-elegant-gold" />
                  Crear Administrador de Barbería
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Registra un usuario administrador para gestionar una barbería específica de la plataforma.
                </p>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                    Barbería / Inquilino Destino:
                  </label>
                  <select
                    value={newAdminSalon}
                    onChange={(e) => setNewAdminSalon(e.target.value)}
                    className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                  >
                    {tenantsList.map(t => (
                      <option key={t.id} value={t.id} className="bg-elegant-bg text-white">
                        {t.name} ({t.licenseType.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                    Nombre Completo:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Administradora"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Usuario:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: sofia_admin"
                      value={newAdminUser}
                      onChange={(e) => setNewAdminUser(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Contraseña:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contraseña"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="w-full py-2.5 bg-elegant-gold hover:bg-amber-500 disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{creatingAdmin ? "Creando..." : "Crear Administrador"}</span>
                </button>
              </form>
            </div>

            {/* Listado de Inquilinos y cambio de licencia */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-elegant-gold" />
                  Gestionar Licencias de Barberías
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Cambia de inmediato la licencia activa de cualquier inquilino del ecosistema SaaS.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-elegant-border/80 text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                      <th className="py-2.5 px-2">Barbería</th>
                      <th className="py-2.5 px-2">Licencia Actual</th>
                      <th className="py-2.5 px-2">Cambiar Nivel de Licencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsList.map((t) => (
                      <tr key={t.id} className="border-b border-elegant-border/40 hover:bg-elegant-sub/10">
                        <td className="py-3 px-2 font-bold text-white">
                          {t.name}
                          <span className="block text-[9px] text-neutral-500 font-mono">id: {t.id}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            t.licenseType === "premium" 
                              ? "bg-amber-950/80 text-elegant-gold border-amber-800/60" 
                              : t.licenseType === "profesional" 
                                ? "bg-slate-800 text-slate-200 border-slate-700" 
                                : "bg-neutral-900 text-neutral-400 border-neutral-800"
                          }`}>
                            {t.licenseType}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1.5">
                            {(["basica", "profesional", "premium"] as const).map((level) => (
                              <button
                                key={level}
                                disabled={updatingLicense}
                                onClick={() => handleUpdateTenantLicense(t.id, level)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${
                                  t.licenseType === level
                                    ? "bg-elegant-gold border-elegant-gold text-elegant-bg font-extrabold"
                                    : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700 hover:text-white"
                                }`}
                              >
                                {level === "basica" ? "Básica" : level === "profesional" ? "Pro" : "Premium"}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Listado de Administradores Registrados */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
            <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-elegant-gold" />
                  Administradores del Sistema SaaS
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Cuentas habilitadas con rol de Administrador. Pueden iniciar sesión y operar de forma aislada su barbería.
                </p>
              </div>
              <button 
                onClick={fetchAdmins}
                className="p-2 bg-elegant-sub border border-elegant-border hover:bg-elegant-card rounded-xl text-elegant-text-muted hover:text-white transition-all cursor-pointer flex items-center justify-center"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adminsList.map((adm) => {
                const salonName = tenantsList.find(t => t.id === adm.salonId)?.name || adm.salonId;
                return (
                  <div key={adm.id} className="p-4 bg-elegant-sub/40 border border-elegant-border rounded-2xl flex flex-col justify-between space-y-3">
                    <div>
                      <p className="font-bold text-white text-xs">{adm.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 font-mono">Usuario: <span className="text-neutral-300 font-bold">{adm.username}</span></p>
                      <p className="text-[10px] text-neutral-500 font-mono">Clave: <span className="text-neutral-400">{adm.password || "••••"}</span></p>
                    </div>
                    <div className="border-t border-elegant-border/40 pt-2 flex items-center justify-between">
                      <span className="text-[9px] text-elegant-text-muted uppercase font-bold">Barbería:</span>
                      <span className="text-[10px] bg-neutral-900 text-elegant-gold font-bold px-2 py-0.5 rounded-lg border border-neutral-800">
                        {salonName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
