import React, { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  Volume2, 
  VolumeX,
  Clock, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  ShieldAlert, 
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Trash2,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Radio
} from "lucide-react";
import { SalonConfig, Barber } from "../types";
import { 
  playNotificationSound, 
  getNotificationSoundConfig, 
  saveNotificationSoundConfig, 
  stopContinuousAlarm, 
  isAlarmActive,
  AlarmSoundProfile,
  SoundConfig
} from "../utils/notificationSound";
import { 
  getNotificationPermissionState, 
  requestNotificationPermission, 
  showPushNotification,
  getWhatsAppNotificationUrl 
} from "../utils/pushNotifications";
import { 
  getNotificationHistory, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearNotificationHistory,
  LoggedNotification 
} from "../utils/notificationHistory";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: SalonConfig;
  barber?: Barber;
  loggedBarberId?: string;
  onUpdateConfig?: (newConfig: Partial<SalonConfig>) => Promise<any>;
  onUpdateBarber?: (id: string, updates: Partial<Barber>) => Promise<any>;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  config,
  barber,
  loggedBarberId,
  onUpdateConfig,
  onUpdateBarber
}: NotificationSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"sound" | "background" | "history" | "whatsapp">("sound");
  
  // Sound settings
  const [soundConfig, setSoundConfig] = useState<SoundConfig>(getNotificationSoundConfig());
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  // Push notifications state
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [testingPush, setTestingPush] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // Notification history
  const [history, setHistory] = useState<LoggedNotification[]>([]);

  // WhatsApp configuration
  const activePhone = barber?.whatsapp || barber?.phone || config?.whatsapp || config?.phone || "";
  const [phoneInput, setPhoneInput] = useState(activePhone);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSavedSuccess, setPhoneSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSoundConfig(getNotificationSoundConfig());
      setPermission(getNotificationPermissionState());
      setHistory(getNotificationHistory());
      setIsRinging(isAlarmActive());
      if (activePhone) setPhoneInput(activePhone);
    }
  }, [isOpen, activePhone]);

  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistory(getNotificationHistory());
    };
    const handleAlarmStarted = () => setIsRinging(true);
    const handleAlarmStopped = () => setIsRinging(false);

    window.addEventListener("syncbarber_notification_history_updated", handleHistoryUpdate);
    window.addEventListener("syncbarber_notification_added", handleHistoryUpdate);
    window.addEventListener("syncbarber_alarm_started", handleAlarmStarted);
    window.addEventListener("syncbarber_alarm_stopped", handleAlarmStopped);

    return () => {
      window.removeEventListener("syncbarber_notification_history_updated", handleHistoryUpdate);
      window.removeEventListener("syncbarber_notification_added", handleHistoryUpdate);
      window.removeEventListener("syncbarber_alarm_started", handleAlarmStarted);
      window.removeEventListener("syncbarber_alarm_stopped", handleAlarmStopped);
    };
  }, []);

  if (!isOpen) return null;

  const handleVolumeChange = (vol: number) => {
    const updated = saveNotificationSoundConfig({ volume: vol });
    setSoundConfig(updated);
  };

  const handleProfileChange = (profile: AlarmSoundProfile) => {
    const updated = saveNotificationSoundConfig({ alarmProfile: profile });
    setSoundConfig(updated);
    // Play quick sample
    playNotificationSound("test", updated.volume, profile);
  };

  const handleToggleContinuous = (val: boolean) => {
    const updated = saveNotificationSoundConfig({ continuousAlarm: val });
    setSoundConfig(updated);
  };

  const handleTestSound = (type: "new_booking" | "30min_reminder" | "shift_start") => {
    setIsPlayingTest(true);
    playNotificationSound(type);
    setTimeout(() => setIsPlayingTest(false), 2000);
  };

  const handleStopAlarm = () => {
    stopContinuousAlarm();
    setIsRinging(false);
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      await showPushNotification("🔔 Notificaciones en Segundo Plano Activadas", {
        body: "¡Configuración exitosa! El celular ahora sonará y vibrará al llegar turnos.",
        vibrate: [400, 150, 400, 150, 400]
      });
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3500);
    }
  };

  const handleTestRealPush = async (scenario: "booking" | "30min" | "shift") => {
    setTestingPush(true);
    let title = "";
    let body = "";
    let type: LoggedNotification["type"] = "new_booking";

    if (scenario === "booking") {
      title = "🚨 [PRUEBA] ¡Nueva Cita Agendada! 💈";
      body = "(Simulacro de prueba - No es cita real en tu agenda) • Cliente demo: Andrés Rojas (3:30 PM)";
      type = "new_booking";
    } else if (scenario === "30min") {
      title = "⏰ [PRUEBA] ¡Tu Cita Inicia en 30 Minutos!";
      body = "(Simulacro de prueba - No es cita real en tu agenda) • Cliente demo: Mateo Gómez (4:00 PM)";
      type = "30min_reminder";
    } else {
      title = "☀️ [PRUEBA] ¡Turno Iniciado! Resumen del Día 💈";
      body = "(Simulacro de prueba - No es cita real) • Turnos de ejemplo hoy: 7";
      type = "shift_start";
    }

    playNotificationSound(type);

    const sent = await showPushNotification(title, {
      body,
      tag: `test-scenario-${Date.now()}`,
      vibrate: [400, 150, 400, 150, 400, 150, 400],
      requireInteraction: true,
      type
    });

    setTestingPush(false);
    if (sent) {
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 4000);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      if (loggedBarberId && onUpdateBarber) {
        await onUpdateBarber(loggedBarberId, { whatsapp: phoneInput, phone: phoneInput });
      } else if (onUpdateConfig) {
        await onUpdateConfig({ whatsapp: phoneInput, phone: phoneInput });
      }
      setPhoneSavedSuccess(true);
      setTimeout(() => setPhoneSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn" id="notification-settings-modal">
      <div 
        className="bg-[#101018] border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 via-white/5 to-transparent border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-400 shadow-md">
              <Bell className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Centro de Alarmas & Notificaciones</h2>
                <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Segundo Plano
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Alarmas de alta potencia, vibración y avisos en segundo plano para el barbero
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ALERTA DE ALARMA ACTIVA SI ESTÁ SONANDO */}
        {isRinging && (
          <div className="bg-rose-950/90 border-b border-rose-500/60 p-3 px-4 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400 animate-bounce" />
              <span className="text-xs font-black text-rose-200">
                🚨 ¡ALARMA SONANDO CONTINUAMENTE EN EL SALÓN!
              </span>
            </div>
            <button
              onClick={handleStopAlarm}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <VolumeX className="h-4 w-4" />
              <span>Detener Alarma</span>
            </button>
          </div>
        )}

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex border-b border-white/10 bg-black/40 px-3 sm:px-5 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("sound")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "sound"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>Potencia y Sirena</span>
          </button>

          <button
            onClick={() => setActiveTab("background")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "background"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Segundo Plano Móvil</span>
            {permission === "granted" && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Buzón / Historial</span>
            {history.length > 0 && (
              <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded-full font-black">
                {history.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "whatsapp"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Respaldo WhatsApp</span>
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TAB 1: POTENCIA Y SIRENA */}
          {activeTab === "sound" && (
            <div className="space-y-5">
              {/* Selector de Volumen */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">Volumen de la Alarma</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/40">
                    {Math.round(soundConfig.volume * 100)}% {soundConfig.volume >= 0.85 ? "🔥 (Máxima Potencia)" : ""}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={soundConfig.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-neutral-400">
                  Ajusta el volumen para que se escuche claramente en la barbería incluso con secadores de pelo o música de fondo.
                </p>
              </div>

              {/* Selector de Perfil de Sonido */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  <span>Tipo de Alarma Sonora</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Sirena */}
                  <div
                    onClick={() => handleProfileChange("loud_siren")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      soundConfig.alarmProfile === "loud_siren"
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5">
                      🚨
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black">Sirena Potente (Recomendada)</h4>
                        {soundConfig.alarmProfile === "loud_siren" && (
                          <span className="text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded">ACTIVA</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Doble barrido penetrante (750-1350Hz) que corta el ruido ambiental del salón.
                      </p>
                    </div>
                  </div>

                  {/* Campana */}
                  <div
                    onClick={() => handleProfileChange("loud_bell")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      soundConfig.alarmProfile === "loud_bell"
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400 shrink-0 mt-0.5">
                      🔔
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black">Campana Resonante</h4>
                        {soundConfig.alarmProfile === "loud_bell" && (
                          <span className="text-[9px] bg-sky-500 text-black font-extrabold px-1.5 py-0.2 rounded">ACTIVA</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Campana de bronce de gran sustain y resonancia armónica de salón.
                      </p>
                    </div>
                  </div>

                  {/* Urgente */}
                  <div
                    onClick={() => handleProfileChange("urgent_alarm")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      soundConfig.alarmProfile === "urgent_alarm"
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0 mt-0.5">
                      ⏰
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black">Pitidos de Alta Cadencia</h4>
                        {soundConfig.alarmProfile === "urgent_alarm" && (
                          <span className="text-[9px] bg-rose-500 text-black font-extrabold px-1.5 py-0.2 rounded">ACTIVA</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        4 pulsos rápidos y agudos diseñados para llamar la atención inmediata.
                      </p>
                    </div>
                  </div>

                  {/* Melódico */}
                  <div
                    onClick={() => handleProfileChange("melodic_chime")}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      soundConfig.alarmProfile === "melodic_chime"
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0 mt-0.5">
                      💈
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black">Melodía Clásica Suave</h4>
                        {soundConfig.alarmProfile === "melodic_chime" && (
                          <span className="text-[9px] bg-emerald-500 text-black font-extrabold px-1.5 py-0.2 rounded">ACTIVA</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Acorde suave y elegante para ambientes relajados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opción Alarma Continua */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-amber-400" />
                    <span>Repetir Alarma hasta que el Barbero la Apague</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Si está activado, la alarma sonará continuamente cada 2.5 segundos hasta presionar "Detener Alarma".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleContinuous(!soundConfig.continuousAlarm)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    soundConfig.continuousAlarm ? "bg-amber-500" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      soundConfig.continuousAlarm ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Botones de Prueba Rápida de Sonido */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300">
                  Probar Sonidos en este Dispositivo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTestSound("new_booking")}
                    disabled={isPlayingTest}
                    className="p-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    <span>1. Nueva Cita</span>
                  </button>

                  <button
                    onClick={() => handleTestSound("30min_reminder")}
                    disabled={isPlayingTest}
                    className="p-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    <span>2. Alarma 30 min</span>
                  </button>

                  <button
                    onClick={() => handleTestSound("shift_start")}
                    disabled={isPlayingTest}
                    className="p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    <span>3. Inicio Turno</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEGUNDO PLANO MÓVIL */}
          {activeTab === "background" && (
            <div className="space-y-5">
              {/* Estado del Permiso */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    permission === "granted" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Permiso de Notificaciones en Celular</h4>
                    <p className="text-[11px] text-neutral-400">
                      {permission === "granted" 
                        ? "✅ Permitido. Tu teléfono vibrará y sonará incluso con la pantalla bloqueada." 
                        : "⚠️ Requiere activación para sonar en segundo plano."}
                    </p>
                  </div>
                </div>

                {permission === "granted" ? (
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-xl border border-emerald-500/40 flex items-center gap-1 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                    <span>ACTIVO</span>
                  </span>
                ) : (
                  <button
                    onClick={handleEnablePush}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
                  >
                    Activar Ahora
                  </button>
                )}
              </div>

              {/* Botón de Demostración en Vivo */}
              <div className="bg-gradient-to-br from-amber-500/10 via-black/40 to-transparent border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-black text-white">Simular Alarma en Segundo Plano</h4>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Presiona uno de los botones abajo y **bloquea tu celular o minimiza el navegador**. Verás cómo la notificación entra en la barra superior con sonido y vibración háptica:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTestRealPush("booking")}
                    disabled={testingPush}
                    className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🚨 Probar Nueva Cita</span>
                  </button>

                  <button
                    onClick={() => handleTestRealPush("30min")}
                    disabled={testingPush}
                    className="p-2.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>⏰ Probar Alerta 30 min</span>
                  </button>

                  <button
                    onClick={() => handleTestRealPush("shift")}
                    disabled={testingPush}
                    className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>☀️ Probar Inicio Turno</span>
                  </button>
                </div>

                {pushSuccess && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>¡Alarma emitida exitosamente! Revisa la barra de notificaciones de tu teléfono.</span>
                  </div>
                )}
              </div>

              {/* Guía Paso a Paso para el Cliente */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  <span>¿Cómo garantizar que suene siempre con pantalla bloqueada?</span>
                </h4>

                <div className="space-y-2 text-[11px] text-neutral-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p>
                      **Instalar como App (PWA):** En Chrome toca los 3 puntos y selecciona *"Instalar aplicación"* o *"Añadir a pantalla de inicio"*.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p>
                      **En iPhone (iOS 16.4+):** Abre en Safari, toca el botón de *Compartir (cuadrado con flecha hacia arriba)* y elige *"Añadir a pantalla de inicio"*. Abre la app desde ese icono para aceptar notificaciones.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p>
                      **Ahorro de Batería de Android:** En Ajustes &gt; Batería &gt; Chrome/SYNCBARBER, selecciona *"Sin restricciones"* para que el sistema operativo no congele la app en segundo plano.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUZÓN / HISTORIAL */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Registro Permanente de Notificaciones</span>
                </div>
                {history.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-2 py-1 bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                      Marcar leídas
                    </button>
                    <button
                      onClick={clearNotificationHistory}
                      className="text-[10px] text-neutral-400 hover:text-rose-400 font-bold px-2 py-1 bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Limpiar</span>
                    </button>
                  </div>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                    <Bell className="h-6 w-6 opacity-60" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-300">Buzón vacío por el momento</h4>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    A medida que se agenden citas o se activen alarmas de 30 minutos, se guardarán aquí para que nunca pierdas un turno.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        item.read 
                          ? "bg-white/5 border-white/5 opacity-80" 
                          : "bg-amber-500/10 border-amber-500/30 text-white"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-black/40 border border-white/10 shrink-0 text-sm">
                          {item.type === "new_booking" ? "🚨" : item.type === "30min_reminder" ? "⏰" : "☀️"}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{item.title}</h4>
                            {!item.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-300">{item.message}</p>
                          <span className="text-[9px] text-neutral-400 font-mono block pt-0.5">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => playNotificationSound(item.type)}
                          className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          title="Re-sonar alarma"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        {!item.read && (
                          <button
                            onClick={() => markNotificationAsRead(item.id)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Marcar como leída"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESPALDO WHATSAPP */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                  <h4 className="text-xs font-black">Respaldo Automático 100% Inmune a Ahorro de Batería</h4>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Si el celular del barbero entra en modo ultra-ahorro o no tiene la app abierta, cada reserva genera un enlace inmediato con el mensaje estructurado de la cita listo para enviar a WhatsApp.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <span>Número de WhatsApp para Notificaciones:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Ej: +57 300 123 4567"
                    className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white font-mono focus:border-amber-500 outline-none"
                  />
                  <button
                    onClick={handleSavePhone}
                    disabled={savingPhone || !phoneInput.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black text-xs rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    {savingPhone ? "..." : "Guardar"}
                  </button>
                </div>
                {phoneSavedSuccess && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Número guardado correctamente.</span>
                  </div>
                )}
              </div>

              {activePhone && (
                <div className="flex items-center justify-between bg-black/40 p-3.5 rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Número registrado:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{activePhone}</span>
                  </div>
                  <a
                    href={getWhatsAppNotificationUrl(activePhone, {
                      clientName: "Cliente Ejemplo (Prueba)",
                      serviceName: "Corte & Barba Premium",
                      barberName: barber?.name || "Barbero",
                      date: "Hoy",
                      time: "03:30 PM",
                      price: 35000,
                      salonName: config?.name || "Barbería"
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar WhatsApp de Prueba</span>
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            SYNCBARBER • Motor de Alarmas V3.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
