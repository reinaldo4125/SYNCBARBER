import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  X, 
  Volume2, 
  Clock, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  ShieldAlert,
  Info,
  AlertTriangle,
  Sliders,
  Settings,
  VolumeX,
  Radio
} from "lucide-react";
import { SalonConfig, Barber, Appointment } from "../types";
import { playNotificationSound, getNotificationSoundConfig, isAlarmActive, stopContinuousAlarm } from "../utils/notificationSound";
import { calculateShiftSummary } from "../utils/useShiftStartEngine";
import { getNotificationHistory, markNotificationAsRead, markAllNotificationsAsRead, LoggedNotification } from "../utils/notificationHistory";
import NotificationSettingsModal from "./NotificationSettingsModal";
import { 
  getNotificationPermissionState, 
  requestNotificationPermission, 
  showPushNotification,
  getWhatsAppNotificationUrl 
} from "../utils/pushNotifications";

interface NotificationBellProps {
  announcements?: any[];
  config?: SalonConfig;
  barber?: Barber;
  appointments?: Appointment[];
  barbers?: Barber[];
  onUpdateConfig?: (newConfig: Partial<SalonConfig>) => Promise<any>;
  onUpdateBarber?: (id: string, updates: Partial<Barber>) => Promise<any>;
  loggedBarberId?: string;
  isMobileHeader?: boolean;
}

export default function NotificationBell({
  announcements = [],
  config,
  barber,
  appointments = [],
  barbers = [],
  onUpdateConfig,
  onUpdateBarber,
  loggedBarberId,
  isMobileHeader = false
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "alerts">("messages");
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [historyList, setHistoryList] = useState<LoggedNotification[]>([]);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      const hist = getNotificationHistory();
      setHistoryList(hist);
      setHistoryCount(hist.filter(h => !h.read).length);
    };
    updateUnread();
    window.addEventListener("syncbarber_notification_history_updated", updateUnread);
    window.addEventListener("syncbarber_notification_added", updateUnread);
    return () => {
      window.removeEventListener("syncbarber_notification_history_updated", updateUnread);
      window.removeEventListener("syncbarber_notification_added", updateUnread);
    };
  }, []);

  // Dismissed announcements state saved in localStorage
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("syncbarber_dismissed_announcements");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Push notifications state
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [testingPush, setTestingPush] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // WhatsApp input state
  const activePhone = barber?.whatsapp || barber?.phone || config?.whatsapp || config?.phone || "";
  const [phoneInput, setPhoneInput] = useState(activePhone);
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermissionState());
  }, []);

  useEffect(() => {
    if (activePhone) {
      setPhoneInput(activePhone);
    }
  }, [activePhone]);

  // Filter unread / active announcements
  const visibleAnnouncements = announcements.filter(
    (a) => a && a.id && !dismissedIds.includes(a.id) && a.active !== false
  );

  const unreadHistory = historyList.filter((h) => !h.read);
  const unreadCount = visibleAnnouncements.length + unreadHistory.length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("syncbarber_dismissed_announcements", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissHistoryItem = (id: string) => {
    markNotificationAsRead(id);
    const hist = getNotificationHistory();
    setHistoryList(hist);
    setHistoryCount(hist.filter(h => !h.read).length);
  };

  const handleDismissAll = () => {
    const allIds = announcements.map((a) => a.id).filter(Boolean);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    try {
      localStorage.setItem("syncbarber_dismissed_announcements", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    markAllNotificationsAsRead();
    const hist = getNotificationHistory();
    setHistoryList(hist);
    setHistoryCount(0);
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      await showPushNotification("🔔 Notificaciones SYNCBARBER Activadas", {
        body: "¡Configuración completada! Recibirás timbres y avisos con sonido.",
        vibrate: [200, 100, 200]
      });
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3500);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    const sent = await showPushNotification("🚨 [PRUEBA] Test de Notificación 💈", {
      body: "(Simulacro de prueba - No es cita real en tu agenda) • Cliente demo: Marcos Silva | 4:30 PM",
      vibrate: [300, 100, 300]
    });
    setTestingPush(false);
    if (sent) {
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3500);
    }
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    try {
      if (loggedBarberId && onUpdateBarber) {
        await onUpdateBarber(loggedBarberId, { whatsapp: phoneInput, phone: phoneInput });
      } else if (onUpdateConfig) {
        await onUpdateConfig({ whatsapp: phoneInput, phone: phoneInput });
      }
      setEditingPhone(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPhone(false);
    }
  };

  const testWhatsAppUrl = activePhone
    ? getWhatsAppNotificationUrl(activePhone, {
        clientName: "Cliente Ejemplo (Prueba)",
        clientPhone: "+57 300 000 0000",
        serviceName: "Corte Fade Premium",
        barberName: barber?.name || "Barbero Máster",
        date: "Hoy",
        time: "03:00 PM",
        price: 35000,
        salonName: config?.name || "Barbería"
      })
    : "";

  return (
    <div className="relative inline-block text-left" ref={popoverRef} id="notification-bell-container">
      {/* Campana de Notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
            : unreadCount > 0
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
            : "bg-elegant-sub border-elegant-border text-elegant-text hover:bg-elegant-border"
        }`}
        title={unreadCount > 0 ? `Tienes ${unreadCount} mensaje(s) nuevo(s)` : "Campana de notificaciones y alertas"}
        aria-label="Notificaciones"
        id="header-notification-bell-btn"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "animate-pulse text-amber-400" : ""}`} />
        
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-amber-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-bounce"
            id="notification-badge-count"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop transparente/oscuro en móvil para cerrar al hacer tap fuera */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-xs" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Popover Desplegable Optimizado para Móvil y Desktop */}
      {isOpen && (
        <div 
          className="fixed inset-x-3 top-14 sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-lg mx-auto sm:mx-0 bg-[#12121e] border border-amber-500/30 rounded-2xl shadow-2xl z-50 text-white overflow-hidden animate-fadeIn backdrop-blur-xl max-h-[82vh] sm:max-h-[85vh] flex flex-col"
          id="notification-dropdown-panel"
        >
          {/* Header del Menú Desplegable */}
          <div className="p-3 sm:p-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white leading-tight truncate">Centro de Notificaciones</h3>
                <p className="text-[10px] text-neutral-400 truncate">
                  {unreadCount > 0 ? `${unreadCount} comunicado(s) pendiente(s)` : "Estás al día"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  title="Marcar todos como leídos"
                >
                  Marcar leídos
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sub-Pestañas: Mensajes & Citas vs Alertas Rápidas */}
          <div className="flex items-center border-b border-white/10 bg-black/30 p-1 shrink-0">
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "messages"
                  ? "bg-amber-500 text-black font-extrabold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Mensajes & Citas</span>
              {unreadCount > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === "messages" ? "bg-black text-amber-400" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "alerts"
                  ? "bg-amber-500 text-black font-extrabold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Timbre & Alertas</span>
            </button>
          </div>

          {/* Contenido: Pestaña 1 - Comunicados & Notificaciones de Citas */}
          {activeTab === "messages" && (
            <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-0">
              {unreadCount === 0 ? (
                <div className="py-8 px-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-300">No hay notificaciones pendientes</p>
                  <p className="text-[10px] text-neutral-500">
                    Estás al día con todas tus reservas, alarmas de 30 min y comunicados.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Alertas de Reservas, Citas y Turnos */}
                  {unreadHistory.map((item) => {
                    const isBooking = item.type === "new_booking";
                    const is30min = item.type === "30min_reminder";
                    const isShift = item.type === "shift_start";

                    const cardBg = isBooking
                      ? "bg-amber-950/40 border-amber-500/50"
                      : is30min
                      ? "bg-rose-950/40 border-rose-500/50"
                      : "bg-sky-950/40 border-sky-500/50";

                    const badgeColor = isBooking
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : is30min
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-sky-500/20 text-sky-300 border-sky-500/40";

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border ${cardBg} transition-all space-y-2 shadow-xs`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            <span>
                              {isBooking ? "🚨 Nueva Cita" : is30min ? "⏰ Alerta 30 min" : isShift ? "☀️ Inicio Turno" : "🔔 Aviso"}
                            </span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => playNotificationSound(item.type)}
                              className="p-1 text-amber-400 hover:text-amber-300 rounded hover:bg-white/10 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Escuchar alarma sonando"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              <span className="text-[9px]">Sonar</span>
                            </button>
                            <button
                              onClick={() => handleDismissHistoryItem(item.id)}
                              className="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer flex items-center gap-1"
                              title="Marcar esta notificación como leída"
                            >
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span>Leído</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white leading-snug">{item.title}</h4>
                          <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{item.message}</p>
                        </div>

                        <div className="text-[9px] text-neutral-400 font-mono pt-0.5 flex items-center justify-between">
                          <span>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(item.timestamp).toLocaleDateString([], { day: "2-digit", month: "short" })}
                          </span>
                          <span className="text-amber-400/80 font-sans text-[9px] font-semibold">Pendiente</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Comunicados del Administrador */}
                  {visibleAnnouncements.map((ann) => {
                    const isAlert = ann.type === "alert";
                    const isWarning = ann.type === "warning";
                    const isSuccess = ann.type === "success";

                    const cardStyle = isAlert
                      ? "bg-rose-950/50 border-rose-800/60"
                      : isWarning
                      ? "bg-amber-950/50 border-amber-800/60"
                      : isSuccess
                      ? "bg-emerald-950/50 border-emerald-800/60"
                      : "bg-sky-950/50 border-sky-800/60";

                    const tagStyle = isAlert
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : isWarning
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : isSuccess
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-sky-500/20 text-sky-300 border-sky-500/40";

                    const TagIcon = isAlert ? ShieldAlert : isWarning ? AlertTriangle : isSuccess ? CheckCircle2 : Info;

                    return (
                      <div
                        key={ann.id}
                        className={`p-3 rounded-xl border ${cardStyle} transition-all space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${tagStyle}`}>
                              <TagIcon className="h-3 w-3" />
                              <span>
                                {isAlert ? "Alerta" : isWarning ? "Aviso" : isSuccess ? "Novedad" : "Comunicado"}
                              </span>
                            </span>
                          </div>
                          <button
                            onClick={() => handleDismiss(ann.id)}
                            className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer flex items-center gap-1"
                            title="Ocultar este comunicado"
                          >
                            <X className="h-3 w-3" />
                            <span>Ocultar</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                          <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{ann.message}</p>
                        </div>

                        {ann.createdAt && (
                          <div className="text-[9px] text-neutral-400 font-mono pt-1">
                            {new Date(ann.createdAt).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Contenido: Pestaña 2 - Timbre, WhatsApp & Alertas Rápidas */}
          {activeTab === "alerts" && (
            <div className="p-3.5 space-y-3.5 text-xs">
              {/* Probar Timbres y Alarmas Web Audio */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Alarmas y Timbres del Sistema</span>
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">Sonido + Push</span>
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playNotificationSound("new_booking");
                      showPushNotification("🚨 [PRUEBA] ¡Cita Nueva Simulada! 💈", {
                        body: "(Simulacro de sonido y aviso - No es cita real) • Demo: Marcos Silva | 4:00 PM",
                        vibrate: [300, 100, 300, 100, 300]
                      });
                    }}
                    className="p-1.5 sm:p-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-xl text-[9px] xs:text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 shadow-xs text-center"
                    title="Probar sonido y vibración de nueva cita"
                  >
                    <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                    <span className="leading-tight">1. Cita Nueva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playNotificationSound("30min_reminder");
                      showPushNotification("⏰ [PRUEBA] ¡Alerta 30 min Simulada!", {
                        body: "(Simulacro de alarma - No es cita real) • Demo: Juan Pérez | 4:30 PM",
                        vibrate: [400, 150, 400, 150, 400],
                        requireInteraction: true
                      });
                    }}
                    className="p-1.5 sm:p-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 rounded-xl text-[9px] xs:text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 shadow-xs text-center"
                    title="Probar alarma urgente faltando 30 minutos"
                  >
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400 shrink-0" />
                    <span className="leading-tight">2. Alerta 30 min</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sum = calculateShiftSummary(appointments, barbers, loggedBarberId, "barber");
                      playNotificationSound("shift_start");
                      const firstAppText = sum.firstAppointment 
                        ? `Primer cliente: ${sum.firstAppointment.clientName} a las ${sum.firstAppointment.time}.` 
                        : "Sin turnos agendados aún.";
                      showPushNotification("☀️ [PRUEBA] ¡Inicio Turno Simulado! 💈", {
                        body: `(Simulacro de prueba) • Tienes ${sum.totalToday} turnos agendados hoy. ${firstAppText}`,
                        vibrate: [300, 100, 300, 100, 400]
                      });
                    }}
                    className="p-1.5 sm:p-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-xl text-[9px] xs:text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 shadow-xs text-center"
                    title="Probar alarma de inicio de turno y conteo diario"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                    <span className="leading-tight">3. Inicio Turno</span>
                  </button>
                </div>
              </div>

              {/* Notificaciones WhatsApp */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Número WhatsApp de Alertas</span>
                </label>

                {editingPhone || !activePhone ? (
                  <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/15">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ej: +57 300 123 4567"
                      className="flex-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white font-mono focus:border-amber-500 outline-none"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone || !phoneInput.trim()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold rounded-lg text-xs transition-all cursor-pointer"
                    >
                      {savingPhone ? "..." : "Guardar"}
                    </button>
                    {activePhone && editingPhone && (
                      <button
                        onClick={() => setEditingPhone(false)}
                        className="text-xs text-neutral-400 hover:text-white px-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-white/10">
                    <span className="font-mono text-emerald-400 font-bold text-xs">{activePhone}</span>
                    <div className="flex items-center gap-1.5">
                      {testWhatsAppUrl && (
                        <a
                          href={testWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                          title="Enviar WhatsApp de prueba"
                        >
                          <Send className="h-3 w-3" />
                          <span>Probar</span>
                        </a>
                      )}
                      <button
                        onClick={() => setEditingPhone(true)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-1.5 py-0.5"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notificaciones Web Push de Navegador */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Push Móvil / PC</span>
                  </span>
                  {permission === "granted" ? (
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Activo</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleEnablePush}
                      className="text-[10px] bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      Activar Push
                    </button>
                  )}
                </div>

                {permission === "granted" && (
                  <button
                    onClick={handleTestPush}
                    disabled={testingPush}
                    className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>Enviar Notificación Push de Prueba</span>
                  </button>
                )}

                {pushSuccess && (
                  <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>¡Notificación de prueba emitida!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOOTER DEL DROPDOWN: ACCESO DIRECTO A CENTRO DE ALARMAS & SEGUNDO PLANO */}
          <div className="p-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Configurar Sirena Fuerte & Segundo Plano</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL CENTRO DE CONTROL DE ALARMAS Y SEGUNDO PLANO */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        barber={barber}
        loggedBarberId={loggedBarberId}
        onUpdateConfig={onUpdateConfig}
        onUpdateBarber={onUpdateBarber}
      />
    </div>
  );
}
