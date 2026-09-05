import React, { useState } from "react";
import { Appointment, ClientAccount, Barber, Service } from "../types";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  X, 
  Scissors, 
  User, 
  Zap, 
  ArrowRight,
  Send,
  CalendarDays
} from "lucide-react";

interface AutoReagendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientAccount | null;
  completedAppointment: Appointment | null;
  services: Service[];
  barbers: Barber[];
  salonName?: string;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  onToast?: (message: string) => void;
}

export default function AutoReagendaModal({
  isOpen,
  onClose,
  client,
  completedAppointment,
  services,
  barbers,
  salonName = "Barbería Pro",
  onCreateAppointment,
  onToast
}: AutoReagendaModalProps) {
  if (!isOpen || !completedAppointment) return null;

  const [selectedBarberId, setSelectedBarberId] = useState<string>(completedAppointment.barberId || barbers[0]?.id || "");
  const [selectedServiceId, setSelectedServiceId] = useState<string>(completedAppointment.serviceId || services[0]?.id || "");
  const [selectedTime, setSelectedTime] = useState<string>(completedAppointment.time || "10:00");
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookedOptionIndex, setBookedOptionIndex] = useState<number | null>(null);

  // Cycle calculation
  const cycleDays = client?.avgCutCycleDays || 15;
  const clientName = client?.name || completedAppointment.clientName || "Cliente";
  const clientPhone = client?.phone || completedAppointment.clientPhone || "";

  // Helper date function
  const formatDateSpanish = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const addDaysToDate = (startDateStr: string, daysToAdd: number): string => {
    try {
      const parts = startDateStr.split("-");
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      date.setDate(date.getDate() + daysToAdd);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      return d.toISOString().split("T")[0];
    }
  };

  const baseDate = completedAppointment.date || new Date().toISOString().split("T")[0];

  // 3 Smart Options
  const option1Date = addDaysToDate(baseDate, cycleDays);
  const option2Date = addDaysToDate(baseDate, Math.max(7, cycleDays - 3));
  const option3Date = addDaysToDate(baseDate, cycleDays + 3);

  const options = [
    {
      index: 1,
      title: `Ciclo Habitual (${cycleDays} días)`,
      badge: "⭐ Sugerencia Ideal",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      cardBorder: "border-amber-500/60 hover:border-amber-400 bg-amber-500/5",
      dateStr: option1Date,
      formattedDate: formatDateSpanish(option1Date),
      description: "Momento exacto en que tu cabello requiere renovación según tu ritmo."
    },
    {
      index: 2,
      title: `Siempre Impecable (${Math.max(7, cycleDays - 3)} días)`,
      badge: "⚡ Look Intacto",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      cardBorder: "border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/5",
      dateStr: option2Date,
      formattedDate: formatDateSpanish(option2Date),
      description: "Para mantener el degradado y contornos 100% frescos sin perder forma."
    },
    {
      index: 3,
      title: `Opción Flexible (${cycleDays + 3} días)`,
      badge: "🎉 Fin de Semana",
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
      cardBorder: "border-sky-500/50 hover:border-sky-400 bg-sky-500/5",
      dateStr: option3Date,
      formattedDate: formatDateSpanish(option3Date),
      description: "Espacio ideal para retocar tu corte cómodamente sin afanes de trabajo."
    }
  ];

  // Selected Service object
  const currentService = services.find((s) => s.id === selectedServiceId) || {
    id: completedAppointment.serviceId,
    name: completedAppointment.serviceName,
    price: completedAppointment.price,
    duration: 30
  };

  const currentBarber = barbers.find((b) => b.id === selectedBarberId) || {
    id: completedAppointment.barberId,
    name: completedAppointment.barberName
  };

  // Direct Booking Handler
  const handleBookOption = async (opt: typeof options[0]) => {
    setIsBooking(true);
    try {
      const newAppPayload = {
        tenantId: (completedAppointment as any).tenantId,
        clientId: client?.id || undefined,
        clientName: clientName,
        clientPhone: clientPhone,
        clientEmail: client?.email || completedAppointment.clientEmail || "",
        serviceId: currentService.id,
        serviceName: currentService.name,
        barberId: currentBarber.id,
        barberName: currentBarber.name,
        date: opt.dateStr,
        time: selectedTime,
        duration: currentService.duration || 30,
        price: currentService.price || 0,
        status: "confirmed",
        notes: `Agendado automáticamente al finalizar corte previo (Ciclo: ${cycleDays}d)`
      };

      const created = await onCreateAppointment(newAppPayload);
      
      // Save ID and Phone to localStorage so client sees it immediately
      const createdId = created?.id || created?.appointment?.id;
      if (createdId) {
        try {
          const existingApps = JSON.parse(localStorage.getItem("bella_barba_appointments") || "[]");
          if (!existingApps.includes(createdId)) {
            existingApps.push(createdId);
            localStorage.setItem("bella_barba_appointments", JSON.stringify(existingApps));
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (clientPhone) {
        localStorage.setItem("bella_barba_last_phone", clientPhone);
      }

      setBookedOptionIndex(opt.index);
      if (onToast) {
        onToast(`🎉 ¡Próxima cita agendada para el ${opt.formattedDate} a las ${selectedTime}!`);
      }
      setTimeout(() => {
        setIsBooking(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      if (onToast) {
        onToast("❌ Hubo un error al agendar la próxima cita.");
      }
      setIsBooking(false);
    }
  };

  // WhatsApp formatted message with the 3 options
  const cleanPhone = clientPhone.replace(/[^0-9+]/g, "");
  const waMessage = `¡Hola ${clientName}! 💈 Muchas gracias por visitar ${salonName} hoy.

Para mantener tu corte siempre impecable según tu ciclo habitual de ${cycleDays} días, te sugiero desde ya reservar tu próximo espacio:

1️⃣ ${options[0].formattedDate} a las ${selectedTime}
2️⃣ ${options[1].formattedDate} a las ${selectedTime}
3️⃣ ${options[2].formattedDate} a las ${selectedTime}

¿Cuál de estas opciones prefieres para dejártela agendada de una vez? ✂️✨`;

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#121218] border border-amber-500/40 rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden my-auto text-white">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black flex items-center justify-center font-black text-xl shadow-lg shrink-0">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1 font-mono">
                  <Sparkles className="h-3.5 w-3.5" />
                  REAGENDAMIENTO AUTOMÁTICO
                </span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {cycleDays} Días
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Próxima Cita para {clientName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SELECTOR RAPIDO DE SERVICIO, BARBERO Y HORA PREFERIDA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#181822] p-3 rounded-2xl border border-neutral-800 relative z-10">
          <div>
            <label className="text-[10px] font-extrabold text-neutral-400 uppercase block mb-1">Servicio:</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full bg-[#101016] border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${s.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-neutral-400 uppercase block mb-1">Barbero:</label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-[#101016] border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-neutral-400 uppercase block mb-1">Hora Habitual:</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-[#101016] border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold text-center focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 3 OPCIONES SUGERIDAS */}
        <div className="space-y-3 relative z-10">
          <p className="text-xs text-neutral-300 font-medium">
            Calculamos automáticamente 3 fechas óptimas según la frecuencia del cliente (<strong>cada {cycleDays} días</strong>):
          </p>

          <div className="space-y-2.5">
            {options.map((opt) => {
              const isBooked = bookedOptionIndex === opt.index;

              return (
                <div
                  key={opt.index}
                  className={`border rounded-2xl p-3.5 transition-all relative ${opt.cardBorder} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                      <span className="text-[11px] font-mono font-extrabold text-amber-400">
                        {opt.formattedDate}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{opt.title}</span>
                      <span className="text-xs font-mono text-neutral-400 font-normal">a las {selectedTime} hs</span>
                    </h4>

                    <p className="text-[11px] text-neutral-400 leading-snug">
                      {opt.description}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                    <button
                      onClick={() => handleBookOption(opt)}
                      disabled={isBooking}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                        isBooked
                          ? "bg-emerald-600 text-white"
                          : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black"
                      }`}
                    >
                      {isBooked ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>¡Agendado!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 fill-black" />
                          <span>Agendar en 1 Tap</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÓN WHATSAPP DE OPCIONES PRE-ARMADAS */}
        <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="text-[11px] text-neutral-400 text-center sm:text-left">
            <span className="block font-bold text-white">¿Prefieres que el cliente elija?</span>
            <span>Envíale las 3 opciones por WhatsApp para que te responda de inmediato.</span>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Enviar 3 Opciones por WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
}
