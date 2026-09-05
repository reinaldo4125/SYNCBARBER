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
  const [tagline, setTagline] = useState(config.tagline || "");
  const [openTime, setOpenTime] = useState(config.openTime);
  const [closeTime, setCloseTime] = useState(config.closeTime);
  const [workingDays, setWorkingDays] = useState<number[]>(config.workingDays);
  const [intervalMinutes, setIntervalMinutes] = useState(config.intervalMinutes);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(config.timeFormat || '12h');
  const [noShowPenaltyAmount, setNoShowPenaltyAmount] = useState<number>(config.noShowPenaltyAmount !== undefined ? config.noShowPenaltyAmount : 10000);
  const [isSavingPenalty, setIsSavingPenalty] = useState(false);
  const [penaltySuccess, setPenaltySuccess] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState("");
  
  // Brand/Theme states & saving
  const [accentColor, setAccentColor] = useState(config.accentColor || "gold");
  const [textColor, setTextColor] = useState(config.textColor || "#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState(config.backgroundColor || "#0B0C10");
  const [cardColor, setCardColor] = useState(config.cardColor || "#141414");
  const [subCardColor, setSubCardColor] = useState(config.subCardColor || "#1A1A1A");
  const [borderColor, setBorderColor] = useState(config.borderColor || "#262626");
  const [customLogoUrl, setCustomLogoUrl] = useState(config.customLogoUrl || "");
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState(false);

  const activeLicense = config.licenseType || "premium";

  React.useEffect(() => {
    if (config.accentColor) setAccentColor(config.accentColor);
    if (config.textColor) setTextColor(config.textColor);
    if (config.backgroundColor) setBackgroundColor(config.backgroundColor);
    if (config.cardColor) setCardColor(config.cardColor);
    if (config.subCardColor) setSubCardColor(config.subCardColor);
    if (config.borderColor) setBorderColor(config.borderColor);
    if (config.tagline !== undefined) setTagline(config.tagline || "");
    if (config.customLogoUrl !== undefined) setCustomLogoUrl(config.customLogoUrl || "");
    if (config.name) setSalonName(config.name);
    if (config.openTime) setOpenTime(config.openTime);
    if (config.closeTime) setCloseTime(config.closeTime);
    if (config.workingDays) setWorkingDays(config.workingDays);
    if (config.intervalMinutes) setIntervalMinutes(config.intervalMinutes);
    if (config.timeFormat) setTimeFormat(config.timeFormat);
    if (config.noShowPenaltyAmount !== undefined) setNoShowPenaltyAmount(config.noShowPenaltyAmount);
  }, [config]);

  const DEFAULT_CATEGORIES = [
    { id: "cabello", name: "Corte de Cabello" },
    { id: "barba", name: "Barbería & Barba" },
    { id: "color", name: "Tinte & Coloración" },
    { id: "tratamiento", name: "Tratamiento Capilar" }
  ];

  const serviceCategories = config.serviceCategories || DEFAULT_CATEGORIES;

  // New Service state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServiceCategory, setNewServiceCategory] = useState<string>(serviceCategories[0]?.id || "cabello");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceAllowReward, setNewServiceAllowReward] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [isSavingService, setIsSavingService] = useState(false);

  // Edit Service inline state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState<string>("cabello");
  const [editDescription, setEditDescription] = useState("");
  const [editAllowReward, setEditAllowReward] = useState(true);

  // Categories Manager State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const handleAddCategory = async () => {
    setCategoryError("");
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    // Generar un ID único (slugificado)
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-") || `cat_${Date.now()}`;

    // Validar duplicado
    if (serviceCategories.some((c) => c.id === slug || c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError("Esta categoría ya existe.");
      return;
    }

    const updatedCategories = [...serviceCategories, { id: slug, name: trimmed }];
    try {
      await onUpdateConfig({ ...config, serviceCategories: updatedCategories });
      setNewCategoryName("");
      if (triggerToast) {
        triggerToast("Categoría Creada", `La categoría "${trimmed}" se ha creado con éxito.`, "success");
      }
    } catch (e) {
      console.error(e);
      setCategoryError("Error al guardar la categoría.");
    }
  };

  const startEditingCategory = (cat: { id: string; name: string }) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
  };

  const handleSaveCategory = async (catId: string) => {
    const trimmed = editCategoryName.trim();
    if (!trimmed) return;

    // Validar duplicado en otras categorías
    if (serviceCategories.some((c) => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError("Otra categoría ya tiene este nombre.");
      return;
    }

    const updatedCategories = serviceCategories.map((c) =>
      c.id === catId ? { ...c, name: trimmed } : c
    );

    try {
      await onUpdateConfig({ ...config, serviceCategories: updatedCategories });
      setEditingCategoryId(null);
      if (triggerToast) {
        triggerToast("Categoría Actualizada", `La categoría ha sido renombrada a "${trimmed}".`, "success");
      }
    } catch (e) {
      console.error(e);
      setCategoryError("Error al guardar cambios.");
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const servicesUsing = services.filter((s) => s.category === catId);
    
    let confirmMsg = `¿Estás seguro de eliminar la categoría "${catName}"?`;
    if (servicesUsing.length > 0) {
      confirmMsg += `\n\nAtención: Hay ${servicesUsing.length} servicio(s) que usan esta categoría actualmente. Serán reclasificados de inmediato a la categoría "${serviceCategories.find(c => c.id !== catId)?.name || 'general'}".`;
    }

    if (!window.confirm(confirmMsg)) return;

    const remainingCategories = serviceCategories.filter((c) => c.id !== catId);
    const fallbackCatId = remainingCategories[0]?.id || "cabello";

    try {
      // Guardar categorías actualizadas
      await onUpdateConfig({ ...config, serviceCategories: remainingCategories });

      // Reclasificar servicios
      if (servicesUsing.length > 0) {
        for (const s of servicesUsing) {
          await onUpdateService(s.id, { category: fallbackCatId });
        }
      }

      if (triggerToast) {
        triggerToast("Categoría Eliminada", `La categoría "${catName}" fue eliminada.`, "success");
      }
    } catch (e) {
      console.error(e);
      setCategoryError("Error al eliminar la categoría.");
    }
  };

  // Handle saving general salon configs
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError("");
    setConfigSuccess(false);

    // Validation 1: Name
    if (!salonName.trim()) {
      setConfigError("El nombre de la barbería es obligatorio.");
      return;
    }

    // Validation 2: Hours / Schedule
    if (!openTime || !closeTime) {
      setConfigError("Debes especificar la hora de apertura y la hora de cierre.");
      return;
    }

    const [openH, openM] = openTime.split(":").map(Number);
    const [closeH, closeM] = closeTime.split(":").map(Number);

    if (isNaN(openH) || isNaN(openM) || isNaN(closeH) || isNaN(closeM)) {
      setConfigError("El formato de las horas de atención es inválido.");
      return;
    }

    const openTotalMins = openH * 60 + openM;
    const closeTotalMins = closeH * 60 + closeM;

    if (openTotalMins >= closeTotalMins) {
      setConfigError(`La hora de apertura (${openTime}) debe ser anterior a la hora de cierre (${closeTime}).`);
      return;
    }

    // Validation 3: Working Days
    if (!workingDays || workingDays.length === 0) {
      setConfigError("Debes seleccionar al menos un día laboral para la atención al público.");
      return;
    }

    setIsSavingConfig(true);

    try {
      await onUpdateConfig({
        name: salonName.trim(),
        tagline: tagline.trim(),
        openTime,
        closeTime,
        workingDays: Array.from(new Set<number>(workingDays)).sort((a: number, b: number) => a - b),
        intervalMinutes: Number(intervalMinutes),
        timeFormat,
      });
      setConfigSuccess(true);
      if (triggerToast) {
        triggerToast(
          "Parámetros Guardados",
          "Los parámetros y horarios de la peluquería han sido actualizados con éxito.",
          "success"
        );
      }
      setTimeout(() => setConfigSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setConfigError(err.message || "Error al guardar la configuración.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle saving brand styles
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBrand(true);
    setBrandSuccess(false);

    try {
      await onUpdateConfig({
        accentColor,
        textColor,
        backgroundColor,
        cardColor,
        subCardColor,
        borderColor,
        customLogoUrl: customLogoUrl.trim(),
      });
      setBrandSuccess(true);
      if (triggerToast) {
        triggerToast(
          "Marca Actualizada",
          "Los colores y logotipo han sido guardados con éxito.",
          "success"
        );
      }
      setTimeout(() => setBrandSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBrand(false);
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
        allowRewardRedemption: newServiceAllowReward,
      });

      // Clear new service states
      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDuration("30");
      setNewServiceDescription("");
      setNewServiceAllowReward(true);
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
    setEditAllowReward(service.allowRewardRedemption !== false);
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
        allowRewardRedemption: editAllowReward,
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
        
        {/* Card 1: Parámetros de Peluquería */}
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-5" id="parametros-peluqueria-card">
          <div className="border-b border-elegant-border pb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-elegant-gold" />
                Parámetros de Peluquería
              </h2>
              <p className="text-[11px] text-elegant-text-muted">Configura datos generales, eslogan y horarios de atención del salón.</p>
            </div>
            <span className="px-2 py-0.5 bg-elegant-gold/10 border border-elegant-gold/30 text-elegant-gold rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
              General
            </span>
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
                placeholder="Ej: Cano Barber"
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500 font-medium"
              />
            </div>

            {/* Eslogan o Lema Comercial (Slogan) */}
            <div className="space-y-1 bg-elegant-sub/50 p-3 rounded-2xl border border-elegant-border/70">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-elegant-gold uppercase block flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-elegant-gold" />
                  Eslogan o Lema Comercial (Slogan)
                </label>
                <span className="text-[9px] text-elegant-text-muted italic">Visible para clientes</span>
              </div>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Ej: Arte, Precisión & Estilo Masculino"
                className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-card text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500 font-medium"
              />
              <p className="text-[9px] text-elegant-text-muted leading-tight">
                Se muestra debajo del nombre del salón en el portal web y en la pantalla de bienvenida.
              </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Intervalo Citas (Minutos)</label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-10 font-medium"
                >
                  <option value="15" className="bg-elegant-card text-white">Cada 15 minutos</option>
                  <option value="30" className="bg-elegant-card text-white">Cada 30 minutos (Recomendado)</option>
                  <option value="45" className="bg-elegant-card text-white">Cada 45 minutos</option>
                  <option value="60" className="bg-elegant-card text-white">Cada 60 minutos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-300 uppercase block">Formato de Horas</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value as '12h' | '24h')}
                  className="w-full px-3 py-2.5 border border-amber-500/40 rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-amber-500 h-10 font-medium"
                >
                  <option value="12h" className="bg-elegant-card text-white">
                    ☀️ Normal (12 Horas AM / PM)
                  </option>
                  <option value="24h" className="bg-elegant-card text-white">
                    🎖️ Militar (24 Horas)
                  </option>
                </select>
              </div>
            </div>

            {/* Días laborables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Días Laborales Abiertos</label>
                <span className="text-[9px] font-mono text-elegant-gold font-semibold">
                  {workingDays.length} {workingDays.length === 1 ? "día activo" : "días activos"}
                </span>
              </div>
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
                    <label 
                      key={day.id} 
                      className={`flex items-center justify-between p-1.5 rounded-xl transition-colors cursor-pointer select-none ${
                        isChecked ? "bg-elegant-card/80 text-white font-bold" : "text-elegant-text-muted hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDay(day.id)}
                          className="rounded text-elegant-gold focus:ring-elegant-gold border-elegant-border bg-elegant-card w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs">{day.label}</span>
                      </div>
                      {isChecked ? (
                        <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-800/60">
                          Abierto
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 font-mono bg-zinc-900/60 px-1.5 py-0.5 rounded-md">
                          Cerrado
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {configError && (
              <div className="text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80 p-3 rounded-xl flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{configError}</span>
              </div>
            )}

            {configSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>¡Parámetros guardados y sincronizados correctamente!</span>
              </div>
            )}

            {/* BOTÓN DIRECTO Y EFECTIVO DE GUARDAR PARÁMETROS */}
            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full py-3 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isSavingConfig ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Guardando Parámetros...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-elegant-bg stroke-[3]" />
                  <span>Guardar Parámetros de Peluquería</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Política de Multas por Inasistencia */}
        <div className="bg-rose-950/20 border border-rose-900/60 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
          <div className="border-b border-rose-900/40 pb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <AlertCircle className="h-4 w-4 text-rose-400 animate-pulse" />
              Política de Multas por Inasistencia
            </h3>
            <span className="px-2 py-0.5 bg-rose-900/40 border border-rose-700/60 text-rose-300 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider">
              Recargos
            </span>
          </div>

          <p className="text-[11px] text-rose-200/80 leading-relaxed">
            Define el valor del recargo en pesos COP que se asignará a la ficha del cliente cuando se marque <strong>"No Asistió"</strong> en una reserva. Se cobrará o exonerará en su siguiente cita.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-rose-200 uppercase block">Valor de la Multa ($ COP)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={noShowPenaltyAmount}
                    onChange={(e) => setNoShowPenaltyAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 bg-rose-950/80 border border-rose-700/80 text-white font-mono font-extrabold text-base rounded-xl focus:ring-2 focus:ring-rose-500 shadow-inner"
                    placeholder="10000"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSavingPenalty}
                  onClick={async () => {
                    setIsSavingPenalty(true);
                    try {
                      await onUpdateConfig({ noShowPenaltyAmount: Number(noShowPenaltyAmount) });
                      setPenaltySuccess(true);
                      if (triggerToast) {
                        triggerToast(
                          "Multa Guardada",
                          `Se actualizó el valor de la multa a $${Number(noShowPenaltyAmount).toLocaleString()} COP`,
                          "success"
                        );
                      }
                      setTimeout(() => setPenaltySuccess(false), 4000);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsSavingPenalty(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <Check className="h-4 w-4 text-white" />
                  <span>{isSavingPenalty ? "Guardando..." : "Guardar Multa"}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-rose-300/70">
              <span>Ejemplo: 10000 (equivale a $10.000 COP)</span>
            </div>

            {penaltySuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>¡Valor de multa actualizado y guardado correctamente!</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Personalización de Marca (Branding) */}
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="border-b border-elegant-border pb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-elegant-gold" />
                Personalización de Marca & Estilos
              </h3>
              <p className="text-[11px] text-elegant-text-muted">Ajusta la paleta de colores y logotipo del salón.</p>
            </div>
            <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider">
              Branding
            </span>
          </div>
          
          <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Color de Acento del Salón</label>
              <select
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-10 font-medium"
              >
                <option value="gold" className="bg-elegant-card text-white">Dorado Elegante</option>
                <option value="cyan" className="bg-elegant-card text-cyan-400">Cian Tecnológico</option>
                <option value="emerald" className="bg-elegant-card text-emerald-400">Verde Esmeralda</option>
                <option value="blue" className="bg-elegant-card text-blue-400">Azul Zafiro</option>
                <option value="violet" className="bg-elegant-card text-violet-400">Morado Real</option>
                <option value="rose" className="bg-elegant-card text-rose-400">Rosa Carmesí</option>
                <option value="amber" className="bg-elegant-card text-amber-500">Ámbar Cálido</option>
              </select>
            </div>

            {/* URL del Logo Personalizado */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">URL del Logo de la Barbería (o Iniciales)</label>
              <input
                type="text"
                placeholder="Ej: https://midominio.com/logo.png o 'BB'"
                value={customLogoUrl}
                onChange={(e) => setCustomLogoUrl(e.target.value)}
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Color de Texto Accent */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Color Texto Accent</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full px-2 py-2 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono uppercase focus:ring-1 focus:ring-elegant-gold"
                  />
                </div>
              </div>

              {/* Color de Fondo del Salón */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Color Fondo</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full px-2 py-2 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono uppercase focus:ring-1 focus:ring-elegant-gold"
                  />
                </div>
              </div>
            </div>

            {/* Nuevos controles para colores de Secciones y Bordes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Color de Tarjetas / Secciones */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Secciones</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                  />
                  <input
                    type="text"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-full px-2 py-2 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono uppercase focus:ring-1 focus:ring-elegant-gold"
                  />
                </div>
              </div>

              {/* Color de Sub-secciones */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Sub-secciones</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={subCardColor}
                    onChange={(e) => setSubCardColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                  />
                  <input
                    type="text"
                    value={subCardColor}
                    onChange={(e) => setSubCardColor(e.target.value)}
                    className="w-full px-2 py-2 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono uppercase focus:ring-1 focus:ring-elegant-gold"
                  />
                </div>
              </div>

              {/* Color de Bordes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Bordes</label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full px-2 py-2 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono uppercase focus:ring-1 focus:ring-elegant-gold"
                  />
                </div>
              </div>
            </div>

            {brandSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>¡Estilos de marca guardados correctamente!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingBrand}
              className="w-full py-2.5 bg-elegant-gold/20 hover:bg-elegant-gold/30 border border-elegant-gold/50 text-elegant-gold font-extrabold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="h-4 w-4" />
              <span>{isSavingBrand ? "Guardando Estilos..." : "Guardar Personalización de Marca"}</span>
            </button>
          </form>
        </div>

        {/* 1.5. Información de Licencia Contratada (Informativo) */}
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="border-b border-elegant-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-elegant-gold" />
                Información de Licencia Contratada
              </h2>
              <p className="text-[11px] text-elegant-text-muted">
                Detalles de la suscripción y módulos habilitados para tu establecimiento.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Licencia Activa
            </span>
          </div>

          <div className="bg-gradient-to-br from-[#121A2A] to-[#0E1422] border border-amber-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-amber-400/80 font-mono uppercase font-bold tracking-wider">Plan Contratado</span>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mt-0.5">
                  {activeLicense === "premium" && "🥇 Licencia Premium (Oro / Full)"}
                  {activeLicense === "profesional" && "🥈 Licencia Profesional (Plata)"}
                  {activeLicense === "basica" && "🥉 Licencia Básica (Bronce)"}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl self-start sm:self-center">
                {activeLicense === "premium" ? "SaaS Empresarial Multi-Barbero" : activeLicense === "profesional" ? "Equipo & Agenda Avanzada" : "Atención Básica"}
              </span>
            </div>

            <div className="border-t border-slate-800/80 pt-3 grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-gray-400 text-[10px] block font-mono">Establecimiento:</span>
                <span className="font-bold text-white">{salonName || config.name}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block font-mono">Estado del Sistema:</span>
                <span className="font-bold text-emerald-400">Servicio Activo</span>
              </div>
            </div>

            <div className="bg-[#162237]/60 rounded-xl p-3 border border-[#1F314D] space-y-2">
              <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider block">
                Módulos y Capacidades de tu Plan:
              </span>
              <ul className="grid sm:grid-cols-2 gap-2 text-[10px] text-gray-200">
                <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Agenda & Reservas Online QR</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Modo Silla PWA con Foto de Referencia</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="h-3 w-3 shrink-0" />
                  <span>
                    {activeLicense === "basica"
                      ? "Catálogo de Cortes (Lectura Cliente)"
                      : "Catálogo Lookbook Personalizado (Editor Full)"}
                  </span>
                </li>
                <li className={`flex items-center gap-1.5 font-medium ${activeLicense === "basica" ? "text-neutral-500 line-through" : "text-emerald-400"}`}>
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Inventario & Nevera POS</span>
                </li>
                <li className={`flex items-center gap-1.5 font-medium ${activeLicense === "basica" ? "text-neutral-500 line-through" : "text-emerald-400"}`}>
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Membresías VIP & Fichas de Clientes</span>
                </li>
                <li className={`flex items-center gap-1.5 font-medium ${activeLicense === "premium" ? "text-emerald-400" : "text-neutral-500 line-through"}`}>
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Liquidación de Comisiones & Propinas</span>
                </li>
                <li className={`flex items-center gap-1.5 font-medium ${activeLicense === "premium" ? "text-emerald-400" : "text-neutral-500 line-through"}`}>
                  <Check className="h-3 w-3 shrink-0" />
                  <span>Cierre de Caja Ciego & Auditoría</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="h-3 w-3 shrink-0" />
                  <span>
                    {activeLicense === "premium"
                      ? "Barberos Ilimitados"
                      : activeLicense === "profesional"
                      ? "Hasta 5 Barberos"
                      : "Hasta 2 Barberos"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gestor de Servicios */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-elegant-border pb-4">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <Scissors className="h-4.5 w-4.5 text-elegant-gold" />
                Catálogo de Servicios del Salón
              </h2>
              <p className="text-[11px] text-elegant-text-muted">Agrega, edita o elimina servicios disponibles para agendamiento de clientes.</p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowCategoryManager(!showCategoryManager);
                  setShowAddForm(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1 cursor-pointer border ${
                  showCategoryManager
                    ? "bg-elegant-border text-white border-transparent"
                    : "bg-elegant-sub border-elegant-border text-elegant-text hover:bg-elegant-card"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>{showCategoryManager ? "Cerrar Categorías" : "Gestionar Categorías"}</span>
              </button>

              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowCategoryManager(false);
                }}
                className="px-3 py-1.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showAddForm ? "Cerrar Form" : "Nuevo Servicio"}</span>
              </button>
            </div>
          </div>

          {/* Administrador de Categorías */}
          {showCategoryManager && (
            <div className="bg-elegant-sub/40 border border-elegant-border rounded-2xl p-4 space-y-4 animate-fadeIn text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-elegant-gold flex items-center gap-1">
                    <Grid className="h-4 w-4" />
                    Gestionar Categorías de Servicios
                  </h3>
                  <p className="text-[10px] text-elegant-text-muted mt-0.5">
                    Crea categorías personalizadas, o renombra/elimina las existentes. Las categorías se reflejarán de inmediato.
                  </p>
                </div>
              </div>

              {/* Formulario Agregar Categoría */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Limpieza Facial, Manicura"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold placeholder-neutral-500 h-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold flex items-center gap-1 h-9 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
              </div>

              {categoryError && (
                <p className="text-[10px] text-rose-400 font-semibold">{categoryError}</p>
              )}

              {/* Lista de Categorías */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {serviceCategories.map((cat) => {
                  const isEditingCat = editingCategoryId === cat.id;
                  const countServices = services.filter((s) => s.category === cat.id).length;

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 p-2.5 bg-elegant-card/50 border border-elegant-border rounded-xl"
                    >
                      {isEditingCat ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategory(cat.id);
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveCategory(cat.id)}
                            className="p-1.5 text-emerald-400 bg-emerald-950/25 border border-emerald-900/40 rounded-lg hover:bg-emerald-950/50 cursor-pointer"
                            title="Guardar"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1.5 text-rose-400 bg-rose-950/25 border border-rose-900/40 rounded-lg hover:bg-rose-950/50 cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-semibold text-white">{cat.name}</span>
                            <span className="text-[8px] bg-elegant-sub border border-elegant-border text-elegant-text-muted px-1.5 py-0.5 rounded-md font-mono">
                              {countServices} {countServices === 1 ? "servicio" : "servicios"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditingCategory(cat)}
                              className="p-1.5 text-elegant-text-muted hover:text-white bg-elegant-sub border border-elegant-border rounded-lg transition-colors cursor-pointer"
                              title="Renombrar Categoría"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            
                            {serviceCategories.length > 1 && (
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/10 border border-rose-900/20 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar Categoría"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-elegant-border rounded-xl text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold h-9"
                  >
                    {serviceCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-elegant-card text-white">
                        {cat.name}
                      </option>
                    ))}
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

              {/* Opción de Canje por Recompensas / Regalo */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-amber-300 block">
                    🎁 Permitir canjear como Regalo Gratis (Puntos de Fidelización o Cumpleaños)
                  </label>
                  <p className="text-[10px] text-neutral-400">
                    Si está activo, los clientes podrán elegir este servicio gratis al redimir 5 sellos o su corte de cumpleaños.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={newServiceAllowReward}
                  onChange={(e) => setNewServiceAllowReward(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500 cursor-pointer"
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
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-2 py-1.5 border border-elegant-border rounded-lg text-xs bg-elegant-sub text-white"
                        >
                          {serviceCategories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="bg-elegant-card text-white">
                              {cat.name}
                            </option>
                          ))}
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
                    <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-lg border border-amber-500/30">
                      <input
                        type="checkbox"
                        id={`edit-reward-${s.id}`}
                        checked={editAllowReward}
                        onChange={(e) => setEditAllowReward(e.target.checked)}
                        className="h-3.5 w-3.5 text-amber-500 rounded border-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor={`edit-reward-${s.id}`} className="text-[11px] text-amber-300 font-medium cursor-pointer">
                        🎁 Permitir canjear como Regalo Gratis (Puntos de Fidelidad / Cumpleaños)
                      </label>
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

              const isRewardAllowed = s.allowRewardRedemption !== false;

              return (
                <div key={s.id} className="border border-elegant-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-elegant-sub/50 hover:border-neutral-700 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-xs text-white">{s.name}</h4>
                      <span className="text-[8px] bg-elegant-card text-elegant-text-muted border border-elegant-border font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {serviceCategories.find(c => c.id === s.category)?.name || s.category}
                      </span>
                      {isRewardAllowed ? (
                        <span className="text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/40 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          🎁 Canjeable como Regalo
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          🚫 No Canjeable Gratis
                        </span>
                      )}
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
