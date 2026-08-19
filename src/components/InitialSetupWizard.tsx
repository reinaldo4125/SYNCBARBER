import React, { useState } from "react";
import { Service, Barber, SalonConfig } from "../types";
import { 
  Scissors, 
  Clock, 
  User, 
  Check, 
  Plus, 
  Trash, 
  AlertCircle, 
  Sparkles, 
  DollarSign, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InitialSetupWizardProps {
  initialConfig: SalonConfig;
  initialServices: Service[];
  initialBarbers: Barber[];
  onComplete: (data: { config: Partial<SalonConfig>; services: Service[]; barbers: Barber[] }) => Promise<void>;
  formatPrice: (price: number) => string;
}

export default function InitialSetupWizard({
  initialConfig,
  initialServices,
  initialBarbers,
  onComplete,
  formatPrice
}: InitialSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Config states
  const [salonName, setSalonName] = useState(initialConfig.name);
  const [tagline, setTagline] = useState(initialConfig.tagline || "");
  const [openTime, setOpenTime] = useState(initialConfig.openTime || "09:00");
  const [closeTime, setCloseTime] = useState(initialConfig.closeTime || "19:00");
  const [intervalMinutes, setIntervalMinutes] = useState(initialConfig.intervalMinutes || 30);
  const [workingDays, setWorkingDays] = useState<number[]>(initialConfig.workingDays || [1, 2, 3, 4, 5, 6]);

  // Step 2: Services states
  const [services, setServices] = useState<Service[]>(initialServices);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServiceCategory, setNewServiceCategory] = useState<'cabello' | 'barba' | 'color' | 'tratamiento'>("cabello");
  const [newServiceDescription, setNewServiceDescription] = useState("");

  // Step 3: Barbers states
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberUser, setNewBarberUser] = useState("");
  const [newBarberPass, setNewBarberPass] = useState("");
  const [newBarberSpecialties, setNewBarberSpecialties] = useState<string[]>(["cabello", "barba"]);

  const handleToggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) {
      setError("Completa el nombre y precio del servicio.");
      return;
    }
    setError("");
    const newService: Service = {
      id: "s_setup_" + Date.now().toString(),
      name: newServiceName,
      price: Number(newServicePrice),
      duration: Number(newServiceDuration),
      category: newServiceCategory,
      description: newServiceDescription
    };
    setServices([...services, newService]);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceDescription("");
  };

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleAddBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName || !newBarberUser || !newBarberPass) {
      setError("Completa todos los campos para el barbero.");
      return;
    }
    if (newBarberUser.toLowerCase() === "admin") {
      setError("El usuario 'admin' está reservado para el administrador.");
      return;
    }
    if (barbers.some(b => b.username.toLowerCase() === newBarberUser.toLowerCase())) {
      setError("Este nombre de usuario ya está asignado a otro barbero.");
      return;
    }

    // Check license limits
    const currentLic = initialConfig.licenseType || "basica";
    const maxAllowed = currentLic === "basica" ? 2 : currentLic === "profesional" ? 5 : 99;
    const activeCount = barbers.filter(b => b.isActive !== false).length;
    if (activeCount >= maxAllowed) {
      setError(`Límite alcanzado: Tu licencia actual (${currentLic}) solo permite registrar hasta ${maxAllowed} barberos.`);
      return;
    }

    setError("");
    const newBarber: Barber = {
      id: "b_setup_" + Date.now().toString(),
      name: newBarberName,
      username: newBarberUser,
      password: newBarberPass,
      isActive: true,
      specialties: newBarberSpecialties
    };
    setBarbers([...barbers, newBarber]);
    setNewBarberName("");
    setNewBarberUser("");
    setNewBarberPass("");
  };

  const handleDeleteBarber = (id: string) => {
    setBarbers(barbers.filter(b => b.id !== id));
  };

  const handleToggleSpecialty = (spec: string) => {
    if (newBarberSpecialties.includes(spec)) {
      setNewBarberSpecialties(newBarberSpecialties.filter(s => s !== spec));
    } else {
      setNewBarberSpecialties([...newBarberSpecialties, spec]);
    }
  };

  const handleNextStep1 = () => {
    setError("");
    if (!salonName.trim()) {
      setError("Por favor ingresa el nombre de tu barbería o peluquería.");
      return;
    }
    if (!openTime || !closeTime) {
      setError("Por favor indica la hora de apertura y de cierre.");
      return;
    }
    const [openH, openM] = openTime.split(":").map(Number);
    const [closeH, closeM] = closeTime.split(":").map(Number);
    if (openH * 60 + openM >= closeH * 60 + closeM) {
      setError(`La hora de apertura (${openTime}) debe ser anterior a la hora de cierre (${closeTime}).`);
      return;
    }
    if (!workingDays || workingDays.length === 0) {
      setError("Debes seleccionar al menos un día laboral.");
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (services.length === 0) {
      setError("Por favor, agrega al menos un servicio para tus clientes.");
      setStep(2);
      return;
    }
    if (barbers.length === 0) {
      setError("Por favor, registra al menos un barbero/estilista de tu equipo.");
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onComplete({
        config: {
          name: salonName.trim(),
          tagline: tagline.trim(),
          openTime,
          closeTime,
          workingDays: Array.from(new Set<number>(workingDays)).sort((a: number, b: number) => a - b),
          intervalMinutes: Number(intervalMinutes),
          needsSetup: false
        },
        services,
        barbers
      });
    } catch (err: any) {
      setError(err.message || "Fallo al guardar la configuración inicial.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-elegant-bg/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-elegant-card border border-elegant-border rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl my-8 space-y-6 flex flex-col justify-between max-h-[90vh] overflow-y-auto" id="setup-wizard-container">
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-elegant-border/80 pb-5">
          <div className="inline-flex p-3.5 bg-elegant-gold/15 border border-elegant-gold/25 rounded-2xl text-elegant-gold animate-bounce">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white font-sans tracking-tight uppercase">
            ¡Bienvenido a <span className="text-elegant-gold">SyncBarber SaaS</span>!
          </h1>
          <p className="text-xs text-elegant-text-muted max-w-lg mx-auto">
            Vamos a configurar los parámetros iniciales de tu barbería o peluquería en 3 sencillos pasos.
          </p>

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2 pt-4">
            {[
              { num: 1, label: "Parámetros" },
              { num: 2, label: "Catálogo" },
              { num: 3, label: "Tu Equipo" }
            ].map((s) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s.num 
                      ? "bg-elegant-gold text-elegant-bg font-black scale-110" 
                      : step > s.num 
                        ? "bg-emerald-600 text-white" 
                        : "bg-elegant-sub border border-elegant-border text-elegant-text-muted"
                  }`}>
                    {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    step === s.num ? "text-elegant-gold" : "text-elegant-text-muted"
                  }`}>{s.label}</span>
                </div>
                {s.num < 3 && <div className="h-[1px] w-8 sm:w-16 bg-elegant-border"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 py-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 text-xs text-left"
              >
                <div className="border-b border-elegant-border pb-2 flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-elegant-gold" />
                  <h2 className="text-sm font-bold text-white uppercase font-sans">Paso 1: Parámetros del Negocio</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre del Salón */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Nombre Oficial de la Peluquería / Barbería</label>
                    <input
                      type="text"
                      required
                      value={salonName}
                      onChange={(e) => setSalonName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                      placeholder="Ej: Barbería Golden Cuts"
                    />
                  </div>

                  {/* Eslogan / Lema */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Eslogan o Lema del Salón</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                      placeholder="Ej: Arte, Precisión & Estilo Masculino"
                    />
                  </div>

                  {/* Intervalo de citas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Frecuencia / Intervalo de Turnos</label>
                    <select
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white h-10 focus:ring-1 focus:ring-elegant-gold"
                    >
                      <option value="15">Cada 15 minutos</option>
                      <option value="30">Cada 30 minutos (Recomendado)</option>
                      <option value="45">Cada 45 minutos</option>
                      <option value="60">Cada 60 minutos</option>
                    </select>
                  </div>

                  {/* Horas */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Hora de Apertura</label>
                    <input
                      type="time"
                      required
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Hora de Cierre</label>
                    <input
                      type="time"
                      required
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs bg-elegant-sub text-white focus:ring-1 focus:ring-elegant-gold"
                    />
                  </div>
                </div>

                {/* Días laborables */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase block">Días de Atención Semanal</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                    {[
                      { id: 1, label: "Lun" },
                      { id: 2, label: "Mar" },
                      { id: 3, label: "Mié" },
                      { id: 4, label: "Jue" },
                      { id: 5, label: "Vie" },
                      { id: 6, label: "Sáb" },
                      { id: 0, label: "Dom" },
                    ].map((day) => {
                      const isSelected = workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleDay(day.id)}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase transition-all border cursor-pointer text-center ${
                            isSelected 
                              ? "bg-elegant-gold border-elegant-gold text-elegant-bg" 
                              : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 text-xs text-left"
              >
                <div className="border-b border-elegant-border pb-2 flex items-center gap-2">
                  <Scissors className="h-4.5 w-4.5 text-elegant-gold" />
                  <h2 className="text-sm font-bold text-white uppercase font-sans">Paso 2: Define tus Servicios Iniciales</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Formulario Agregar */}
                  <form onSubmit={handleAddService} className="lg:col-span-5 bg-elegant-sub/50 border border-elegant-border rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-1.5 border-b border-elegant-border pb-2 mb-2">
                      <Plus className="h-4 w-4 text-elegant-gold" />
                      Agregar Servicio
                    </h3>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Nombre del Servicio</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Corte Premium Fade"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Precio COP ($)</label>
                        <input
                          type="number"
                          required
                          placeholder="Ej. 18000"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Duración (Min)</label>
                        <select
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(e.target.value)}
                          className="w-full px-2 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white h-8"
                        >
                          <option value="15">15 min</option>
                          <option value="30">30 min</option>
                          <option value="45">45 min</option>
                          <option value="60">1 hora</option>
                          <option value="90">1.5 horas</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Categoría</label>
                      <select
                        value={newServiceCategory}
                        onChange={(e) => setNewServiceCategory(e.target.value as any)}
                        className="w-full px-2 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white h-8"
                      >
                        <option value="cabello">Corte de Cabello</option>
                        <option value="barba">Barbería & Barba</option>
                        <option value="color">Tinte & Coloración</option>
                        <option value="tratamiento">Tratamiento Capilar</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Descripción rápida</label>
                      <textarea
                        placeholder="Descripción opcional"
                        value={newServiceDescription}
                        onChange={(e) => setNewServiceDescription(e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir al Catálogo
                    </button>
                  </form>

                  {/* Listado de Servicios agregados */}
                  <div className="lg:col-span-7 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold text-elegant-text-muted uppercase block tracking-wider">Tu Catálogo Actual ({services.length}):</p>
                    {services.length === 0 ? (
                      <div className="py-12 text-center text-elegant-text-muted border border-dashed border-elegant-border rounded-2xl">
                        <Scissors className="h-6 w-6 mx-auto stroke-1 mb-2 text-elegant-gold" />
                        <p>No has agregado servicios. Crea al menos uno para continuar.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {services.map((s) => (
                          <div key={s.id} className="border border-elegant-border rounded-xl p-3 bg-elegant-sub/30 flex items-center justify-between gap-3">
                            <div className="text-left space-y-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-white text-xs">{s.name}</h4>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-elegant-card text-elegant-text-muted border border-elegant-border uppercase font-bold">{s.category}</span>
                              </div>
                              <p className="text-[10px] text-elegant-text-muted font-mono flex items-center gap-2">
                                <span>⏱️ {s.duration} min</span>
                                <span>💵 {formatPrice(s.price)}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(s.id)}
                              className="p-1.5 border border-rose-900/40 bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 rounded-lg cursor-pointer"
                              title="Quitar"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 text-xs text-left"
              >
                <div className="border-b border-elegant-border pb-2 flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-elegant-gold" />
                  <h2 className="text-sm font-bold text-white uppercase font-sans">Paso 3: Registra tu Equipo de Barberos</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Formulario Agregar */}
                  <form onSubmit={handleAddBarber} className="lg:col-span-5 bg-elegant-sub/50 border border-elegant-border rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-1.5 border-b border-elegant-border pb-2 mb-2">
                      <Plus className="h-4 w-4 text-elegant-gold" />
                      Registrar Barbero
                    </h3>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mateo Silva"
                        value={newBarberName}
                        onChange={(e) => setNewBarberName(e.target.value)}
                        className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Usuario Acceso</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. mateo_cuts"
                          value={newBarberUser}
                          onChange={(e) => setNewBarberUser(e.target.value)}
                          className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-elegant-text-muted uppercase">Contraseña</label>
                        <input
                          type="text"
                          required
                          placeholder="Contraseña"
                          value={newBarberPass}
                          onChange={(e) => setNewBarberPass(e.target.value)}
                          className="w-full px-2.5 py-2 border border-elegant-border rounded-lg bg-elegant-card text-white placeholder-neutral-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-elegant-text-muted uppercase block">Especialidades</label>
                      <div className="flex flex-wrap gap-1">
                        {["cabello", "barba", "color", "tratamiento"].map((spec) => {
                          const hasSpec = newBarberSpecialties.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => handleToggleSpecialty(spec)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                                hasSpec 
                                  ? "bg-elegant-gold/20 border-elegant-gold text-elegant-gold" 
                                  : "bg-elegant-card border-elegant-border text-elegant-text-muted"
                              }`}
                            >
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registrar en Plantilla
                    </button>
                  </form>

                  {/* Listado de Barberos */}
                  <div className="lg:col-span-7 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold text-elegant-text-muted uppercase block tracking-wider">Tu Equipo Actual ({barbers.length}):</p>
                    {barbers.length === 0 ? (
                      <div className="py-12 text-center text-elegant-text-muted border border-dashed border-elegant-border rounded-2xl">
                        <User className="h-6 w-6 mx-auto stroke-1 mb-2 text-elegant-gold" />
                        <p>No has registrado barberos. Agrega al menos uno para que atienda las citas.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {barbers.map((b) => (
                          <div key={b.id} className="border border-elegant-border rounded-xl p-3 bg-elegant-sub/30 flex items-center justify-between gap-3">
                            <div className="text-left space-y-1">
                              <h4 className="font-bold text-white text-xs">{b.name}</h4>
                              <p className="text-[10px] text-elegant-text-muted font-mono flex items-center gap-2">
                                <span>🔑 Usuario: <strong className="text-white">{b.username}</strong></span>
                                <span>🔒 Clave: <strong className="text-white">{b.password}</strong></span>
                              </p>
                              {b.specialties && b.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {b.specialties.map((spec) => (
                                    <span key={spec} className="text-[7px] font-bold uppercase tracking-wider bg-elegant-card text-elegant-text-muted border border-elegant-border px-1 rounded">
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBarber(b.id)}
                              className="p-1.5 border border-rose-900/40 bg-rose-950/15 hover:bg-rose-950/35 text-rose-400 rounded-lg cursor-pointer"
                              title="Quitar"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-elegant-border/80 pt-5 flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={() => { setError(""); setStep(step - 1); }}
              className="px-4 py-2 bg-elegant-sub hover:bg-elegant-card border border-elegant-border text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1) {
                  handleNextStep1();
                } else {
                  setError("");
                  setStep(step + 1);
                }
              }}
              className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>Continuar</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/30 transition-all"
            >
              <Check className="h-4.5 w-4.5" />
              <span>{isSubmitting ? "Guardando..." : "Completar Configuración"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
