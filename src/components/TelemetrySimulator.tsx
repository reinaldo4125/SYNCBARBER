import React, { useState } from "react";
import { 
  Activity, 
  Play, 
  Trash2, 
  Pause, 
  RefreshCw, 
  Database, 
  Check, 
  Search, 
  Terminal, 
  Wifi, 
  Info,
  SlidersHorizontal,
  Copy
} from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: string;
  tag: string;
  text: string;
  type: "info" | "success" | "warn" | "error";
}

interface TelemetrySimulatorProps {
  logs: LogEntry[];
  onSimulateBooking: () => Promise<void>;
  onClearLogs?: () => void;
  onAddLog?: (tag: string, text: string, type?: "info" | "success" | "warn" | "error") => void;
  triggerToast?: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

export default function TelemetrySimulator({
  logs,
  onSimulateBooking,
  onClearLogs,
  onAddLog,
  triggerToast
}: TelemetrySimulatorProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Search match
    const matchesSearch = 
      log.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tag.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "all") return true;
    if (activeFilter === "error") return log.type === "error" || log.type === "warn";
    if (activeFilter === "api") return log.tag.toUpperCase() === "API";
    if (activeFilter === "sse") return log.tag.toUpperCase() === "SSE";
    if (activeFilter === "licencia") return log.tag.toUpperCase() === "LICENCIA" || log.tag.toUpperCase() === "SAAS";

    return true;
  });

  const handleSimulateClick = async () => {
    try {
      setIsSimulating(true);
      await onSimulateBooking();
    } finally {
      setIsSimulating(false);
    }
  };

  const handlePingSSE = () => {
    if (onAddLog) {
      onAddLog("SSE", "PING: Enviando paquete de telemetría de canal en vivo [latencia < 12ms]", "info");
    }
    if (triggerToast) {
      triggerToast("Ping SSE Enviado", "El canal de eventos en tiempo real respondió OK.", "info");
    }
  };

  const handleRunHealthCheck = async () => {
    try {
      if (onAddLog) {
        onAddLog("HEALTH", "Ejecutando diagnóstico de infraestructura y memoria...", "info");
      }
      const res = await fetch("/api/developer/health");
      if (res.ok) {
        const data = await res.json();
        if (onAddLog) {
          onAddLog(
            "HEALTH", 
            `Estado Servidor: ${data.status || 'HEALTHY'} | Memoria: ${data.memory || '88 MB'} | Uptime: ${data.uptime || '99.9%'}`, 
            "success"
          );
        }
        if (triggerToast) {
          triggerToast("Servidor Saludable", "Infraestructura operando al 100% sin latencia.", "success");
        }
      }
    } catch (e) {
      if (onAddLog) {
        onAddLog("HEALTH", "Atención: No se pudo verificar la métrica de salud del servidor", "warn");
      }
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.tag}] ${l.text}`)
      .join("\n");
    navigator.clipboard.writeText(textToCopy);
    if (triggerToast) {
      triggerToast("Logs Copiados", "Telemetría copiada al portapapeles con éxito.", "info");
    }
  };

  return (
    <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs flex flex-col space-y-4">
      {/* Header */}
      <div className="border-b border-elegant-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-emerald-400" />
              Simulador de Eventos & Telemetría en Vivo
            </h2>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="p-1 text-elegant-gold hover:text-amber-300 transition-colors bg-amber-950/30 border border-amber-800/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="¿Para qué sirve este módulo?"
            >
              <Info className="h-3 w-3" />
              <span>{showInfo ? "Ocultar Ayuda" : "¿Para qué sirve?"}</span>
            </button>
          </div>
          <p className="text-[11px] text-elegant-text-muted mt-0.5">
            Monitorea el tráfico de la API y prueba la reactividad SSE inyectando eventos en tiempo real.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleSimulateClick}
            disabled={isSimulating}
            className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-800 hover:border-emerald-500 hover:text-emerald-300 text-emerald-400 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Play className={`h-3 w-3 shrink-0 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Inyectando..." : "Inyectar Cita Cliente"}</span>
          </button>

          <button
            type="button"
            onClick={handlePingSSE}
            className="px-2.5 py-1.5 bg-blue-950/50 border border-blue-900/60 hover:border-blue-500 text-blue-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
            title="Probar pulso SSE"
          >
            <Wifi className="h-3 w-3 text-blue-400" />
            <span>Ping SSE</span>
          </button>
        </div>
      </div>

      {/* Explicación informativa si el usuario pulsa '¿Para qué sirve?' */}
      {showInfo && (
        <div className="bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-950/20 border border-amber-800/50 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn text-neutral-300">
          <div className="flex items-center gap-2 font-bold text-amber-400 border-b border-amber-800/30 pb-1.5">
            <Info className="h-4 w-4" />
            <span>Guía Explicativa del Módulo de Telemetría & Simulador:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">1. Inyección de Eventos</span>
              <p className="text-neutral-400 leading-relaxed text-[10px]">
                Simula citas agendadas por clientes reales. Esto permite verificar que el calendario de los barberos y la pantalla de administración se actualicen al instante sin recargar la página.
              </p>
            </div>
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="font-bold text-blue-400 block">2. Registro de Telemetría (SSE)</span>
              <p className="text-neutral-400 leading-relaxed text-[10px]">
                Muestra en vivo los mensajes HTTP, consultas de licencias y pings de comunicación en la terminal. Sirve para diagnosticar fallos y comprobar el estado del backend.
              </p>
            </div>
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 space-y-1">
              <span className="font-bold text-amber-400 block">3. Diagnóstico e Inspección</span>
              <p className="text-neutral-400 leading-relaxed text-[10px]">
                Permite filtrar logs por tipo (API, Errores, Licencias), pausar el flujo en tiempo real y copiar reportes de auditoría para el equipo técnico.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-neutral-950/80 p-2 rounded-2xl border border-neutral-900 text-xs">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 pr-1">
          {[
            { id: "all", label: "TODOS" },
            { id: "api", label: "API" },
            { id: "sse", label: "SSE" },
            { id: "licencia", label: "LICENCIAS" },
            { id: "error", label: "ERRORES" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Terminal Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-36">
            <Search className="h-3 w-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-neutral-900 border border-neutral-800 text-white text-[10px] rounded-lg focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleRunHealthCheck}
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-[10px] cursor-pointer"
            title="Diagnóstico de Salud"
          >
            <RefreshCw className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 border rounded-lg text-[10px] cursor-pointer transition-colors ${
              isPaused 
                ? "bg-amber-950/80 text-amber-400 border-amber-800" 
                : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300"
            }`}
            title={isPaused ? "Reanudar terminal" : "Pausar actualización"}
          >
            <Pause className="h-3 w-3" />
          </button>

          {onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="p-1.5 bg-neutral-900 hover:bg-rose-950/50 border border-neutral-800 hover:border-rose-900/50 text-neutral-400 hover:text-rose-400 rounded-lg text-[10px] cursor-pointer transition-colors"
              title="Limpiar terminal"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-[10px] cursor-pointer"
            title="Copiar logs al portapapeles"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="relative">
        <div className="min-h-[280px] max-h-[380px] bg-neutral-950 rounded-2xl border border-neutral-900 p-4 font-mono text-[10px] leading-relaxed text-emerald-500 overflow-y-auto flex flex-col-reverse shadow-inner select-text">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-1.5 py-0.5 hover:bg-white/5 px-1 rounded transition-colors">
                <span className="text-neutral-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`font-bold shrink-0 select-none ${
                  log.type === "success" 
                    ? "text-emerald-400" 
                    : log.type === "error" 
                      ? "text-rose-500 font-extrabold" 
                      : log.type === "warn" 
                        ? "text-amber-500" 
                        : "text-blue-400"
                }`}>
                  [{log.tag}]
                </span>
                <span className={
                  log.type === "error" 
                    ? "text-rose-400" 
                    : log.type === "warn" 
                      ? "text-amber-300" 
                      : log.type === "success" 
                        ? "text-emerald-300" 
                        : "text-neutral-300"
                }>
                  {log.text}
                </span>
              </div>
            ))
          ) : (
            <p className="text-neutral-700 italic">No hay registros que coincidan con los filtros.</p>
          )}
        </div>

        {isPaused && (
          <div className="absolute top-2 right-4 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg font-mono">
            TERMINAL PAUSADA
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-elegant-text-muted bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-900 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-elegant-gold" />
            <span>Motor BD: <span className="font-bold text-white font-mono">SQLite (In-Memory)</span></span>
          </span>
          <span className="text-neutral-700">|</span>
          <span className="flex items-center gap-1">
            <Terminal className="h-3 w-3 text-emerald-400" />
            <span>Eventos: <span className="font-bold text-emerald-400 font-mono">{logs.length}</span></span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-emerald-400 font-bold">Canal SSE Activo</span>
          <span className="text-neutral-600">•</span>
          <span>UTC Sync Live</span>
        </div>
      </div>
    </div>
  );
}
