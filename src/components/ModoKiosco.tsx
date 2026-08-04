import React, { useState } from "react";
import { Appointment, Barber, Service } from "../types";
import { 
  CheckCircle2, 
  Search, 
  UserCheck, 
  Clock, 
  Sparkles, 
  X, 
  Scissors, 
  Tv, 
  Bell, 
  ChevronRight,
  Phone,
  RotateCcw,
  UserPlus,
  Printer,
  Zap,
  Ticket,
  User,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface ModoKioscoProps {
  appointments: Appointment[];
  barbers: Barber[];
  services?: Service[];
  onCreateAppointment?: (data: any) => Promise<any>;
  onRefresh?: () => void;
  formatPrice: (price: number) => string;
  onClose?: () => void;
}

export default function ModoKiosco({
  appointments,
  barbers,
  services = [],
  onCreateAppointment,
  onRefresh,
  formatPrice,
  onClose
}: ModoKioscoProps) {
  // Mode tabs: "checkin" (existing booking phone checkin), "walkin" (new walk-in self signup), "queue" (TV screen view)
  const [activeTab, setActiveTab] = useState<"checkin" | "walkin" | "queue">("walkin");

  // Check-In existing appointment state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [checkedInAppt, setCheckedInAppt] = useState<Appointment | null>(null);
  const [errorMsgCheckin, setErrorMsgCheckin] = useState<string | null>(null);

  // Walk-In wizard state
  const [walkinStep, setWalkinStep] = useState<1 | 2 | 3 | 4>(1); // 1: Name & Phone, 2: Service, 3: Barber, 4: Ticket Ticket
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [loadingWalkin, setLoadingWalkin] = useState(false);
  const [walkinError, setWalkinError] = useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<{
    turnCode: string;
    clientName: string;
    serviceName: string;
    barberName: string;
    estimatedWaitMins: number;
    price: number;
    time: string;
  } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const todayApps = appointments.filter(a => a.date === today && a.status !== "canceled");

  const nowServing = todayApps.filter(a => a.status === "confirmed" || a.status === "en_espera");
  const waitingQueue = todayApps.filter(a => a.status === "en_espera" || a.checkedIn);

  // Keypad helpers for Check-In
  const handleKeyPress = (num: string) => {
    if (phoneNumber.length < 10) {
      setPhoneNumber(prev => prev + num);
      setErrorMsgCheckin(null);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
    setErrorMsgCheckin(null);
  };

  const handleClear = () => {
    setPhoneNumber("");
    setErrorMsgCheckin(null);
  };

  const handleCheckIn = async (customPhone?: string) => {
    const phoneToSubmit = customPhone || phoneNumber;
    if (!phoneToSubmit || phoneToSubmit.length < 7) {
      setErrorMsgCheckin("Ingresa tu número de teléfono registrado.");
      return;
    }

    setLoadingCheckin(true);
    setErrorMsgCheckin(null);

    try {
      const res = await fetch("/api/kiosk/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToSubmit })
      });

      const data = await res.json();
      if (res.ok && data.appointment) {
        setCheckedInAppt(data.appointment);
        setPhoneNumber("");
        if (onRefresh) onRefresh();
      } else {
        setErrorMsgCheckin(data.error || "No se encontró cita activa para hoy con este número.");
      }
    } catch (err) {
      setErrorMsgCheckin("Error al conectar con la recepción. Intenta nuevamente.");
    } finally {
      setLoadingCheckin(false);
    }
  };

  // Default services fallback if empty
  const availableServices = services.length > 0 ? services : [
    { id: "s1", name: "Corte de Autor (Fade / Degradado)", price: 20000, duration: 30, category: "cabello", description: "Degradado milimétrico y peinado con cera." },
    { id: "s2", name: "Ritual de Barba a Navaja y Vapor", price: 15000, duration: 30, category: "barba", description: "Perfilado con toalla caliente aromática y vapor." },
    { id: "s3", name: "Combo Imperial (Corte + Barba)", price: 32000, duration: 60, category: "cabello", description: "Corte completo y experiencia de barba imperial." },
  ];

  const activeBarbers = barbers.filter(b => b.isActive);

  // Calculate estimated wait time based on queue length
  const calculateEstimatedWait = (barberIdChosen: string, serviceDuration: number) => {
    const activeBarbersCount = Math.max(1, activeBarbers.length);
    const waitingInQueueCount = waitingQueue.length;
    
    if (barberIdChosen !== "any") {
      const barberQueue = waitingQueue.filter(a => a.barberId === barberIdChosen).length;
      return Math.max(10, barberQueue * 30 + 10);
    }
    
    // Distributed average
    return Math.max(10, Math.ceil((waitingInQueueCount * 25) / activeBarbersCount));
  };

  // Submit Walk-In Signup
  const handleWalkinSubmit = async () => {
    if (!walkinName.trim()) {
      setWalkinError("Por favor ingresa tu nombre.");
      return;
    }
    if (!selectedServiceId) {
      setWalkinError("Por favor selecciona un servicio.");
      return;
    }

    setLoadingWalkin(true);
    setWalkinError(null);

    const chosenService = availableServices.find(s => s.id === selectedServiceId);
    const chosenBarber = activeBarbers.find(b => b.id === selectedBarberId);
    const barberNameStr = chosenBarber ? chosenBarber.name : "Cualquier Barbero Disponible";
    const waitTimeMins = calculateEstimatedWait(selectedBarberId, chosenService?.duration || 30);

    try {
      const res = await fetch("/api/kiosk/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: walkinName.trim(),
          clientPhone: walkinPhone.trim() || "Walk-in Entrada",
          serviceId: selectedServiceId,
          barberId: selectedBarberId
        })
      });

      const data = await res.json();
      if (res.ok && data.appointment) {
        setGeneratedTicket({
          turnCode: data.turnCode || `W-${Math.floor(Math.random() * 90 + 10)}`,
          clientName: walkinName.trim(),
          serviceName: chosenService?.name || "Servicio Barbería",
          barberName: barberNameStr,
          estimatedWaitMins: waitTimeMins,
          price: chosenService?.price || 0,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setWalkinStep(4);
        if (onRefresh) onRefresh();
      } else {
        // Fallback to client side if API endpoint fails
        if (onCreateAppointment) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const turnCodeStr = `W-${Math.floor(Math.random() * 90 + 10)}`;
          await onCreateAppointment({
            clientName: walkinName.trim(),
            clientPhone: walkinPhone.trim() || "Walk-in Entrada",
            serviceId: selectedServiceId,
            barberId: selectedBarberId === "any" ? undefined : selectedBarberId,
            date: today,
            time: nowStr,
            status: "en_espera",
            checkedIn: true,
            notes: `[WALK-IN KIOSCO] Turno ${turnCodeStr}`
          });
          setGeneratedTicket({
            turnCode: turnCodeStr,
            clientName: walkinName.trim(),
            serviceName: chosenService?.name || "Servicio Barbería",
            barberName: barberNameStr,
            estimatedWaitMins: waitTimeMins,
            price: chosenService?.price || 0,
            time: nowStr
          });
          setWalkinStep(4);
          if (onRefresh) onRefresh();
        } else {
          setWalkinError(data.error || "No se pudo registrar en la lista de espera.");
        }
      }
    } catch (err) {
      console.error(err);
      setWalkinError("Error de conexión con recepción. Por favor avisa al barbero.");
    } finally {
      setLoadingWalkin(false);
    }
  };

  const resetWalkinForm = () => {
    setWalkinStep(1);
    setWalkinName("");
    setWalkinPhone("");
    setSelectedServiceId("");
    setSelectedBarberId("any");
    setGeneratedTicket(null);
    setWalkinError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060A13] text-white flex flex-col font-sans overflow-hidden select-none animate-fadeIn">
      {/* Kiosk Header */}
      <header className="p-4 md:p-5 bg-[#0E1524] border-b border-[#1F314D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <div className="h-full w-full bg-[#0E1524] rounded-[14px] flex items-center justify-center">
              <Scissors className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              KIOSCO DE ENTRADA & RECEPCIÓN
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                Autoservicio Táctil
              </span>
            </h1>
            <p className="text-xs text-slate-400">Punto de atención para clientes sin cita (Walk-in) y Confirmación de Reservas</p>
          </div>
        </div>

        {/* Tab Switcher & Exit */}
        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab("walkin")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "walkin"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
                : "bg-[#162237] border border-[#1F314D] text-slate-300 hover:text-white"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>🚶‍♂️ Llegué sin Cita (Walk-in)</span>
          </button>

          <button
            onClick={() => setActiveTab("checkin")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "checkin"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
                : "bg-[#162237] border border-[#1F314D] text-slate-300 hover:text-white"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>📋 Tengo una Cita</span>
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-black shadow-lg shadow-cyan-500/20"
                : "bg-[#162237] border border-[#1F314D] text-slate-300 hover:text-white"
            }`}
          >
            <Tv className="h-4 w-4 text-cyan-300" />
            <span>📺 Pantalla TV de Turnos</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-red-950/40 border border-red-800/40 text-red-300 hover:bg-red-900/60 rounded-xl transition-all cursor-pointer"
              title="Salir de Modo Kiosco"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* BODY CONTENT DEPENDING ON ACTIVE TAB */}

      {/* 1. WALK-IN TAB (TOUCHSCREEN WIZARD FOR WALK-INS) */}
      {activeTab === "walkin" && (
        <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col justify-center overflow-y-auto">
          {walkinStep === 1 && (
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 md:p-10 space-y-6 shadow-2xl animate-fadeIn">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                  Paso 1 de 3: Tus Datos
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-white">
                  ¡Bienvenido! ¿Cómo te llamas?
                </h2>
                <p className="text-sm text-slate-400">
                  Ingresa tu nombre para anotarte en la lista de espera virtual de la barbería.
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full px-5 py-4 bg-[#162237] border-2 border-amber-500/40 rounded-2xl text-white text-xl font-bold focus:outline-none focus:border-amber-400 font-sans shadow-inner"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Número Celular / WhatsApp (Opcional para avisarte)
                  </label>
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    className="w-full px-5 py-3.5 bg-[#162237] border border-[#1F314D] rounded-2xl text-amber-300 text-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                {walkinError && (
                  <p className="text-red-400 text-xs font-bold text-center bg-red-950/40 p-3 rounded-xl border border-red-800/40">
                    {walkinError}
                  </p>
                )}

                <button
                  onClick={() => {
                    if (!walkinName.trim()) {
                      setWalkinError("Ingresa tu nombre para continuar.");
                      return;
                    }
                    setWalkinError(null);
                    setWalkinStep(2);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  <span>Siguiente: Seleccionar Servicio</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {walkinStep === 2 && (
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1F314D] pb-4">
                <div>
                  <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    Paso 2 de 3: Selección de Servicio
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-white mt-1">
                    ¿Qué servicio deseas hoy, {walkinName}?
                  </h2>
                </div>
                <button
                  onClick={() => setWalkinStep(1)}
                  className="px-3 py-1.5 bg-[#162237] text-slate-300 text-xs font-bold rounded-xl border border-[#1F314D] hover:text-white"
                >
                  ← Cambiar Nombre
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-1">
                {availableServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-95 ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20"
                          : "bg-[#162237]/80 border-[#1F314D] hover:border-amber-500/50 hover:bg-[#1A2942]"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-base text-white">{service.name}</h3>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{service.description || "Atención profesional personalizada."}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1F314D]/60 text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          {service.duration} min
                        </span>
                        <span className="font-black text-amber-400 text-sm">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {walkinError && (
                <p className="text-red-400 text-xs font-bold text-center bg-red-950/40 p-3 rounded-xl border border-red-800/40">
                  {walkinError}
                </p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => setWalkinStep(1)}
                  className="px-6 py-4 bg-[#162237] text-slate-300 font-bold text-sm rounded-2xl border border-[#1F314D] hover:text-white"
                >
                  Atrás
                </button>
                <button
                  onClick={() => {
                    if (!selectedServiceId) {
                      setWalkinError("Selecciona un servicio para continuar.");
                      return;
                    }
                    setWalkinError(null);
                    setWalkinStep(3);
                  }}
                  disabled={!selectedServiceId}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Siguiente: Elegir Barbero</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {walkinStep === 3 && (
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1F314D] pb-4">
                <div>
                  <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    Paso 3 de 3: Selección de Barbero
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-white mt-1">
                    ¿Prefieres un Barbero en específico?
                  </h2>
                </div>
                <button
                  onClick={() => setWalkinStep(2)}
                  className="px-3 py-1.5 bg-[#162237] text-slate-300 text-xs font-bold rounded-xl border border-[#1F314D] hover:text-white"
                >
                  ← Cambiar Servicio
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Any Barber Card */}
                <div
                  onClick={() => setSelectedBarberId("any")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-95 ${
                    selectedBarberId === "any"
                      ? "bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20"
                      : "bg-[#162237]/80 border-[#1F314D] hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 font-bold text-xl shrink-0">
                      ⚡
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">Cualquier Barbero</h3>
                      <p className="text-xs text-amber-400 font-bold">¡Atención Más Rápida!</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">El primer barbero que se desocupe atenderá tu turno inmediatamente.</p>
                </div>

                {/* Specific active barbers */}
                {activeBarbers.map((barber) => {
                  const isSelected = selectedBarberId === barber.id;
                  return (
                    <div
                      key={barber.id}
                      onClick={() => setSelectedBarberId(barber.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-95 ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20"
                          : "bg-[#162237]/80 border-[#1F314D] hover:border-amber-500/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg uppercase shrink-0">
                          {barber.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-white">{barber.name}</h3>
                          <p className="text-xs text-slate-400 font-mono">@{barber.username}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {barber.specialties ? barber.specialties.join(", ") : "Especialista en degradado y barba"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {walkinError && (
                <p className="text-red-400 text-xs font-bold text-center bg-red-950/40 p-3 rounded-xl border border-red-800/40">
                  {walkinError}
                </p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => setWalkinStep(2)}
                  className="px-6 py-4 bg-[#162237] text-slate-300 font-bold text-sm rounded-2xl border border-[#1F314D] hover:text-white"
                >
                  Atrás
                </button>
                <button
                  onClick={handleWalkinSubmit}
                  disabled={loadingWalkin}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-3"
                >
                  {loadingWalkin ? (
                    <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Ticket className="h-6 w-6" />
                      <span>GENERAR MI TICKET DE TURNO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VIRTUAL TICKET GENERATED */}
          {walkinStep === 4 && generatedTicket && (
            <div className="bg-[#0E1524] border-2 border-amber-500/60 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-amber-500/20 max-w-xl mx-auto animate-scaleUp">
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30">
                  ¡TE HAS ANOTADO CON ÉXITO!
                </span>
                <h2 className="text-3xl font-black text-white pt-2">
                  ¡Hola, {generatedTicket.clientName}!
                </h2>
                <p className="text-slate-300 text-sm">
                  Toma asiento en nuestra sala de espera. Te llamaremos en pantalla.
                </p>
              </div>

              {/* High Contrast Ticket Display */}
              <div className="bg-[#162237] border-2 border-dashed border-amber-500/40 p-6 rounded-3xl space-y-4 font-mono text-left relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between border-b border-[#1F314D] pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase">CÓDIGO DE TURNO</span>
                  <span className="text-xs text-amber-400 font-bold">{generatedTicket.time} hs</span>
                </div>

                <div className="text-center py-2">
                  <span className="text-5xl md:text-6xl font-black text-amber-400 tracking-wider block drop-shadow-md">
                    #{generatedTicket.turnCode}
                  </span>
                  <span className="text-xs text-slate-300 uppercase tracking-widest font-bold mt-1 block">
                    Turno Walk-in Lista de Espera
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-3 border-t border-[#1F314D] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Servicio:</span>
                    <span className="font-bold text-white">{generatedTicket.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barbero:</span>
                    <span className="font-bold text-amber-300">{generatedTicket.barberName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Precio Servicio:</span>
                    <span className="font-bold text-emerald-400">{formatPrice(generatedTicket.price)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm border-t border-[#1F314D]/40">
                    <span className="text-slate-300 font-bold">Tiempo Estimado de Espera:</span>
                    <span className="font-black text-cyan-300">~{generatedTicket.estimatedWaitMins} minutos</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3.5 bg-[#162237] border border-[#1F314D] text-slate-200 text-xs font-bold rounded-2xl hover:text-white flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4 text-slate-400" />
                  <span>Imprimir Ticket</span>
                </button>
                <button
                  onClick={resetWalkinForm}
                  className="w-full sm:flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Siguiente Cliente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CHECK-IN TAB (EXISTING BOOKING CHECKIN BY PHONE) */}
      {activeTab === "checkin" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full items-center">
          
          {/* Left Column: Number Pad & Input */}
          <div className="lg:col-span-7 space-y-6">
            {checkedInAppt ? (
              <div className="bg-[#0E1524] border-2 border-emerald-500/60 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-emerald-500/10 animate-scaleUp">
                <div className="h-20 w-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono bg-emerald-500/10 px-3 py-1 rounded-full">
                    ¡CHECK-IN CONFIRMADO!
                  </span>
                  <h2 className="text-3xl font-black text-white">
                    ¡Hola, {checkedInAppt.clientName}!
                  </h2>
                  <p className="text-slate-300 text-sm max-w-md mx-auto">
                    Hemos notificado a tu barbero <span className="text-amber-400 font-bold">{checkedInAppt.barberName || "General"}</span> de tu llegada. Por favor pasa a la sala de espera.
                  </p>
                </div>

                <div className="bg-[#162237] border border-[#1F314D] p-4 rounded-2xl max-w-md mx-auto text-left space-y-2 font-mono text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Servicio:</span>
                    <span className="font-bold text-white">{checkedInAppt.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hora Cita:</span>
                    <span className="font-bold text-amber-400">{checkedInAppt.time} hs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado:</span>
                    <span className="font-bold text-emerald-400">En Lista de Espera Recepción</span>
                  </div>
                </div>

                <button
                  onClick={() => setCheckedInAppt(null)}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Siguiente Cliente</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    Ingresa tu Número Celular
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400">
                    Marca tu teléfono para confirmar tu reserva agendada de hoy
                  </p>
                </div>

                {/* Display Phone Input */}
                <div className="relative">
                  <div className="w-full bg-[#162237] border-2 border-amber-500/50 rounded-2xl py-4 px-6 text-center text-3xl font-black font-mono tracking-widest text-amber-400 min-h-[64px] flex items-center justify-center shadow-inner">
                    {phoneNumber ? (
                      phoneNumber
                    ) : (
                      <span className="text-slate-600 text-lg font-normal">3XX XXX XXXX</span>
                    )}
                  </div>

                  {phoneNumber && (
                    <button
                      onClick={handleClear}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold bg-[#0E1524] px-2 py-1 rounded-lg border border-[#1F314D]"
                    >
                      Borrar
                    </button>
                  )}
                </div>

                {errorMsgCheckin && (
                  <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs font-bold text-center animate-shake">
                    {errorMsgCheckin}
                  </div>
                )}

                {/* Digital Keypad */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      className="h-14 bg-[#162237] border border-[#1F314D] hover:bg-amber-500/20 hover:border-amber-500/60 text-white text-2xl font-black rounded-2xl transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center font-mono"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    className="h-14 bg-red-950/30 border border-red-800/40 text-red-400 text-xs font-bold rounded-2xl hover:bg-red-900/40 transition-all cursor-pointer flex items-center justify-center"
                  >
                    LIMPIAR
                  </button>
                  <button
                    onClick={() => handleKeyPress("0")}
                    className="h-14 bg-[#162237] border border-[#1F314D] hover:bg-amber-500/20 text-white text-2xl font-black rounded-2xl transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center font-mono"
                  >
                    0
                  </button>
                  <button
                    onClick={handleDelete}
                    className="h-14 bg-[#162237] border border-[#1F314D] text-slate-300 hover:bg-slate-800 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center"
                  >
                    ⌫ BORRAR
                  </button>
                </div>

                {/* Action Submit */}
                <button
                  onClick={() => handleCheckIn()}
                  disabled={loadingCheckin || !phoneNumber}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-3"
                >
                  {loadingCheckin ? (
                    <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="h-6 w-6" />
                      <span>CONFIRMAR MI LLEGADA</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Today's Appointments List for quick tap */}
          <div className="lg:col-span-5 space-y-4 h-full flex flex-col justify-center">
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F314D] pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  Citas Agendadas Hoy ({todayApps.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Toca tu nombre si prefieres</span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {todayApps.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs italic">
                    No hay citas agendadas previamente hoy. ¡Usa el modo Walk-in!
                  </div>
                ) : (
                  todayApps.map(app => (
                    <div
                      key={app.id}
                      onClick={() => handleCheckIn(app.clientPhone)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        app.checkedIn || app.status === "en_espera"
                          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                          : "bg-[#162237]/60 border-[#1F314D] hover:bg-[#1A2942] hover:border-amber-500/40 text-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{app.clientName}</span>
                          {app.checkedIn && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">
                              ✓ En Espera
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {app.serviceName} con <span className="text-amber-400">{app.barberName || "General"}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black font-mono bg-[#0E1524] px-2.5 py-1 rounded-xl border border-[#1F314D] text-amber-400">
                          {app.time} hs
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. QUEUE TV MONITOR VIEW */}
      {activeTab === "queue" && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Atendiendo Ahora */}
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F314D] pb-3">
                <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-amber-400" />
                  Atendiendo Ahora en Silla
                </h3>
                <span className="text-xs text-slate-400 font-mono">{nowServing.length} en servicio</span>
              </div>

              <div className="space-y-3">
                {nowServing.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm italic">
                    Ninguna silla ocupada actualmente.
                  </div>
                ) : (
                  nowServing.map(app => (
                    <div key={app.id} className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-lg text-white">{app.clientName}</h4>
                          {app.notes?.includes("[WALK-IN") && (
                            <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-md font-bold font-mono">
                              Walk-in 🚶‍♂️
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{app.serviceName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 uppercase font-mono block">Barbero</span>
                        <span className="text-sm font-black text-white">{app.barberName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* En Espera en Recepción */}
            <div className="bg-[#0E1524] border border-[#1F314D] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F314D] pb-3">
                <h3 className="text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  En Espera en Recepción
                </h3>
                <span className="text-xs text-slate-400 font-mono">{waitingQueue.length} clientes listos</span>
              </div>

              <div className="space-y-3">
                {waitingQueue.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm italic">
                    Sin clientes en espera por el momento.
                  </div>
                ) : (
                  waitingQueue.map((app, i) => (
                    <div key={app.id} className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="h-8 w-8 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black rounded-full flex items-center justify-center font-mono text-xs">
                          #{i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-white">{app.clientName}</h4>
                            {app.notes?.includes("[WALK-IN") && (
                              <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-md font-bold font-mono">
                                Walk-in 🚶‍♂️
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{app.serviceName} ({app.time} hs)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 font-mono">Con {app.barberName || "General"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
