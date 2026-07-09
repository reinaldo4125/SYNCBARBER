import React, { useState } from "react";
import { 
  Appointment, 
  Service, 
  SalonConfig, 
  AppointmentStatus,
  DashboardStats,
  Barber
} from "../types";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  Check, 
  X, 
  TrendingUp, 
  Scissors, 
  Plus, 
  FileText, 
  Trash,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Bell
} from "lucide-react";

interface AdminDashboardProps {
  appointments: Appointment[];
  services: Service[];
  config: SalonConfig;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onDeleteAppointment: (id: string) => Promise<any>;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  formatPrice: (price: number) => string;
  isBarberView?: boolean;
  loggedBarberId?: string;
  barbers?: Barber[];
  onUpdateBarber?: (id: string, updates: Partial<Barber>) => Promise<any>;
}

export default function AdminDashboard({
  appointments,
  services,
  config,
  onUpdateAppointment,
  onDeleteAppointment,
  onCreateAppointment,
  formatPrice,
  isBarberView = false,
  loggedBarberId,
  barbers = [],
  onUpdateBarber,
}: AdminDashboardProps) {
  // States
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] // Current local date e.g. YYYY-MM-DD
  );
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

  // Walk-in booking state
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState(services[0]?.id || "");
  const [walkInTime, setWalkInTime] = useState("09:00");
  const [walkInBarberId, setWalkInBarberId] = useState<string>("any");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [walkInError, setWalkInError] = useState("");
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState("");
  const [newRescheduleDate, setNewRescheduleDate] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  // Service/cut editing state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [tempServiceId, setTempServiceId] = useState<string>("");
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [serviceError, setServiceError] = useState<string>("");

  // Helpers for date navigation
  const adjustDate = (days: number) => {
    const date = new Date(selectedDate + "T12:00:00");
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const getDayLabel = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split("T")[0];

    if (dateStr === today) return "Hoy";
    if (dateStr === tomorrow) return "Mañana";

    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const date = new Date(dateStr + "T12:00:00");
    return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Filter appointments based on role/view before running metrics
  const relevantAppointmentsForStats = isBarberView
    ? appointments.filter(a => a.barberId === loggedBarberId)
    : appointments;

  // Calculations for dashboard metrics based on selected date or overall
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = relevantAppointmentsForStats.filter((a) => a.date === selectedDate && a.status !== "canceled");

  // Overall calculations
  const stats: DashboardStats = relevantAppointmentsForStats.reduce(
    (acc, app) => {
      // Income only from confirmed or completed appointments
      if (app.status === "completed" || app.status === "confirmed") {
        acc.totalIncome += app.price;
      }
      if (app.status === "completed") acc.completedCount++;
      if (app.status === "pending") acc.pendingCount++;
      if (app.status === "confirmed") acc.confirmedCount++;
      if (app.date === todayStr && app.status !== "canceled") acc.todayCount++;
      return acc;
    },
    { totalIncome: 0, completedCount: 0, pendingCount: 0, confirmedCount: 0, todayCount: 0 }
  );

  // Income for the CURRENT SELECTED DATE
  const selectedDateIncome = relevantAppointmentsForStats
    .filter((a) => a.date === selectedDate && (a.status === "completed" || a.status === "confirmed"))
    .reduce((sum, app) => sum + app.price, 0);

  // Filtered appointments list for display (include unassigned for barbers to claim!)
  const filteredAppointments = appointments
    .filter((app) => {
      const matchDate = app.date === selectedDate;
      const matchStatus = filterStatus === "all" || app.status === filterStatus;
      if (!matchDate || !matchStatus) return false;

      if (isBarberView) {
        // Barbers see their own or unclaimed ones
        return app.barberId === loggedBarberId || !app.barberId || app.barberId === "any";
      }
      return true;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  // Handle saving hairdresser formulas/notes
  const handleSaveNotes = async (id: string) => {
    setIsSubmittingNotes(true);
    try {
      await onUpdateAppointment(id, { hairdresserNotes: tempNotes });
      setEditingNotesId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  // Handle Walk-In Submit
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError("");
    setIsSubmittingWalkIn(true);

    if (!walkInName || !walkInPhone) {
      setWalkInError("Por favor ingresa nombre y celular del cliente.");
      setIsSubmittingWalkIn(false);
      return;
    }

    try {
      const selectedBarb = barbers.find(b => b.id === (isBarberView ? loggedBarberId : walkInBarberId));
      const res = await onCreateAppointment({
        clientName: walkInName,
        clientPhone: walkInPhone,
        serviceId: walkInServiceId,
        date: selectedDate,
        time: walkInTime,
        notes: walkInNotes,
        barberId: isBarberView ? loggedBarberId : walkInBarberId,
        barberName: isBarberView ? "Tú" : (selectedBarb?.name || "Cualquier Barbero"),
      });

      // Automatically confirm admin-booked appointments
      if (res && res.id) {
        await onUpdateAppointment(res.id, { status: "confirmed" });
      }

      // Reset
      setWalkInName("");
      setWalkInPhone("");
      setWalkInNotes("");
      setShowWalkInForm(false);
    } catch (err: any) {
      setWalkInError(err.message || "Error al registrar la cita manual.");
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // Handle Rescheduling
  const handleRescheduleSubmit = async (id: string) => {
    setRescheduleError("");
    if (!newRescheduleDate || !newRescheduleTime) {
      setRescheduleError("Ingresa fecha y hora válidas.");
      return;
    }

    try {
      await onUpdateAppointment(id, {
        date: newRescheduleDate,
        time: newRescheduleTime,
        status: "confirmed", // auto-confirm rescheduled appointments
      });
      setReschedulingId(null);
      setNewRescheduleDate("");
      setNewRescheduleTime("");
    } catch (err: any) {
      setRescheduleError(err.message || "Horario conflictivo o inválido.");
    }
  };

  // Open reschedule drawer
  const startRescheduling = (app: Appointment) => {
    setReschedulingId(app.id);
    setNewRescheduleDate(app.date);
    setNewRescheduleTime(app.time);
    setRescheduleError("");
  };

  // Handle updating appointment service (changing the cut)
  const handleSaveService = async (id: string) => {
    setServiceError("");
    setIsSubmittingService(true);
    try {
      await onUpdateAppointment(id, { serviceId: tempServiceId });
      setEditingServiceId(null);
    } catch (err: any) {
      setServiceError(err.message || "Error al actualizar el servicio/corte.");
    } finally {
      setIsSubmittingService(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-dashboard">
      {/* Real-time Status Alert */}
      <div className="bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p className="text-xs font-medium">Panel de Peluquero conectado en tiempo real.</p>
        </div>
        <div className="text-xs bg-emerald-900/40 border border-emerald-800/30 px-2 py-0.5 rounded-md font-mono font-semibold text-emerald-300">
          SSE Conectado
        </div>
      </div>

      {/* Módulo de Bloqueo de Agenda para Barberos (Sickness / Descanso) */}
      {isBarberView && loggedBarberId && (
        (() => {
          const selfBarber = barbers.find(b => b.id === loggedBarberId);
          if (!selfBarber) return null;
          
          const activeLicense = config.licenseType || "premium";
          const isBlockedDatesLocked = activeLicense === "basica";

          return (
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 shadow-xs space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-elegant-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-rose-950/40 text-rose-400 rounded-lg">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">📅 Bloquear mi Agenda / Días de Descanso</h3>
                    <p className="text-[10px] text-elegant-text-muted">Si te enfermas o tienes descanso, bloquea fechas aquí para evitar nuevas reservas.</p>
                  </div>
                </div>
                <div className="text-[10px] font-bold uppercase px-2.5 py-1 bg-rose-950/40 text-rose-400 border border-rose-800/40 rounded-xl">
                  {selfBarber.name}
                </div>
              </div>

              {isBlockedDatesLocked ? (
                <div className="bg-amber-950/20 border border-amber-900/40 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Módulo de Ausencias Reservado para Licencia Profesional & Premium</span>
                    </p>
                    <p className="text-[10px] text-elegant-text-muted">
                      El bloqueo de agenda y ausencias médicas requiere una licencia superior. Solicita una actualización a tu administrador.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-[10px] font-bold uppercase text-elegant-text-muted shrink-0">Seleccionar Fecha:</label>
                      <input
                        type="date"
                        id="barber-block-date-input"
                        className="px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                      />
                    </div>
                    
                    <button
                      onClick={async () => {
                        const input = document.getElementById("barber-block-date-input") as HTMLInputElement;
                        if (input && input.value) {
                          const dateVal = input.value;
                          const currentBlocked = selfBarber.blockedDates || [];
                          if (!currentBlocked.includes(dateVal)) {
                            const updated = [...currentBlocked, dateVal];
                            if (onUpdateBarber) {
                              await onUpdateBarber(selfBarber.id, { blockedDates: updated });
                            }
                          }
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Bloquear Agenda para este Día</span>
                    </button>
                  </div>

                  {selfBarber.blockedDates && selfBarber.blockedDates.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">Tus Fechas Bloqueadas Activas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selfBarber.blockedDates.map((dateStr) => (
                          <span
                            key={dateStr}
                            className="text-[10px] bg-rose-950 border border-rose-800/60 text-rose-300 px-3 py-1.5 rounded-xl flex items-center gap-2"
                          >
                            <span className="font-mono font-bold">{dateStr}</span>
                            <button
                              onClick={async () => {
                                const updated = (selfBarber.blockedDates || []).filter(d => d !== dateStr);
                                if (onUpdateBarber) {
                                  await onUpdateBarber(selfBarber.id, { blockedDates: updated });
                                }
                              }}
                              className="text-rose-400 hover:text-white font-black hover:scale-110 transition-transform cursor-pointer"
                              title="Eliminar bloqueo"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-elegant-text-muted italic">No tienes fechas bloqueadas. Tu agenda está totalmente abierta para recibir citas.</p>
                  )}
                </>
              )}
            </div>
          );
        })()
      )}

      {/* Grid de Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total ingresos */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-income">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Ingresos Confirmados</span>
            <div className="p-2 bg-elegant-gold/20 rounded-lg text-elegant-gold">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold font-sans text-white">
              {formatPrice(stats.totalIncome)}
            </span>
            <p className="text-[10px] text-elegant-text-muted mt-1">Suma de citas activas y completadas</p>
          </div>
        </div>

        {/* Citas de Hoy */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-today">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Citas Hoy ({getDayLabel(selectedDate)})</span>
            <div className="p-2 bg-blue-950/40 rounded-lg text-blue-400">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold font-sans text-white">
              {todayAppointments.length}
            </span>
            <p className="text-[10px] text-elegant-text-muted mt-1">
              Ingreso estimado hoy: <strong className="text-elegant-gold font-mono">{formatPrice(selectedDateIncome)}</strong>
            </p>
          </div>
        </div>

        {/* Pendientes por confirmar */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-pending">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Por Confirmar</span>
            <div className="p-2 bg-rose-950/40 rounded-lg text-rose-400 relative">
              <Bell className="h-4 w-4 animate-swing" />
              {stats.pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {stats.pendingCount}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold font-sans text-white">
              {stats.pendingCount}
            </span>
            <p className="text-[10px] text-elegant-text-muted mt-1">Citas solicitadas por clientes</p>
          </div>
        </div>

        {/* Confirmadas activas */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-confirmed">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmadas</span>
            <div className="p-2 bg-emerald-950/40 rounded-lg text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold font-sans text-white">
              {stats.confirmedCount}
            </span>
            <p className="text-[10px] text-elegant-text-muted mt-1">Agendadas de forma segura</p>
          </div>
        </div>
      </div>

      {/* Control de Agenda Diaria */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-4 md:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Scissors className="h-5 w-5 text-elegant-gold" />
              Agenda del Día
            </h2>
            <p className="text-xs text-elegant-text-muted">Gestiona las reservas hechas para el día seleccionado.</p>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => adjustDate(-1)}
              className="p-2 border border-elegant-border bg-elegant-sub rounded-xl hover:bg-elegant-card active:scale-95 transition-all text-elegant-text cursor-pointer"
              title="Día Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 bg-elegant-sub border border-elegant-border text-white font-semibold rounded-xl text-xs font-mono select-none">
              {getDayLabel(selectedDate)}
            </span>
            <button 
              onClick={() => adjustDate(1)}
              className="p-2 border border-elegant-border bg-elegant-sub rounded-xl hover:bg-elegant-card active:scale-95 transition-all text-elegant-text cursor-pointer"
              title="Día Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setShowWalkInForm(!showWalkInForm)}
              className="px-3 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors ml-2 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Cita Manual
            </button>
          </div>
        </div>

        {/* Formulario de Cita Manual (Walk-in) */}
        {showWalkInForm && (
          <form onSubmit={handleWalkInSubmit} className="bg-elegant-gold/10 border border-elegant-gold/20 rounded-2xl p-4 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-elegant-border pb-2">
              <h3 className="text-xs font-bold text-elegant-gold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-elegant-gold" />
                Registrar Cita de Cliente Walk-in / Llamada
              </h3>
              <button 
                type="button" 
                onClick={() => setShowWalkInForm(false)}
                className="text-elegant-text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {walkInError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg">{walkInError}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Nombre Cliente *</label>
                <input 
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Ej. Carlos Ortiz"
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Teléfono / Celular *</label>
                <input 
                  type="text"
                  required
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                />
              </div>

              {/* Servicio */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Servicio *</label>
                <select 
                  value={walkInServiceId}
                  onChange={(e) => setWalkInServiceId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="bg-elegant-card text-white">
                      {s.name} ({s.duration} min - {formatPrice(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hora */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Hora *</label>
                <input 
                  type="time"
                  required
                  value={walkInTime}
                  onChange={(e) => setWalkInTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
                />
              </div>

              {/* Asignar Barbero (Only for admin) */}
              {!isBarberView && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Asignar Barbero *</label>
                  <select
                    value={walkInBarberId}
                    onChange={(e) => setWalkInBarberId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
                  >
                    <option value="any">Cualquier Barbero (Sin asignar)</option>
                    {barbers.filter(b => b.isActive).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Notas internas de reserva (Opcional)</label>
              <textarea 
                value={walkInNotes}
                onChange={(e) => setWalkInNotes(e.target.value)}
                placeholder="Ej. Agendado por teléfono. Solicita corte fade."
                rows={2}
                className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowWalkInForm(false)}
                className="px-4 py-2 border border-elegant-border bg-elegant-sub hover:bg-elegant-card text-elegant-text rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmittingWalkIn}
                className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingWalkIn ? "Guardando..." : "Confirmar y Agendar"}
              </button>
            </div>
          </form>
        )}

        {/* Filtros por Estado */}
        <div className="flex items-center space-x-2 border-b border-elegant-border pb-3 overflow-x-auto">
          <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider hidden md:inline">Ver:</span>
          {(["all", "pending", "confirmed", "completed", "canceled"] as const).map((status) => {
            const isSelected = filterStatus === status;
            const count = appointments.filter((a) => a.date === selectedDate && (status === "all" || a.status === status)).length;
            
            const labels: Record<string, string> = {
              all: `Todos (${count})`,
              pending: `Pendientes (${count})`,
              confirmed: `Confirmados (${count})`,
              completed: `Completados (${count})`,
              canceled: `Cancelados (${count})`
            };

            const colors: Record<string, string> = {
              all: isSelected ? "bg-elegant-gold text-elegant-bg font-bold font-bold" : "bg-elegant-sub border border-elegant-border text-elegant-text hover:bg-elegant-card",
              pending: isSelected ? "bg-amber-600 text-white font-bold" : "bg-amber-950/40 border border-amber-800/40 text-amber-400 hover:bg-amber-900/40",
              confirmed: isSelected ? "bg-emerald-600 text-white font-bold" : "bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40",
              completed: isSelected ? "bg-blue-600 text-white font-bold" : "bg-blue-950/40 border border-blue-800/40 text-blue-400 hover:bg-blue-900/40",
              canceled: isSelected ? "bg-rose-500 text-white font-bold" : "bg-rose-950/40 border border-rose-800/40 text-rose-400 hover:bg-rose-900/40",
            };

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 ${colors[status]}`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

        {/* Lista de Citas */}
        {filteredAppointments.length === 0 ? (
          <div className="py-12 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
            <CalendarIcon className="h-8 w-8 mx-auto stroke-1" />
            <p className="text-sm">No hay citas registradas para este día con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((app) => {
              const isEditingNotes = editingNotesId === app.id;
              const isRescheduling = reschedulingId === app.id;

              return (
                <div 
                  key={app.id}
                  id={`appointment-card-${app.id}`}
                  className={`border rounded-2xl p-4 md:p-5 transition-all bg-elegant-sub/50 ${
                    app.status === "completed" ? "border-blue-900/40 bg-blue-950/10 opacity-85" : 
                    app.status === "confirmed" ? "border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-800/50" :
                    app.status === "canceled" ? "border-rose-900/40 bg-rose-950/10 opacity-70" :
                    "border-elegant-gold/40 bg-elegant-gold/10 hover:border-elegant-gold/60 border-2"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Detalles de la cita */}
                    <div className="space-y-3 flex-1">
                      {/* Cabecera de tarjeta: Hora y Status */}
                      <div className="flex items-center space-x-2">
                        <span className="bg-elegant-card border border-elegant-border text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {app.time}
                        </span>
                        <span className="text-[10px] text-elegant-text-muted font-medium font-mono">
                          ({app.duration} min)
                        </span>

                        {/* Badges de Estado */}
                        {app.status === "pending" && (
                          <span className="bg-amber-950/50 text-amber-400 border border-amber-800/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse uppercase">
                            Por Confirmar
                          </span>
                        )}
                        {app.status === "confirmed" && (
                          <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Confirmado
                          </span>
                        )}
                        {app.status === "completed" && (
                          <span className="bg-blue-950/50 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Completado
                          </span>
                        )}
                        {app.status === "canceled" && (
                          <span className="bg-rose-950/50 text-rose-400 border border-rose-800/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Cancelado
                          </span>
                        )}
                        {app.membershipId && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Socio: {app.membershipId === "gold" ? "Oro VIP" : app.membershipId === "silver" ? "Plata" : "Bronce"} ({app.membershipDiscountPercent}% OFF)
                          </span>
                        )}
                      </div>

                      {/* Cliente y Servicio */}
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                           <User className="h-4 w-4 text-elegant-text-muted" />
                          {app.clientName}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-elegant-text-muted">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-elegant-text-muted" />
                            {app.clientPhone}
                          </span>
                          {app.clientEmail && (
                            <span className="text-elegant-text-muted">{app.clientEmail}</span>
                          )}
                        </div>
                      </div>

                      {/* Asignación de Barbero */}
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="text-elegant-text-muted font-bold uppercase text-[9px] tracking-wider">Peluquero Asignado:</span>
                        {!isBarberView ? (
                          <select
                            value={app.barberId || "any"}
                            onChange={async (e) => {
                              const bId = e.target.value;
                              const selectedBarb = barbers.find(b => b.id === bId);
                              await onUpdateAppointment(app.id, { 
                                barberId: bId === "any" ? undefined : bId,
                                barberName: bId === "any" ? "Cualquier Barbero" : selectedBarb?.name
                              });
                            }}
                            className="px-2 py-0.5 bg-elegant-sub border border-elegant-border text-white text-[11px] rounded-lg cursor-pointer"
                          >
                            <option value="any">Cualquier Barbero (Sin Asignar)</option>
                            {barbers.filter(b => b.isActive).map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[11px] font-bold ${app.barberId === loggedBarberId ? "text-elegant-gold" : "text-white"}`}>
                            {app.barberId === loggedBarberId ? "✨ Asignado a ti" : (app.barberName || "Cualquier Barbero")}
                          </span>
                        )}
                      </div>

                      {/* Servicio agendado */}
                      {editingServiceId === app.id ? (
                        <div className="bg-elegant-sub/50 border border-elegant-border rounded-xl p-3 max-w-md space-y-2">
                          <label className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">
                            Seleccionar Nuevo Corte / Servicio:
                          </label>
                          <select
                            value={tempServiceId}
                            onChange={(e) => setTempServiceId(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-elegant-border rounded-lg bg-elegant-card text-white focus:ring-1 focus:ring-elegant-gold"
                          >
                            {services.map((srv) => (
                              <option key={srv.id} value={srv.id}>
                                {srv.name} ({formatPrice(srv.price)})
                              </option>
                            ))}
                          </select>
                          {serviceError && (
                            <p className="text-[10px] text-rose-400 font-medium">
                              {serviceError}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveService(app.id)}
                              disabled={isSubmittingService}
                              className="px-2.5 py-1 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg text-[10px] rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                            >
                              {isSubmittingService ? "Guardando..." : "Guardar Cambio"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingServiceId(null);
                                setServiceError("");
                              }}
                              className="px-2.5 py-1 border border-elegant-border text-elegant-text text-[10px] rounded-lg hover:bg-elegant-sub cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-elegant-sub/50 border border-elegant-border rounded-xl p-2.5 max-w-md flex items-center justify-between group">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white">{app.serviceName}</p>
                              <button
                                onClick={() => {
                                  setEditingServiceId(app.id);
                                  setTempServiceId(app.serviceId);
                                  setServiceError("");
                                }}
                                className="text-[10px] font-bold text-elegant-gold hover:underline cursor-pointer opacity-80 hover:opacity-100"
                                title="Cambiar el corte/servicio de esta cita"
                              >
                                [Cambiar corte]
                              </button>
                            </div>
                            <p className="text-[10px] text-elegant-text-muted">Precio pactado: {formatPrice(app.price)}</p>
                          </div>
                          <span className="text-xs font-bold font-mono text-elegant-gold bg-elegant-gold/20 border border-elegant-gold/10 px-2 py-1 rounded-md shrink-0 ml-2">
                            {formatPrice(app.price)}
                          </span>
                        </div>
                      )}

                      {/* Notas de Cliente */}
                      {app.notes && (
                        <div className="text-xs text-elegant-text bg-elegant-gold/10 border border-elegant-gold/20 p-2 rounded-xl">
                          <span className="font-bold text-[10px] uppercase text-elegant-gold block mb-0.5">Nota del cliente:</span>
                          "{app.notes}"
                        </div>
                      )}

                      {/* Notas del Peluquero (Fórmulas, Ficha de Cliente) */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                          Notas del Peluquero (Tinturas, Fórmulas, Preferencias):
                        </span>
                        {isEditingNotes ? (
                          <div className="space-y-2 max-w-xl">
                            <textarea
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              placeholder="Ej: Mezcla tinte 7.1 + 8.2 con peróxido 20 vol. Corte fade medio."
                              className="w-full text-xs p-2 border border-elegant-border rounded-xl focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(app.id)}
                                disabled={isSubmittingNotes}
                                className="px-2.5 py-1 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg text-[11px] rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                              >
                                Guardar Nota
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-2.5 py-1 border border-elegant-border text-elegant-text text-[11px] rounded-lg hover:bg-elegant-sub cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between max-w-xl bg-elegant-sub/40 hover:bg-elegant-sub/60 p-2.5 rounded-xl border border-elegant-border">
                            <p className="text-xs italic text-elegant-text flex-1">
                              {app.hairdresserNotes || "Sin notas registradas. Agrega fórmulas o preferencias del corte para este cliente..."}
                            </p>
                            <button
                              onClick={() => {
                                setEditingNotesId(app.id);
                                setTempNotes(app.hairdresserNotes || "");
                              }}
                              className="text-elegant-gold hover:text-elegant-gold-hover text-[11px] font-bold ml-2 cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Diálogo Rescheduling */}
                      {isRescheduling && (
                        <div className="bg-elegant-sub border border-elegant-border p-3.5 rounded-xl space-y-3 max-w-md">
                          <h5 className="text-xs font-bold text-white flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-elegant-gold" />
                            Reagendar Cita de {app.clientName}
                          </h5>
                          {rescheduleError && (
                            <p className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-800/50 p-1.5 rounded-lg">{rescheduleError}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">FECHA</label>
                              <input 
                                type="date"
                                value={newRescheduleDate}
                                onChange={(e) => setNewRescheduleDate(e.target.value)}
                                className="w-full text-xs p-1.5 border border-elegant-border rounded-lg bg-elegant-card text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-elegant-text-muted block mb-0.5">HORA</label>
                              <input 
                                type="time"
                                value={newRescheduleTime}
                                onChange={(e) => setNewRescheduleTime(e.target.value)}
                                className="w-full text-xs p-1.5 border border-elegant-border rounded-lg bg-elegant-card text-white"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => setReschedulingId(null)}
                              className="px-2.5 py-1 text-[11px] text-elegant-text-muted hover:bg-elegant-card rounded-lg"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleRescheduleSubmit(app.id)}
                              className="px-3 py-1 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg text-[11px] font-bold rounded-lg"
                            >
                              Reagendar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones del Peluquero */}
                    <div className="flex flex-row md:flex-col justify-end gap-1.5 self-center md:self-start shrink-0 flex-wrap w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-elegant-border/20 md:border-t-0">
                      {/* Claim / Asignarme Button for Barbers */}
                      {isBarberView && (!app.barberId || app.barberId === "any") && (
                        <button
                          onClick={async () => {
                            const selfBarb = barbers.find(b => b.id === loggedBarberId);
                            await onUpdateAppointment(app.id, { 
                              barberId: loggedBarberId, 
                              barberName: selfBarb?.name || "Tú" 
                            });
                          }}
                          className="px-3 py-1.5 bg-elegant-gold hover:bg-amber-500 text-elegant-bg rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Asignarme este turno a mi agenda"
                        >
                          <Scissors className="h-3.5 w-3.5" />
                          <span>Asignarme</span>
                        </button>
                      )}

                      {/* Confirmar */}
                      {app.status === "pending" && (
                        <button
                          onClick={() => onUpdateAppointment(app.id, { status: "confirmed" })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Confirmar Cita"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Aprobar</span>
                        </button>
                      )}

                      {/* Completar */}
                      {app.status === "confirmed" && (
                        <button
                          onClick={() => onUpdateAppointment(app.id, { status: "completed" })}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Marcar como Completada"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Completar</span>
                        </button>
                      )}

                      {/* Reagendar */}
                      {app.status !== "completed" && app.status !== "canceled" && (
                        <button
                          onClick={() => startRescheduling(app)}
                          className="px-3 py-1.5 border border-elegant-border bg-elegant-sub hover:bg-elegant-card text-elegant-text rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Cambiar fecha u hora"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-elegant-text-muted" />
                          <span>Mover</span>
                        </button>
                      )}

                      {/* Cancelar */}
                      {app.status !== "canceled" && app.status !== "completed" && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de cancelar la cita de ${app.clientName}?`)) {
                              onUpdateAppointment(app.id, { status: "canceled" });
                            }
                          }}
                          className="px-3 py-1.5 border border-rose-900/40 text-rose-400 hover:bg-rose-950/20 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Cancelar Cita"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Cancelar</span>
                        </button>
                      )}

                      {/* Eliminar (Solo cancelados o completados para limpiar) */}
                      {(app.status === "canceled" || app.status === "completed") && (
                        <button
                          onClick={() => {
                            if (window.confirm("¿Deseas eliminar permanentemente esta cita del historial?")) {
                              onDeleteAppointment(app.id);
                            }
                          }}
                          className="px-3 py-1.5 text-elegant-text-muted hover:text-rose-400 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                          title="Eliminar de historial"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
