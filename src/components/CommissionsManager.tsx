import React, { useState } from "react";
import { Appointment, Barber } from "../types";
import { 
  Scissors, 
  Coins, 
  DollarSign, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Award, 
  Sparkles,
  Plus,
  Percent,
  Check
} from "lucide-react";

interface CommissionsManagerProps {
  appointments: Appointment[];
  barbers: Barber[];
  onUpdateBarber: (id: string, updates: Partial<Barber>) => Promise<any>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  formatPrice: (price: number) => string;
}

export default function CommissionsManager({
  appointments,
  barbers,
  onUpdateBarber,
  onUpdateAppointment,
  formatPrice,
}: CommissionsManagerProps) {
  // Date filter presets
  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month">("week");
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [tempCommission, setTempCommission] = useState<number>(50);
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);

  // In-row tip editing state
  const [editingTipAppId, setEditingTipAppId] = useState<string | null>(null);
  const [tempTipAmount, setTempTipAmount] = useState<string>("");
  const [isUpdatingTip, setIsUpdatingTip] = useState(false);

  // Expanded barber list details
  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(null);

  // Filter completed appointments based on chosen preset
  const getFilteredAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Calculate start of current week (last Monday)
    const currentDay = new Date();
    const dayOfWeek = currentDay.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diffToMonday = currentDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(currentDay.setDate(diffToMonday)).toISOString().split("T")[0];

    // Calculate start of current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    return appointments.filter(app => {
      if (app.status !== "completed") return false;

      switch (datePreset) {
        case "today":
          return app.date === today;
        case "week":
          return app.date >= startOfWeek;
        case "month":
          return app.date >= startOfMonth;
        case "all":
        default:
          return true;
      }
    });
  };

  const completedApps = getFilteredAppointments();

  // Helper to calculate statistics for a specific barber
  const calculateBarberStats = (barberId: string, customPercent?: number) => {
    const barberApps = completedApps.filter(app => app.barberId === barberId);
    const commissionPercent = customPercent !== undefined ? customPercent : 50; // default to 50% split

    const totalRevenue = barberApps.reduce((sum, app) => sum + app.price, 0);
    const totalCommissions = (totalRevenue * commissionPercent) / 100;
    const totalTips = barberApps.reduce((sum, app) => sum + (app.tip || 0), 0);
    const totalPayout = totalCommissions + totalTips;

    return {
      appointmentCount: barberApps.length,
      totalRevenue,
      commissionPercent,
      totalCommissions,
      totalTips,
      totalPayout,
      appointmentsList: barberApps
    };
  };

  const handleSaveCommission = async (barberId: string) => {
    setIsUpdatingCommission(true);
    try {
      await onUpdateBarber(barberId, { commissionPercent: tempCommission });
      setEditingCommissionId(null);
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el porcentaje de comisión.");
    } finally {
      setIsUpdatingCommission(false);
    }
  };

  const handleSaveTip = async (appId: string) => {
    setIsUpdatingTip(true);
    try {
      const tipNum = tempTipAmount === "" ? 0 : Number(tempTipAmount);
      await onUpdateAppointment(appId, { tip: Math.max(0, tipNum) });
      setEditingTipAppId(null);
      setTempTipAmount("");
    } catch (err) {
      console.error(err);
      alert("No se pudo registrar la propina.");
    } finally {
      setIsUpdatingTip(false);
    }
  };

  const activeBarbers = barbers.filter(b => b.isActive);

  // Overall sums for the selected date filter
  const overallRevenue = completedApps.reduce((sum, app) => sum + app.price, 0);
  const overallTips = completedApps.reduce((sum, app) => sum + (app.tip || 0), 0);

  return (
    <div className="space-y-6" id="commissions-tips-module">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <Coins className="h-5 w-5 text-elegant-gold" />
            Liquidación de Comisiones & Propinas
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Calcula las comisiones de los barberos por cortes completados y registra sus propinas adicionales en tiempo real.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center space-x-1 border border-elegant-border bg-elegant-sub/50 p-1 rounded-xl shrink-0">
          {(["today", "week", "month", "all"] as const).map((preset) => {
            const labels: Record<string, string> = {
              today: "Hoy",
              week: "Esta Semana",
              month: "Este Mes",
              all: "Todo el Historial"
            };
            return (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  datePreset === preset 
                    ? "bg-elegant-gold text-elegant-bg" 
                    : "text-elegant-text-muted hover:text-white"
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total revenue of filter */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">
            Servicios Completados ({datePreset === "today" ? "Hoy" : datePreset === "week" ? "Esta Semana" : datePreset === "month" ? "Este Mes" : "Historial"})
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-white">{formatPrice(overallRevenue)}</span>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {completedApps.length} servicios
            </span>
          </div>
          <p className="text-[10px] text-elegant-text-muted">Monto total bruto cobrado a los clientes.</p>
        </div>

        {/* Total tips of filter */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">
            Propinas Registradas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-elegant-gold">{formatPrice(overallTips)}</span>
            <span className="text-xs text-elegant-gold font-mono font-bold bg-elegant-gold/10 px-2 py-0.5 rounded-md">
              100% para barberos
            </span>
          </div>
          <p className="text-[10px] text-elegant-text-muted">Dinero adicional recibido voluntariamente.</p>
        </div>

        {/* Total calculated net payouts */}
        <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl space-y-1 bg-elegant-gold/5">
          <span className="text-[10px] font-bold text-elegant-gold uppercase tracking-wider block">
            Total Neto a Liquidar
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-white">
              {formatPrice(
                activeBarbers.reduce((sum, b) => {
                  const stats = calculateBarberStats(b.id, b.commissionPercent);
                  return sum + stats.totalPayout;
                }, 0)
              )}
            </span>
            <span className="text-xs text-elegant-gold font-bold">
              Comisiones + Propinas
            </span>
          </div>
          <p className="text-[10px] text-elegant-text-muted">A pagar total acumulado entre todos los barberos.</p>
        </div>
      </div>

      {/* Barbers Commission Table / List */}
      <div className="space-y-4">
        {activeBarbers.length === 0 ? (
          <div className="py-12 text-center text-elegant-text-muted border border-dashed border-elegant-border rounded-3xl">
            <Scissors className="h-8 w-8 mx-auto stroke-1 mb-2" />
            <p className="text-sm">No hay barberos registrados o activos para liquidar.</p>
          </div>
        ) : (
          activeBarbers.map((barber) => {
            const stats = calculateBarberStats(barber.id, barber.commissionPercent);
            const isExpanded = expandedBarberId === barber.id;

            return (
              <div 
                key={barber.id}
                className="bg-elegant-card border border-elegant-border rounded-2xl overflow-hidden transition-all"
              >
                {/* Barber Summary Row */}
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-elegant-sub/30">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-10 w-10 rounded-full bg-elegant-gold/10 border border-elegant-gold/20 flex items-center justify-center text-elegant-gold font-bold uppercase shrink-0">
                      {barber.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                        {barber.name}
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                          Activo
                        </span>
                      </h3>
                      <p className="text-xs text-elegant-text-muted font-mono">@{barber.username}</p>
                    </div>
                  </div>

                  {/* Commission config inline */}
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">Comisión Pactada</span>
                      {editingCommissionId === barber.id ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={tempCommission}
                            onChange={(e) => setTempCommission(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-16 px-1.5 py-0.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-md text-center font-mono font-bold"
                          />
                          <button
                            onClick={() => handleSaveCommission(barber.id)}
                            disabled={isUpdatingCommission}
                            className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-black text-white font-mono bg-elegant-sub border border-elegant-border px-2 py-0.5 rounded-md">
                            {stats.commissionPercent}%
                          </span>
                          <button
                            onClick={() => {
                              setEditingCommissionId(barber.id);
                              setTempCommission(barber.commissionPercent !== undefined ? barber.commissionPercent : 50);
                            }}
                            className="text-[10px] font-bold text-elegant-gold hover:underline cursor-pointer"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 flex-1 max-w-xl">
                    <div className="text-center md:text-left">
                      <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">Bruto Generado</span>
                      <span className="text-xs font-bold text-white font-mono">{formatPrice(stats.totalRevenue)}</span>
                      <span className="text-[10px] text-elegant-text-muted block font-mono">({stats.appointmentCount} cortes)</span>
                    </div>

                    <div className="text-center md:text-left">
                      <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">Comisión ({stats.commissionPercent}%)</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">{formatPrice(stats.totalCommissions)}</span>
                    </div>

                    <div className="text-center md:text-left">
                      <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">Propinas</span>
                      <span className="text-xs font-bold text-elegant-gold font-mono">{formatPrice(stats.totalTips)}</span>
                    </div>

                    <div className="text-center md:text-left bg-elegant-sub/40 p-1.5 rounded-xl border border-elegant-border/50">
                      <span className="text-[9px] font-black text-elegant-gold uppercase block">PAGO TOTAL</span>
                      <span className="text-sm font-black text-white font-mono">{formatPrice(stats.totalPayout)}</span>
                    </div>
                  </div>

                  {/* Expand button */}
                  <div>
                    <button
                      onClick={() => setExpandedBarberId(isExpanded ? null : barber.id)}
                      className="p-2 border border-elegant-border hover:bg-elegant-sub bg-elegant-card rounded-xl text-elegant-text-muted hover:text-white transition-colors cursor-pointer w-full md:w-auto flex items-center justify-center gap-1 text-xs font-bold"
                    >
                      <span>{isExpanded ? "Ocultar Cortes" : "Ver Desglose"}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: List of Completed Appointments with Tip Register tool */}
                {isExpanded && (
                  <div className="border-t border-elegant-border/60 bg-elegant-sub/10 p-4 md:p-5 space-y-4 animate-fadeIn">
                    <h4 className="text-xs font-extrabold text-elegant-gold uppercase tracking-wider flex items-center gap-1">
                      <Award className="h-4 w-4 text-elegant-gold" />
                      Historial de Servicios de {barber.name} ({labelsPreset(datePreset)})
                    </h4>

                    {stats.appointmentsList.length === 0 ? (
                      <p className="text-xs text-elegant-text-muted py-4 text-center italic">
                        No hay servicios completados registrados para este barbero en el periodo seleccionado.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-elegant-border rounded-xl bg-elegant-card">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-elegant-sub border-b border-elegant-border text-elegant-text-muted text-[10px] font-bold uppercase tracking-wider">
                              <th className="p-3">Fecha/Hora</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3">Servicio</th>
                              <th className="p-3 text-right">Precio Cita</th>
                              <th className="p-3 text-right">Comisión ({stats.commissionPercent}%)</th>
                              <th className="p-3 text-center">Propina / Tip</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-elegant-border/40 text-white">
                            {stats.appointmentsList.map((app) => {
                              const calculatedCommission = (app.price * stats.commissionPercent) / 100;
                              const isEditingTip = editingTipAppId === app.id;

                              return (
                                <tr key={app.id} className="hover:bg-elegant-sub/20">
                                  <td className="p-3 font-mono font-bold whitespace-nowrap">
                                    {app.date} <span className="text-elegant-text-muted">@{app.time}</span>
                                  </td>
                                  <td className="p-3 font-bold">{app.clientName}</td>
                                  <td className="p-3 text-elegant-text">{app.serviceName}</td>
                                  <td className="p-3 text-right font-mono font-bold">{formatPrice(app.price)}</td>
                                  <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                                    {formatPrice(calculatedCommission)}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isEditingTip ? (
                                      <div className="flex items-center justify-center gap-1.5 max-w-[140px] mx-auto">
                                        <div className="relative flex items-center">
                                          <DollarSign className="absolute left-1.5 h-3 w-3 text-elegant-text-muted" />
                                          <input 
                                            type="number"
                                            value={tempTipAmount}
                                            onChange={(e) => setTempTipAmount(e.target.value)}
                                            placeholder="0"
                                            className="w-16 pl-4.5 pr-1 py-0.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-md font-mono"
                                          />
                                        </div>
                                        <button
                                          onClick={() => handleSaveTip(app.id)}
                                          disabled={isUpdatingTip}
                                          className="p-1 bg-elegant-gold text-elegant-bg rounded-md hover:bg-amber-400 font-bold transition-colors cursor-pointer"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingTipAppId(null)}
                                          className="p-1 border border-elegant-border rounded-md text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
                                        >
                                          X
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        {app.tip && app.tip > 0 ? (
                                          <span className="font-mono font-black text-elegant-gold bg-elegant-gold/10 px-2 py-0.5 rounded-md">
                                            +{formatPrice(app.tip)}
                                          </span>
                                        ) : (
                                          <span className="text-elegant-text-muted italic">Sin propina</span>
                                        )}
                                        <button
                                          onClick={() => {
                                            setEditingTipAppId(app.id);
                                            setTempTipAmount(app.tip ? app.tip.toString() : "");
                                          }}
                                          className="text-[10px] text-elegant-gold hover:underline cursor-pointer"
                                        >
                                          [Registrar]
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helpers
function labelsPreset(preset: string): string {
  switch (preset) {
    case "today": return "Hoy";
    case "week": return "Esta Semana";
    case "month": return "Este Mes";
    case "all": return "Todo el Historial";
    default: return "";
  }
}
