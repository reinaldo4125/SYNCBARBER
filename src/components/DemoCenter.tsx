import React, { useState } from "react";
import { 
  Sparkles, 
  User, 
  Shield, 
  Scissors, 
  Play, 
  ExternalLink, 
  X, 
  Maximize2, 
  Minimize2, 
  Info,
  ChevronRight,
  TrendingUp,
  Cpu,
  Tv,
  Check
} from "lucide-react";
import { Barber, SalonConfig } from "../types";

interface DemoCenterProps {
  currentRole: "client" | "admin" | "barber" | "login" | "developer" | "syncbarber";
  setCurrentRole: (role: "client" | "admin" | "barber" | "login" | "developer" | "syncbarber") => void;
  loggedUser: any;
  setLoggedUser: (user: any) => void;
  config: SalonConfig;
  activeTenantId: string;
  barbers: Barber[];
  triggerToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

export default function DemoCenter({
  currentRole,
  setCurrentRole,
  loggedUser,
  setLoggedUser,
  config,
  activeTenantId,
  barbers,
  triggerToast
}: DemoCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // ROI Calculator states
  const [showRoiCalc, setShowRoiCalc] = useState(false);
  const [monthlyCuts, setMonthlyCuts] = useState(400);
  const [avgTicket, setAvgTicket] = useState(18000);
  const [commissionRate, setCommissionRate] = useState(50); // percentage

  // ROI calculations
  const totalMonthlyBilling = monthlyCuts * avgTicket;
  const commissionsPaid = totalMonthlyBilling * (commissionRate / 100);
  const netEarnings = totalMonthlyBilling - commissionsPaid;
  // Estimated increase in reservations due to online 24/7 availability (usually 15% more)
  const estimatedSaaSDocsRevenue = totalMonthlyBilling * 0.15;

  const handleQuickLogin = async (roleType: "admin" | "barber") => {
    try {
      let username = "";
      let password = "";

      if (roleType === "admin") {
        username = "admin";
        password = "admin";
      } else {
        username = "mateo";
        password = "123";
      }

      triggerToast("Simulando Inicio", `Iniciando sesión como ${roleType === "admin" ? "Administrador" : "Barbero"}...`, "info");
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        // Save token & tenant ID
        localStorage.setItem("bella_barba_token", data.token);
        localStorage.setItem("active_tenant_id", data.user.salonId);
        
        setLoggedUser({
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          role: data.role,
          barberId: data.barberId,
          salonId: data.user.salonId,
        });
        setCurrentRole(data.role);
        
        triggerToast(
          "¡Sesión Iniciada con Éxito!", 
          `Bienvenido ${data.user.name}. Acceso directo de demostración.`, 
          "success"
        );
      } else {
        triggerToast("Fallo en login directo", "Por favor ingresa manualmente desde la pestaña 'Ingreso Personal'.", "warning");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error de demostración", "No se pudo realizar el inicio de sesión rápido.", "warning");
    }
  };

  const handleSimulateClientBooking = async () => {
    try {
      setSimulating(true);
      triggerToast("Simulando Reserva", "Inyectando cita en tiempo real desde el Centro de Demo...", "info");
      
      const res = await fetch("/api/developer/tenants");
      let activeBarbers = barbers;
      
      const mockNames = [
        "Andrés Felipe Castro", 
        "Santiago Bermúdez", 
        "Camilo Restrepo", 
        "Esteban Henao", 
        "Juan Pablo Vélez", 
        "Mateo Aristizábal"
      ];
      
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const randomPhone = `300${Math.floor(1000000 + Math.random() * 9000000)}`;
      
      // Select random barber of current list
      const selectedBarber = activeBarbers.length > 0 ? activeBarbers[Math.floor(Math.random() * activeBarbers.length)] : { id: "b1", name: "Carlos Barber" };

      // Set date to today
      const todayStr = new Date().toISOString().split("T")[0];
      
      // Pick a random hour
      const hour = Math.floor(10 + Math.random() * 8); // 10:00 to 18:00
      const minutes = Math.random() > 0.5 ? "00" : "30";
      const timeStr = `${hour.toString().padStart(2, "0")}:${minutes}`;

      const serviceRes = await fetch("/api/services");
      const servicesList = await serviceRes.json();
      const randomService = servicesList[Math.floor(Math.random() * servicesList.length)] || { id: "s1", name: "Corte de Cabello Premium", price: 18000, duration: 30 };

      const appointmentData = {
        clientName: randomName,
        clientPhone: randomPhone,
        serviceId: randomService.id,
        serviceName: randomService.name,
        price: randomService.price,
        date: todayStr,
        time: timeStr,
        duration: randomService.duration,
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        notes: "Cita inyectada por demostración express."
      };

      const bookingRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData)
      });

      if (bookingRes.ok) {
        triggerToast(
          "Cita Simulada Exitosa", 
          `Se creó cita para ${randomName} hoy a las ${timeStr} con ${selectedBarber.name}.`, 
          "success"
        );
      } else {
        const err = await bookingRes.json();
        triggerToast("Colisión de horario", err.message || "Ese slot ya está ocupado. Intenta de nuevo.", "warning");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error", "Fallo al comunicar con el simulador.", "warning");
    } finally {
      setSimulating(false);
    }
  };

  const openDuplicateTab = () => {
    window.open(window.location.href, "_blank");
    triggerToast("Pestaña Duplicada", "Abre la nueva pestaña al lado de esta para ver los cambios en tiempo real.", "success");
  };

  return (
    <>
      {/* Floating Sparkles Button to open/close */}
      {currentRole !== "syncbarber" && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setIsMinimized(false);
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
              isOpen 
                ? "bg-rose-950 border-rose-800 text-rose-300" 
                : "bg-elegant-gold border-amber-400 text-elegant-bg animate-pulse"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isOpen ? "" : "animate-spin-slow"}`} />
            <span>{isOpen ? "Cerrar Demo" : "💡 Centro de Demo"}</span>
          </button>
        </div>
      )}

      {/* Floating Demo Sidebar/Drawer Container */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[380px] bg-elegant-card/95 backdrop-blur-lg border-r border-elegant-border z-40 shadow-2xl flex flex-col justify-between overflow-y-auto pt-20 animate-slideRight">
          
          {/* Header Panel */}
          <div className="p-5 border-b border-elegant-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-elegant-gold/10 text-elegant-gold rounded-lg border border-elegant-gold/20">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Consola de Demostración</h3>
                  <p className="text-[10px] text-elegant-gold font-bold uppercase tracking-wider">SYNCBARBER SaaS</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-elegant-sub rounded-lg text-elegant-text-muted hover:text-white transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <p className="text-[11px] text-elegant-text-muted mt-3 leading-relaxed">
              Diseñamos esta consola para ayudarte a mostrar el software a dueños de peluquerías en <strong>pocos pasos</strong> y sin complicaciones de contraseñas.
            </p>
          </div>

          {/* Body Section */}
          <div className="p-5 flex-1 space-y-5">
            
            {/* Quick Actions / Multitab Demonstration */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-elegant-text-muted block">
                ⚡ Demostración en Tiempo Real
              </span>
              <div className="bg-elegant-sub/50 border border-elegant-border/80 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Para lucir la velocidad real-time de SYNCBARBER, abre una segunda ventana y colócala al lado de esta:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={openDuplicateTab}
                    className="py-2 bg-elegant-card border border-elegant-border hover:border-elegant-gold hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 text-neutral-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Duplicar Ventana</span>
                  </button>
                  <button
                    onClick={handleSimulateClientBooking}
                    disabled={simulating}
                    className="py-2 bg-emerald-950/40 border border-emerald-900 hover:border-emerald-500 hover:text-emerald-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 text-emerald-400"
                  >
                    <Play className="h-3 w-3" />
                    <span>Inyectar Cita</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Login role switches */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-elegant-text-muted block">
                🔄 Simulador de Roles Integrado
              </span>
              <div className="space-y-2">
                
                {/* Client Role */}
                <div 
                  onClick={() => {
                    setCurrentRole("client");
                    triggerToast("Vista de Cliente Activa", "Puedes agendar servicios, elegir barberos y validar horas de forma intuitiva.", "info");
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    currentRole === "client" 
                      ? "bg-elegant-gold/10 border-elegant-gold text-white" 
                      : "bg-elegant-sub/30 border-elegant-border/60 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-0.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Vista del Cliente Final</span>
                      {currentRole === "client" && <span className="text-[9px] bg-elegant-gold text-elegant-bg px-1.5 py-0.5 rounded font-black">ACTIVO</span>}
                    </div>
                    <p className="text-[10px] opacity-80 leading-relaxed">
                      Catálogo interactivo, suscripción VIP, puntos de lealtad y agendamiento exprés 24/7.
                    </p>
                  </div>
                </div>

                {/* Barber Role */}
                <div 
                  onClick={() => handleQuickLogin("barber")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    currentRole === "barber" 
                      ? "bg-elegant-gold/10 border-elegant-gold text-white" 
                      : "bg-elegant-sub/30 border-elegant-border/60 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-0.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Panel del Barbero / Staff</span>
                      {currentRole === "barber" && <span className="text-[9px] bg-elegant-gold text-elegant-bg px-1.5 py-0.5 rounded font-black">ACTIVO</span>}
                    </div>
                    <p className="text-[10px] opacity-80 leading-relaxed">
                      El peluquero ve su agenda individual del día, liquida sus comisiones acumuladas y bloquea sus descansos.
                    </p>
                  </div>
                </div>

                {/* Admin Role */}
                <div 
                  onClick={() => handleQuickLogin("admin")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    currentRole === "admin" 
                      ? "bg-elegant-gold/10 border-elegant-gold text-white" 
                      : "bg-elegant-sub/30 border-elegant-border/60 hover:border-neutral-700 text-neutral-400"
                  }`}
                >
                  <div className="p-1.5 bg-amber-500/10 text-elegant-gold rounded-lg border border-amber-500/20">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-0.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Panel Administrativo</span>
                      {currentRole === "admin" && <span className="text-[9px] bg-elegant-gold text-elegant-bg px-1.5 py-0.5 rounded font-black">ACTIVO</span>}
                    </div>
                    <p className="text-[10px] opacity-80 leading-relaxed">
                      Configuración de horarios del local, catálogo de precios, ingresos, administración de barberos y comisiones.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* ROI Pricing Calculator */}
            <div className="space-y-2.5">
              <button
                onClick={() => setShowRoiCalc(!showRoiCalc)}
                className="w-full py-2 bg-elegant-sub border border-elegant-border hover:border-elegant-gold rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-between px-4 text-white"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Calculadora de Retorno (ROI)</span>
                </span>
                <ChevronRight className={`h-4 w-4 transition-all ${showRoiCalc ? "rotate-90 text-elegant-gold" : "text-neutral-500"}`} />
              </button>

              {showRoiCalc && (
                <div className="bg-elegant-sub/40 border border-elegant-border rounded-2xl p-4 space-y-4 animate-fadeIn">
                  <p className="text-[10px] text-elegant-text-muted leading-relaxed">
                    Usa esta calculadora interactiva frente a un dueño de barbería para demostrar el valor económico de SYNCBARBER:
                  </p>
                  
                  {/* Inputs */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-bold text-neutral-300">
                        <span>Servicios al Mes:</span>
                        <span className="text-white font-mono">{monthlyCuts} cortes</span>
                      </div>
                      <input 
                        type="range" 
                        min="100" 
                        max="1500" 
                        step="50"
                        value={monthlyCuts} 
                        onChange={(e) => setMonthlyCuts(Number(e.target.value))}
                        className="w-full h-1 bg-elegant-border rounded-lg appearance-none cursor-pointer accent-elegant-gold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-bold text-neutral-300">
                        <span>Ticket Promedio:</span>
                        <span className="text-white font-mono">${avgTicket.toLocaleString()} COP</span>
                      </div>
                      <input 
                        type="range" 
                        min="8000" 
                        max="60000" 
                        step="2000"
                        value={avgTicket} 
                        onChange={(e) => setAvgTicket(Number(e.target.value))}
                        className="w-full h-1 bg-elegant-border rounded-lg appearance-none cursor-pointer accent-elegant-gold"
                      />
                    </div>
                  </div>

                  {/* Calculations output */}
                  <div className="border-t border-elegant-border/60 pt-3 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-elegant-text-muted">Facturación Total:</span>
                      <span className="text-neutral-300 font-mono font-bold">${totalMonthlyBilling.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-1.5 rounded-lg border border-emerald-900/40">
                      <span>Aumento estimado (15% online):</span>
                      <span className="font-mono">+${estimatedSaaSDocsRevenue.toLocaleString()} COP</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-elegant-gold leading-relaxed italic">
                    💡 ¡Aumentar un 15% las reservas debido a que los clientes pueden agendar fuera de horario amortiza con creces el valor mensual de la suscripción SaaS!
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Footer of Sidebar */}
          <div className="p-4 border-t border-elegant-border bg-elegant-sub/40 flex items-center justify-between text-[10px]">
            <span className="text-neutral-500 font-mono">SYNCBARBER LIVE DEMO</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Canal SSE Activo
            </span>
          </div>

        </div>
      )}
    </>
  );
}
