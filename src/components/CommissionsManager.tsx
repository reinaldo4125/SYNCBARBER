import React, { useState } from "react";
import { Appointment, Barber, InventoryItem, ProductSale, BarberAdvance, BarberPayrollSettlement } from "../types";
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
  Check,
  Wine,
  FileText,
  Printer,
  X,
  CreditCard,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle
} from "lucide-react";

interface CommissionsManagerProps {
  appointments: Appointment[];
  barbers: Barber[];
  inventory?: InventoryItem[];
  sales?: ProductSale[];
  loggedBarberId?: string;
  onUpdateBarber: (id: string, updates: Partial<Barber>) => Promise<any>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  formatPrice: (price: number) => string;
}

export default function CommissionsManager({
  appointments,
  barbers,
  inventory = [],
  sales = [],
  loggedBarberId,
  onUpdateBarber,
  onUpdateAppointment,
  formatPrice,
}: CommissionsManagerProps) {
  // Date filter presets
  const [datePreset, setDatePreset] = useState<"today" | "week" | "month" | "all">("week");
  
  // Barber selection filter ("all" or specific barber id)
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>(loggedBarberId || "all");

  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [tempCommission, setTempCommission] = useState<number>(50);
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);

  // In-row tip editing state
  const [editingTipAppId, setEditingTipAppId] = useState<string | null>(null);
  const [tempTipAmount, setTempTipAmount] = useState<string>("");
  const [isUpdatingTip, setIsUpdatingTip] = useState(false);

  // Expanded barber list details
  const [expandedBarberId, setExpandedBarberId] = useState<string | null>(null);

  // Barber Advance Modal State
  const [advanceModalBarber, setAdvanceModalBarber] = useState<Barber | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [advanceReason, setAdvanceReason] = useState<string>("");
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  // Payroll Settlement Modal State
  const [settlementModalBarber, setSettlementModalBarber] = useState<Barber | null>(null);
  const [settlementReceipt, setSettlementReceipt] = useState<BarberPayrollSettlement | null>(null);
  const [settlementNotes, setSettlementNotes] = useState<string>("");
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);

  // Active subtab: "commissions" or "settlements_history"
  const [subtab, setSubtab] = useState<"commissions" | "settlements_history">("commissions");

  // Filter completed appointments based on chosen preset
  const getFilteredAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Calculate start of current week (last Monday)
    const currentDay = new Date();
    const dayOfWeek = currentDay.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diffToMonday = currentDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date(currentDay).setDate(diffToMonday)).toISOString().split("T")[0];

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

  const getFilteredSales = () => {
    const today = new Date().toISOString().split("T")[0];
    const currentDay = new Date();
    const dayOfWeek = currentDay.getDay();
    const diffToMonday = currentDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date(currentDay).setDate(diffToMonday)).toISOString().split("T")[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    return sales.filter(s => {
      const saleDate = (s.createdAt || "").split("T")[0];
      switch (datePreset) {
        case "today":
          return saleDate === today;
        case "week":
          return saleDate >= startOfWeek;
        case "month":
          return saleDate >= startOfMonth;
        case "all":
        default:
          return true;
      }
    });
  };

  const completedApps = getFilteredAppointments();
  const filteredSales = getFilteredSales();

  // Helper to calculate statistics for a specific barber
  const calculateBarberStats = (barber: Barber, customPercent?: number) => {
    const barberApps = completedApps.filter(app => app.barberId === barber.id);
    const serviceCommissionPercent = customPercent !== undefined ? customPercent : (barber.commissionPercent !== undefined ? barber.commissionPercent : 50);

    // 1. Cortes & Servicios Revenue & Commission
    const cutsRevenue = barberApps.reduce((sum, app) => sum + (app.price || 0), 0);
    const cutsCommission = (cutsRevenue * serviceCommissionPercent) / 100;

    // 2. Consumos & Venta de Productos Revenue & Commission
    let consumptionsRevenue = 0;
    let consumptionsCommission = 0;

    // From appointments consumptions
    barberApps.forEach(app => {
      if (app.consumptions && app.consumptions.length > 0) {
        app.consumptions.forEach(c => {
          const itemRev = (c.price || 0) * (c.quantity || 1);
          consumptionsRevenue += itemRev;

          const invItem = inventory.find(i => i.id === c.productId || i.name === c.name);
          const pCommPct = invItem?.commissionPercent !== undefined ? invItem.commissionPercent : 10;
          const isAllowed = invItem?.allowBarberCommission !== false;

          if (isAllowed) {
            consumptionsCommission += itemRev * (pCommPct / 100);
          }
        });
      }
    });

    // From direct POS sales attributed to barber
    const barberSales = filteredSales.filter(s => s.barberId === barber.id && !s.appointmentId);
    barberSales.forEach(sale => {
      sale.items.forEach(item => {
        const itemRev = item.subtotal || ((item.price || 0) * (item.quantity || 1));
        consumptionsRevenue += itemRev;

        const invItem = inventory.find(i => i.id === item.productId || i.name === item.name);
        const pCommPct = invItem?.commissionPercent !== undefined ? invItem.commissionPercent : 10;
        const isAllowed = invItem?.allowBarberCommission !== false;

        if (isAllowed) {
          consumptionsCommission += itemRev * (pCommPct / 100);
        }
      });
    });

    const totalTips = barberApps.reduce((sum, app) => sum + (app.tip || 0), 0);
    
    // Calculate total advances in current period
    const advances = barber.advances || [];
    const advancesTotal = advances.reduce((sum, adv) => sum + adv.amount, 0);

    const grossPayout = cutsCommission + consumptionsCommission + totalTips;
    const netPayout = Math.max(0, grossPayout - advancesTotal);
    const totalGrossRevenue = cutsRevenue + consumptionsRevenue;

    return {
      appointmentCount: barberApps.length,
      cutsRevenue,
      cutsCommission,
      serviceCommissionPercent,
      consumptionsRevenue,
      consumptionsCommission,
      totalGrossRevenue,
      totalTips,
      advancesTotal,
      advances,
      grossPayout,
      netPayout,
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

  // Add Advance to Barber
  const handleAddAdvance = async () => {
    if (!advanceModalBarber || !advanceAmount || Number(advanceAmount) <= 0) return;
    setIsSavingAdvance(true);

    try {
      const newAdv: BarberAdvance = {
        id: "adv_" + Date.now().toString(),
        date: new Date().toISOString().split("T")[0],
        amount: Number(advanceAmount),
        reason: advanceReason.trim() || "Adelanto de nómina / Vale",
        createdAt: new Date().toISOString()
      };

      const existingAdvances = advanceModalBarber.advances || [];
      const updatedAdvances = [newAdv, ...existingAdvances];

      await onUpdateBarber(advanceModalBarber.id, { advances: updatedAdvances });
      setAdvanceModalBarber(null);
      setAdvanceAmount("");
      setAdvanceReason("");
    } catch (err) {
      console.error(err);
      alert("Error al registrar el adelanto.");
    } finally {
      setIsSavingAdvance(false);
    }
  };

  // Process Payroll Settlement (Liquidación de Nómina)
  const handleExecuteSettlement = async (barber: Barber) => {
    setIsProcessingSettlement(true);
    const stats = calculateBarberStats(barber);

    const newSettlement: BarberPayrollSettlement = {
      id: "liq_" + Date.now().toString(),
      barberId: barber.id,
      barberName: barber.name,
      startDate: datePreset === "today" ? new Date().toISOString().split("T")[0] : labelsPreset(datePreset),
      endDate: new Date().toISOString().split("T")[0],
      cutsCount: stats.appointmentCount,
      cutsRevenue: stats.cutsRevenue,
      cutsCommission: stats.cutsCommission,
      productsRevenue: stats.consumptionsRevenue,
      productsCommission: stats.consumptionsCommission,
      tipsTotal: stats.totalTips,
      advancesTotal: stats.advancesTotal,
      netPayout: stats.netPayout,
      settledAt: new Date().toISOString(),
      settledBy: "Administración Barbería",
      notes: settlementNotes.trim() || `Liquidación de nómina correspondiente a ${labelsPreset(datePreset)}.`
    };

    try {
      const updatedHistory = [newSettlement, ...(barber.payrollSettlements || [])];
      // Reset advances for next period on settlement
      await onUpdateBarber(barber.id, { 
        payrollSettlements: updatedHistory,
        advances: [] 
      });

      setSettlementReceipt(newSettlement);
      setSettlementNotes("");
    } catch (err) {
      console.error(err);
      alert("Error al procesar la liquidación de nómina.");
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  const activeBarbers = barbers.filter(b => b.isActive);

  const displayedBarbers = selectedBarberFilter === "all" 
    ? activeBarbers 
    : activeBarbers.filter(b => b.id === selectedBarberFilter);

  // Overall sums for the selected date filter & barber filter
  const overallCutsRevenue = completedApps
    .filter(a => selectedBarberFilter === "all" || a.barberId === selectedBarberFilter)
    .reduce((sum, app) => sum + app.price, 0);

  const overallConsumptionsRevenue = completedApps
    .filter(a => selectedBarberFilter === "all" || a.barberId === selectedBarberFilter)
    .reduce((sum, app) => {
      const cSum = app.consumptions ? app.consumptions.reduce((s, c) => s + (c.price * c.quantity), 0) : (app.consumptionsTotal || 0);
      return sum + cSum;
    }, 0) + filteredSales
      .filter(s => selectedBarberFilter === "all" || s.barberId === selectedBarberFilter)
      .reduce((sum, s) => sum + s.totalAmount, 0);

  const overallTips = completedApps
    .filter(a => selectedBarberFilter === "all" || a.barberId === selectedBarberFilter)
    .reduce((sum, app) => sum + (app.tip || 0), 0);

  const overallNetPayout = displayedBarbers.reduce((sum, b) => {
    const stats = calculateBarberStats(b, b.commissionPercent);
    return sum + stats.netPayout;
  }, 0);

  const overallAdvances = displayedBarbers.reduce((sum, b) => {
    const stats = calculateBarberStats(b, b.commissionPercent);
    return sum + stats.advancesTotal;
  }, 0);

  return (
    <div className="space-y-6" id="commissions-tips-module">
      {/* Title & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-elegant-border pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-sans flex items-center gap-2">
            <Coins className="h-5 w-5 text-elegant-gold" />
            Módulo de Comisiones y Liquidaciones de Nómina
          </h2>
          <p className="text-xs text-elegant-text-muted">
            Consulta de ganancias netas del día, propinas acumuladas, vales y reportes de liquidación.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtabs Switcher */}
          <div className="flex items-center space-x-1 border border-elegant-border bg-elegant-sub/60 p-1 rounded-xl">
            <button
              onClick={() => setSubtab("commissions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subtab === "commissions"
                  ? "bg-elegant-gold text-elegant-bg"
                  : "text-elegant-text-muted hover:text-white"
              }`}
            >
              Comisiones Activas
            </button>
            <button
              onClick={() => setSubtab("settlements_history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subtab === "settlements_history"
                  ? "bg-elegant-gold text-elegant-bg"
                  : "text-elegant-text-muted hover:text-white"
              }`}
            >
              Historial de Liquidaciones
            </button>
          </div>

          {/* Barber Select Filter */}
          <select
            value={selectedBarberFilter}
            onChange={(e) => setSelectedBarberFilter(e.target.value)}
            className="px-3 py-1.5 bg-elegant-card border border-elegant-border text-white text-xs font-bold rounded-xl focus:outline-none focus:border-elegant-gold"
          >
            <option value="all">👥 Todos los Barberos</option>
            {activeBarbers.map(b => (
              <option key={b.id} value={b.id}>
                ✂️ {b.name}
              </option>
            ))}
          </select>

          {/* Date Filter Tabs */}
          <div className="flex items-center space-x-1 border border-elegant-border bg-elegant-sub/50 p-1 rounded-xl shrink-0">
            {(["today", "week", "month", "all"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  datePreset === preset 
                    ? "bg-emerald-500 text-black font-extrabold" 
                    : "text-elegant-text-muted hover:text-white"
                }`}
              >
                {labelsPreset(preset)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subtab === "commissions" ? (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Cuts Revenue */}
            <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">
                Ingreso Cortes ({labelsPreset(datePreset)})
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-white">{formatPrice(overallCutsRevenue)}</span>
              </div>
              <p className="text-[10px] text-elegant-text-muted">Subtotal por servicios.</p>
            </div>

            {/* Total Consumptions / Product Sales */}
            <div className="bg-elegant-card border border-cyan-800/40 p-4 rounded-2xl space-y-1 bg-cyan-950/10">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block flex items-center gap-1 font-mono">
                <Wine className="h-3 w-3" /> Productos / Nevera
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-cyan-300">{formatPrice(overallConsumptionsRevenue)}</span>
              </div>
              <p className="text-[10px] text-cyan-400/80">Bebidas y productos.</p>
            </div>

            {/* Total tips */}
            <div className="bg-elegant-card border border-elegant-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-elegant-text-muted uppercase tracking-wider block">
                Propinas Registradas
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-elegant-gold">{formatPrice(overallTips)}</span>
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                  100% Barbero
                </span>
              </div>
              <p className="text-[10px] text-elegant-text-muted">Directo a barbero.</p>
            </div>

            {/* Vales / Adelantos */}
            <div className="bg-elegant-card border border-red-900/40 p-4 rounded-2xl space-y-1 bg-red-950/10">
              <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block font-mono">
                Vales / Adelantos
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-red-400 font-mono">-{formatPrice(overallAdvances)}</span>
              </div>
              <p className="text-[10px] text-red-300/80">Descontado en nómina.</p>
            </div>

            {/* TOTAL NETO A LIQUIDAR */}
            <div className="bg-elegant-card border border-amber-500/40 p-4 rounded-2xl space-y-1 bg-amber-500/5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Ganancia Neta a Entregar
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-amber-300 font-mono">
                  {formatPrice(overallNetPayout)}
                </span>
              </div>
              <p className="text-[10px] text-amber-200/70">Comisiones + Tip - Vales.</p>
            </div>
          </div>

          {/* Barbers Commission Cards */}
          <div className="space-y-4">
            {displayedBarbers.length === 0 ? (
              <div className="py-12 text-center text-elegant-text-muted border border-dashed border-elegant-border rounded-3xl">
                <Scissors className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-500" />
                <p className="text-sm">No hay barberos seleccionados o activos para liquidar.</p>
              </div>
            ) : (
              displayedBarbers.map((barber) => {
                const stats = calculateBarberStats(barber, barber.commissionPercent);
                const isExpanded = expandedBarberId === barber.id;

                return (
                  <div 
                    key={barber.id}
                    className="bg-elegant-card border border-elegant-border rounded-2xl overflow-hidden transition-all shadow-lg"
                  >
                    {/* Barber Summary Header Row */}
                    <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-elegant-sub/30">
                      <div className="flex items-center space-x-3.5 shrink-0">
                        <div className="h-12 w-12 rounded-full bg-elegant-gold/10 border border-elegant-gold/30 flex items-center justify-center text-elegant-gold font-bold uppercase shrink-0 text-lg">
                          {barber.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-2">
                            {barber.name}
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              Activo
                            </span>
                          </h3>
                          <p className="text-xs text-elegant-text-muted font-mono">@{barber.username}</p>
                        </div>
                      </div>

                      {/* Service Commission Config */}
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-left">
                          <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">% Com. Cortes</span>
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
                                {stats.serviceCommissionPercent}%
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

                      {/* Detailed Financial Breakdown per Barber */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 flex-1">
                        {/* Cortes */}
                        <div className="bg-elegant-sub/40 p-2.5 rounded-xl border border-elegant-border/40">
                          <span className="text-[9px] font-bold text-elegant-text-muted uppercase block">Cortes ({stats.appointmentCount})</span>
                          <span className="text-xs font-bold text-white font-mono block">{formatPrice(stats.cutsRevenue)}</span>
                          <span className="text-[10px] text-emerald-400 font-bold font-mono block">
                            Com: {formatPrice(stats.cutsCommission)}
                          </span>
                        </div>

                        {/* Productos */}
                        <div className="bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-800/30">
                          <span className="text-[9px] font-bold text-cyan-300 uppercase block">Productos</span>
                          <span className="text-xs font-bold text-cyan-200 font-mono block">{formatPrice(stats.consumptionsRevenue)}</span>
                          <span className="text-[10px] text-cyan-400 font-bold font-mono block">
                            Com: {formatPrice(stats.consumptionsCommission)}
                          </span>
                        </div>

                        {/* Propinas */}
                        <div className="bg-elegant-sub/40 p-2.5 rounded-xl border border-elegant-border/40">
                          <span className="text-[9px] font-bold text-amber-300 uppercase block">Propinas</span>
                          <span className="text-xs font-bold text-elegant-gold font-mono block">{formatPrice(stats.totalTips)}</span>
                          <span className="text-[10px] text-elegant-text-muted block">100% Barbero</span>
                        </div>

                        {/* Vales / Adelantos */}
                        <div className="bg-red-950/20 p-2.5 rounded-xl border border-red-800/30">
                          <span className="text-[9px] font-bold text-red-300 uppercase block">Adelantos / Vales</span>
                          <span className="text-xs font-bold text-red-400 font-mono block">-{formatPrice(stats.advancesTotal)}</span>
                          <span className="text-[10px] text-red-300/80 block">{stats.advances.length} registros</span>
                        </div>

                        {/* TOTAL NETO ENTREGAR */}
                        <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/40 text-right">
                          <span className="text-[9px] font-black text-amber-400 uppercase block">GANANCIA NETA</span>
                          <span className="text-sm font-black text-amber-300 font-mono block">{formatPrice(stats.netPayout)}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Add Advance, Liquidate Payroll, Expand */}
                      <div className="flex flex-wrap lg:flex-col items-center gap-2 shrink-0">
                        <button
                          onClick={() => setAdvanceModalBarber(barber)}
                          className="px-3 py-1.5 bg-red-950/50 border border-red-800/50 hover:bg-red-900/60 rounded-xl text-red-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adelanto / Vale</span>
                        </button>

                        <button
                          onClick={() => setSettlementModalBarber(barber)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Liquidar Nómina</span>
                        </button>

                        <button
                          onClick={() => setExpandedBarberId(isExpanded ? null : barber.id)}
                          className="px-3 py-1.5 border border-elegant-border hover:bg-elegant-sub bg-elegant-card rounded-xl text-elegant-text-muted hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                        >
                          <span>{isExpanded ? "Ocultar" : "Detalles"}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details: Services list + Advances list */}
                    {isExpanded && (
                      <div className="border-t border-elegant-border/60 bg-elegant-sub/10 p-4 md:p-5 space-y-6 animate-fadeIn">
                        
                        {/* Advances List if any */}
                        {stats.advances.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                              <AlertCircle className="h-4 w-4 text-red-400" />
                              Adelantos / Vales de Dinero en este periodo
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {stats.advances.map((adv) => (
                                <div key={adv.id} className="p-3 bg-red-950/20 border border-red-800/40 rounded-xl flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-white block">{adv.reason}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{adv.date}</span>
                                  </div>
                                  <span className="font-mono font-black text-red-400 text-sm">
                                    -{formatPrice(adv.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Appointments list */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold text-elegant-gold uppercase tracking-wider flex items-center gap-1">
                            <Award className="h-4 w-4 text-elegant-gold" />
                            Historial Detallado de Cortes y Consumos ({labelsPreset(datePreset)})
                          </h4>

                          {stats.appointmentsList.length === 0 ? (
                            <p className="text-xs text-elegant-text-muted py-4 text-center italic border border-dashed border-elegant-border rounded-xl">
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
                                    <th className="p-3 text-right">Precio</th>
                                    <th className="p-3 text-right">Com. Corte ({stats.serviceCommissionPercent}%)</th>
                                    <th className="p-3">Consumos / Nevera</th>
                                    <th className="p-3 text-center">Propina</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-elegant-border/40 text-white">
                                  {stats.appointmentsList.map((app) => {
                                    const calculatedServiceCommission = (app.price * stats.serviceCommissionPercent) / 100;
                                    const isEditingTip = editingTipAppId === app.id;

                                    let appConsumptionsSum = 0;
                                    let appConsumptionsComm = 0;
                                    if (app.consumptions && app.consumptions.length > 0) {
                                      app.consumptions.forEach(c => {
                                        const cRev = (c.price || 0) * (c.quantity || 1);
                                        appConsumptionsSum += cRev;
                                        const invItem = inventory.find(i => i.id === c.productId || i.name === c.name);
                                        const pCommPct = invItem?.commissionPercent !== undefined ? invItem.commissionPercent : 10;
                                        if (invItem?.allowBarberCommission !== false) {
                                          appConsumptionsComm += cRev * (pCommPct / 100);
                                        }
                                      });
                                    }

                                    return (
                                      <tr key={app.id} className="hover:bg-elegant-sub/20">
                                        <td className="p-3 font-mono font-bold whitespace-nowrap">
                                          {app.date} <span className="text-elegant-text-muted">@{app.time}</span>
                                        </td>
                                        <td className="p-3 font-bold">{app.clientName}</td>
                                        <td className="p-3 text-elegant-text">{app.serviceName}</td>
                                        <td className="p-3 text-right font-mono font-bold">{formatPrice(app.price)}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                                          {formatPrice(calculatedServiceCommission)}
                                        </td>
                                        <td className="p-3 font-mono text-xs">
                                          {app.consumptions && app.consumptions.length > 0 ? (
                                            <div className="space-y-0.5">
                                              <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-bold">
                                                <span>🥤 {formatPrice(appConsumptionsSum)}</span>
                                                <span className="text-[10px] text-cyan-400/80">(Com: {formatPrice(appConsumptionsComm)})</span>
                                              </div>
                                              <div className="text-[9px] text-elegant-text-muted">
                                                {app.consumptions.map(c => `${c.quantity}x ${c.name}`).join(", ")}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-elegant-text-muted/60 italic text-[11px]">-</span>
                                          )}
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
                                                className="p-1 bg-elegant-gold text-elegant-bg rounded-md hover:bg-elegant-gold-hover font-bold transition-colors cursor-pointer"
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
                                                [Editar]
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* SUBTAB: HISTORIAL DE LIQUIDACIONES Y REPORTES */
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            Historial de Liquidaciones de Nómina Procesadas
          </h3>

          <div className="space-y-3">
            {activeBarbers.flatMap(b => (b.payrollSettlements || []).map(s => ({ ...s, barberName: b.name }))).length === 0 ? (
              <div className="py-12 text-center text-elegant-text-muted border border-dashed border-elegant-border rounded-3xl">
                <FileText className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-500" />
                <p className="text-sm">Aún no hay liquidaciones de nómina procesadas.</p>
              </div>
            ) : (
              activeBarbers.flatMap(b => (b.payrollSettlements || []).map(s => ({ ...s, barberName: b.name }))).map((s) => (
                <div key={s.id} className="p-4 bg-elegant-card border border-elegant-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base">{s.barberName}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                        ✓ LIQUIDADO
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cortes: {s.cutsCount} | Periodo: {s.startDate} al {s.endDate}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">Liquidado el: {new Date(s.settledAt).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Entregado</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">{formatPrice(s.netPayout)}</span>
                    </div>
                    <button
                      onClick={() => setSettlementReceipt(s)}
                      className="p-2.5 bg-elegant-sub border border-elegant-border hover:bg-elegant-sub/80 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Ver Recibo</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ADELANTO / VALE */}
      {advanceModalBarber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-elegant-border pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-400" />
                Registrar Adelanto / Vale de Dinero
              </h3>
              <button
                onClick={() => setAdvanceModalBarber(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-elegant-sub p-3 rounded-2xl border border-elegant-border">
                <span className="text-slate-400 block">Barbero:</span>
                <span className="font-extrabold text-white text-sm">{advanceModalBarber.name}</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold uppercase block mb-1">Monto del Adelanto (COP) *</label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="Ej. 50000"
                  className="w-full px-4 py-3 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold uppercase block mb-1">Motivo / Concepto</label>
                <input
                  type="text"
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="Ej. Adelanto para transporte / Almuerzo"
                  className="w-full px-4 py-3 bg-elegant-sub border border-elegant-border rounded-xl text-white text-xs focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setAdvanceModalBarber(null)}
                className="flex-1 py-3 bg-elegant-sub text-slate-300 font-bold rounded-xl border border-elegant-border"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddAdvance}
                disabled={isSavingAdvance || !advanceAmount}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSavingAdvance ? "Guardando..." : "Guardar Adelanto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESAR LIQUIDACIÓN DE NÓMINA */}
      {settlementModalBarber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-elegant-border pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                Cierre y Liquidación de Nómina
              </h3>
              <button
                onClick={() => setSettlementModalBarber(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const stats = calculateBarberStats(settlementModalBarber);
              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-elegant-sub p-4 rounded-2xl border border-elegant-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Barbero a Liquidar:</span>
                      <span className="font-black text-white text-sm">{settlementModalBarber.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Periodo Seleccionado:</span>
                      <span className="font-bold text-emerald-400">{labelsPreset(datePreset)}</span>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="space-y-1.5 border border-elegant-border p-3 rounded-2xl bg-black/30 font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>(+) Comisiones de Cortes ({stats.appointmentCount} citas):</span>
                      <span className="font-bold">{formatPrice(stats.cutsCommission)}</span>
                    </div>
                    <div className="flex justify-between text-cyan-300">
                      <span>(+) Comisiones Productos / Nevera:</span>
                      <span className="font-bold">{formatPrice(stats.consumptionsCommission)}</span>
                    </div>
                    <div className="flex justify-between text-amber-300">
                      <span>(+) Propinas (100%):</span>
                      <span className="font-bold">{formatPrice(stats.totalTips)}</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>(-) Vales y Adelantos Registrados:</span>
                      <span className="font-bold">-{formatPrice(stats.advancesTotal)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-elegant-border text-white">
                      <span className="font-bold">TOTAL NETO A ENTREGAR:</span>
                      <span className="font-black text-emerald-400">{formatPrice(stats.netPayout)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold uppercase block mb-1">Observaciones / Notas de Pago</label>
                    <textarea
                      value={settlementNotes}
                      onChange={(e) => setSettlementNotes(e.target.value)}
                      placeholder="Ej. Pago en efectivo entregado al barbero por concepto de comisiones..."
                      className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSettlementModalBarber(null)}
                className="flex-1 py-3 bg-elegant-sub text-slate-300 font-bold rounded-xl border border-elegant-border"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteSettlement(settlementModalBarber)}
                disabled={isProcessingSettlement}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {isProcessingSettlement ? "Procesando..." : "Confirmar & Marcar Pagado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / TICKET RECEIPT FOR SETTLEMENT */}
      {settlementReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl animate-scaleUp font-mono">
            <div className="text-center space-y-1 border-b border-black/10 pb-4">
              <h3 className="text-xl font-black tracking-tight uppercase">COMPROBANTE DE LIQUIDACIÓN DE NÓMINA</h3>
              <p className="text-xs text-neutral-600">Barbería Pro - Gestión de Comisiones</p>
              <span className="text-[10px] text-neutral-500 block">ID: {settlementReceipt.id}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Barbero:</span>
                <span className="font-bold">{settlementReceipt.barberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fecha Cierre:</span>
                <span className="font-bold">{new Date(settlementReceipt.settledAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Servicios Realizados:</span>
                <span className="font-bold">{settlementReceipt.cutsCount} cortes</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-b border-black/10 py-3 text-xs">
              <div className="flex justify-between">
                <span>Comisión Cortes:</span>
                <span className="font-bold">{formatPrice(settlementReceipt.cutsCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisión Productos:</span>
                <span className="font-bold">{formatPrice(settlementReceipt.productsCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span>Propinas Acumuladas:</span>
                <span className="font-bold">{formatPrice(settlementReceipt.tipsTotal)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Descuento Vales / Adelantos:</span>
                <span className="font-bold">-{formatPrice(settlementReceipt.advancesTotal)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-black/10 font-bold">
                <span>TOTAL LIQUIDADO ENTREGADO:</span>
                <span className="text-emerald-700 font-black">{formatPrice(settlementReceipt.netPayout)}</span>
              </div>
            </div>

            {settlementReceipt.notes && (
              <p className="text-[11px] text-neutral-600 italic bg-neutral-100 p-2.5 rounded-xl border border-neutral-200">
                Nota: {settlementReceipt.notes}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-neutral-200 hover:bg-neutral-300 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => {
                  setSettlementReceipt(null);
                  setSettlementModalBarber(null);
                }}
                className="flex-1 py-3 bg-black text-white font-bold text-xs rounded-xl hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelsPreset(preset: string): string {
  switch (preset) {
    case "today": return "Hoy";
    case "week": return "Esta Semana";
    case "month": return "Este Mes";
    case "all": return "Todo el Historial";
    default: return preset;
  }
}
