import React, { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2, MessageCircle, Sparkles, Send, ChevronDown, ChevronUp, X } from "lucide-react";
import { 
  getNotificationPermissionState, 
  requestNotificationPermission, 
  showPushNotification,
  getWhatsAppNotificationUrl
} from "../utils/pushNotifications";
import { SalonConfig, Barber } from "../types";

interface PushNotificationBannerProps {
  config?: SalonConfig;
  barber?: Barber;
  onUpdateWhatsAppPhone?: (phone: string) => Promise<void>;
  compact?: boolean;
}

export default function PushNotificationBanner({ 
  config, 
  barber, 
  onUpdateWhatsAppPhone,
  compact = false 
}: PushNotificationBannerProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testingPush, setTestingPush] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [phoneInput, setPhoneInput] = useState<string>(
    barber?.whatsapp || barber?.phone || config?.whatsapp || config?.phone || ""
  );
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Expandable & Dismissible state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem("syncbarber_push_banner_dismissed") === "true";
  });

  useEffect(() => {
    setPermission(getNotificationPermissionState());
  }, []);

  useEffect(() => {
    const activePhone = barber?.whatsapp || barber?.phone || config?.whatsapp || config?.phone || "";
    if (activePhone) {
      setPhoneInput(activePhone);
    }
  }, [barber?.whatsapp, barber?.phone, config?.whatsapp, config?.phone]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("syncbarber_push_banner_dismissed", "true");
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      await showPushNotification("🔔 Notificaciones SYNCBARBER Activadas", {
        body: "¡Perfecto! Ahora recibirás avisos sonoros de nuevas citas incluso con la pantalla bloqueada.",
        vibrate: [200, 100, 200]
      });
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    const sent = await showPushNotification("🚨 ¡Nueva Cita de Prueba! 💈", {
      body: "Cliente: Juan Pérez | Servicio: Corte Fade + Barba | Hora: 4:00 PM",
      vibrate: [300, 100, 300, 100, 300]
    });
    setTestingPush(false);
    if (sent) {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    }
  };

  const handleSavePhone = async () => {
    if (!onUpdateWhatsAppPhone) return;
    setSavingPhone(true);
    try {
      await onUpdateWhatsAppPhone(phoneInput);
      setEditingPhone(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPhone(false);
    }
  };

  if (isDismissed) return null;

  const currentWhatsAppPhone = barber?.whatsapp || barber?.phone || config?.whatsapp || config?.phone || phoneInput;

  const testWhatsAppUrl = currentWhatsAppPhone ? getWhatsAppNotificationUrl(currentWhatsAppPhone, {
    clientName: "Cliente Ejemplo (Prueba)",
    clientPhone: "+57 300 000 0000",
    serviceName: "Corte Fade Premium",
    barberName: barber?.name || "Barbero Máster",
    date: "Hoy",
    time: "03:00 PM",
    price: 35000,
    salonName: config?.name || "Barbería"
  }) : "";

  return (
    <div className="bg-gradient-to-r from-[#12121D] via-[#181826] to-[#12121D] border border-amber-500/30 rounded-2xl p-3 shadow-lg my-2 text-white transition-all">
      {/* Header bar (compact 1-liner) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Bell className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold text-white truncate">
              Alertas en Vivo
            </span>
            {permission === 'granted' ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Push Activo</span>
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-500/30 shrink-0">
                WhatsApp & Push
              </span>
            )}
          </div>
        </div>

        {/* Quick action buttons & expand toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={handleEnablePush}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1"
            >
              <Bell className="h-3 w-3" />
              <span>Activar</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title={isExpanded ? "Contraer opciones" : "Ver ajustes de alertas"}
          >
            <span className="hidden md:inline text-[10px] font-semibold">
              {isExpanded ? "Ocultar" : "Ajustes"}
            </span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
            title="Descartar aviso de alertas"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Content (Details & Tests) */}
      {isExpanded && (
        <div className="pt-3 mt-2 border-t border-white/10 space-y-3 text-xs animate-fadeIn">
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Recibe avisos con sonido en tu celular cada vez que un cliente reserve un turno.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-neutral-300">
                WhatsApp:{" "}
                {currentWhatsAppPhone ? (
                  <strong className="text-emerald-300 font-mono">{currentWhatsAppPhone}</strong>
                ) : (
                  <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Sin configurar
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {testWhatsAppUrl && (
                <a
                  href={testWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Probar WhatsApp</span>
                </a>
              )}

              {permission === 'granted' && (
                <button
                  onClick={handleTestPush}
                  disabled={testingPush}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Probar Push</span>
                </button>
              )}

              {onUpdateWhatsAppPhone && (
                (editingPhone || !currentWhatsAppPhone) ? (
                  <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-amber-500/40">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ej: +57 300 123 4567"
                      className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-[11px] text-white w-36 font-mono focus:border-amber-500 outline-none"
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone || !phoneInput.trim()}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold rounded text-[10px] transition-all cursor-pointer"
                    >
                      {savingPhone ? "..." : "Guardar"}
                    </button>
                    {currentWhatsAppPhone && editingPhone && (
                      <button
                        onClick={() => setEditingPhone(false)}
                        className="text-[10px] text-neutral-400 hover:text-white px-1"
                      >
                        X
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingPhone(true)}
                    className="px-2 py-1 text-[10px] text-amber-400 hover:bg-amber-500/10 rounded-lg border border-amber-500/30 font-bold transition-all cursor-pointer ml-1"
                  >
                    ✏️ Editar N°
                  </button>
                )
              )}
            </div>
          </div>

          {testSuccess && (
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>¡Notificación de prueba enviada con éxito!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
