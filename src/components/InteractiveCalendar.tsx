import React, { useState } from "react";
import { Appointment, Barber, Service, SalonConfig, ClientAccount } from "../types";
import { formatTime } from "../utils/formatters";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Scissors, 
  Sparkles, 
  Check, 
  X,
  GripVertical,
  Plus,
  Grid,
  CalendarDays,
  LayoutGrid,
  Filter,
  Search
} from "lucide-react";

interface InteractiveCalendarProps {
  appointments: Appointment[];
  barbers: Barber[];
  services: Service[];
  config: SalonConfig;
  clients?: ClientAccount[];
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  formatPrice: (price: number) => string;
}

export default function InteractiveCalendar({
  appointments,
  barbers,
  services,
  config,
  clients = [],
  onUpdateAppointment,
  onCreateAppointment,
  formatPrice,
}: InteractiveCalendarProps) {
  // Calendar views: "day" | "week" | "month"
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  
  // Selected date anchor
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Barber filter for week/month views
  const [barberFilter, setBarberFilter] = useState<string>("all");

  // Dragged state for UI visual indicators
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  
  // Unified drag over indicator to support barber, date, and time
  const [dragOverCell, setDragOverCell] = useState<{ 
    barberId?: string; 
    date?: string; 
    time?: string; 
  } | null>(null);

  // Quick booking states
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickTime, setQuickTime] = useState("");
  const [quickBarberId, setQuickBarberId] = useState("");
  const [quickDate, setQuickDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [quickError, setQuickError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client search/autocomplete matching
  const matchedClientsByName = clientName.trim().length >= 2 && clients
    ? clients.filter(c => c.name.toLowerCase().includes(clientName.toLowerCase().trim()))
    : [];

  const matchedClientsByPhone = clientPhone.trim().length >= 3 && clients
    ? clients.filter(c => (c.phone || "").replace(/\D/g, "").includes(clientPhone.replace(/\D/g, "").trim()))
    : [];

  const matchedClients = Array.from(
    new Map([...matchedClientsByName, ...matchedClientsByPhone].map(c => [c.id, c])).values()
  );

  const selectedClientObj = clients?.find(c => 
    c.id === selectedClientId || 
    (c.phone && clientPhone && c.phone.replace(/\D/g, "") === clientPhone.replace(/\D/g, "")) ||
    (c.name && clientName && c.name.toLowerCase().trim() === clientName.toLowerCase().trim())
  );

  // Active barbers
  const activeBarbers = barbers.filter(b => b.isActive);

  // Generate hourly slots based on openTime, closeTime, and interval
  const timeSlots: string[] = [];
  const [openH, openM] = (config.openTime || "08:00").split(":").map(Number);
  const [closeH, closeM] = (config.closeTime || "20:00").split(":").map(Number);
  const safeOpenH = isNaN(openH) ? 8 : openH;
  const safeOpenM = isNaN(openM) ? 0 : openM;
  const safeCloseH = isNaN(closeH) ? 20 : closeH;
  const safeCloseM = isNaN(closeM) ? 0 : closeM;
  const interval = config.intervalMinutes && config.intervalMinutes >= 10 ? config.intervalMinutes : 30;

  let currentMinutes = safeOpenH * 60 + safeOpenM;
  const closeMinutes = safeCloseH * 60 + safeCloseM;

  while (currentMinutes < closeMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    timeSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    currentMinutes += interval;
  }

  // --- Week Days Calculator Helper ---
  const getWeekDays = (dateStr: string) => {
    const current = new Date(dateStr + "T12:00:00");
    const day = current.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(monday.getDate() + distanceToMonday);

    const days: { dateStr: string; label: string; dayName: string; dateObj: Date }[] = [];
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const fullDayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split("T")[0];
      days.push({
        dateStr: dStr,
        label: `${dayNames[i]} ${d.getDate()}`,
        dayName: fullDayNames[i],
        dateObj: d,
      });
    }
    return days;
  };

  // --- Month Days Calculator Helper (standard 35 or 42 grid cells) ---
  const getMonthDays = (dateStr: string) => {
    const current = new Date(dateStr + "T12:00:00");
    const year = current.getFullYear();
    const month = current.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week of first day (0 = Sun, 1 = Mon...)
    let firstDayIndex = firstDay.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Mon is 0

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Padding previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Padding next month
    const remaining = days.length % 7;
    if (remaining > 0) {
      const pad = 7 - remaining;
      for (let i = 1; i <= pad; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          dateStr: d.toISOString().split("T")[0],
          dayNum: i,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  };

  // Adjust date navigation based on active view mode
  const adjustDate = (amount: number) => {
    const date = new Date(selectedDate + "T12:00:00");
    if (viewMode === "day") {
      date.setDate(date.getDate() + amount);
    } else if (viewMode === "week") {
      date.setDate(date.getDate() + amount * 7);
    } else if (viewMode === "month") {
      date.setMonth(date.getMonth() + amount);
    }
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  // Human friendly labels
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

  const getWeekLabel = (dateStr: string) => {
    const days = getWeekDays(dateStr);
    const first = days[0].dateObj;
    const last = days[6].dateObj;
    return `Semana: ${first.getDate()}/${first.getMonth() + 1} al ${last.getDate()}/${last.getMonth() + 1}`;
  };

  const getMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Column headers for Day View (Sin Asignar + Active Barbers)
  const columnsDayView = [
    { id: "any", name: "Sin Asignar 📌", specialties: ["Todos"] },
    ...activeBarbers.map(b => ({ id: b.id, name: b.name, specialties: b.specialties || [] }))
  ];

  // --- Appointments Finders per View ---

  // Day View
  const getAppointmentAtDayCell = (barberId: string, time: string) => {
    return appointments.find(app => {
      if (app.date !== selectedDate || app.status === "canceled") return false;
      const appBarbId = app.barberId || "any";
      return appBarbId === barberId && app.time === time;
    });
  };

  // Week View
  const getAppointmentsAtWeekCell = (dateStr: string, time: string) => {
    return appointments.filter(app => {
      if (app.date !== dateStr || app.status === "canceled") return false;
      if (barberFilter !== "all") {
        const appBarbId = app.barberId || "any";
        if (appBarbId !== barberFilter) return false;
      }
      return app.time === time;
    });
  };

  // Month View
  const getAppointmentsForDayMonth = (dateStr: string) => {
    return appointments
      .filter(app => {
        if (app.date !== dateStr || app.status === "canceled") return false;
        if (barberFilter !== "all") {
          const appBarbId = app.barberId || "any";
          if (appBarbId !== barberFilter) return false;
        }
        return true;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, app: Appointment) => {
    setDraggedAppId(app.id);
    e.dataTransfer.setData("text/plain", app.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, cellInfo: { barberId?: string; date?: string; time?: string }) => {
    e.preventDefault();
    setDragOverCell(cellInfo);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  // Drop in Day View
  const handleDropDay = async (e: React.DragEvent, targetBarberId: string, targetTime: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain") || draggedAppId;
    handleDragEnd();

    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    const currentBarbId = app.barberId || "any";
    if (currentBarbId === targetBarberId && app.time === targetTime && app.date === selectedDate) return;

    try {
      const selectedB = barbers.find(b => b.id === targetBarberId);
      await onUpdateAppointment(appId, {
        barberId: targetBarberId === "any" ? undefined : targetBarberId,
        barberName: targetBarberId === "any" ? "Cualquier Barbero" : (selectedB?.name || "Barbero No Asignado"),
        time: targetTime,
        date: selectedDate,
        status: "confirmed"
      });
    } catch (err: any) {
      alert(err.message || "Conflicto de horario: Ese espacio ya está ocupado.");
    }
  };

  // Drop in Week View
  const handleDropWeek = async (e: React.DragEvent, targetDate: string, targetTime: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain") || draggedAppId;
    handleDragEnd();

    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    const targetBarberId = barberFilter === "all" ? (app.barberId || "any") : barberFilter;

    if (app.date === targetDate && app.time === targetTime && (app.barberId || "any") === targetBarberId) return;

    try {
      const selectedB = barbers.find(b => b.id === targetBarberId);
      await onUpdateAppointment(appId, {
        date: targetDate,
        time: targetTime,
        barberId: targetBarberId === "any" ? undefined : targetBarberId,
        barberName: targetBarberId === "any" ? "Cualquier Barbero" : (selectedB?.name || "Sin asignar"),
        status: "confirmed"
      });
    } catch (err: any) {
      alert(err.message || "Conflicto de horario: Ese espacio ya está ocupado.");
    }
  };

  // Drop in Month View
  const handleDropMonth = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData("text/plain") || draggedAppId;
    handleDragEnd();

    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    if (app.date === targetDate) return;

    try {
      await onUpdateAppointment(appId, {
        date: targetDate,
        status: "confirmed"
      });
    } catch (err: any) {
      alert(err.message || "Conflicto de horario.");
    }
  };

  // --- Click to Book Triggers ---

  const handleCellClickDay = (barberId: string, time: string) => {
    const existing = getAppointmentAtDayCell(barberId, time);
    if (existing) return;

    setQuickBarberId(barberId);
    setQuickTime(time);
    setQuickDate(selectedDate);
    setClientName("");
    setClientPhone("");
    setSelectedClientId("");
    setQuickError("");
    setShowQuickBook(true);
  };

  const handleCellClickWeek = (dateStr: string, time: string) => {
    const activeBarbId = barberFilter === "all" ? "any" : barberFilter;
    setQuickBarberId(activeBarbId);
    setQuickTime(time);
    setQuickDate(dateStr);
    setClientName("");
    setClientPhone("");
    setSelectedClientId("");
    setQuickError("");
    setShowQuickBook(true);
  };

  const handleCellClickMonth = (dateStr: string) => {
    // Standard calendar drill-down: Navigate to Day View for the clicked date
    setSelectedDate(dateStr);
    setViewMode("day");
  };

  // --- Form submission for walk-ins / manual booking ---
  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError("");
    setIsSubmitting(true);

    if (!clientName || !clientPhone) {
      setQuickError("Por favor ingresa nombre y celular.");
      setIsSubmitting(false);
      return;
    }

    try {
      const selectedBarb = barbers.find(b => b.id === quickBarberId);
      const res = await onCreateAppointment({
        clientName,
        clientPhone,
        serviceId: selectedServiceId,
        date: quickDate,
        time: quickTime,
        barberId: quickBarberId === "any" ? undefined : quickBarberId,
        barberName: quickBarberId === "any" ? "Cualquier Barbero" : (selectedBarb?.name || "Sin asignar"),
      });

      if (res && res.id) {
        await onUpdateAppointment(res.id, { status: "confirmed" });
      }

      setShowQuickBook(false);
    } catch (err: any) {
      setQuickError(err.message || "No se pudo crear la cita en este espacio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="interactive-schedule-board">
      {/* 1. Header controls, Views Switcher, and Nav */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-elegant-sub/20 p-4 rounded-3xl border border-elegant-border/50">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-elegant-gold animate-pulse" />
            Agenda Interactiva Multi-Vista
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Visualiza tu barbería por Día, Semana o Mes. Reagenda citas fácilmente arrastrándolas (Drag & Drop) en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Barber Filter Selector (visible in Week/Month to coordinate easily) */}
          {(viewMode === "week" || viewMode === "month") && (
            <div className="flex items-center gap-1.5 bg-elegant-sub/40 border border-elegant-border/80 p-1 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-elegant-text-muted font-sans pl-2.5 flex items-center gap-1">
                <Filter className="h-3 w-3 text-elegant-gold" />
                Filtrar:
              </span>
              <select
                value={barberFilter}
                onChange={(e) => setBarberFilter(e.target.value)}
                className="px-3 py-1 bg-elegant-bg text-white text-[11px] rounded-xl focus:outline-none focus:ring-1 focus:ring-elegant-gold h-8 cursor-pointer font-sans"
              >
                <option value="all">Todos los Barberos</option>
                {activeBarbers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* View switcher toggle buttons */}
          <div className="flex bg-elegant-sub border border-elegant-border p-1 rounded-2xl gap-1">
            <button 
              onClick={() => { setViewMode("day"); setDragOverCell(null); }} 
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'day' ? 'bg-elegant-gold text-elegant-bg shadow-sm' : 'text-elegant-text-muted hover:text-white'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Día
            </button>
            <button 
              onClick={() => { setViewMode("week"); setDragOverCell(null); }} 
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'week' ? 'bg-elegant-gold text-elegant-bg shadow-sm' : 'text-elegant-text-muted hover:text-white'}`}
            >
              <Grid className="h-3.5 w-3.5" />
              Semana
            </button>
            <button 
              onClick={() => { setViewMode("month"); setDragOverCell(null); }} 
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1 ${viewMode === 'month' ? 'bg-elegant-gold text-elegant-bg shadow-sm' : 'text-elegant-text-muted hover:text-white'}`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Mes
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1.5 bg-elegant-sub/60 border border-elegant-border p-1 rounded-2xl">
            <button 
              onClick={() => adjustDate(-1)}
              className="p-1.5 border border-elegant-border/40 bg-elegant-bg rounded-xl hover:bg-elegant-card active:scale-95 transition-all text-elegant-text cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1 text-white font-bold rounded-xl text-xs font-mono select-none text-center min-w-[130px] sm:min-w-[160px]">
              {viewMode === "day" && getDayLabel(selectedDate)}
              {viewMode === "week" && getWeekLabel(selectedDate)}
              {viewMode === "month" && getMonthLabel(selectedDate)}
            </span>
            <button 
              onClick={() => adjustDate(1)}
              className="p-1.5 border border-elegant-border/40 bg-elegant-bg rounded-xl hover:bg-elegant-card active:scale-95 transition-all text-elegant-text cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Info indicator */}
      <div className="p-3 bg-elegant-gold/10 border border-elegant-gold/20 text-elegant-gold rounded-2xl flex items-center gap-2 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-elegant-gold animate-pulse" />
        <p>
          {viewMode === "day" && (
            <span><strong>Modo Día:</strong> Columnas de barberos. Arrastra las citas para cambiar de barbero o de hora. Clic en espacio libre para agendar.</span>
          )}
          {viewMode === "week" && (
            <span><strong>Modo Semana:</strong> Columnas de lunes a domingo. Arrastra las citas para reprogramarlas de día u hora. Clic en espacio libre para agendar.</span>
          )}
          {viewMode === "month" && (
            <span><strong>Modo Mes:</strong> Calendario mensual. Arrastra citas de un día a otro para mover la fecha rápidamente. Clic en un día para desglosarlo.</span>
          )}
        </p>
      </div>

      {/* --- RENDER VIEW MODES --- */}

      {/* A. DAY VIEW */}
      {viewMode === "day" && (
        <div className="overflow-x-auto bg-elegant-card border border-elegant-border rounded-3xl shadow-sm">
          <div className="min-w-[800px]">
            {/* Columns Header (Barbers) */}
            <div className="grid grid-cols-12 border-b border-elegant-border bg-elegant-sub/60 divide-x divide-elegant-border text-center sticky top-0 z-10">
              <div className="col-span-2 p-3 text-xs font-extrabold uppercase tracking-wider text-elegant-text-muted flex items-center justify-center font-sans">
                Hora
              </div>
              {columnsDayView.map(col => (
                <div key={col.id} className="col-span-2 p-3 text-center space-y-0.5">
                  <span className="text-xs font-extrabold text-white block truncate font-sans">
                    {col.name}
                  </span>
                  <span className="text-[9px] text-elegant-text-muted block truncate font-mono">
                    {col.specialties.slice(0, 2).join(", ")}
                  </span>
                </div>
              ))}
            </div>

            {/* Rows (Time slots) */}
            <div className="divide-y divide-elegant-border select-none">
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-12 divide-x divide-elegant-border hover:bg-elegant-sub/10 transition-colors">
                  {/* Row Hour */}
                  <div className="col-span-2 py-5 px-3 flex items-center justify-center bg-elegant-sub/30 font-mono text-xs font-extrabold text-white">
                    <Clock className="h-3.5 w-3.5 mr-1.5 text-elegant-gold" />
                    {formatTime(time, config?.timeFormat)}
                  </div>

                  {/* Columns */}
                  {columnsDayView.map(col => {
                    const app = getAppointmentAtDayCell(col.id, time);
                    const isOver = dragOverCell?.barberId === col.id && dragOverCell?.time === time;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => handleDragOver(e, { barberId: col.id, time })}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropDay(e, col.id, time)}
                        onClick={() => handleCellClickDay(col.id, time)}
                        className={`col-span-2 p-2 min-h-[90px] relative transition-all duration-150 cursor-pointer flex flex-col justify-center ${
                          isOver 
                            ? "bg-elegant-gold/20 ring-2 ring-elegant-gold/40 ring-inset" 
                            : app 
                              ? "cursor-default" 
                              : "hover:bg-elegant-gold/5 group"
                        }`}
                      >
                        {app ? (
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, app)}
                            onDragEnd={handleDragEnd}
                            className={`p-2.5 rounded-xl border text-left shadow-xs transition-all active:scale-95 group relative select-none ${
                              app.status === "completed" 
                                ? "bg-blue-950/20 border-blue-900/40 text-blue-200" 
                                : app.status === "confirmed"
                                  ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                                  : "bg-elegant-gold/10 border-elegant-gold/40 text-white"
                            } ${draggedAppId === app.id ? "opacity-30 scale-95" : "hover:border-elegant-gold/70"}`}
                          >
                            <div className="absolute top-2.5 right-2 text-elegant-text-muted hover:text-white cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="space-y-1.5 pr-4">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-elegant-text-muted shrink-0" />
                                <p className="text-[11px] font-black tracking-tight leading-tight truncate">
                                  {app.clientName}
                                </p>
                              </div>
                              {app.isBirthdayBenefit && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold block truncate">
                                  🎂 Regalo Cumpleaños
                                </span>
                              )}
                              <p className="text-[10px] text-elegant-text-muted leading-tight line-clamp-1">
                                {app.serviceName}
                              </p>
                              <div className="flex items-center justify-between text-[9px] font-mono font-bold mt-1.5 pt-1.5 border-t border-elegant-border/20">
                                <span className="text-elegant-gold">{formatPrice(app.price)}</span>
                                <span className="text-elegant-text-muted">{app.duration}m</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="hidden group-hover:flex items-center justify-center text-center space-x-1.5 text-elegant-gold transition-all animate-fadeIn">
                            <Plus className="h-3.5 w-3.5 bg-elegant-gold/10 p-0.5 rounded-full" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Agendar</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* B. WEEK VIEW */}
      {viewMode === "week" && (
        <div className="overflow-x-auto bg-elegant-card border border-elegant-border rounded-3xl shadow-sm">
          <div className="min-w-[980px]">
            {/* Week days columns header */}
            <div className="grid border-b border-elegant-border bg-elegant-sub/60 divide-x divide-elegant-border text-center sticky top-0 z-10"
                 style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}>
              <div className="p-3.5 text-xs font-extrabold uppercase tracking-wider text-elegant-text-muted flex items-center justify-center font-sans">
                Hora
              </div>
              {getWeekDays(selectedDate).map(day => {
                const isToday = day.dateStr === new Date().toISOString().split("T")[0];
                return (
                  <div key={day.dateStr} className={`p-3 text-center space-y-0.5 ${isToday ? "bg-elegant-gold/5" : ""}`}>
                    <span className={`text-xs font-extrabold block truncate font-sans ${isToday ? "text-elegant-gold" : "text-white"}`}>
                      {day.label}
                    </span>
                    <span className="text-[9px] text-elegant-text-muted block truncate font-mono">
                      {day.dayName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Week grid body */}
            <div className="divide-y divide-elegant-border select-none">
              {timeSlots.map(time => (
                <div key={time} className="grid divide-x divide-elegant-border hover:bg-elegant-sub/10 transition-colors"
                     style={{ gridTemplateColumns: "100px repeat(7, 1fr)" }}>
                  
                  {/* Hour */}
                  <div className="py-6 px-3 flex items-center justify-center bg-elegant-sub/30 font-mono text-xs font-extrabold text-white">
                    <Clock className="h-3.5 w-3.5 mr-1 text-elegant-gold" />
                    {formatTime(time, config?.timeFormat)}
                  </div>

                  {/* Day cells */}
                  {getWeekDays(selectedDate).map(day => {
                    const apps = getAppointmentsAtWeekCell(day.dateStr, time);
                    const isOver = dragOverCell?.date === day.dateStr && dragOverCell?.time === time;
                    const isToday = day.dateStr === new Date().toISOString().split("T")[0];

                    return (
                      <div
                        key={day.dateStr}
                        onDragOver={(e) => handleDragOver(e, { date: day.dateStr, time })}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropWeek(e, day.dateStr, time)}
                        onClick={() => handleCellClickWeek(day.dateStr, time)}
                        className={`p-1.5 min-h-[100px] relative transition-all duration-150 cursor-pointer flex flex-col justify-start space-y-1 ${
                          isOver 
                            ? "bg-elegant-gold/20 ring-2 ring-elegant-gold/40 ring-inset" 
                            : apps.length > 0 
                              ? "cursor-default" 
                              : isToday 
                                ? "bg-elegant-gold/2 hover:bg-elegant-gold/5 group"
                                : "hover:bg-elegant-gold/5 group"
                        }`}
                      >
                        {apps.length > 0 ? (
                          apps.map(app => (
                            <div
                              key={app.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, app)}
                              onDragEnd={handleDragEnd}
                              className={`p-1.5 rounded-xl border text-left shadow-xs transition-all active:scale-95 group relative select-none text-[10px] ${
                                app.status === "completed" 
                                  ? "bg-blue-950/20 border-blue-900/40 text-blue-200" 
                                  : app.status === "confirmed"
                                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                                    : "bg-elegant-gold/10 border-elegant-gold/40 text-white"
                              } ${draggedAppId === app.id ? "opacity-30 scale-95" : "hover:border-elegant-gold/70"}`}
                            >
                              <div className="absolute top-1 right-1 text-elegant-text-muted hover:text-white cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                              </div>

                              <div className="space-y-1">
                                <p className="font-black leading-none truncate pr-2">
                                  {app.clientName}
                                </p>
                                <p className="text-[9px] text-elegant-text-muted leading-none truncate">
                                  {app.serviceName}
                                </p>
                                {barberFilter === "all" && (
                                  <div className="text-[8px] px-1 py-0.5 rounded bg-elegant-sub/60 text-elegant-gold border border-elegant-border/30 inline-block font-sans truncate max-w-full">
                                    💈 {app.barberName}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="hidden group-hover:flex items-center justify-center h-full text-center text-elegant-gold/60 transition-all">
                            <Plus className="h-4 w-4 bg-elegant-gold/10 p-0.5 rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* C. MONTH VIEW */}
      {viewMode === "month" && (
        <div className="bg-elegant-card border border-elegant-border rounded-3xl shadow-sm overflow-hidden select-none">
          {/* Calendar week header */}
          <div className="grid grid-cols-7 border-b border-elegant-border bg-elegant-sub/60 text-center">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(dayName => (
              <div key={dayName} className="p-3 text-xs font-extrabold uppercase tracking-wider text-elegant-text-muted font-sans">
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar cells grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-elegant-border bg-elegant-bg">
            {getMonthDays(selectedDate).map((day, idx) => {
              const dayApps = getAppointmentsForDayMonth(day.dateStr);
              const isOver = dragOverCell?.date === day.dateStr;
              const isToday = day.dateStr === new Date().toISOString().split("T")[0];
              const isSelected = day.dateStr === selectedDate;

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onDragOver={(e) => handleDragOver(e, { date: day.dateStr })}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropMonth(e, day.dateStr)}
                  onClick={() => handleCellClickMonth(day.dateStr)}
                  className={`min-h-[130px] p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                    day.isCurrentMonth ? "bg-elegant-bg" : "bg-elegant-sub/10"
                  } ${
                    isOver 
                      ? "bg-elegant-gold/20 ring-2 ring-elegant-gold/40 ring-inset" 
                      : isToday 
                        ? "bg-elegant-gold/2 border-elegant-gold/30 hover:bg-elegant-gold/5" 
                        : isSelected
                          ? "bg-neutral-900/60"
                          : "hover:bg-elegant-sub/20"
                  }`}
                >
                  {/* Day cell indicator header */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {dayApps.length > 0 ? `${dayApps.length} ${dayApps.length === 1 ? 'cita' : 'citas'}` : ""}
                    </span>
                    <span className={`h-6 w-6 flex items-center justify-center rounded-full text-xs font-mono font-bold ${
                      isToday 
                        ? "bg-elegant-gold text-elegant-bg" 
                        : isSelected
                          ? "bg-white text-black"
                          : day.isCurrentMonth 
                            ? "text-white" 
                            : "text-neutral-600"
                    }`}>
                      {day.dayNum}
                    </span>
                  </div>

                  {/* List of day appointments */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[85px] scrollbar-thin">
                    {dayApps.map(app => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering month cell click
                          setSelectedDate(day.dateStr);
                          setViewMode("day");
                        }}
                        className={`p-1 rounded-lg border text-left text-[9px] leading-tight select-none truncate font-semibold cursor-pointer relative group flex items-center justify-between gap-1 ${
                          app.status === "completed" 
                            ? "bg-blue-950/25 border-blue-900/30 text-blue-200" 
                            : app.status === "confirmed"
                              ? "bg-emerald-950/25 border-emerald-900/30 text-emerald-200"
                              : "bg-elegant-gold/10 border-elegant-gold/30 text-white hover:border-elegant-gold"
                        }`}
                      >
                        <span className="truncate">
                          <span className="font-mono font-bold text-elegant-gold mr-0.5">{formatTime(app.time, config?.timeFormat)}</span>
                          {app.clientName}
                        </span>
                        <GripVertical className="h-2.5 w-2.5 text-elegant-text-muted opacity-0 group-hover:opacity-60 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- QUICK BOOKING MODAL --- */}
      {showQuickBook && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <form 
            onSubmit={handleQuickBookSubmit}
            className="bg-elegant-card border border-elegant-border w-full max-w-md rounded-3xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex justify-between items-center border-b border-elegant-border pb-3">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-elegant-gold" />
                Agendar en Espacio Libre
              </h3>
              <button 
                type="button" 
                onClick={() => setShowQuickBook(false)}
                className="text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {quickError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl">
                {quickError}
              </p>
            )}

            <div className="bg-elegant-sub/50 p-3 rounded-2xl border border-elegant-border flex flex-col sm:flex-row justify-between text-xs font-mono gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] text-elegant-text-muted block font-sans">BARBERO</span>
                <span className="text-white font-bold">
                  {quickBarberId === "any" ? "Cualquier Barbero (Sin asignar)" : (barbers.find(b => b.id === quickBarberId)?.name || "Cualquier Barbero")}
                </span>
              </div>
              <div className="sm:text-right space-y-0.5">
                <span className="text-[10px] text-elegant-text-muted block font-sans">HORARIO & FECHA SELECCIONADA</span>
                <span className="text-elegant-gold font-bold">{quickTime} | {quickDate}</span>
              </div>
            </div>

            {/* Client Selector Dropdown */}
            {clients && clients.length > 0 && (
              <div className="space-y-1 bg-elegant-gold/10 border border-elegant-gold/20 p-2.5 rounded-2xl">
                <label className="text-[10px] font-extrabold text-elegant-gold uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-elegant-gold" />
                    Seleccionar Cliente Registrado
                  </span>
                  <span className="text-[9px] text-elegant-text-muted font-normal font-mono">
                    ({clients.length} disponibles)
                  </span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setSelectedClientId(selectedId);
                    const found = clients.find(c => c.id === selectedId);
                    if (found) {
                      setClientName(found.name);
                      setClientPhone(found.phone || "");
                    } else {
                      setClientName("");
                      setClientPhone("");
                    }
                  }}
                  className="w-full px-3 py-2 border border-elegant-gold/40 rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-black/60 text-white h-9 cursor-pointer"
                >
                  <option value="">-- Buscar o elegir cliente de la lista --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""} {(c.pendingPenalty || 0) > 0 ? "⚠️ [MULTA PENDIENTE]" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pending Penalty Badge if client has penalty */}
            {selectedClientObj && (selectedClientObj.pendingPenalty || 0) > 0 && (
              <div className="bg-rose-950/80 border border-rose-800 p-2.5 rounded-xl flex items-center justify-between text-xs text-rose-200">
                <span className="font-bold flex items-center gap-1.5 text-[10px] uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  Inasistencia previa - Multa incluida:
                </span>
                <span className="font-black text-rose-300 font-mono">
                  +{formatPrice(selectedClientObj.pendingPenalty || 0)}
                </span>
              </div>
            )}

            {/* Client Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Nombre del Cliente *</label>
              <input 
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (selectedClientId) setSelectedClientId("");
                }}
                placeholder="Ej. Carlos Ortiz"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            {/* Client Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Teléfono de Contacto *</label>
              <input 
                type="text"
                required
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(e.target.value);
                  if (selectedClientId) setSelectedClientId("");
                }}
                placeholder="Ej. +57 300 123 4567"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            {/* Autocomplete Suggestions if matching clients are found while typing */}
            {matchedClients.length > 0 && (!selectedClientId || (selectedClientObj?.name !== clientName)) && (
              <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl p-2 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 block px-1">
                  💡 Clientes registrados coincidentes ({matchedClients.length}):
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {matchedClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClientName(c.name);
                        setClientPhone(c.phone || "");
                        setSelectedClientId(c.id);
                      }}
                      className="w-full text-left p-1.5 hover:bg-neutral-800 rounded-lg text-xs flex items-center justify-between transition-colors border border-neutral-800 cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{c.phone || "Sin teléfono"}</span>
                      </div>
                      {(c.pendingPenalty || 0) > 0 ? (
                        <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                          Multa +{formatPrice(c.pendingPenalty || 0)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                          Seleccionar
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Corte / Servicio Requerido *</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10 cursor-pointer"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} min - {formatPrice(s.price)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-elegant-border/30">
              <button 
                type="button"
                onClick={() => setShowQuickBook(false)}
                className="px-4 py-2 border border-elegant-border bg-elegant-sub hover:bg-elegant-card text-elegant-text rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Agendando..." : "Confirmar Cita"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
