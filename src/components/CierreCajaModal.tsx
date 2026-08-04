import React, { useState, useEffect } from "react";
import { DailyClosure } from "../types";
import { 
  Calculator, 
  Coins, 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  X, 
  History, 
  FileText,
  Lock,
  Wine,
  Scissors
} from "lucide-react";

interface CierreCajaModalProps {
  formatPrice: (price: number) => string;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function CierreCajaModal({
  formatPrice,
  onClose,
  onRefresh
}: CierreCajaModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"cierre" | "historial">("cierre");

  // Live Register Data
  const [regData, setRegData] = useState<{
    date: string;
    expectedCash: number;
    expectedDigital: number;
    expectedCard: number;
    totalCutsRevenue: number;
    totalProductsRevenue: number;
    totalTips: number;
    totalGross: number;
    completedCount: number;
    salesCount: number;
    closures: DailyClosure[];
  }>({
    date: new Date().toISOString().split("T")[0],
    expectedCash: 0,
    expectedDigital: 0,
    expectedCard: 0,
    totalCutsRevenue: 0,
    totalProductsRevenue: 0,
    totalTips: 0,
    totalGross: 0,
    completedCount: 0,
    salesCount: 0,
    closures: []
  });

  // User Form Inputs
  const [initialBase, setInitialBase] = useState<number>(50000); // Base por defecto $50,000
  const [countedCash, setCountedCash] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [closedSuccess, setClosedSuccess] = useState<DailyClosure | null>(null);

  const fetchCurrentRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cash-register/current");
      if (res.ok) {
        const data = await res.json();
        setRegData(data);
        // Pre-fill counted cash with expected cash + initial base
        setCountedCash(data.expectedCash + 50000);
      }
    } catch (e) {
      console.error("Error fetching register:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRegister();
  }, []);

  const totalExpectedInDrawer = initialBase + regData.expectedCash - withdrawals;
  const cashDifference = countedCash - totalExpectedInDrawer;

  const handleExecuteClose = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBase,
          countedCash,
          expectedCash: regData.expectedCash,
          expectedDigital: regData.expectedDigital,
          expectedCard: regData.expectedCard,
          totalCutsRevenue: regData.totalCutsRevenue,
          totalProductsRevenue: regData.totalProductsRevenue,
          totalTips: regData.totalTips,
          totalGross: regData.totalGross,
          withdrawals,
          notes,
          closedBy: "Administrador / Recepción"
        })
      });

      const data = await res.json();
      if (res.ok && data.closure) {
        setClosedSuccess(data.closure);
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = (closure: DailyClosure) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Arqueo de Caja - ${closure.date}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #000; }
            h2 { text-align: center; margin-bottom: 4px; text-transform: uppercase; }
            p { margin: 2px 0; font-size: 12px; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>BELLA BARBA</h2>
          <p style="text-align:center;">COMPROBANTE DE CIERRE DE CAJA</p>
          <div class="line"></div>
          <p>Fecha: ${closure.date} ${new Date(closure.closedAt).toLocaleTimeString()}</p>
          <p>Realizado por: ${closure.closedBy}</p>
          <div class="line"></div>
          <div class="flex"><p>Base Inicial:</p><p class="bold">${formatPrice(closure.initialBase)}</p></div>
          <div class="flex"><p>Cortes / Servicios:</p><p>${formatPrice(closure.totalCutsRevenue)}</p></div>
          <div class="flex"><p>Productos / Nevera:</p><p>${formatPrice(closure.totalProductsRevenue)}</p></div>
          <div class="flex"><p>Propinas:</p><p>${formatPrice(closure.totalTips)}</p></div>
          <div class="line"></div>
          <div class="flex"><p class="bold">EFECTIVO ESPERADO:</p><p class="bold">${formatPrice(closure.expectedCash)}</p></div>
          <div class="flex"><p class="bold">EFECTIVO CONTADO:</p><p class="bold">${formatPrice(closure.countedCash)}</p></div>
          <div class="flex"><p class="bold">DIFERENCIA:</p><p class="bold">${formatPrice(closure.cashDifference)}</p></div>
          <div class="line"></div>
          <div class="flex"><p>Digital (Nequi/Dav):</p><p>${formatPrice(closure.expectedDigital)}</p></div>
          <div class="flex"><p>Tarjetas:</p><p>${formatPrice(closure.expectedCard)}</p></div>
          <div class="line"></div>
          <div class="flex"><p class="bold">TOTAL GENERAL:</p><p class="bold">${formatPrice(closure.totalGross)}</p></div>
          ${closure.notes ? `<p style="margin-top:8px;">Obs: ${closure.notes}</p>` : ""}
          <div class="line"></div>
          <p style="text-align:center; font-size:10px;">Firma Administrador: ________________</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white font-sans">
        
        {/* Header */}
        <div className="p-5 bg-[#162237]/80 border-b border-[#1F314D] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                ARQUEO Y CIERRE DE CAJA AUTOMATIZADO
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  {regData.date}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Control diario de efectivo, transferencias, propinas e inventario</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab(activeTab === "cierre" ? "historial" : "cierre")}
              className="px-3 py-1.5 bg-[#0E1524] border border-[#1F314D] hover:bg-[#1A2942] rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <History className="h-4 w-4 text-cyan-400" />
              <span>{activeTab === "cierre" ? "Historial Cierres" : "Cierre de Hoy"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Calculando ingresos y balance de caja...</p>
            </div>
          ) : activeTab === "cierre" ? (
            closedSuccess ? (
              /* Success Screen */
              <div className="bg-[#162237]/60 border-2 border-emerald-500/50 rounded-3xl p-8 text-center space-y-6 max-w-xl mx-auto my-4 shadow-xl">
                <div className="h-16 w-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold font-mono text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full">
                    ¡CAJA CERRADA CON ÉXITO!
                  </span>
                  <h3 className="text-2xl font-black text-white">Cierre Registrado #{closedSuccess.id.slice(-6)}</h3>
                  <p className="text-xs text-slate-300">Resumen procesado el {closedSuccess.date} por {closedSuccess.closedBy}</p>
                </div>

                <div className="bg-[#0E1524] border border-[#1F314D] p-4 rounded-2xl text-left font-mono text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Efectivo Contado:</span>
                    <span className="font-bold text-white">{formatPrice(closedSuccess.countedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efectivo Esperado:</span>
                    <span className="font-bold text-slate-400">{formatPrice(closedSuccess.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#1F314D] pt-2">
                    <span>Diferencia:</span>
                    <span className={`font-black ${closedSuccess.cashDifference >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {closedSuccess.cashDifference >= 0 ? "+" : ""}{formatPrice(closedSuccess.cashDifference)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handlePrintReceipt(closedSuccess)}
                    className="px-5 py-2.5 bg-amber-500 text-black font-black text-xs rounded-xl hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Ticket de Cierre</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#162237] border border-[#1F314D] text-white font-bold text-xs rounded-xl hover:bg-[#1A2942] cursor-pointer"
                  >
                    Cerrar Ventana
                  </button>
                </div>
              </div>
            ) : (
              /* Active Close Form */
              <div className="space-y-6">
                
                {/* 1. Live Revenue Breakdown Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Cortes */}
                  <div className="bg-[#162237]/50 border border-[#1F314D] p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Scissors className="h-3 w-3 text-amber-400" />
                      Cortes ({regData.completedCount})
                    </span>
                    <span className="text-base font-black text-white font-mono block">
                      {formatPrice(regData.totalCutsRevenue)}
                    </span>
                  </div>

                  {/* Productos / Nevera */}
                  <div className="bg-cyan-950/20 border border-cyan-800/40 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block flex items-center gap-1">
                      <Wine className="h-3 w-3 text-cyan-400" />
                      Productos / Nevera
                    </span>
                    <span className="text-base font-black text-cyan-300 font-mono block">
                      {formatPrice(regData.totalProductsRevenue)}
                    </span>
                  </div>

                  {/* Propinas */}
                  <div className="bg-[#162237]/50 border border-[#1F314D] p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Propinas
                    </span>
                    <span className="text-base font-black text-amber-300 font-mono block">
                      {formatPrice(regData.totalTips)}
                    </span>
                  </div>

                  {/* Total Bruto */}
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      TOTAL INGRESO BRUTO
                    </span>
                    <span className="text-base font-black text-amber-300 font-mono block">
                      {formatPrice(regData.totalGross)}
                    </span>
                  </div>
                </div>

                {/* 2. Breakdown by Payment Method */}
                <div className="bg-[#162237]/40 border border-[#1F314D] rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Desglose por Métodos de Pago Esperados
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#0E1524] border border-[#1F314D] rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Coins className="h-4 w-4 text-emerald-400" />
                        Efectivo Esperado:
                      </span>
                      <span className="font-mono font-bold text-emerald-400">{formatPrice(regData.expectedCash)}</span>
                    </div>

                    <div className="p-3 bg-[#0E1524] border border-[#1F314D] rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-300">
                        <DollarSign className="h-4 w-4 text-cyan-400" />
                        Nequi / Transferencia:
                      </span>
                      <span className="font-mono font-bold text-cyan-300">{formatPrice(regData.expectedDigital)}</span>
                    </div>

                    <div className="p-3 bg-[#0E1524] border border-[#1F314D] rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-300">
                        <CreditCard className="h-4 w-4 text-purple-400" />
                        Tarjetas / Datáfono:
                      </span>
                      <span className="font-mono font-bold text-purple-300">{formatPrice(regData.expectedCard)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Physical Cash Count Form */}
                <div className="bg-[#0E1524] border-2 border-amber-500/40 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Conteo Físico y Ajustes de Caja
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Base Inicial */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">
                        Base / Fondo Inicial ($)
                      </label>
                      <input
                        type="number"
                        value={initialBase}
                        onChange={e => setInitialBase(Number(e.target.value))}
                        className="w-full bg-[#162237] border border-[#1F314D] rounded-xl p-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Gastos o Retiros */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">
                        Gastos / Retiros del Día ($)
                      </label>
                      <input
                        type="number"
                        value={withdrawals}
                        onChange={e => setWithdrawals(Number(e.target.value))}
                        className="w-full bg-[#162237] border border-[#1F314D] rounded-xl p-2.5 text-sm font-mono font-bold text-red-300 focus:outline-none focus:border-red-400"
                        placeholder="0"
                      />
                    </div>

                    {/* Efectivo Físico Contado */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-amber-400 uppercase">
                        Efectivo Contado en Caja ($)
                      </label>
                      <input
                        type="number"
                        value={countedCash}
                        onChange={e => setCountedCash(Number(e.target.value))}
                        className="w-full bg-[#162237] border-2 border-amber-500 rounded-xl p-2.5 text-base font-mono font-black text-amber-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Auto-Calculated Difference Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    cashDifference === 0
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : cashDifference > 0
                      ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200"
                      : "bg-red-950/40 border-red-500/50 text-red-200"
                  }`}>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold uppercase font-mono block">
                        {cashDifference === 0 ? "✓ CAJA PERFECTA (SIN DIFERENCIAS)" : cashDifference > 0 ? "▲ SOBRANTE EN CAJA" : "▼ FALTANTE EN CAJA"}
                      </span>
                      <p className="text-[11px] opacity-80">
                        Esperado en cajón: {formatPrice(totalExpectedInDrawer)} (Base: {formatPrice(initialBase)} + Efectivo: {formatPrice(regData.expectedCash)} - Retiros: {formatPrice(withdrawals)})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold block opacity-70">Diferencia Final</span>
                      <span className="text-xl font-black font-mono">
                        {cashDifference > 0 ? "+" : ""}{formatPrice(cashDifference)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">
                      Observaciones o Justificación del Cierre
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ej: Se retiraron $20,000 para compra de hielo y café. Caja descuadrada por cambio."
                      className="w-full bg-[#162237] border border-[#1F314D] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleExecuteClose}
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="h-5 w-5" />
                  <span>EFECTUAR CIERRE DE CAJA DEFINITIVO</span>
                </button>

              </div>
            )
          ) : (
            /* History Tab */
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-amber-400" />
                Historial de Cierres de Caja Guardados
              </h3>

              {regData.closures.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs italic bg-[#162237]/30 rounded-2xl border border-[#1F314D]">
                  No se han registrado cierres de caja anteriores todavía.
                </div>
              ) : (
                <div className="space-y-3">
                  {regData.closures.map(closure => (
                    <div
                      key={closure.id}
                      className="p-4 bg-[#162237]/50 border border-[#1F314D] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/40 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono">{closure.date}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                            {new Date(closure.closedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Responsable: <span className="text-amber-400 font-bold">{closure.closedBy}</span>
                          {closure.notes && ` — "${closure.notes}"`}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block uppercase">Efectivo Contado</span>
                          <span className="font-bold text-white">{formatPrice(closure.countedCash)}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block uppercase">Diferencia</span>
                          <span className={`font-black ${closure.cashDifference >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {closure.cashDifference >= 0 ? "+" : ""}{formatPrice(closure.cashDifference)}
                          </span>
                        </div>

                        <button
                          onClick={() => handlePrintReceipt(closure)}
                          className="p-2 bg-[#0E1524] border border-[#1F314D] hover:bg-amber-500/20 text-amber-400 rounded-xl cursor-pointer transition-all"
                          title="Reimprimir Comprobante"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
