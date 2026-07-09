import React, { useState } from "react";
import { Appointment, Barber, Service, SalonConfig } from "../types";
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
  Plus
} from "lucide-react";

interface InteractiveCalendarProps {
  appointments: Appointment[];
  barbers: Barber[];
  services: Service[];
  config: SalonConfig;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  formatPrice: (price: number) => string;
}

export default function InteractiveCalendar({
  appointments,
  barbers,
  services,
  config,
  onUpdateAppointment,
  onCreateAppointment,
  formatPrice,
}: InteractiveCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // Dragged state for UI visual indicators
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ barberId: string; time: string } | null>(null);

  // Quick booking state
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickTime, setQuickTime] = useState("");
  const [quickBarberId, setQuickBarberId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [quickError, setQuickError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate hourly slots based on openTime, closeTime, and interval
  const timeSlots: string[] = [];
  const startHour = parseInt(config.openTime.split(":")[0]) || 9;
  const endHour = parseInt(config.closeTime.split(":")[0]) || 20;
  const interval = config.intervalMinutes || 30;

  for (let h = startHour; h < endHour; h++) {
    const hourStr = h.toString().padStart(2, "0");
    if (interval === 30) {
      timeSlots.push(`${hourStr}:00`);
      timeSlots.push(`${hourStr}:30`);
    } else if (interval === 15) {
      timeSlots.push(`${hourStr}:00`);
      timeSlots.push(`${hourStr}:15`);
      timeSlots.push(`${hourStr}:30`);
      timeSlots.push(`${hourStr}:45`);
    } else {
      timeSlots.push(`${hourStr}:00`);
    }
  }

  // Active barbers (columns)
  const activeBarbers = barbers.filter(b => b.isActive);
  // Column options: "any" (Unassigned) + all active barbers
  const columns = [
    { id: "any", name: "Sin Asignar 📌", specialties: ["Todos"] },
    ...activeBarbers.map(b => ({ id: b.id, name: b.name, specialties: b.specialties || [] }))
  ];

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

  // Find appointment matching date, time and barberId
  const getAppointmentAt = (barberId: string, time: string) => {
    return appointments.find(app => {
      if (app.date !== selectedDate || app.status === "canceled") return false;
      const appBarbId = app.barberId || "any";
      // Convert barber ID matching
      return appBarbId === barberId && app.time === time;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, app: Appointment) => {
    setDraggedAppId(app.id);
    e.dataTransfer.setData("text/plain", app.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, barberId: string, time: string) => {
    e.preventDefault();
    setDragOverCell({ barberId, time });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, targetBarberId: string, targetTime: string) => {
    e.preventDefault();
    const appPieceId = e.dataTransfer.getData("text/plain");
    const appId = appPieceId || draggedAppId;
    
    setDragOverCell(null);
    setDraggedAppId(null);

    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    // Avoid updating if dropped onto its original slot
    const currentBarbId = app.barberId || "any";
    if (currentBarbId === targetBarberId && app.time === targetTime) return;

    try {
      const selectedB = barbers.find(b => b.id === targetBarberId);
      await onUpdateAppointment(appId, {
        barberId: targetBarberId === "any" ? undefined : targetBarberId,
        barberName: targetBarberId === "any" ? "Cualquier Barbero" : (selectedB?.name || "Barbero No Asignado"),
        time: targetTime,
        date: selectedDate,
        status: "confirmed" // Auto-confirm on drag-drop rescheduling
      });
    } catch (err: any) {
      alert(err.message || "Conflicto de horario: Ese espacio ya está ocupado.");
    }
  };

  const handleCellClick = (barberId: string, time: string) => {
    const existing = getAppointmentAt(barberId, time);
    if (existing) return; // Clicking on existing appointment does nothing

    setQuickBarberId(barberId);
    setQuickTime(time);
    setClientName("");
    setClientPhone("");
    setQuickError("");
    setShowQuickBook(true);
  };

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
        date: selectedDate,
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
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-elegant-gold" />
            Agenda Visual Interactiva (Drag & Drop)
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Organiza la agenda diaria de forma visual. Arrastra y suelta (Drag & Drop) las citas para reasignarlas a otro barbero o cambiar su hora en tiempo real.
          </p>
        </div>

        {/* Date Selector Navigation */}
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
        </div>
      </div>

      {/* Walk-in slot info helper */}
      <div className="p-3 bg-elegant-gold/10 border border-elegant-gold/20 text-elegant-gold rounded-xl flex items-center gap-2 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-elegant-gold animate-pulse" />
        <p>
          <strong>Consejo rápido:</strong> Arrastra cualquier tarjeta de cita hacia otra celda de barbero o hacia otra hora para reagendarla al instante. Haz clic en una celda vacía para agendar una cita manual directamente en ese horario.
        </p>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto bg-elegant-card border border-elegant-border rounded-3xl shadow-sm">
        <div className="min-w-[800px]">
          {/* Columns Header (Barbers) */}
          <div className="grid grid-cols-12 border-b border-elegant-border bg-elegant-sub/60 divide-x divide-elegant-border text-center sticky top-0 z-10">
            {/* Hour label corner */}
            <div className="col-span-2 p-3 text-xs font-extrabold uppercase tracking-wider text-elegant-text-muted flex items-center justify-center">
              Hora
            </div>
            {/* Barber Columns */}
            {columns.map(col => (
              <div key={col.id} className="col-span-2 p-3 text-center space-y-0.5">
                <span className="text-xs font-extrabold text-white block truncate">
                  {col.name}
                </span>
                <span className="text-[9px] text-elegant-text-muted block truncate font-mono">
                  {col.specialties.slice(0, 2).join(", ")}
                </span>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-elegant-border select-none">
            {timeSlots.map(time => (
              <div key={time} className="grid grid-cols-12 divide-x divide-elegant-border hover:bg-elegant-sub/10 transition-colors">
                {/* Row Hour Label */}
                <div className="col-span-2 py-5 px-3 flex items-center justify-center bg-elegant-sub/30 font-mono text-xs font-extrabold text-white">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-elegant-gold" />
                  {time}
                </div>

                {/* Barber Cells */}
                {columns.map(col => {
                  const app = getAppointmentAt(col.id, time);
                  const isOver = dragOverCell?.barberId === col.id && dragOverCell?.time === time;

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => handleDragOver(e, col.id, time)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.id, time)}
                      onClick={() => handleCellClick(col.id, time)}
                      className={`col-span-2 p-2 min-h-[90px] relative transition-all duration-150 cursor-pointer flex flex-col justify-center ${
                        isOver 
                          ? "bg-elegant-gold/20 ring-2 ring-elegant-gold/40 ring-inset" 
                          : app 
                            ? "cursor-default" 
                            : "hover:bg-elegant-gold/5 group"
                      }`}
                    >
                      {app ? (
                        /* Draggable Appointment Card */
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
                          {/* Drag handle */}
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
                        /* Empty state interactive indicator */
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

      {/* Quick Booking modal overlay */}
      {showQuickBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
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

            <div className="bg-elegant-sub/50 p-3 rounded-2xl border border-elegant-border flex justify-between text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[10px] text-elegant-text-muted block font-sans">BARBERO</span>
                <span className="text-white font-bold">
                  {quickBarberId === "any" ? "Cualquier Barbero (Sin asignar)" : (barbers.find(b => b.id === quickBarberId)?.name || "")}
                </span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] text-elegant-text-muted block font-sans">HORARIO SELECCIONADO</span>
                <span className="text-elegant-gold font-bold">{quickTime} (Hoy)</span>
              </div>
            </div>

            {/* Client Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Nombre del Cliente *</label>
              <input 
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
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
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ej. +57 300 123 4567"
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
              />
            </div>

            {/* Service Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Corte / Servicio Requerido *</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
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
