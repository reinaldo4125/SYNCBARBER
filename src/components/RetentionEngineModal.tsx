import React, { useState } from "react";
import { ClientAccount, Appointment } from "../types";
import { calculateClientRetention } from "../utils/retentionUtils";
import { 
  Sparkles, 
  MessageSquare, 
  Copy, 
  Check, 
  X, 
  Send, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Award,
  Zap,
  Scissors
} from "lucide-react";

interface RetentionEngineModalProps {
  client: ClientAccount;
  appointments: Appointment[];
  onClose: () => void;
  salonName?: string;
}

export default function RetentionEngineModal({
  client,
  appointments,
  onClose,
  salonName = "Barbería",
}: RetentionEngineModalProps) {
  const retention = calculateClientRetention(client, appointments);

  const [tone, setTone] = useState<string>("friendly");
  const [generatedMessage, setGeneratedMessage] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Function to generate re-cut message via AI endpoint or local fallback
  const handleGenerateMessage = async () => {
    setLoadingAi(true);
    setErrorMsg("");
    setCopied(false);

    try {
      const response = await fetch("/api/ai/generate-recut-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.name,
          daysSinceLastCut: retention.daysSinceLastCut,
          avgCutCycleDays: retention.cycleDays,
          barberName: retention.lastBarberName || "tu barbero habitual",
          serviceName: retention.lastServiceName || "Corte Fade & Estilo",
          technicalPreferences: client.technicalPreferences,
          loyaltyPoints: client.loyaltyPoints || 0,
          tone: tone,
          salonName: salonName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage(data.message);
      } else {
        throw new Error("Respuesta no OK del servidor de IA");
      }
    } catch (err) {
      // Local smart fallback generator in case API key or endpoint fails
      const styleSummary = client.technicalPreferences?.fadeType || "tu estilo de siempre";
      const loyaltyBonusText = (client.loyaltyPoints && client.loyaltyPoints >= 4) 
        ? ` ¡Recuerda que tienes ${client.loyaltyPoints} sellos acumulados y tu próximo corte te dará un regalo especial!` 
        : "";

      let fallbackText = "";
      if (tone === "vip") {
        fallbackText = `Hola ${client.name}, te saludamos de ${salonName}. Han pasado ${retention.daysSinceLastCut} días desde tu último retoque con ${retention.lastBarberName || 'nuestro equipo'}. Queremos asegurarnos de que mantengas tu ${styleSummary} impecable.${loyaltyBonusText} ¿Te agendamos un espacio VIP esta semana? Reserva aquí o respóndenos directamente.`;
      } else if (tone === "promo") {
        fallbackText = `¡Hola ${client.name}! 💈 En ${salonName} extrañamos tu energía. Ya hace ${retention.daysSinceLastCut} días renovaste tu corte y queremos obsequiarte un trato preferencial en tu próxima reserva.${loyaltyBonusText} ¿Qué día de esta semana te queda mejor para retocar tu corte?`;
      } else {
        fallbackText = `Hola ${client.name} 👋, ¿cómo estás? Te escribo de ${salonName}. Vemos que han transcurrido ${retention.daysSinceLastCut} días desde tu último corte de cabello. Ya es el momento perfecto para renovar tu ${styleSummary} y mantener tu look al 100%.${loyaltyBonusText} ¿Te apartamos un espacio este fin de semana?`;
      }
      setGeneratedMessage(fallbackText);
    } finally {
      setLoadingAi(false);
    }
  };

  // Generate initial message on mount
  React.useEffect(() => {
    handleGenerateMessage();
  }, [tone]);

  const handleCopy = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    if (!generatedMessage) return;
    // Clean phone number
    const cleanPhone = client.phone.replace(/[^0-9+]/g, '');
    const encodedText = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-elegant-card border border-elegant-border w-full max-w-xl rounded-3xl p-6 space-y-5 relative shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-elegant-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-elegant-gold/20 border border-elegant-gold/40 flex items-center justify-center text-elegant-gold shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-sans flex items-center gap-2">
                Motor de Re-Corte & Retención IA
              </h3>
              <p className="text-xs text-elegant-text-muted">
                Asistente inteligente para re-enganchar al cliente en su ciclo ideal de corte.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen del Cliente y Estado */}
        <div className="bg-elegant-sub/60 border border-elegant-border rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">Cliente</span>
            <span className="text-xs font-bold text-white block mt-0.5 truncate">{client.name}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">Último Corte</span>
            <span className="text-xs font-bold text-white block mt-0.5 font-mono">
              hace {retention.daysSinceLastCut} días
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">Estado Retención</span>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold border inline-block mt-0.5 ${retention.badgeBgClass}`}>
              {retention.statusLabel}
            </span>
          </div>
        </div>

        {/* Selector de Tono de Mensaje IA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-elegant-gold" />
              Selecciona el Tono de Comunicación IA:
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTone("friendly")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                tone === "friendly"
                  ? "bg-elegant-gold/20 border-elegant-gold text-white font-bold"
                  : "bg-elegant-sub/40 border-elegant-border text-neutral-400 hover:text-white"
              }`}
            >
              <span className="text-xs block">👋 Amigable & Cercano</span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">Atención cálida diaria</span>
            </button>

            <button
              type="button"
              onClick={() => setTone("vip")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                tone === "vip"
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                  : "bg-elegant-sub/40 border-elegant-border text-neutral-400 hover:text-white"
              }`}
            >
              <span className="text-xs block">👑 Ejecutivo / VIP</span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">Elegancia & exclusividad</span>
            </button>

            <button
              type="button"
              onClick={() => setTone("promo")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                tone === "promo"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                  : "bg-elegant-sub/40 border-elegant-border text-neutral-400 hover:text-white"
              }`}
            >
              <span className="text-xs block">🎁 Fidelización / Oferta</span>
              <span className="text-[9px] text-neutral-400 block mt-0.5">Énfasis en sellos/beneficio</span>
            </button>
          </div>
        </div>

        {/* Generador Textarea */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-elegant-gold" />
              Mensaje Personalizado Sugerido
            </label>
            <button
              type="button"
              onClick={handleGenerateMessage}
              disabled={loadingAi}
              className="text-[10px] text-elegant-gold hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`h-3 w-3 ${loadingAi ? "animate-spin" : ""}`} />
              <span>{loadingAi ? "Generando con IA..." : "Regenerar Mensaje"}</span>
            </button>
          </div>

          <textarea
            value={generatedMessage}
            onChange={(e) => setGeneratedMessage(e.target.value)}
            rows={5}
            placeholder="El mensaje generado por IA aparecerá aquí..."
            className="w-full text-xs p-3.5 bg-elegant-sub border border-elegant-border rounded-2xl text-white placeholder-neutral-600 focus:outline-none focus:border-elegant-gold leading-relaxed"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-elegant-border/40">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 border border-elegant-border bg-elegant-sub hover:bg-elegant-card text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-neutral-400" />}
            <span>{copied ? "¡Copiado al Portapapeles!" : "Copiar Texto"}</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Enviar por WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
}
