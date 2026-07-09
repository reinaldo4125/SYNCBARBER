import React, { useState } from "react";
import { Service, SalonConfig } from "../types";
import { 
  Settings, 
  Trash, 
  Edit, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Grid, 
  DollarSign, 
  Scissors, 
  Sparkles,
  RefreshCw,
  AlertCircle,
  Key
} from "lucide-react";

interface SalonSettingsProps {
  services: Service[];
  config: SalonConfig;
  onUpdateConfig: (newConfig: Partial<SalonConfig>) => Promise<any>;
  onCreateService: (serviceData: any) => Promise<any>;
  onUpdateService: (id: string, updates: Partial<Service>) => Promise<any>;
  onDeleteService: (id: string) => Promise<any>;
  formatPrice: (price: number) => string;
  triggerToast?: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

export default function SalonSettings({
  services,
  config,
  onUpdateConfig,
  onCreateService,
  onUpdateService,
  onDeleteService,
  formatPrice,
  triggerToast,
}: SalonSettingsProps) {
  // Config state
  const [salonName, setSalonName] = useState(config.name);
  const [openTime, setOpenTime] = useState(config.openTime);
  const [closeTime, setCloseTime] = useState(config.closeTime);
  const [workingDays, setWorkingDays] = useState<number[]>(config.workingDays);
  const [intervalMinutes, setIntervalMinutes] = useState(config.intervalMinutes);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [licenseType, setLicenseType] = useState<"basica" | "profesional" | "premium">((config.licenseType as any) || "premium");
  
  // Key Activation State
  const [activationKey, setActivationKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  const handleKeyActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) return;

    setIsActivating(true);
    setActivationError("");

    try {
      const res = await fetch("/api/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activationKey.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (triggerToast) {
          triggerToast(
            "Licencia Activada 🚀", 
            `Tu suscripción se actualizó con éxito a: ${data.license.licenseType.toUpperCase()}`, 
            "success"
          );
        }
        setActivationKey("");
      } else {
        const errData = await res.json();
        setActivationError(errData.error || "La clave de licencia no es válida.");
      }
    } catch (err) {
      console.error(err);
      setActivationError("Error al conectar con el servidor.");
    } finally {
      setIsActivating(false);
    }
  };

  React.useEffect(() => {
    if (config.licenseType) {
      setLicenseType(config.licenseType);
    }
  }, [config.licenseType]);

  // New Service state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServiceCategory, setNewServiceCategory] = useState<'cabello' | 'barba' | 'color' | 'tratamiento'>("cabello");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [isSavingService, setIsSavingService] = useState(false);

  // Edit Service inline state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState<'cabello' | 'barba' | 'color' | 'tratamiento'>("cabello");
  const [editDescription, setEditDescription] = useState("");

  // Handle saving general salon configs
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSuccess(false);

    try {
      await onUpdateConfig({
        name: salonName,
        openTime,
        closeTime,
        workingDays,
        intervalMinutes: Number(intervalMinutes),
        licenseType,
      });
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Toggle work day checkboxes
  const handleToggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== day));
      } else {
        alert("Debes seleccionar al menos un día laboral.");
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  // Handle adding a brand new service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError("");
    setIsSavingService(true);

    if (!newServiceName || !newServicePrice || !newServiceDuration) {
      setServiceError("Completa el nombre, precio y duración de forma válida.");
      setIsSavingService(false);
      return;
    }

    try {
      await onCreateService({
        name: newServiceName,
        price: Number(newServicePrice),
        duration: Number(newServiceDuration),
        category: newServiceCategory,
        description: newServiceDescription,
      });

      // Clear new service states
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDuration("30");
      setNewServiceDescription("");
      setShowAddForm(false);
    } catch (err: any) {
      setServiceError(err.message || "Error al crear el servicio.");
    } finally {
      setIsSavingService(false);
    }
  };

  // Open inline editor for a service
  const startEditingService = (service: Service) => {
    setEditingServiceId(service.id);
    setEditName(service.name);
    setEditPrice(service.price.toString());
    setEditDuration(service.duration.toString());
    setEditCategory(service.category);
    setEditDescription(service.description);
  };

  // Save changes of edited service
  const handleSaveEditedService = async (id: string) => {
    try {
      await onUpdateService(id, {
        name: editName,
        price: Number(editPrice),
        duration: Number(editDuration),
        category: editCategory,
        description: editDescription,
      });
      setEditingServiceId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="salon-settings-panel">
      
      {/* 1. Configuración del Negocio */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="border-b border-elegant-border pb-4">
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <Settings className="h-4.5 w-4.5 text-elegant-gold" />
              Parámetros de Peluquería
            </h2>
            <p className="text-[11px] text-elegant-text-muted">Configura datos generales y tiempos de atención del salón.</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* Nombre del Salón */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Nombre de la Peluquería / Barbería</label>
              <input
                type="text"
                required
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500"
              />
            </div>

            {/* Horarios de Atención */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Hora Apertura</label>
                <input
                  type="time"
                  required
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Hora Cierre</label>
                <input
                  type="time"
                  required
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                />
              </div>
            </div>

            {/* Intervalo entre Turnos */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Intervalo Citas (Minutos)</label>
              <select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-10"
              >
                <option value="15" className="bg-elegant-card text-white">Cada 15 minutos</option>
                <option value="30" className="bg-elegant-card text-white">Cada 30 minutos (Recomendado)</option>
                <option value="45" className="bg-elegant-card text-white">Cada 45 minutos</option>
                <option value="60" className="bg-elegant-card text-white">Cada 60 minutos</option>
              </select>
            </div>

            {/* Días laborables */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Días Laborales Abiertos</label>
              <div className="space-y-1.5 bg-elegant-sub p-3 rounded-2xl border border-elegant-border">
                {[
                  { id: 1, label: "Lunes" },
                  { id: 2, label: "Martes" },
                  { id: 3, label: "Miércoles" },
                  { id: 4, label: "Jueves" },
                  { id: 5, label: "Viernes" },
                  { id: 6, label: "Sábado" },
                  { id: 0, label: "Domingo" },
                ].map((day) => {
                  const isChecked = workingDays.includes(day.id);
                  return (
                    <label key={day.id} className="flex items-center space-x-2 text-xs font-semibold text-elegant-text select-none cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleDay(day.id)}
                        className="rounded text-elegant-gold focus:ring-elegant-gold border-elegant-border bg-elegant-card w-4 h-4 cursor-pointer"
                      />
                      <span>{day.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {configSuccess && (
              <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 p-2 rounded-xl text-center">
                ¡Configuración guardada y compartida con éxito!
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isSavingConfig ? "Guardando..." : "Guardar Configuración"}
            </button>
          </form>
        </div>

        {/* 1.5. Gestión de Licencia del Software */}
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="border-b border-elegant-border pb-3">
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-elegant-gold animate-pulse" />
              Suscripción & Licencias
            </h2>
            <p className="text-[11px] text-elegant-text-muted">
              Cambia la licencia de uso para simular los módulos de acuerdo a cada plan.
            </p>
          </div>

          <div className="space-y-3">
            {/* Básica */}
            <div
              onClick={async () => {
                setLicenseType("basica");
                await onUpdateConfig({ ...config, licenseType: "basica" });
              }}
              className={`border p-3.5 rounded-2xl cursor-pointer transition-all ${
                licenseType === "basica"
                  ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                  : "border-elegant-border bg-elegant-sub/60 hover:border-neutral-700 hover:bg-elegant-card"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-xs ${licenseType === "basica" ? "text-elegant-gold" : "text-white"}`}>
                    🥉 Licencia Básica (Bronce)
                  </h3>
                  <p className="text-[10px] text-elegant-text-muted mt-0.5">Perfecto para salones/barberías independientes.</p>
                </div>
                <span className="text-[10px] font-bold text-white bg-elegant-border px-2 py-0.5 rounded-md font-mono">$15 / mes</span>
              </div>
              <div className="mt-2.5 space-y-1 text-[9px]">
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Agenda de Citas Diaria (Vista lista)</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Catálogo de Servicios & Barberos</span>
                </div>
                <div className="flex items-center text-rose-400/70 gap-1">
                  <span>✘</span>
                  <span className="line-through text-elegant-text-muted/60">Calendario Drag & Drop interactivo</span>
                </div>
                <div className="flex items-center text-rose-400/70 gap-1">
                  <span>✘</span>
                  <span className="line-through text-elegant-text-muted/60">Módulo de Comisiones y Propinas</span>
                </div>
                <div className="flex items-center text-rose-400/70 gap-1">
                  <span>✘</span>
                  <span className="line-through text-elegant-text-muted/60">Bloqueo de agenda (Enfermedades/Vacaciones)</span>
                </div>
              </div>
            </div>

            {/* Profesional */}
            <div
              onClick={async () => {
                setLicenseType("profesional");
                await onUpdateConfig({ ...config, licenseType: "profesional" });
              }}
              className={`border p-3.5 rounded-2xl cursor-pointer transition-all ${
                licenseType === "profesional"
                  ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                  : "border-elegant-border bg-elegant-sub/60 hover:border-neutral-700 hover:bg-elegant-card"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-xs ${licenseType === "profesional" ? "text-elegant-gold" : "text-white"}`}>
                    🥈 Licencia Profesional (Plata)
                  </h3>
                  <p className="text-[10px] text-elegant-text-muted mt-0.5">Optimiza la agenda y gestión de tu equipo.</p>
                </div>
                <span className="text-[10px] font-bold text-white bg-elegant-border px-2 py-0.5 rounded-md font-mono">$35 / mes</span>
              </div>
              <div className="mt-2.5 space-y-1 text-[9px]">
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Todo lo de la licencia Básica</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Calendario Interactivo Drag & Drop</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Bloqueo de Agenda por ausencias (Médica/Descanso)</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Gestión básica de Clientes</span>
                </div>
                <div className="flex items-center text-rose-400/70 gap-1">
                  <span>✘</span>
                  <span className="line-through text-elegant-text-muted/60">Comisiones y Propinas de Barberos</span>
                </div>
                <div className="flex items-center text-rose-400/70 gap-1">
                  <span>✘</span>
                  <span className="line-through text-elegant-text-muted/60">Membresías VIP y sistema de puntos</span>
                </div>
              </div>
            </div>

            {/* Premium */}
            <div
              onClick={async () => {
                setLicenseType("premium");
                await onUpdateConfig({ ...config, licenseType: "premium" });
              }}
              className={`border p-3.5 rounded-2xl cursor-pointer transition-all ${
                licenseType === "premium"
                  ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                  : "border-elegant-border bg-elegant-sub/60 hover:border-neutral-700 hover:bg-elegant-card"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-xs ${licenseType === "premium" ? "text-elegant-gold" : "text-white"}`}>
                    🥇 Licencia Premium (Oro / Full)
                  </h3>
                  <p className="text-[10px] text-elegant-text-muted mt-0.5">El control absoluto para un negocio de alto volumen.</p>
                </div>
                <span className="text-[10px] font-bold text-elegant-bg bg-elegant-gold px-2 py-0.5 rounded-md font-mono">$59 / mes</span>
              </div>
              <div className="mt-2.5 space-y-1 text-[9px]">
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Acceso ilimitado a todos los módulos</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Comisiones y Propinas Avanzadas</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Estadísticas Financieras & Reportes de Ingresos</span>
                </div>
                <div className="flex items-center text-emerald-400 gap-1 font-semibold">
                  <span>✔</span>
                  <span>Membresías VIP y Plan de Lealtad (Puntos)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activación por llave de licencia SaaS */}
          <div className="border-t border-elegant-border/80 pt-4 mt-2 space-y-3 text-xs">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-elegant-gold" />
              Activar con Clave de Licencia
            </h3>
            <p className="text-[10px] text-elegant-text-muted leading-relaxed">
              Si tienes una clave de licencia SaaS emitida por el panel de desarrollador, ingrésala a continuación para activar todos tus módulos premium y profesionales en vivo.
            </p>

            {config.activeLicenseKey ? (
              <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl flex items-center justify-between text-[11px] text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>🟢 Activo:</span>
                  <span className="font-mono bg-emerald-900/35 px-1.5 py-0.5 rounded border border-emerald-800/40">{config.activeLicenseKey}</span>
                </span>
                <span className="text-[9px] uppercase font-bold text-emerald-400">Verificado</span>
              </div>
            ) : (
              <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-xl text-[10px] text-amber-300">
                <span>⚠️ Operando bajo selección de demostración manual temporal. Sin clave permanente registrada.</span>
              </div>
            )}

            <form onSubmit={handleKeyActivation} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ej: LIC-PREM-XXXXX-2026"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs font-mono rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 uppercase"
              />
              <button
                type="submit"
                disabled={isActivating || !activationKey}
                className="px-4 py-2 bg-elegant-gold hover:bg-amber-500 disabled:opacity-50 text-elegant-bg font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
              >
                {isActivating ? "Verificando..." : "Activar"}
              </button>
            </form>

            {activationError && (
              <p className="text-[10px] text-rose-400 font-semibold">{activationError}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Gestor de Servicios */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-elegant-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <Scissors className="h-4.5 w-4.5 text-elegant-gold" />
                Catálogo de Servicios del Salón
              </h2>
              <p className="text-[11px] text-elegant-text-muted">Agrega, edita o elimina servicios disponibles para agendamiento de clientes.</p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1 cursor-pointer"
            >
              {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{showAddForm ? "Cerrar Form" : "Nuevo Servicio"}</span>
            </button>
          </div>

          {/* Formulario para Agregar Nuevo Servicio */}
          {showAddForm && (
            <form onSubmit={handleAddService} className="bg-elegant-gold/10 border border-elegant-gold/20 rounded-2xl p-4 space-y-4 animate-fadeIn text-xs">
              <h3 className="text-xs font-bold text-elegant-gold flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                Crear Nuevo Servicio para Clientes
              </h3>

              {serviceError && (
                <div className="p-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  <p>{serviceError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Nombre de Servicio *</label>
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Ej. Balayage Reflejos Dorados"
                    className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Precio COP ($) *</label>
                  <input
                    type="number"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Ej. 35000"
                    className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Duración Estimada (Minutos) *</label>
                  <select
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-9"
                  >
                    <option value="15" className="bg-elegant-card text-white">15 minutos</option>
                    <option value="30" className="bg-elegant-card text-white">30 minutos</option>
                    <option value="45" className="bg-elegant-card text-white">45 minutos</option>
                    <option value="60" className="bg-elegant-card text-white">1 hora (60 min)</option>
                    <option value="90" className="bg-elegant-card text-white">1.5 horas (90 min)</option>
                    <option value="120" className="bg-elegant-card text-white">2 horas (120 min)</option>
                    <option value="150" className="bg-elegant-card text-white">2.5 horas (150 min)</option>
                    <option value="180" className="bg-elegant-card text-white">3 horas (180 min)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Categoría *</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-9"
                  >
                    <option value="cabello" className="bg-elegant-card text-white">Corte de Cabello</option>
                    <option value="barba" className="bg-elegant-card text-white">Barbería & Barba</option>
                    <option value="color" className="bg-elegant-card text-white">Tinte & Coloración</option>
                    <option value="tratamiento" className="bg-elegant-card text-white">Tratamiento Capilar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Descripción del Servicio (Opcional)</label>
                <textarea
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  placeholder="Detalla qué incluye el servicio (lavado, cremas, tipos de máquinas, etc.)"
                  rows={2}
                  className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-elegant-border text-elegant-text rounded-xl bg-elegant-sub hover:bg-elegant-card text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingService}
                  className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {isSavingService ? "Guardando..." : "Guardar Servicio"}
                </button>
              </div>
            </form>
          )}

          {/* Listado de Servicios Actuales */}
          <div className="space-y-3">
            {services.map((s) => {
              const isEditing = editingServiceId === s.id;

              if (isEditing) {
                return (
                  <div key={s.id} className="border-2 border-elegant-gold bg-elegant-gold/10 rounded-2xl p-4 space-y-3 text-xs animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">NOMBRE</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">PRECIO</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">DURACIÓN (MIN)</label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">CATEGORÍA</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as any)}
                          className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white"
                        >
                          <option value="cabello" className="bg-elegant-card text-white">Corte de Cabello</option>
                          <option value="barba" className="bg-elegant-card text-white">Barbería & Barba</option>
                          <option value="color" className="bg-elegant-card text-white">Tinte & Coloración</option>
                          <option value="tratamiento" className="bg-elegant-card text-white">Tratamiento Capilar</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">DESCRIPCIÓN</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => setEditingServiceId(null)}
                        className="px-3 py-1 border border-elegant-border text-elegant-text rounded-lg bg-elegant-sub hover:bg-elegant-card text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEditedService(s.id)}
                        className="px-3 py-1 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={s.id} className="border border-elegant-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-elegant-sub/50 hover:border-neutral-700 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs text-white">{s.name}</h4>
                      <span className="text-[8px] bg-elegant-card text-elegant-text-muted border border-elegant-border font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {s.category}
                      </span>
                    </div>
                    {s.description && <p className="text-[10px] text-elegant-text-muted leading-relaxed">{s.description}</p>}
                    <div className="flex space-x-4 pt-1 text-[10px] text-elegant-text-muted font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-elegant-text-muted" />
                        {s.duration} min
                      </span>
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="h-3.5 w-3.5 text-elegant-text-muted" />
                        Precio: {formatPrice(s.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-center">
                    <button
                      onClick={() => startEditingService(s)}
                      className="p-2 border border-elegant-border bg-elegant-card hover:bg-elegant-sub text-elegant-text-muted hover:text-white rounded-xl transition-colors cursor-pointer"
                      title="Editar Servicio"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar el servicio "${s.name}"? Los clientes ya no podrán agendarlo.`)) {
                          onDeleteService(s.id);
                        }
                      }}
                      className="p-2 border border-rose-900/40 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar Servicio"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
