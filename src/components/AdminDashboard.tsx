import React, { useState, useEffect } from "react";
import AutoReagendaModal from "./AutoReagendaModal";
import { 
  Appointment, 
  Service, 
  SalonConfig, 
  AppointmentStatus,
  DashboardStats,
  Barber,
  ClientAccount,
  InventoryItem
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
  Bell,
  Megaphone,
  AlertTriangle,
  Wine,
  UserX
} from "lucide-react";

interface AdminDashboardProps {
  appointments: Appointment[];
  services: Service[];
  config: SalonConfig;
  onUpdateConfig?: (updates: Partial<SalonConfig>) => Promise<any>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onDeleteAppointment: (id: string) => Promise<any>;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  formatPrice: (price: number) => string;
  isBarberView?: boolean;
  loggedBarberId?: string;
  barbers?: Barber[];
  onUpdateBarber?: (id: string, updates: Partial<Barber>) => Promise<any>;
  clients?: ClientAccount[];
  onUpdateClient?: (id: string, updates: Partial<ClientAccount>) => Promise<any>;
  announcements?: any[];
  inventory?: InventoryItem[];
  onRefresh?: () => void;
  onOpenModoSilla?: () => void;
}

export default function AdminDashboard({
  appointments,
  services,
  config,
  onUpdateConfig,
  onUpdateAppointment,
  onDeleteAppointment,
  onCreateAppointment,
  formatPrice,
  isBarberView = false,
  loggedBarberId,
  barbers = [],
  onUpdateBarber,
  clients = [],
  onUpdateClient,
  announcements = [],
  inventory = [],
  onRefresh,
  onOpenModoSilla,
}: AdminDashboardProps) {
  // States
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] // Current local date e.g. YYYY-MM-DD
  );
  const [activeSubmodule, setActiveSubmodule] = useState<"agenda" | "caja" | "multas" | "bloqueos" | "all">("agenda");
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);
  const [showPenaltiesModal, setShowPenaltiesModal] = useState<boolean>(false);
  const [waivingPenaltyClientId, setWaivingPenaltyClientId] = useState<string | null>(null);
  const [editPenaltyVal, setEditPenaltyVal] = useState<number>(config?.noShowPenaltyAmount !== undefined ? config.noShowPenaltyAmount : 10000);
  const [isSavingPenaltyVal, setIsSavingPenaltyVal] = useState(false);
  const [penaltySavedToast, setPenaltySavedToast] = useState(false);

  useEffect(() => {
    if (config?.noShowPenaltyAmount !== undefined) {
      setEditPenaltyVal(config.noShowPenaltyAmount);
    }
  }, [config?.noShowPenaltyAmount]);

  // Quick consumption on appointment
  const [addingConsumptionAppId, setAddingConsumptionAppId] = useState<string | null>(null);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>("");
  const [selectedConsumptionQty, setSelectedConsumptionQty] = useState<number>(1);
  const [isAddingConsumption, setIsAddingConsumption] = useState<boolean>(false);

  // Auto Reagenda Modal
  const [showAutoReagenda, setShowAutoReagenda] = useState<boolean>(false);
  const [autoReagendaApp, setAutoReagendaApp] = useState<Appointment | null>(null);
  const [autoReagendaClient, setAutoReagendaClient] = useState<ClientAccount | null>(null);

  const handleCompleteAppointmentWithReagenda = async (app: Appointment, paymentMethod: "efectivo" | "transferencia" | "nequi_daviplata" | "tarjeta") => {
    try {
      await onUpdateAppointment(app.id, { status: "completed", paymentMethod });
      
      const matchedClient = (clients || []).find(c => 
        (c.phone && app.clientPhone && c.phone.replace(/\s+/g, '') === app.clientPhone.replace(/\s+/g, '')) ||
        (c.name && app.clientName && c.name.toLowerCase().trim() === app.clientName.toLowerCase().trim())
      ) || null;

      setAutoReagendaApp(app);
      setAutoReagendaClient(matchedClient);
      setShowAutoReagenda(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddConsumption = async (appointmentId: string) => {
    if (!selectedInventoryItemId) return;
    setIsAddingConsumption(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/add-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedInventoryItemId,
          quantity: selectedConsumptionQty
        })
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
      setAddingConsumptionAppId(null);
      setSelectedInventoryItemId("");
      setSelectedConsumptionQty(1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingConsumption(false);
    }
  };

  const handleRemoveConsumption = async (appointmentId: string, index: number) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/remove-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumptionIndex: index })
      });
      if (res.ok && onRefresh) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Global Announcements State
  const [localAnnouncements, setLocalAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data.announcements) {
            setLocalAnnouncements(data.announcements);
          }
        }
      } catch (e) {
        console.warn("No se pudieron obtener anuncios globales en AdminDashboard:", e);
      }
    };
    fetchAnnouncements();
  }, []);

  // Merged active announcements
  const allAnnouncementsList = announcements.length > 0 ? announcements : localAnnouncements;
  const visibleAnnouncements = allAnnouncementsList.filter(
    (a) => a.active !== false && (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now()) && !dismissedAnnouncements.includes(a.id)
  );

  // Walk-in booking state
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInDate, setWalkInDate] = useState(selectedDate);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
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

  // Counts of visible appointments for the selected date to keep the dashboard metrics aligned with the agenda below
  const selectedDateTotalActive = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (a.status === "canceled") return false;
    if (isBarberView) {
      return a.barberId === loggedBarberId || !a.barberId || a.barberId === "any";
    }
    return true;
  }).length;

  const selectedDatePendingCount = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (isBarberView) {
      return a.barberId === loggedBarberId || !a.barberId || a.barberId === "any";
    }
    return true;
  }).filter(a => a.status === "pending").length;

  const selectedDateConfirmedCount = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (isBarberView) {
      return a.barberId === loggedBarberId || !a.barberId || a.barberId === "any";
    }
    return true;
  }).filter(a => a.status === "confirmed").length;

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

  // Daily Cash Module calculations for SELECTED DATE (completed only)
  const selectedDateCompletedApps = relevantAppointmentsForStats.filter(
    (a) => a.date === selectedDate && a.status === "completed"
  );
  const cashIncome = selectedDateCompletedApps
    .filter((a) => (a.paymentMethod || "efectivo") === "efectivo")
    .reduce((sum, app) => sum + app.price, 0);
  const transferIncome = selectedDateCompletedApps
    .filter((a) => a.paymentMethod === "transferencia")
    .reduce((sum, app) => sum + app.price, 0);
  const totalCajaCompleted = cashIncome + transferIncome;

  // Clients auto-complete match lists for manual walk-in form
  const matchedByName = walkInName.trim().length >= 2
    ? clients.filter(c => 
        c.name.toLowerCase().includes(walkInName.toLowerCase()) ||
        (c.phone && c.phone.includes(walkInName))
      )
    : [];

  const matchedByPhone = walkInPhone.trim().length >= 2
    ? clients.filter(c => 
        (c.phone && c.phone.includes(walkInPhone)) ||
        c.name.toLowerCase().includes(walkInPhone.toLowerCase())
      )
    : [];

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
        date: walkInDate,
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
      {/* Global Broadcast Announcements for Admin & Barbers */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-3" id="global-announcements-banner">
          {visibleAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 md:p-5 rounded-2xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-all ${
                ann.type === "alert"
                  ? "bg-rose-950/90 border-rose-600/70 text-rose-100 shadow-rose-950/30"
                  : ann.type === "warning"
                  ? "bg-amber-950/90 border-amber-600/70 text-amber-100 shadow-amber-950/30"
                  : ann.type === "success"
                  ? "bg-emerald-950/90 border-emerald-600/70 text-emerald-100 shadow-emerald-950/30"
                  : "bg-sky-950/90 border-sky-600/70 text-sky-100 shadow-sky-950/30"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-white/10 rounded-2xl shrink-0 mt-0.5 border border-white/10">
                  <Megaphone className="h-6 w-6 text-amber-400 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/15 tracking-wider border border-white/20">
                      {ann.type === "alert" ? "🚨 Alerta Urgente" : ann.type === "warning" ? "⚠️ Advertencia" : ann.type === "success" ? "🎉 Novedad Plataforma" : "📢 Comunicado Oficial"}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      {new Date(ann.createdAt || Date.now()).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-sm md:text-base font-extrabold text-white tracking-tight">{ann.title}</h4>
                  <p className="text-xs md:text-sm opacity-90 leading-relaxed font-normal">{ann.message}</p>
                </div>
              </div>
              <button
                onClick={() => setDismissedAnnouncements(prev => [...prev, ann.id])}
                className="self-end sm:self-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Descartar anuncio"
              >
                <X className="h-4 w-4" />
                <span>Entendido</span>
              </button>
            </div>
          ))}
        </div>
      )}

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

      {/* Selector Navegación de Submódulos Administrativos */}
      <div className="bg-elegant-card border border-elegant-border rounded-2xl p-2.5 shadow-md" id="admin-submodules-bar">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none max-w-full py-0.5">
            <button
              type="button"
              onClick={() => setActiveSubmodule("agenda")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubmodule === "agenda"
                  ? "bg-amber-500 text-black shadow-md font-extrabold"
                  : "bg-elegant-sub text-elegant-text-muted hover:text-white hover:bg-elegant-border"
              }`}
            >
              <Scissors className="h-4 w-4" />
              <span>Agenda Diaria</span>
              <span className="ml-1 text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono font-bold">
                {selectedDateTotalActive}
              </span>
            </button>

            {!isBarberView && (
              <button
                type="button"
                onClick={() => setActiveSubmodule("caja")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubmodule === "caja"
                    ? "bg-emerald-500 text-black shadow-md font-extrabold"
                    : "bg-elegant-sub text-elegant-text-muted hover:text-white hover:bg-elegant-border"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Caja & Balance</span>
                <span className="ml-1 text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  {formatPrice(totalCajaCompleted)}
                </span>
              </button>
            )}

            {!isBarberView && (
              <button
                type="button"
                onClick={() => setActiveSubmodule("multas")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubmodule === "multas"
                    ? "bg-rose-600 text-white shadow-md font-extrabold"
                    : "bg-elegant-sub text-elegant-text-muted hover:text-white hover:bg-elegant-border"
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-rose-300" />
                <span>Multas & Sanciones</span>
                {(clients || []).filter(c => (c.pendingPenalty || 0) > 0).length > 0 && (
                  <span className="ml-1 text-[10px] bg-rose-950 text-rose-200 border border-rose-700/60 px-2 py-0.5 rounded-full font-mono font-bold">
                    {(clients || []).filter(c => (c.pendingPenalty || 0) > 0).length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubmodule("bloqueos")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubmodule === "bloqueos"
                  ? "bg-cyan-600 text-white shadow-md font-extrabold"
                  : "bg-elegant-sub text-elegant-text-muted hover:text-white hover:bg-elegant-border"
              }`}
            >
              <CalendarIcon className="h-4 w-4 text-cyan-200" />
              <span>Bloqueo & Horarios</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveSubmodule(activeSubmodule === "all" ? "agenda" : "all")}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
              activeSubmodule === "all"
                ? "bg-elegant-gold text-black border-elegant-gold font-extrabold"
                : "bg-elegant-sub text-elegant-text-muted border-elegant-border hover:text-white"
            }`}
            title="Alternar entre submódulo enfocado o vista completa"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{activeSubmodule === "all" ? "Vista Enfocada" : "Vista Completa"}</span>
          </button>
        </div>
      </div>

      {/* Módulo de Bloqueo de Agenda para Barberos (Sickness / Descanso) */}
      {(activeSubmodule === "bloqueos" || activeSubmodule === "all") && isBarberView && loggedBarberId && (
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

                  {/* Divider */}
                  <div className="border-t border-elegant-border/60 my-4 pt-4"></div>

                  {/* Hourly Time Blocks Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 bg-amber-950/40 text-elegant-gold rounded-lg">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">🕒 Bloqueo por Horas (Almuerzo / Descanso)</h4>
                        <p className="text-[10px] text-elegant-text-muted">Bloquea un rango de horas específico de un día para descansar, almorzar o atender un asunto personal.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold uppercase text-elegant-text-muted">Fecha:</label>
                        <input
                          type="date"
                          id="barber-block-time-date"
                          defaultValue={new Date().toISOString().split("T")[0]}
                          className="px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold uppercase text-elegant-text-muted">Desde:</label>
                        <input
                          type="time"
                          id="barber-block-time-start"
                          defaultValue="13:00"
                          className="px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold uppercase text-elegant-text-muted">Hasta:</label>
                        <input
                          type="time"
                          id="barber-block-time-end"
                          defaultValue="14:00"
                          className="px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold uppercase text-elegant-text-muted">Motivo:</label>
                        <select
                          id="barber-block-time-reason"
                          className="px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                        >
                          <option value="Almuerzo">🍽️ Almuerzo</option>
                          <option value="Descanso">☕ Descanso</option>
                          <option value="Asunto Personal">💼 Personal</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const dateEl = document.getElementById("barber-block-time-date") as HTMLInputElement;
                        const startEl = document.getElementById("barber-block-time-start") as HTMLInputElement;
                        const endEl = document.getElementById("barber-block-time-end") as HTMLInputElement;
                        const reasonEl = document.getElementById("barber-block-time-reason") as HTMLSelectElement;

                        if (dateEl && dateEl.value && startEl && startEl.value && endEl && endEl.value) {
                          const dateVal = dateEl.value;
                          const startVal = startEl.value;
                          const endVal = endEl.value;
                          const reasonVal = reasonEl ? reasonEl.value : "Descanso";

                          if (startVal >= endVal) {
                            alert("La hora de inicio debe ser menor que la hora de fin.");
                            return;
                          }

                          const currentBlocks = selfBarber.timeBlocks || [];
                          const newBlock = {
                            id: "tb_" + Date.now(),
                            date: dateVal,
                            startTime: startVal,
                            endTime: endVal,
                            reason: reasonVal
                          };

                          const updated = [...currentBlocks, newBlock];
                          if (onUpdateBarber) {
                            await onUpdateBarber(selfBarber.id, { timeBlocks: updated });
                          }
                        }
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>⏱️ Bloquear Rango de Horas</span>
                    </button>

                    {selfBarber.timeBlocks && selfBarber.timeBlocks.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <p className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Tus Horas Bloqueadas Activas:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selfBarber.timeBlocks.map((block: any) => (
                            <div
                              key={block.id}
                              className="text-[11px] bg-elegant-sub border border-elegant-border/80 text-white p-3 rounded-2xl flex items-center justify-between"
                            >
                              <div className="text-left">
                                <span className="font-bold text-white block">{block.reason}</span>
                                <span className="text-[10px] text-elegant-text-muted font-mono">
                                  📅 {block.date} | 🕒 {block.startTime} a {block.endTime}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  const updated = (selfBarber.timeBlocks || []).filter((b: any) => b.id !== block.id);
                                  if (onUpdateBarber) {
                                    await onUpdateBarber(selfBarber.id, { timeBlocks: updated });
                                  }
                                }}
                                className="p-1 bg-rose-950/50 hover:bg-rose-900 border border-rose-900/40 hover:border-rose-700 text-rose-400 rounded-lg hover:text-white transition-colors text-xs font-black px-2.5 cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-elegant-text-muted italic">No tienes rangos de horas bloqueadas.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()
      )}

      {/* Grid de Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total ingresos */}
        <div className="bg-elegant-card border border-elegant-border p-3.5 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-income">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ingresos Confirmados</span>
            <div className="p-1.5 bg-elegant-gold/20 rounded-lg text-elegant-gold">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-bold font-sans text-white">
              {formatPrice(stats.totalIncome)}
            </span>
            <p className="text-[9px] text-elegant-text-muted mt-0.5">Citas activas y completadas</p>
          </div>
        </div>

        {/* Citas de Hoy */}
        <div className="bg-elegant-card border border-elegant-border p-3.5 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-today">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Citas Hoy ({getDayLabel(selectedDate)})</span>
            <div className="p-1.5 bg-blue-950/40 rounded-lg text-blue-400">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-bold font-sans text-white">
              {selectedDateTotalActive}
            </span>
            <p className="text-[9px] text-elegant-text-muted mt-0.5">
              Estimado hoy: <strong className="text-elegant-gold font-mono">{formatPrice(selectedDateIncome)}</strong>
            </p>
          </div>
        </div>

        {/* Pendientes por confirmar */}
        <div className="bg-elegant-card border border-elegant-border p-3.5 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-pending">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Por Confirmar</span>
            <div className="p-1.5 bg-rose-950/40 rounded-lg text-rose-400 relative">
              <Bell className="h-4 w-4 animate-swing" />
              {stats.pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold" title="Total pendientes global">
                  {stats.pendingCount}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-bold font-sans text-white">
              {selectedDatePendingCount}
            </span>
            <p className="text-[9px] text-elegant-text-muted mt-0.5">Solicitadas por clientes</p>
          </div>
        </div>

        {/* Confirmadas activas */}
        <div className="bg-elegant-card border border-elegant-border p-3.5 rounded-2xl flex flex-col justify-between shadow-xs" id="metric-confirmed">
          <div className="flex items-center justify-between text-elegant-text-muted">
            <span className="text-[10px] font-bold uppercase tracking-wider">Confirmadas</span>
            <div className="p-1.5 bg-emerald-950/40 rounded-lg text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-bold font-sans text-white">
              {selectedDateConfirmedCount}
            </span>
            <p className="text-[9px] text-elegant-text-muted mt-0.5">Agendadas activas</p>
          </div>
        </div>

        {/* KPI Multas y Control de Inasistencias */}
        {(() => {
          const pendingPenaltiesTotal = (clients || []).reduce((sum, c) => sum + (c.pendingPenalty || 0), 0);
          const clientsWithPenaltiesCount = (clients || []).filter(c => (c.pendingPenalty || 0) > 0).length;

          // Calculate penalties collected in appointments or history
          const collectedFromAppointments = (appointments || []).reduce((sum, a) => {
            if (a.notes && (
              a.notes.toLowerCase().includes("recaudo de multa") || 
              a.notes.toLowerCase().includes("multa por inasistencia") ||
              a.notes.toLowerCase().includes("inasistencia previa") ||
              a.notes.toLowerCase().includes("multa")
            )) {
              const match = a.notes.match(/\$([\d.,]+)/);
              if (match) {
                const val = parseInt(match[1].replace(/\D/g, ""), 10);
                return sum + (isNaN(val) ? 10000 : val);
              }
              return sum + 10000;
            }
            return sum;
          }, 0);

          const collectedFromClientHistory = (clients || []).reduce((sum, c) => {
            if (!c.penaltyHistory) return sum;
            return sum + c.penaltyHistory.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 10000), 0);
          }, 0);

          const collectedPenaltiesTotal = Math.max(collectedFromAppointments, collectedFromClientHistory);

          // Count total recorded no-shows / penalties strictly from canceled appointments or client penalty history
          const apptInasistencias = (appointments || []).filter(a => 
            a.status === "canceled" && (
              a.notes?.toLowerCase().includes("inasistencia") || 
              a.notes?.toLowerCase().includes("no asistió") || 
              a.notes?.toLowerCase().includes("no asistio") ||
              a.notes?.toLowerCase().includes("multa")
            )
          ).length;

          const clientPenaltyRecordsCount = (clients || []).reduce((sum, c) => sum + (c.penaltyHistory?.length || 0), 0);

          const noShowsCount = Math.max(apptInasistencias, clientPenaltyRecordsCount);

          const displayAmount = pendingPenaltiesTotal > 0 ? pendingPenaltiesTotal : collectedPenaltiesTotal;
          const displayLabel = pendingPenaltiesTotal > 0 
            ? "Pendientes por cobro" 
            : (collectedPenaltiesTotal > 0 ? "Multas Recaudadas" : "Pendientes por cobro");

          return (
            <div className="bg-gradient-to-br from-rose-950/50 to-elegant-card border border-rose-800/60 p-3.5 rounded-2xl flex flex-col justify-between shadow-xs col-span-2 md:col-span-1" id="metric-penalties">
              <div className="flex items-center justify-between text-rose-300">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                  🚨 Multas & Señas
                </span>
                <div className={`p-1 rounded font-mono text-[9px] font-bold ${
                  clientsWithPenaltiesCount > 0 ? "bg-rose-900/80 text-rose-200 border border-rose-700" : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                }`}>
                  {clientsWithPenaltiesCount} Cli.
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <span className={`text-lg md:text-xl font-black font-mono block ${pendingPenaltiesTotal > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  ${pendingPenaltiesTotal.toLocaleString()} COP
                </span>
                <div className="text-[9px] text-rose-300/80 flex justify-between font-mono">
                  <span>{pendingPenaltiesTotal > 0 ? "Pendientes por cobro" : "Sin multas pendientes"}</span>
                  <span>Clientes multados: <strong>{clientsWithPenaltiesCount}</strong></span>
                </div>
                {collectedPenaltiesTotal > 0 && (
                  <div className="text-[8px] text-emerald-400/90 font-mono text-right pt-0.5 border-t border-rose-900/40">
                    Histórico Recaudado: ${collectedPenaltiesTotal.toLocaleString()} COP
                  </div>
                )}
                <button
                  onClick={() => setShowPenaltiesModal(true)}
                  className="mt-2 w-full py-1.5 px-2 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-extrabold text-[10px] rounded-xl transition-all border border-rose-600/70 flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  title="Abrir panel para exonerar o gestionar multas por inasistencia"
                >
                  <Sparkles className="h-3 w-3 text-rose-300" />
                  <span>Exonerar / Gestionar Multas</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Módulo de Caja Diaria (Only for Admin) */}
      {!isBarberView && (activeSubmodule === "caja" || activeSubmodule === "all") && (
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 shadow-xs space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-elegant-border/60 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-sans uppercase tracking-wider">
                <span>💼 Módulo de Caja Diaria</span>
                <span className="text-[10px] bg-elegant-gold/15 text-elegant-gold px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border border-elegant-gold/20 font-mono">
                  {selectedDate.split("-").reverse().join("/")}
                </span>
              </h3>
              <p className="text-[11px] text-elegant-text-muted mt-0.5">
                Cierre de caja y flujos de dinero real para los servicios completados en esta fecha.
              </p>
            </div>
            
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-elegant-text-muted uppercase tracking-widest block font-bold">Total Facturado Caja</span>
              <span className="text-2xl font-black text-elegant-gold font-sans font-mono block">
                {formatPrice(totalCajaCompleted)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Efectivo */}
            <div className="bg-elegant-sub/40 border border-elegant-border/80 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="text-sm">💵</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Efectivo</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatPrice(cashIncome)}
                </div>
                <p className="text-[10px] text-elegant-text-muted">
                  {selectedDateCompletedApps.filter(a => (a.paymentMethod || "efectivo") === "efectivo").length} servicios completados
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 flex items-center justify-center font-bold text-lg">
                $
              </div>
            </div>

            {/* Transferencia */}
            <div className="bg-elegant-sub/40 border border-elegant-border/80 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <span className="text-sm">💳</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Transferencia</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatPrice(transferIncome)}
                </div>
                <p className="text-[10px] text-elegant-text-muted">
                  {selectedDateCompletedApps.filter(a => a.paymentMethod === "transferencia").length} servicios transferidos
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-950/40 text-sky-400 border border-sky-900/40 flex items-center justify-center font-bold text-lg font-mono">
                T
              </div>
            </div>
          </div>

          {/* Progress / Ratio Bar */}
          {totalCajaCompleted > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-elegant-text-muted uppercase font-bold tracking-wider">
                <span>Efectivo ({Math.round((cashIncome / totalCajaCompleted) * 100)}%)</span>
                <span>Transferencia ({Math.round((transferIncome / totalCajaCompleted) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-elegant-sub rounded-full overflow-hidden flex border border-elegant-border">
                <div 
                  style={{ width: `${(cashIncome / totalCajaCompleted) * 100}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500"
                />
                <div 
                  style={{ width: `${(transferIncome / totalCajaCompleted) * 100}%` }} 
                  className="bg-sky-500 h-full transition-all duration-500"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-3.5 bg-elegant-sub/20 border border-dashed border-elegant-border rounded-2xl text-[10px] text-elegant-text-muted italic">
              No hay servicios completados registrados para esta fecha. Marca citas como "Completadas" (indicando si fue Efectivo o Transferencia) en la agenda para facturar en caja.
            </div>
          )}
        </div>
      )}

      {/* MÓDULO EXCLUSIVO DE MULTAS & SANCIONES POR INASISTENCIA */}
      {!isBarberView && (activeSubmodule === "multas" || activeSubmodule === "all") && (
        <div className="bg-elegant-card border border-rose-900/60 rounded-3xl p-5 shadow-xs space-y-4 text-left animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-900/40 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-950/80 border border-rose-700/60 rounded-2xl text-rose-400">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2 font-sans">
                  🚨 Submódulo de Multas & Inasistencias
                </h3>
                <p className="text-xs text-rose-200/80">
                  Gestión activa de penalizaciones registradas por inasistencia y exoneración inmediata.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPenaltiesModal(true)}
              className="px-3.5 py-2 bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-bold rounded-xl border border-rose-600/80 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all self-start sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5 text-rose-300" />
              <span>Ver Historial & Modal</span>
            </button>
          </div>

          {/* Caja para Ajustar/Guardar el Valor de la Multa */}
          <div className="bg-rose-950/40 border border-rose-800/80 p-3.5 rounded-2xl space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-extrabold text-rose-200 uppercase tracking-wider block font-sans">
                  Valor Actual de Multa por Inasistencia ($ COP):
                </label>
                <p className="text-[10px] text-rose-300/80">
                  Monto automático que se asigna a la ficha cuando se marca "No Asistió".
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editPenaltyVal}
                    onChange={(e) => setEditPenaltyVal(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-1.5 bg-black/60 border border-rose-700 text-white font-mono font-bold text-sm rounded-xl focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSavingPenaltyVal || !onUpdateConfig}
                  onClick={async () => {
                    if (!onUpdateConfig) return;
                    setIsSavingPenaltyVal(true);
                    try {
                      await onUpdateConfig({ noShowPenaltyAmount: Number(editPenaltyVal) });
                      setPenaltySavedToast(true);
                      setTimeout(() => setPenaltySavedToast(false), 3500);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsSavingPenaltyVal(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSavingPenaltyVal ? "Guardando..." : "Guardar Multa"}</span>
                </button>
              </div>
            </div>

            {penaltySavedToast && (
              <div className="p-2 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-bold text-center animate-fadeIn">
                ✓ ¡Valor de la multa guardado exitosamente a ${Number(editPenaltyVal).toLocaleString()} COP!
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                Clientes Sancionados con Multa Pendiente ({(clients || []).filter(c => (c.pendingPenalty || 0) > 0).length})
              </h4>
            </div>

            {((clients || []).filter(c => (c.pendingPenalty || 0) > 0).length === 0) ? (
              <div className="p-6 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-center space-y-1">
                <p className="text-sm font-bold text-emerald-300">✓ No hay clientes con multas pendientes de cobro</p>
                <p className="text-xs text-emerald-400/80">Todas las inasistencias previas están al día o han sido exoneradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(clients || []).filter(c => (c.pendingPenalty || 0) > 0).map((c) => (
                  <div key={c.id} className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        <span className="text-[10px] bg-rose-900/80 text-rose-200 border border-rose-700 font-mono px-2 py-0.5 rounded-full font-bold">
                          {formatPrice(c.pendingPenalty || 10000)}
                        </span>
                      </div>
                      <p className="text-xs text-rose-200/80 font-mono">📞 {c.phone || "Sin teléfono"}</p>
                    </div>

                    <button
                      disabled={waivingPenaltyClientId === c.id}
                      onClick={async () => {
                        if (confirm(`¿Exonerar y perdonar la multa de ${formatPrice(c.pendingPenalty || 10000)} para ${c.name}?`)) {
                          setWaivingPenaltyClientId(c.id);
                          try {
                            await fetch(`/api/clients/${c.id}/penalties/waive`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ waivedBy: "Admin - Submódulo Multas" })
                            });
                            if (onUpdateClient) {
                              await onUpdateClient(c.id, { pendingPenalty: 0 });
                            }
                            if (onRefresh) onRefresh();
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setWaivingPenaltyClientId(null);
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Exonerar Multa</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control de Agenda Diaria */}
      {(activeSubmodule === "agenda" || activeSubmodule === "all") && (
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

            {onOpenModoSilla && (
              <button
                onClick={onOpenModoSilla}
                className="px-3 py-2 bg-gradient-to-r from-amber-600/30 to-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Abrir Vista Móvil PWA para Barberos en Silla (< 2 seg)"
              >
                <span>📱 Modo Silla (1-Clic)</span>
              </button>
            )}

            <button
              onClick={() => {
                setWalkInDate(selectedDate);
                setShowWalkInForm(!showWalkInForm);
              }}
              className="px-3 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors ml-1 cursor-pointer"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Nombre */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Nombre Cliente *</label>
                <input 
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => {
                    setWalkInName(e.target.value);
                    setShowNameDropdown(true);
                  }}
                  onFocus={() => setShowNameDropdown(true)}
                  onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                  placeholder="Ej. Carlos Ortiz"
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                />
                {showNameDropdown && matchedByName.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-elegant-card border border-elegant-border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-elegant-border/60">
                    {matchedByName.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => {
                          setWalkInName(client.name);
                          setWalkInPhone(client.phone || "");
                          setShowNameDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-elegant-sub transition-colors text-xs text-white block cursor-pointer"
                      >
                        <span className="font-bold text-elegant-gold block">👤 {client.name}</span>
                        <span className="text-[10px] text-elegant-text-muted font-mono block mt-0.5">📞 {client.phone || "Sin celular"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Teléfono / Celular *</label>
                <input 
                  type="text"
                  required
                  value={walkInPhone}
                  onChange={(e) => {
                    setWalkInPhone(e.target.value);
                    setShowPhoneDropdown(true);
                  }}
                  onFocus={() => setShowPhoneDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPhoneDropdown(false), 200)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                />
                {showPhoneDropdown && matchedByPhone.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-elegant-card border border-elegant-border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-elegant-border/60">
                    {matchedByPhone.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => {
                          setWalkInName(client.name);
                          setWalkInPhone(client.phone || "");
                          setShowPhoneDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-elegant-sub transition-colors text-xs text-white block cursor-pointer"
                      >
                        <span className="font-bold text-elegant-gold block">👤 {client.name}</span>
                        <span className="text-[10px] text-elegant-text-muted font-mono block mt-0.5">📞 {client.phone || "Sin celular"}</span>
                      </button>
                    ))}
                  </div>
                )}
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

              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Fecha *</label>
                <input 
                  type="date"
                  required
                  value={walkInDate}
                  onChange={(e) => setWalkInDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white h-10"
                />
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
        <div className="flex items-center space-x-2 border-b border-elegant-border pb-3 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider hidden md:inline">Ver:</span>
          {(["all", "pending", "confirmed", "completed", "canceled"] as const).map((status) => {
            const isSelected = filterStatus === status;
            const count = appointments.filter((a) => {
              if (a.date !== selectedDate) return false;
              if (isBarberView) {
                const isOwnOrUnclaimed = a.barberId === loggedBarberId || !a.barberId || a.barberId === "any";
                if (!isOwnOrUnclaimed) return false;
              }
              return status === "all" || a.status === status;
            }).length;
            
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
                          <div className="flex items-center gap-1.5">
                            <span className="bg-blue-950/50 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                              Completado
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              (app.paymentMethod || "efectivo") === "efectivo"
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                                : "bg-sky-950/40 text-sky-400 border-sky-800/40"
                            }`}>
                              {(app.paymentMethod || "efectivo") === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                            </span>
                          </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                            <User className="h-4 w-4 text-elegant-text-muted" />
                            {app.clientName}
                          </h4>
                          {(() => {
                            const matchedCli = clients.find(c => 
                              (c.phone && app.clientPhone && c.phone.replace(/\D/g, "") === app.clientPhone.replace(/\D/g, "")) ||
                              (c.name && app.clientName && c.name.toLowerCase().trim() === app.clientName.toLowerCase().trim())
                            );
                            if (matchedCli && (matchedCli.pendingPenalty || 0) > 0) {
                              return (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-rose-950 border border-rose-500/80 text-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono animate-pulse">
                                    🚨 MULTA PENDIENTE: ${(matchedCli.pendingPenalty || 0).toLocaleString()} COP
                                  </span>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`¿Exonerar (quitar) la multa de $${(matchedCli.pendingPenalty || 0).toLocaleString()} COP a ${matchedCli.name}?`)) {
                                        await fetch(`/api/clients/${matchedCli.id}/penalties/waive`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ waivedBy: "Admin / Barbero desde Agenda", clientPhone: app.clientPhone, clientName: app.clientName })
                                        });
                                        if (onUpdateClient) onUpdateClient(matchedCli.id, { pendingPenalty: 0 });
                                      }
                                    }}
                                    className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all shadow-xs"
                                    title="Exonerar esta multa al cliente"
                                  >
                                    🛡️ Exonerar
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-xs text-elegant-text-muted">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-elegant-text-muted" />
                            {app.clientPhone}
                          </span>
                          
                          <a
                            href={`https://wa.me/${app.clientPhone.replace(/\D/g, "").length === 10 ? "57" + app.clientPhone.replace(/\D/g, "") : app.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola *${app.clientName}*, te recordamos tu turno para *${app.serviceName}* en *SYNCBARBER* el día *${app.date.split("-").reverse().join("/")}* a las *${app.time}*. ¡Te esperamos! 💈✂️`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 hover:border-emerald-500 rounded-lg text-emerald-400 hover:text-emerald-300 font-bold transition-all text-[10px] uppercase tracking-wider cursor-pointer"
                            title="Enviar recordatorio de WhatsApp"
                          >
                            <Bell className="h-2.5 w-2.5 animate-pulse" />
                            <span>WhatsApp</span>
                          </a>

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
                        (() => {
                          const consumptionsSum = app.consumptions ? app.consumptions.reduce((sum, c) => sum + (c.price * c.quantity), 0) : (app.consumptionsTotal || 0);
                          const grandTotal = app.price + consumptionsSum;

                          return (
                            <div className="bg-elegant-sub/50 border border-elegant-border rounded-xl p-2.5 max-w-xl flex items-center justify-between group">
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
                                <div className="text-[10px] text-elegant-text-muted space-y-0.5 mt-0.5">
                                  <p>Servicio: {formatPrice(app.price)}</p>
                                  {consumptionsSum > 0 && (
                                    <p className="text-cyan-400 font-bold">
                                      + Consumos Nevera: {formatPrice(consumptionsSum)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                {consumptionsSum > 0 ? (
                                  <div className="bg-cyan-950/80 border border-cyan-700/60 px-2.5 py-1 rounded-lg text-right">
                                    <span className="text-[9px] uppercase tracking-wider text-cyan-300 font-extrabold block">TOTAL COBRO:</span>
                                    <span className="text-xs font-black font-mono text-amber-300">
                                      {formatPrice(grandTotal)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold font-mono text-elegant-gold bg-elegant-gold/20 border border-elegant-gold/10 px-2 py-1 rounded-md">
                                    {formatPrice(app.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Notas de Cliente / Alerta & Exoneración de Multa */}
                      {(() => {
                        const hasPenaltyNote = app.notes && (app.notes.toLowerCase().includes("multa") || app.notes.toLowerCase().includes("inasistencia"));
                        const matchedCli = clients.find(c => 
                          (c.phone && app.clientPhone && c.phone.replace(/\D/g, "") === app.clientPhone.replace(/\D/g, "")) ||
                          (c.name && app.clientName && c.name.toLowerCase().trim() === app.clientName.toLowerCase().trim())
                        );
                        const hasPendingClientPenalty = (matchedCli?.pendingPenalty || 0) > 0;

                        if (hasPenaltyNote || hasPendingClientPenalty) {
                          const serviceObj = services.find(s => s.id === app.serviceId);
                          const originalCutPrice = serviceObj ? serviceObj.price : Math.max(0, app.price - 10000);

                          return (
                            <div className="bg-rose-950/80 border border-rose-700/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md max-w-xl animate-fadeIn">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1 font-mono">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                  Multa por inasistencia previa en este cobro
                                </span>
                                <p className="text-xs text-rose-100 font-medium italic">
                                  "{app.notes || "El cliente tiene una multa pendiente por inasistencia previa."}"
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`¿Exonerar multa y cobrar solo el valor original del corte (${formatPrice(originalCutPrice)})?`)) {
                                    // Clean penalty note from appointment
                                    const cleanedNotes = (app.notes || "").replace(/\[Incluye recaudo de multa[^\]]*\]/gi, "").trim();

                                    // 1. Update appointment price to original cut price and clean notes
                                    await onUpdateAppointment(app.id, {
                                      price: originalCutPrice,
                                      notes: cleanedNotes
                                    });

                                    // 2. Waive client pending penalty
                                    const targetClientId = matchedCli?.id || "cli_waive";
                                    try {
                                      await fetch(`/api/clients/${targetClientId}/penalties/waive`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ 
                                          waivedBy: "Barbero/Admin - Desde tarjeta de cita",
                                          clientPhone: app.clientPhone,
                                          clientName: app.clientName
                                        })
                                      });
                                      if (matchedCli?.id && onUpdateClient) {
                                        await onUpdateClient(matchedCli.id, { pendingPenalty: 0 });
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }

                                    if (onRefresh) await onRefresh();
                                    alert(`✨ ¡Multa exonerada correctamente! El cobro se ajustó a ${formatPrice(originalCutPrice)} (solo el corte).`);
                                  }
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>✨ Quitar Multa (Cobrar Solo Corte)</span>
                              </button>
                            </div>
                          );
                        }

                        if (!app.notes) return null;

                        return (
                          <div className="text-xs text-elegant-text bg-elegant-gold/10 border border-elegant-gold/20 p-2 rounded-xl">
                            <span className="font-bold text-[10px] uppercase text-elegant-gold block mb-0.5">Nota del cliente:</span>
                            "{app.notes}"
                          </div>
                        );
                      })()}

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

                      {/* Consumos del cliente en la silla (Bebidas, Ceras, Nevera) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between max-w-xl">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 font-mono">
                            <Wine className="h-3 w-3" />
                            Consumos / Nevera en Silla:
                          </span>
                          <button
                            onClick={() => {
                              setAddingConsumptionAppId(addingConsumptionAppId === app.id ? null : app.id);
                              setSelectedInventoryItemId("");
                              setSelectedConsumptionQty(1);
                            }}
                            className="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Añadir Bebida / Producto</span>
                          </button>
                        </div>

                        {app.consumptions && app.consumptions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-w-xl">
                            {app.consumptions.map((c, i) => (
                              <span key={i} className="bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1.5">
                                <span>🥤 {c.quantity}x {c.name} ({formatPrice(c.price * c.quantity)})</span>
                                <button
                                  onClick={() => handleRemoveConsumption(app.id, i)}
                                  className="text-red-400 hover:text-red-200 hover:bg-red-950/50 p-0.5 rounded cursor-pointer transition-colors"
                                  title="Eliminar este consumo y devolver stock"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {addingConsumptionAppId === app.id && (
                          <div className="bg-elegant-card border border-cyan-800/60 p-3 rounded-xl max-w-xl space-y-2">
                            <label className="text-[10px] font-bold text-cyan-300 uppercase block">
                              Seleccionar Producto o Bebida Fría de Nevera:
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={selectedInventoryItemId}
                                onChange={(e) => setSelectedInventoryItemId(e.target.value)}
                                className="flex-1 text-xs p-2 bg-elegant-sub border border-elegant-border rounded-lg text-white"
                              >
                                <option value="">-- Escoger del inventario --</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id} disabled={inv.stock <= 0}>
                                    {inv.name} ({formatPrice(inv.price)}) - Stock: {inv.stock}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={selectedConsumptionQty}
                                  onChange={(e) => setSelectedConsumptionQty(Number(e.target.value))}
                                  className="w-16 text-xs p-2 bg-elegant-sub border border-elegant-border rounded-lg text-white text-center font-mono font-bold"
                                />

                                <button
                                  onClick={() => handleAddConsumption(app.id)}
                                  disabled={!selectedInventoryItemId || isAddingConsumption}
                                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50"
                                >
                                  {isAddingConsumption ? "Añadiendo..." : "Agregar"}
                                </button>
                                <button
                                  onClick={() => setAddingConsumptionAppId(null)}
                                  className="px-2 py-2 bg-elegant-sub text-gray-400 hover:text-white text-xs rounded-lg cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            </div>
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
                          className="px-3 py-1.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
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
                        <div className="flex gap-2 flex-wrap flex-1 md:flex-none">
                          <button
                            onClick={() => handleCompleteAppointmentWithReagenda(app, "efectivo")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                            title="Completar y pagar en Efectivo"
                          >
                            <span>💵 Efectivo</span>
                          </button>
                          <button
                            onClick={() => handleCompleteAppointmentWithReagenda(app, "transferencia")}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                            title="Completar y pagar por Transferencia"
                          >
                            <span>💳 Transfer</span>
                          </button>
                        </div>
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

                      {/* Cancelar o Marcar No Asistió */}
                      {app.status !== "canceled" && app.status !== "completed" && (
                        <>
                          <button
                            onClick={async () => {
                              const penaltyVal = config.noShowPenaltyAmount !== undefined ? config.noShowPenaltyAmount : 10000;
                              if (window.confirm(`¿Marcar a ${app.clientName} como NO ASISTIÓ? Se registrará la cita como inasistencia y se aplicará una multa de ${formatPrice(penaltyVal)} COP para su próxima reserva.`)) {
                                await onUpdateAppointment(app.id, { 
                                  status: "canceled", 
                                  notes: (app.notes ? app.notes + " | " : "") + `[INASISTENCIA - Multa ${formatPrice(penaltyVal)} COP registrada]` 
                                });
                                
                                const matchedCli = clients.find(c => 
                                  (c.phone && app.clientPhone && c.phone.replace(/\D/g, "") === app.clientPhone.replace(/\D/g, "")) ||
                                  (c.name && app.clientName && c.name.toLowerCase().trim() === app.clientName.toLowerCase().trim())
                                );
                                
                                const targetId = matchedCli?.id || `cli_${Date.now()}`;
                                
                                const res = await fetch(`/api/clients/${targetId}/penalties/add`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    amount: penaltyVal,
                                    reason: `Inasistencia a reserva del ${app.date} ${app.time}`,
                                    appointmentId: app.id,
                                    clientName: app.clientName,
                                    clientPhone: app.clientPhone
                                  })
                                });
                                const data = await res.json();
                                if (data.client && onUpdateClient) {
                                  onUpdateClient(data.client.id, { pendingPenalty: data.client.pendingPenalty });
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-rose-950/80 border border-rose-600/80 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center shadow-xs"
                            title="Marcar cliente como no asistió y aplicar multa de $10.000 COP"
                          >
                            <UserX className="h-3.5 w-3.5 text-rose-300" />
                            <span>🚨 No Asistió</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de cancelar la cita de ${app.clientName}?`)) {
                                onUpdateAppointment(app.id, { status: "canceled" });
                              }
                            }}
                            className="px-3 py-1.5 border border-rose-900/40 text-rose-400 hover:bg-rose-950/20 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer flex-1 md:flex-none text-center"
                            title="Cancelar Cita sin sanción"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cancelar</span>
                          </button>
                        </>
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
      )}

      {/* MODAL GESTIÓN Y EXONERACIÓN DE MULTAS POR INASISTENCIA */}
      {showPenaltiesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-elegant-card border border-rose-800/80 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => setShowPenaltiesModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-elegant-sub rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-rose-900/50 pb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-950 border border-rose-700/80 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 font-mono">
                  🚨 Control & Exoneración de Multas por Inasistencia
                </h3>
                <p className="text-xs text-rose-200/80">
                  Consulta clientes sancionados por no asistir y exonera sus multas con 1 clic.
                </p>
              </div>
            </div>

            {/* SECCIÓN 1: Clientes con Multas Pendientes */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                <span>Clientes con Sanción / Multa Pendiente</span>
                <span className="bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                  {(clients || []).filter(c => (c.pendingPenalty || 0) > 0).length}
                </span>
              </h4>

              {((clients || []).filter(c => (c.pendingPenalty || 0) > 0).length === 0) ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-emerald-300">✓ No hay clientes con multas pendientes por cobro en este momento.</p>
                  <p className="text-[11px] text-emerald-400/80">Todas las inasistencias previas están al día o han sido cobradas / exoneradas.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {(clients || []).filter(c => (c.pendingPenalty || 0) > 0).map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 bg-rose-950/50 border border-rose-700/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{c.name}</span>
                          <span className="text-[10px] bg-rose-900/80 text-rose-200 border border-rose-700 font-mono px-2 py-0.5 rounded-full">
                            Pendiente: {formatPrice(c.pendingPenalty || 10000)}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-200/80 font-mono">
                          Tel: {c.phone || "Sin teléfono registrado"}
                        </p>
                      </div>

                      <button
                        disabled={waivingPenaltyClientId === c.id}
                        onClick={async () => {
                          if (confirm(`¿Exonerar y perdonar la multa de ${formatPrice(c.pendingPenalty || 10000)} para ${c.name}?`)) {
                            setWaivingPenaltyClientId(c.id);
                            try {
                              await fetch(`/api/clients/${c.id}/penalties/waive`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ waivedBy: "Admin - Panel Principal" })
                              });
                              if (onUpdateClient) {
                                await onUpdateClient(c.id, { pendingPenalty: 0 });
                              }
                              if (onRefresh) onRefresh();
                              alert(`¡Se exoneró la multa correctamente para ${c.name}!`);
                            } catch (e) {
                              console.error(e);
                              alert("Error al exonerar la multa.");
                            } finally {
                              setWaivingPenaltyClientId(null);
                            }
                          }
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{waivingPenaltyClientId === c.id ? "Exonerando..." : "✨ Exonerar Multa"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: Historial de Registros de Inasistencias */}
            <div className="space-y-2 pt-2 border-t border-rose-900/40">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 font-mono">
                Citas Canceladas por Inasistencia Registrada
              </h4>

              {(() => {
                const canceledNoShows = (appointments || []).filter(a => 
                  a.status === "canceled" && (
                    a.notes?.toLowerCase().includes("inasistencia") || 
                    a.notes?.toLowerCase().includes("no asistió") || 
                    a.notes?.toLowerCase().includes("no asistio") ||
                    a.notes?.toLowerCase().includes("multa")
                  )
                );

                if (canceledNoShows.length === 0) {
                  return <p className="text-xs italic text-neutral-400">No hay citas marcadas como inasistencia en el historial.</p>;
                }

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {canceledNoShows.map(a => (
                      <div key={a.id} className="p-2.5 bg-black/40 border border-neutral-800 rounded-xl text-xs flex justify-between items-center text-neutral-300">
                        <div>
                          <div className="font-bold text-white">{a.clientName} ({a.clientPhone || "Sin cel"})</div>
                          <div className="text-[10px] text-rose-300/80 font-mono">
                            Fecha: {a.date} a las {a.time} hs - {a.serviceName}
                          </div>
                        </div>
                        <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                          Inasistencia
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-rose-900/40">
              <button
                onClick={() => setShowPenaltiesModal(false)}
                className="px-5 py-2.5 bg-elegant-sub hover:bg-elegant-card border border-elegant-border text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO REAGENDAMIENTO MODAL */}
      <AutoReagendaModal
        isOpen={showAutoReagenda}
        onClose={() => setShowAutoReagenda(false)}
        client={autoReagendaClient}
        completedAppointment={autoReagendaApp}
        services={services}
        barbers={barbers || []}
        salonName={config?.name || "Barbería Pro"}
        onCreateAppointment={onCreateAppointment}
      />
    </div>
  );
}
