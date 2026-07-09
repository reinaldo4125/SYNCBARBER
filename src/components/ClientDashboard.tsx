import React, { useState, useEffect } from "react";
import { Appointment, Service, SalonConfig, AppointmentStatus, Barber, MembershipPlan, ClientAccount, BarberReview } from "../types";
import { 
  Scissors, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  AlertCircle,
  XCircle,
  HelpCircle,
  CreditCard,
  Award,
  Lock,
  LogOut,
  Check,
  Gift,
  Percent
} from "lucide-react";

interface ClientDashboardProps {
  appointments: Appointment[];
  services: Service[];
  barbers?: Barber[];
  config: SalonConfig;
  onCreateAppointment: (appointmentData: any) => Promise<any>;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  formatPrice: (price: number) => string;
  memberships: MembershipPlan[];
  reviews?: BarberReview[];
}

export default function ClientDashboard({
  appointments,
  services,
  barbers = [],
  config,
  onCreateAppointment,
  onUpdateAppointment,
  formatPrice,
  memberships = [],
  reviews = [],
}: ClientDashboardProps) {
  // Navigation categories
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Client Portal & Membership Tabs
  const [clientTab, setClientTab] = useState<"booking" | "memberships" | "account">("booking");
  const [loggedClient, setLoggedClient] = useState<ClientAccount | null>(null);

  // Client Auth Form States
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  const getActiveDiscount = () => {
    if (!loggedClient || !loggedClient.membershipActive || !loggedClient.membershipId) return null;
    const plan = memberships.find(m => m.id === loggedClient.membershipId);
    return plan ? plan.discountPercent : null;
  };

  const discountPercent = getActiveDiscount();

  const calculateSavings = () => {
    if (!loggedClient) return 0;
    
    // Find completed appointments for this loggedClient
    const completedApps = appointments.filter(
      app => app.status === "completed" && 
      (app.clientPhone.replace(/\s+/g, '') === loggedClient.phone.replace(/\s+/g, '') || 
       (loggedClient.email && app.clientEmail && app.clientEmail.toLowerCase() === loggedClient.email.toLowerCase()))
    );
    
    let totalSaved = 0;
    
    completedApps.forEach(app => {
      // Find matching service
      const service = services.find(s => s.id === app.serviceId);
      if (service) {
        if (app.price === 0) {
          // If they redeemed a free courtesy cut, they saved the full price!
          totalSaved += service.price;
        } else {
          // Otherwise, they saved the difference between base price and what they paid
          const diff = service.price - app.price;
          if (diff > 0) {
            totalSaved += diff;
          }
        }
      }
    });
    
    return totalSaved;
  };

  // Booking process state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redeemReward, setRedeemReward] = useState(false);

  // Review Form States (Propuesta A)
  const [reviewBarberId, setReviewBarberId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Client's own appointments tracked in localStorage
  const [myAppIds, setMyAppIds] = useState<string[]>([]);

  // Load my appointment IDs and client session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bella_barba_appointments");
    if (saved) {
      try {
        setMyAppIds(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading client bookings from localStorage:", e);
      }
    }

    const savedClient = localStorage.getItem("bella_barba_logged_client");
    if (savedClient) {
      try {
        setLoggedClient(JSON.parse(savedClient));
      } catch (e) {
        console.error("Error loading client session:", e);
      }
    }
  }, []);

  // Listen for real-time updates to client accounts (Propuesta B)
  useEffect(() => {
    const handleClientUpdate = (e: Event) => {
      const updatedClient = (e as CustomEvent).detail;
      const savedClientStr = localStorage.getItem("bella_barba_logged_client");
      if (savedClientStr) {
        try {
          const currentClient = JSON.parse(savedClientStr);
          if (currentClient && currentClient.id === updatedClient.id) {
            console.log("[ClientDashboard] Sincronizando datos de cliente actualizados:", updatedClient);
            setLoggedClient(updatedClient);
            localStorage.setItem("bella_barba_logged_client", JSON.stringify(updatedClient));
          }
        } catch (err) {
          console.error("Error parsing saved client during real-time update:", err);
        }
      }
    };

    window.addEventListener("bella_barba_client_updated", handleClientUpdate);
    return () => {
      window.removeEventListener("bella_barba_client_updated", handleClientUpdate);
    };
  }, []);

  // Synchronize client details with the server on mount or tab change to avoid stale cached localStorage data
  useEffect(() => {
    if (loggedClient && loggedClient.id) {
      fetch(`/api/clients/${loggedClient.id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to sync client profile");
        })
        .then((data) => {
          if (data && data.success && data.client) {
            console.log("[ClientDashboard] Sincronizado perfil de cliente con el servidor:", data.client);
            setLoggedClient(data.client);
            localStorage.setItem("bella_barba_logged_client", JSON.stringify(data.client));
          }
        })
        .catch((err) => {
          console.error("[ClientDashboard] Error al sincronizar perfil de cliente:", err);
        });
    }
  }, [clientTab]);

  // Autofill booking details if logged in
  useEffect(() => {
    if (loggedClient) {
      setClientName(loggedClient.name);
      setClientPhone(loggedClient.phone);
      setClientEmail(loggedClient.email);
    } else {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
    }
  }, [loggedClient]);

  // Compute barber rating from reviews list
  const getBarberRating = (barberId: string) => {
    const barberReviews = reviews.filter(r => r.barberId === barberId);
    if (barberReviews.length === 0) return { avg: "Nuevo", count: 0 };
    const sum = barberReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = (sum / barberReviews.length).toFixed(1);
    return { avg, count: barberReviews.length };
  };

  // Filter category of services
  const filteredServices = services.filter(
    (s) => activeCategory === "all" || s.category === activeCategory
  );

  // Compute next 7 available business days
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // Check up to 14 days out to find 7 valid working days
    for (let i = 0; i < 14; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...

      // Express server working days. e.g. [1,2,3,4,5,6] (Mon-Sat)
      if (config.workingDays.includes(dayOfWeek)) {
        dates.push(targetDate.toISOString().split("T")[0]);
      }

      if (dates.length === 7) break;
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  // Set initial date when service is selected
  useEffect(() => {
    if (selectedService && !selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [selectedService]);

  // Generate potential time slots for the day
  const getTimeSlots = () => {
    const slots: string[] = [];
    const [openH, openM] = config.openTime.split(":").map(Number);
    const [closeH, closeM] = config.closeTime.split(":").map(Number);

    let currentMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    while (currentMinutes < closeMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeString = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      slots.push(timeString);
      currentMinutes += config.intervalMinutes;
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Overlap checker: check if a specific slot is busy taking preferred barber into account
  const isSlotBusy = (date: string, time: string) => {
    if (!selectedService) return false;
    
    const startToMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const startA = startToMin(time);
    const endA = startA + selectedService.duration;

    // Filter active barbers who are NOT blocked on this date!
    const activeBarbers = barbers.filter(b => b.isActive && !(b.blockedDates && b.blockedDates.includes(date)));
    if (activeBarbers.length === 0) return true;

    if (selectedBarberId && selectedBarberId !== "any") {
      // Check if selected specific barber is blocked on this date!
      const targetBarber = barbers.find(b => b.id === selectedBarberId);
      if (targetBarber && targetBarber.blockedDates && targetBarber.blockedDates.includes(date)) {
        return true; // Overlapping/unavailable!
      }

      // Check if this specific barber is busy
      return appointments.some((app) => {
        if (app.date !== date) return false;
        if (app.status === "canceled") return false;
        if (app.barberId !== selectedBarberId) return false;

        const startB = startToMin(app.time);
        const endB = startB + app.duration;

        return startA < endB && startB < endA;
      });
    } else {
      // "Any barber" selected. A slot is busy ONLY if ALL active, non-blocked barbers are busy.
      const freeBarbers = activeBarbers.filter(barber => {
        const isBusy = appointments.some((app) => {
          if (app.date !== date) return false;
          if (app.status === "canceled") return false;
          if (app.barberId !== barber.id) return false;

          const startB = startToMin(app.time);
          const endB = startB + app.duration;

          return startA < endB && startB < endA;
        });
        return !isBusy;
      });

      return freeBarbers.length === 0;
    }
  };

  // Format date display
  const formatDateLabel = (dateStr: string) => {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    
    const date = new Date(dateStr + "T12:00:00");
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    
    return {
      dayName,
      dayNum,
      monthName,
      full: `${dayName}, ${dayNum} de ${monthName}`
    };
  };

  // Submit appointment to the backend
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError("");
    setIsSubmitting(true);

    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      setBookingError("Por favor completa todos los campos requeridos.");
      setIsSubmitting(false);
      return;
    }

    try {
      const newApp = await onCreateAppointment({
        clientName,
        clientPhone,
        clientEmail,
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        notes: clientNotes,
        barberId: selectedBarberId,
        redeemReward, // Propuesta B
      });

      if (newApp && newApp.id) {
        // Save ID locally
        const updatedIds = [...myAppIds, newApp.id];
        setMyAppIds(updatedIds);
        localStorage.setItem("bella_barba_appointments", JSON.stringify(updatedIds));
        
        // Show success
        setBookingSuccess(newApp);
        
        // Reset process
        setSelectedService(null);
        setSelectedTime("");
        setClientNotes("");
        setRedeemReward(false);
      }
    } catch (err: any) {
      setBookingError(
        err.message || "Error al procesar el agendamiento. El horario podría haberse ocupado."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client login handler
  const handleClientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/clients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error de inicio de sesión.");
      }

      const { client } = await res.json();
      setLoggedClient(client);
      localStorage.setItem("bella_barba_logged_client", JSON.stringify(client));
      setAuthSuccess(`¡Bienvenido de nuevo, ${client.name}!`);
      setAuthEmail("");
      setAuthPassword("");
      
      // Auto transition to booking tab after success
      setTimeout(() => {
        setClientTab("booking");
        setAuthSuccess("");
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || "Credenciales incorrectas.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit client review (Propuesta A)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");
    setReviewLoading(true);

    if (!reviewBarberId || !reviewRating) {
      setReviewError("Por favor selecciona un barbero y tu calificación.");
      setReviewLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: loggedClient ? loggedClient.name : "Cliente Invitado",
          barberId: reviewBarberId,
          rating: Number(reviewRating),
          comment: reviewComment,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo enviar la reseña.");
      }

      setReviewSuccess("¡Gracias por tu opinión! Tu comentario ayuda a mejorar nuestro servicio.");
      setReviewComment("");
      setReviewBarberId("");
      setReviewRating(5);
    } catch (err: any) {
      setReviewError(err.message || "Error al enviar la reseña.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Client registration handler
  const handleClientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    if (!authName || !authPhone || !authEmail || !authPassword) {
      setAuthError("Por favor completa todos los campos.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName,
          phone: authPhone,
          email: authEmail,
          password: authPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al registrar la cuenta.");
      }

      const { client } = await res.json();
      setLoggedClient(client);
      localStorage.setItem("bella_barba_logged_client", JSON.stringify(client));
      setAuthSuccess("¡Cuenta creada con éxito! Bienvenido.");
      setAuthName("");
      setAuthPhone("");
      setAuthEmail("");
      setAuthPassword("");

      // Auto transition to memberships tab to let them choose
      setTimeout(() => {
        setClientTab("memberships");
        setAuthSuccess("");
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || "Error al crear cuenta.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Client logout handler
  const handleClientLogout = () => {
    if (window.confirm("¿Seguro que deseas cerrar sesión?")) {
      setLoggedClient(null);
      localStorage.removeItem("bella_barba_logged_client");
      setClientTab("booking");
    }
  };

  // Subscribe to membership
  const handleSubscribePlan = async (membershipId: string) => {
    if (!loggedClient) {
      setClientTab("account");
      setAuthMode("login");
      alert("Inicia sesión o regístrate para suscribirte a una membresía.");
      return;
    }

    setSubscribingPlanId(membershipId);
    try {
      const res = await fetch(`/api/clients/${loggedClient.id}/membership`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo actualizar la membresía.");
      }

      const { client } = await res.json();
      setLoggedClient(client);
      localStorage.setItem("bella_barba_logged_client", JSON.stringify(client));
      
      const planName = memberships.find(m => m.id === membershipId)?.name || "Membresía";
      alert(`¡Suscrito con éxito al ${planName}! Disfruta de tus beneficios.`);
    } catch (err: any) {
      alert(err.message || "Error al actualizar membresía.");
    } finally {
      setSubscribingPlanId(null);
    }
  };

  // Cancel membership
  const handleCancelMembership = async () => {
    if (!loggedClient) return;
    if (window.confirm("¿Estás seguro de cancelar tu suscripción de membresía? Perderás tus descuentos y beneficios al instante.")) {
      setSubscribingPlanId("cancel");
      try {
        const res = await fetch(`/api/clients/${loggedClient.id}/membership`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipId: "" }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "No se pudo cancelar la membresía.");
        }

        const { client } = await res.json();
        setLoggedClient(client);
        localStorage.setItem("bella_barba_logged_client", JSON.stringify(client));
        alert("Tu suscripción ha sido cancelada.");
      } catch (err: any) {
        alert(err.message || "Error al cancelar membresía.");
      } finally {
        setSubscribingPlanId(null);
      }
    }
  };

  // Filter server appointments to find the user's active/past bookings
  const myAppointments = appointments
    .filter((app) => myAppIds.includes(app.id))
    .sort((a, b) => {
      // Sort upcoming first
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

  // Client cancels their own booking
  const handleCancelMyBooking = async (id: string) => {
    if (window.confirm("¿Estás seguro de cancelar tu reserva?")) {
      try {
        await onUpdateAppointment(id, { status: "canceled" });
      } catch (err) {
        console.error("Error canceling booking:", err);
      }
    }
  };

  return (
    <div className="space-y-8" id="client-dashboard">
      {/* Saludo Banner */}
      <div className="bg-gradient-to-r from-elegant-card to-elegant-sub text-elegant-text rounded-3xl p-6 md:p-8 border border-elegant-border shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
          <Scissors className="h-48 w-48 stroke-1 text-elegant-gold" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-1 bg-elegant-gold/20 text-elegant-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full w-max uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            <span>Agendamiento Directo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans text-white">
            Bienvenido a {config.name}
          </h1>
          <p className="text-xs md:text-sm text-elegant-text-muted max-w-lg">
            Agenda tu cita en tiempo real. Selecciona el servicio que deseas, elige fecha y hora disponibles, y el peluquero la confirmará al instante.
          </p>
        </div>
        
        {/* Salon Details Badge */}
        <div className="bg-elegant-sub/80 border border-elegant-border p-4 rounded-2xl space-y-1 relative z-10 text-xs shrink-0 w-full md:w-auto">
          <p className="font-bold text-elegant-gold uppercase tracking-wider text-[10px]">Horario de Atención</p>
          <p className="font-medium text-white">Lunes a Sábado</p>
          <p className="font-mono text-elegant-text-muted">{config.openTime} - {config.closeTime}</p>
        </div>
      </div>

      {/* Navigation Tabs bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-elegant-border pb-1">
        <button
          onClick={() => setClientTab("booking")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-sans text-sm font-semibold transition-all duration-200 border-b-2 ${
            clientTab === "booking"
              ? "bg-elegant-card text-elegant-gold border-elegant-gold"
              : "text-elegant-text-muted hover:text-white border-transparent hover:bg-elegant-sub/30"
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>Agendar Turno</span>
        </button>
        <button
          onClick={() => setClientTab("memberships")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-sans text-sm font-semibold transition-all duration-200 border-b-2 ${
            clientTab === "memberships"
              ? "bg-elegant-card text-elegant-gold border-elegant-gold"
              : "text-elegant-text-muted hover:text-white border-transparent hover:bg-elegant-sub/30"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Membresías & Beneficios</span>
          <span className="bg-elegant-gold/20 text-elegant-gold text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-95">Promo</span>
        </button>
        <button
          onClick={() => setClientTab("account")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-sans text-sm font-semibold transition-all duration-200 border-b-2 ${
            clientTab === "account"
              ? "bg-elegant-card text-elegant-gold border-elegant-gold"
              : "text-elegant-text-muted hover:text-white border-transparent hover:bg-elegant-sub/30"
          }`}
        >
          <User className="h-4 w-4" />
          <span>{loggedClient ? `Portal: ${loggedClient.name}` : "Portal de Cliente"}</span>
          {loggedClient && loggedClient.membershipActive && (
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">Socio</span>
          )}
        </button>
      </div>

      {clientTab === "booking" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Portal de Reservas (Col-Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
            <div className="border-b border-elegant-border pb-4">
              <h2 className="text-lg font-bold text-white font-sans flex items-center gap-1.5">
                <Scissors className="h-5 w-5 text-elegant-gold" />
                Nueva Reserva en Segundos
              </h2>
              <p className="text-xs text-elegant-text-muted">Completa los 3 sencillos pasos abajo para reservar tu turno.</p>
            </div>

            {/* Error alerts */}
            {bookingError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{bookingError}</p>
              </div>
            )}

            {/* Success state */}
            {bookingSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-5 text-center space-y-4 animate-scaleUp">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-sm">¡Tu cita ha sido solicitada!</h3>
                  <p className="text-xs text-emerald-300">
                    Tu turno para <strong>{bookingSuccess.serviceName}</strong> con <strong>{bookingSuccess.barberName || "Cualquier Barbero"}</strong> el día <strong>{formatDateLabel(bookingSuccess.date).full}</strong> a las <strong>{bookingSuccess.time}</strong> está listo.
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Hemos guardado esta cita en tu navegador. Puedes revisar el estado de aprobación por el peluquero en la sección "Mis Citas" a la derecha.
                  </p>
                </div>
                <button
                  onClick={() => setBookingSuccess(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Reservar Otra Cita
                </button>
              </div>
            )}

            {!bookingSuccess && (
              <div className="space-y-6">
                
                {/* Paso 1: Selección de Servicio */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted flex items-center gap-1.5">
                    <span className="bg-elegant-gold text-elegant-bg w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-extrabold">1</span>
                    Selecciona un Servicio
                  </h3>

                  {/* Filtro de Categorías */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "cabello", label: "Corte de Cabello" },
                      { id: "barba", label: "Barbería & Barba" },
                      { id: "color", label: "Tinte & Color" },
                      { id: "tratamiento", label: "Tratamientos" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          activeCategory === cat.id
                            ? "bg-elegant-gold text-elegant-bg font-bold"
                            : "bg-elegant-sub border border-elegant-border text-elegant-text hover:bg-elegant-border"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Servicios en Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredServices.map((service) => {
                      const isSelected = selectedService?.id === service.id;
                      return (
                        <div
                          key={service.id}
                          id={`client-service-${service.id}`}
                          onClick={() => {
                            setSelectedService(service);
                            setSelectedTime(""); // reset time when service changes
                          }}
                          className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                              : "border-elegant-border bg-elegant-sub hover:border-neutral-700 hover:bg-elegant-card"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-xs text-white">{service.name}</h4>
                              <span className="text-xs font-bold font-mono text-elegant-gold whitespace-nowrap shrink-0">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                            <p className="text-[10px] text-elegant-text-muted line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-1 border-t border-elegant-border text-[10px] text-elegant-text-muted font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-elegant-text-muted" />
                              {service.duration} minutos
                            </span>
                            {isSelected && (
                              <span className="text-elegant-gold font-sans font-bold flex items-center gap-0.5">
                                Seleccionado <CheckCircle className="h-3 w-3 fill-elegant-gold text-elegant-bg" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Paso 2: Selección de Barbero */}
                {selectedService && (
                  <div className="space-y-3 pt-4 border-t border-elegant-border animate-fadeIn">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted flex items-center gap-1.5">
                      <span className="bg-elegant-gold text-elegant-bg w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-extrabold">2</span>
                      Elige tu Barbero / Peluquero
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Cualquier Barbero option */}
                      <div
                        onClick={() => {
                          setSelectedBarberId("any");
                          setSelectedTime("");
                        }}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-center gap-3 ${
                          selectedBarberId === "any"
                            ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                            : "border-elegant-border bg-elegant-sub hover:border-neutral-700 hover:bg-elegant-card"
                        }`}
                      >
                        <div className="h-9 w-9 rounded-xl bg-elegant-border text-elegant-gold flex items-center justify-center font-bold text-sm">
                          ⭐
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white leading-tight">Cualquier Barbero</h4>
                          <p className="text-[10px] text-elegant-text-muted mt-0.5">Asignación automática</p>
                        </div>
                      </div>

                      {/* Barbers list */}
                      {barbers.filter(b => b.isActive).map((barber) => {
                        const isSelected = selectedBarberId === barber.id;
                        const ratingInfo = getBarberRating(barber.id);
                        const isBlockedToday = selectedDate && barber.blockedDates && barber.blockedDates.includes(selectedDate);
                        
                        return (
                          <div
                            key={barber.id}
                            onClick={() => {
                              if (isBlockedToday) return;
                              setSelectedBarberId(barber.id);
                              setSelectedTime("");
                            }}
                            className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-center gap-3 ${
                              isBlockedToday
                                ? "border-rose-950/40 bg-rose-950/5 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "border-elegant-gold bg-elegant-gold/10 ring-1 ring-elegant-gold"
                                  : "border-elegant-border bg-elegant-sub hover:border-neutral-700 hover:bg-elegant-card"
                            }`}
                          >
                            <div className={`h-9 w-9 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 ${isBlockedToday ? "bg-rose-950/40 text-rose-400" : "bg-elegant-border"}`}>
                              {barber.name.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className={`font-bold text-xs leading-tight ${isBlockedToday ? "text-rose-400" : "text-white"}`}>{barber.name}</h4>
                              {isBlockedToday ? (
                                <p className="text-[9px] text-rose-400 font-bold mt-0.5">🔴 Ausente / Descanso</p>
                              ) : (
                                <>
                                  <p className="text-[10px] text-elegant-text-muted mt-0.5">Especialista disponible</p>
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-elegant-gold font-semibold">
                                    <span>★ {ratingInfo.avg}</span>
                                    <span className="text-elegant-text-muted text-[9px] font-normal">
                                      ({ratingInfo.count})
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Paso 3: Selección de Fecha y Hora */}
                {selectedService && (
                  <div className="space-y-4 pt-4 border-t border-elegant-border animate-fadeIn">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted flex items-center gap-1.5">
                      <span className="bg-elegant-gold text-elegant-bg w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-extrabold">3</span>
                      Elige Fecha y Horario Disponible
                    </h3>

                    {/* Fecha de Agendamiento */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Día Seleccionado:</label>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
                        {availableDates.map((dateStr) => {
                          const isSelected = selectedDate === dateStr;
                          const label = formatDateLabel(dateStr);
                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setSelectedTime(""); // reset time
                              }}
                              className={`p-1.5 xs:p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-elegant-gold bg-elegant-gold text-elegant-bg font-bold"
                                  : "border-elegant-border bg-elegant-sub text-elegant-text hover:bg-elegant-card"
                              }`}
                            >
                              <span className={`text-[8px] xs:text-[9px] font-semibold uppercase ${isSelected ? "text-elegant-bg/85 font-extrabold" : "text-elegant-text-muted"}`}>
                                {label.dayName.slice(0, 3)}
                              </span>
                              <span className="text-sm xs:text-base font-bold font-sans mt-0.5">
                                {label.dayNum}
                              </span>
                              <span className={`text-[7px] xs:text-[8px] font-mono ${isSelected ? "text-elegant-bg/80" : "text-elegant-text-muted"}`}>
                                {label.monthName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hora de Agendamiento */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-elegant-text-muted uppercase">Horas Disponibles ({formatDateLabel(selectedDate).full}):</label>
                        <span className="text-[9px] text-elegant-text-muted font-medium hidden xs:inline">Los horarios ocupados se deshabilitan automáticamente</span>
                      </div>
                      
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2">
                        {timeSlots.map((timeStr) => {
                          const isBusy = isSlotBusy(selectedDate, timeStr);
                          const isSelected = selectedTime === timeStr;

                          return (
                            <button
                              key={timeStr}
                              type="button"
                              disabled={isBusy}
                              onClick={() => setSelectedTime(timeStr)}
                              className={`py-2 px-1 text-center font-mono font-bold text-[11px] xs:text-xs rounded-lg transition-all ${
                                isBusy 
                                  ? "bg-elegant-sub/30 border border-elegant-border/30 text-neutral-600 cursor-not-allowed line-through" 
                                  : isSelected
                                    ? "bg-elegant-gold text-elegant-bg font-extrabold ring-2 ring-elegant-gold"
                                    : "bg-elegant-gold/10 border border-elegant-gold/20 hover:bg-elegant-gold/20 hover:border-elegant-gold text-elegant-gold cursor-pointer"
                              }`}
                            >
                              {timeStr}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* Paso 4: Formulario de Contacto */}
                {selectedService && selectedDate && selectedTime && (
                  <form onSubmit={handleBookingSubmit} className="space-y-4 pt-4 border-t border-elegant-border animate-fadeIn text-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted flex items-center gap-1.5">
                      <span className="bg-elegant-gold text-elegant-bg w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-extrabold">4</span>
                      Tus Datos para Confirmación
                    </h3>

                    {loggedClient ? (
                      <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              Sesión de Cliente Iniciada
                            </p>
                            <h4 className="text-sm font-bold text-white">{loggedClient.name}</h4>
                            <p className="text-[11px] text-elegant-text-muted font-mono">{loggedClient.phone} | {loggedClient.email}</p>
                          </div>
                          {loggedClient.membershipActive && (
                            <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-xl uppercase">
                              Socio Activo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-elegant-text-muted italic">
                          Tus datos de contacto se han cargado automáticamente. Tu descuento de membresía se aplicará en el resumen final.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-elegant-sub/60 p-3.5 rounded-2xl border border-elegant-border text-[11px] text-elegant-text-muted flex items-center justify-between">
                          <span>
                            💡 ¿Tienes membresía de descuentos?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setClientTab("account");
                              setAuthMode("login");
                            }}
                            className="text-elegant-gold font-bold hover:underline"
                          >
                            Iniciar Sesión
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="Ej: Sofía Martínez"
                              className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Número de Celular *</label>
                            <input
                              type="text"
                              required
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="Ej: +57 301 234 5678"
                              className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Correo Electrónico (Opcional)</label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="Ej: sofia@example.com"
                            className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Notas para el Peluquero (Opcional)</label>
                      <textarea
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Escribe si tienes alguna preferencia para tu corte, el servicio o tienes dudas..."
                        rows={2.5}
                        className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-sm md:text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                      />
                    </div>

                    {/* Recompensa de fidelidad (Propuesta B) */}
                    {loggedClient && (loggedClient.loyaltyPoints || 0) >= 5 && (
                      <div className="bg-elegant-gold/5 border border-elegant-gold/20 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-fadeIn">
                        <div className="space-y-0.5">
                          <p className="font-bold text-elegant-gold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <Gift className="h-4 w-4" />
                            ¡Recompensa Lista!
                          </p>
                          <p className="text-[10px] text-elegant-text-muted">
                            Tienes <strong>{loggedClient.loyaltyPoints} puntos</strong>. Puedes canjear 5 de ellos para que esta cita sea <strong>totalmente gratis</strong>.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            checked={redeemReward} 
                            onChange={(e) => setRedeemReward(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-elegant-sub peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-elegant-gold peer-checked:after:bg-elegant-bg"></div>
                        </label>
                      </div>
                    )}

                    {/* Resumen Final */}
                    <div className="bg-elegant-gold/10 border border-elegant-gold/20 p-4 rounded-2xl text-xs space-y-2">
                      <p className="font-bold text-elegant-gold flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-elegant-gold" />
                        Resumen de Reserva:
                      </p>
                      <p className="text-elegant-text">
                        Servicio: <strong>{selectedService.name}</strong> ({selectedService.duration} min)
                      </p>
                      <p className="text-elegant-text">
                        Peluquero/Barbero: <strong>{selectedBarberId === "any" ? "Cualquier Barbero" : (barbers.find(b => b.id === selectedBarberId)?.name || "Cualquier Barbero")}</strong>
                      </p>
                      <p className="text-elegant-text">
                        Fecha y Hora: <strong>{formatDateLabel(selectedDate).full}</strong> a las <strong>{selectedTime}</strong>
                      </p>
                      <p className="text-elegant-text flex items-center flex-wrap gap-1">
                        Precio a pagar:{" "}
                        {redeemReward ? (
                          <>
                            <span className="line-through text-elegant-text-muted mr-1 font-mono">
                              {formatPrice(selectedService.price)}
                            </span>
                            <strong className="text-emerald-400 font-mono text-sm uppercase">
                              ¡Gratis! (Canjeando Recompensa)
                            </strong>
                          </>
                        ) : discountPercent ? (
                          <>
                            <span className="line-through text-elegant-text-muted mr-1 font-mono">
                              {formatPrice(selectedService.price)}
                            </span>
                            <strong className="text-emerald-400 font-mono text-sm">
                              {formatPrice(Math.round(selectedService.price * (1 - discountPercent / 100)))}
                            </strong>
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ml-1 animate-pulse">
                              {discountPercent}% OFF
                            </span>
                          </>
                        ) : (
                          <strong className="text-elegant-gold font-mono text-sm">
                            {formatPrice(selectedService.price)}
                          </strong>
                        )}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {isSubmitting ? "Solicitando Turno..." : "Confirmar Mi Cita de Peluquería"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Panel de Reseñas de Clientes (Propuesta A) */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-5 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-elegant-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-elegant-gold" />
                    Opiniones de Clientes
                  </h3>
                  <p className="text-[11px] text-elegant-text-muted">La voz de quienes confían en nuestro estilo.</p>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-sm font-bold text-elegant-gold">
                    <span>★ {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0"}</span>
                    <span className="text-xs text-elegant-text-muted">/ 5.0</span>
                  </div>
                  <p className="text-[9px] text-elegant-text-muted">{reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'} en total</p>
                </div>
              </div>

              {/* Formulario para dejar reseña si está logueado */}
              {loggedClient ? (
                <form onSubmit={handleReviewSubmit} className="p-4 bg-elegant-sub border border-elegant-border rounded-2xl space-y-3">
                  <p className="text-[10px] font-bold text-elegant-gold uppercase tracking-wider">Dejar mi opinión</p>
                  
                  {reviewSuccess && (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 rounded-xl text-[10px]">
                      {reviewSuccess}
                    </div>
                  )}
                  {reviewError && (
                    <div className="p-2.5 bg-rose-950/30 border border-rose-800/40 text-rose-300 rounded-xl text-[10px]">
                      {reviewError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="space-y-1">
                      <label className="text-elegant-text-muted block uppercase font-bold">Barbero / Estilista</label>
                      <select
                        required
                        value={reviewBarberId}
                        onChange={(e) => setReviewBarberId(e.target.value)}
                        className="w-full px-2 py-1.5 border border-elegant-border rounded-lg bg-elegant-bg text-white focus:ring-1 focus:ring-elegant-gold text-[10px] cursor-pointer"
                      >
                        <option value="">Selecciona...</option>
                        {barbers.filter(b => b.isActive).map((barber) => (
                          <option key={barber.id} value={barber.id}>{barber.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-elegant-text-muted block uppercase font-bold">Calificación</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-elegant-border rounded-lg bg-elegant-bg text-white focus:ring-1 focus:ring-elegant-gold text-[10px] cursor-pointer font-bold text-elegant-gold"
                      >
                        <option value="5">★★★★★ (5)</option>
                        <option value="4">★★★★☆ (4)</option>
                        <option value="3">★★★☆☆ (3)</option>
                        <option value="2">★★☆☆☆ (2)</option>
                        <option value="1">★☆☆☆☆ (1)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <label className="text-elegant-text-muted block uppercase font-bold">Comentario</label>
                    <textarea
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Escribe aquí tu opinión sobre el servicio..."
                      rows={2}
                      className="w-full px-2 py-1.5 border border-elegant-border rounded-lg bg-elegant-bg text-white focus:ring-1 focus:ring-elegant-gold text-[10px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="w-full py-1.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    {reviewLoading ? "Enviando..." : "Publicar Opinión"}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-elegant-sub/40 border border-elegant-border/50 rounded-2xl text-[10px] text-center text-elegant-text-muted">
                  💡 <button type="button" onClick={() => setClientTab("account")} className="text-elegant-gold font-bold hover:underline">Inicia Sesión</button> con tu cuenta de socio para dejar tu opinión sobre el servicio.
                </div>
              )}

              {/* Lista de reseñas con scroll */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-left">
                {reviews.length === 0 ? (
                  <p className="text-xs text-elegant-text-muted text-center py-4">Aún no hay opiniones registradas.</p>
                ) : (
                  reviews.slice().reverse().map((rev) => {
                    const bObj = barbers.find(b => b.id === rev.barberId);
                    return (
                      <div key={rev.id} className="p-3 bg-elegant-sub border border-elegant-border/50 rounded-2xl space-y-1.5">
                        <div className="flex justify-between items-start text-[10px]">
                          <div>
                            <p className="font-extrabold text-white">{rev.clientName}</p>
                            <p className="text-[9px] text-elegant-gold font-medium">
                              Atendido por: <span className="font-bold text-white">{bObj ? bObj.name : "Barbero del Salón"}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-elegant-gold font-bold">
                              {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                            </span>
                            <p className="text-[8px] text-elegant-text-muted font-mono">{rev.date}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-elegant-text leading-relaxed bg-elegant-bg/20 p-2 rounded-xl italic">
                          "{rev.comment}"
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Mis Citas (Col-Span 1) */}
        <div className="space-y-6">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
            <div className="border-b border-elegant-border pb-3">
              <h3 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <CalendarIcon className="h-4.5 w-4.5 text-elegant-gold" />
                Mis Citas Reservadas
              </h3>
              <p className="text-[11px] text-elegant-text-muted">Verifica el estado de tus citas en tiempo real.</p>
            </div>

            {myAppointments.length === 0 ? (
              <div className="py-8 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
                <HelpCircle className="h-7 w-7 mx-auto stroke-1" />
                <p className="text-xs">No tienes citas registradas en este dispositivo.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {myAppointments.map((app) => {
                  return (
                    <div
                      key={app.id}
                      className={`border rounded-xl p-3.5 space-y-2 text-xs bg-elegant-sub transition-all ${
                        app.status === "completed" ? "border-blue-900/40 bg-blue-950/10" :
                        app.status === "confirmed" ? "border-emerald-900/40 bg-emerald-950/10" :
                        app.status === "canceled" ? "border-rose-900/40 bg-rose-950/10 opacity-70" :
                        "border-amber-900/40 bg-amber-950/10"
                      }`}
                    >
                      {/* Cabecera cita: Status */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-mono font-bold text-white bg-elegant-card px-1.5 py-0.5 rounded-md border border-elegant-border">
                          {app.time}
                        </span>

                        {app.status === "pending" && (
                          <span className="bg-amber-950/50 text-amber-400 border border-amber-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse uppercase">
                            Esperando Aprobación
                          </span>
                        )}
                        {app.status === "confirmed" && (
                          <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            ¡Confirmada!
                          </span>
                        )}
                        {app.status === "completed" && (
                          <span className="bg-blue-950/50 text-blue-400 border border-blue-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Servicio Realizado
                          </span>
                        )}
                        {app.status === "canceled" && (
                          <span className="bg-rose-950/50 text-rose-400 border border-rose-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Cancelado
                          </span>
                        )}
                      </div>

                      {/* Info de servicio */}
                      <div>
                        <p className="font-bold text-white text-xs">{app.serviceName}</p>
                        <p className="text-[10px] text-elegant-gold font-semibold mt-0.5">
                          Peluquero: {app.barberName || "Cualquier Barbero"}
                        </p>
                        <p className="text-[10px] text-elegant-text-muted mt-0.5">
                          {formatDateLabel(app.date).full} • {app.duration} mins
                        </p>
                      </div>

                      {/* Precio */}
                      <div className="flex justify-between items-center pt-2 border-t border-elegant-border">
                        <span className="text-elegant-text-muted text-[10px]">A pagar: <strong className="text-elegant-gold font-mono">{formatPrice(app.price)}</strong></span>
                        
                        {/* Cancel button */}
                        {app.status === "pending" || app.status === "confirmed" ? (
                          <button
                            onClick={() => handleCancelMyBooking(app.id)}
                            className="text-rose-400 hover:text-rose-300 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer hover:underline"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancelar Turno
                          </button>
                        ) : null}
                      </div>

                      {/* Hairdresser Notes Feedback */}
                      {app.hairdresserNotes && app.status === "completed" && (
                        <div className="mt-1 bg-blue-950/20 p-2 rounded-lg text-[10px] border border-blue-900/40 text-blue-300">
                          <span className="font-bold text-blue-400 block">Fórmula de Peluquero guardada:</span>
                          "{app.hairdresserNotes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
      )}

      {clientTab === "memberships" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Planes de Membresía de Peluquería</h2>
            <p className="text-xs md:text-sm text-elegant-text-muted">
              Únete a nuestro club de socios para disfrutar de descuentos automáticos en todos tus cortes, barbas y tratamientos capilares, además de beneficios prioritarios.
            </p>
            <div className="inline-flex items-center gap-2 bg-elegant-sub/40 border border-elegant-gold/20 px-3.5 py-1.5 rounded-2xl text-[11px] text-elegant-gold max-w-md mx-auto">
              <span className="inline-block w-2 h-2 rounded-full bg-elegant-gold animate-ping"></span>
              <span>Las membresías se contratan con el administrador y se asocian a tu cuenta.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {memberships.map((plan) => {
              const isMyPlan = loggedClient?.membershipId === plan.id && loggedClient?.membershipActive;
              const isVIP = plan.id === "gold";
              const isSilver = plan.id === "silver";
              
              return (
                <div 
                  key={plan.id}
                  className={`rounded-3xl p-6 border flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    isMyPlan 
                      ? "bg-gradient-to-b from-elegant-card to-elegant-sub/60 border-emerald-500 shadow-lg ring-1 ring-emerald-500/30"
                      : isVIP
                        ? "bg-gradient-to-b from-elegant-card to-elegant-sub/90 border-elegant-gold/50 hover:border-elegant-gold hover:shadow-lg shadow-elegant-gold/5"
                        : "bg-elegant-card border-elegant-border hover:border-elegant-gold/30 hover:shadow-md"
                  }`}
                >
                  {isVIP && (
                    <div className="absolute top-0 right-0 bg-elegant-gold text-elegant-bg text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Best Value
                    </div>
                  )}
                  {isMyPlan && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-elegant-bg text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                      Tu Plan
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Header: Name and Price */}
                    <div className="space-y-1">
                      <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        isVIP ? "bg-elegant-gold/15 text-elegant-gold" : isSilver ? "bg-slate-500/15 text-slate-300" : "bg-amber-700/15 text-amber-500"
                      }`}>
                        {plan.name}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1.5">{plan.name}</h3>
                      <p className="text-xs text-elegant-text-muted leading-relaxed">{plan.description}</p>
                    </div>

                    {/* Cost */}
                    <div className="pt-2 border-t border-elegant-border/50 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white font-mono">{formatPrice(plan.monthlyPrice)}</span>
                      <span className="text-elegant-text-muted text-[10px]">/ mes</span>
                    </div>

                    {/* Benefit list */}
                    <ul className="space-y-2.5 text-xs">
                      <li className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-950/20 px-2.5 py-1.5 rounded-xl border border-emerald-900/40">
                        <Percent className="h-4 w-4 shrink-0" />
                        <span>{plan.discountPercent}% OFF en todo el catálogo</span>
                      </li>
                      {plan.benefits.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-elegant-text">
                          <Check className="h-3.5 w-3.5 text-elegant-gold shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions (Read-Only) */}
                  <div className="pt-6 mt-6 border-t border-elegant-border/40 text-center">
                    {isMyPlan ? (
                      <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Membresía Activa en tu Cuenta</span>
                      </div>
                    ) : (
                      <div className="bg-elegant-sub/40 border border-elegant-border/50 text-elegant-text-muted py-3 px-4 rounded-2xl text-[11px] leading-snug">
                        <span>Adquirible únicamente en sucursal con el administrador</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-elegant-card border border-elegant-border p-5 rounded-3xl mt-6 max-w-xl mx-auto text-xs text-elegant-text-muted flex items-start gap-3">
            <Gift className="h-5 w-5 text-elegant-gold shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">¿Cómo funcionan los descuentos?</p>
              <p>
                Al unirte a cualquier membresía, nuestro sistema asocia tu beneficio a tu cuenta. Cada vez que agendes un turno usando tu perfil o ingresando tus datos registrados, el precio final descontado se calculará de manera automática en el portal de reserva y en la agenda del barbero. Sin cupones, sin demoras.
              </p>
            </div>
          </div>
        </div>
      )}

      {clientTab === "account" && (
        <div className="max-w-xl mx-auto animate-fadeIn">
          {loggedClient ? (
            /* Logged in Profile View */
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-6 shadow-xs">
              
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-elegant-border">
                <div className="flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row">
                  <div className="h-14 w-14 bg-elegant-gold/10 text-elegant-gold border border-elegant-gold/20 rounded-full flex items-center justify-center font-sans font-extrabold text-lg">
                    {loggedClient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">{loggedClient.name}</h3>
                    <p className="text-xs text-elegant-text-muted mt-0.5 font-mono">{loggedClient.email}</p>
                    <p className="text-[11px] text-elegant-text-muted mt-0.5 font-mono">{loggedClient.phone}</p>
                  </div>
                </div>

                <button
                  onClick={handleClientLogout}
                  className="px-3.5 py-1.5 border border-rose-900/50 hover:bg-rose-950/10 text-rose-400 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar Sesión
                </button>
              </div>

              {/* Membership Status Box */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted">Estado de Mi Suscripción</h4>
                
                {loggedClient.membershipActive && loggedClient.membershipId ? (
                  (() => {
                    const plan = memberships.find(m => m.id === loggedClient.membershipId);
                    if (!plan) return null;
                    return (
                      <div className="bg-gradient-to-br from-elegant-sub to-elegant-card border border-emerald-500/40 p-5 rounded-2xl relative overflow-hidden space-y-3">
                        <div className="absolute right-0 top-0 opacity-5 translate-x-4 -translate-y-4">
                          <Award className="h-32 w-32 stroke-1 text-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Suscripción Activa
                          </span>
                          <span className="text-elegant-text-muted text-[11px]">Socio ID: {loggedClient.id.slice(0, 8)}</span>
                        </div>
                        <div>
                          <p className="text-xs text-elegant-text-muted uppercase font-semibold">Tu Nivel de Membresía:</p>
                          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                          <p className="text-xs text-elegant-text mt-0.5 italic">"{plan.description}"</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-elegant-border/50 text-xs text-emerald-300">
                          <Percent className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>Disfrutas de un <strong>{plan.discountPercent}% de descuento automático</strong> en todas tus reservas de peluquería.</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-elegant-sub/40 border border-elegant-border p-5 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-elegant-text">
                      Actualmente no tienes ninguna membresía activa y estás agendando como invitado.
                    </p>
                    <button
                      onClick={() => setClientTab("memberships")}
                      className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Ver Planes & Descuentos
                    </button>
                  </div>
                )}
              </div>

              {/* Indicador de Ahorro Acumulado (Propuesta B) */}
              <div className="bg-gradient-to-br from-emerald-950/20 to-neutral-900 border border-emerald-500/20 p-5 rounded-2xl relative overflow-hidden space-y-3 shadow-md">
                <div className="absolute right-0 top-0 opacity-[0.03] translate-x-3 -translate-y-3 pointer-events-none">
                  <Percent className="h-32 w-32 stroke-1 text-emerald-400" />
                </div>
                
                <div>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Fidelidad Tangible
                  </span>
                  <h4 className="text-sm font-extrabold text-white mt-1.5 font-sans">Ahorro Acumulado de Socio</h4>
                  <p className="text-[10px] text-elegant-text-muted mt-0.5">
                    Gracias a tu membresía y los beneficios de fidelización de {config.name}, esto es lo que has ahorrado en total:
                  </p>
                </div>

                <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-900/30 p-3.5 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Dinero Total Ahorrado</span>
                    <span className="text-2xl font-black font-mono text-emerald-300">
                      {formatPrice(calculateSavings())}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-white block">Beneficio Real</span>
                    <p className="text-[9px] text-emerald-400">¡Tu suscripción se paga sola! 🎉</p>
                  </div>
                </div>

                <div className="text-[9px] text-elegant-text-muted leading-relaxed italic">
                  * Este cálculo dinámico compara el precio base original de tus cortes con el monto total con descuento que has pagado.
                </div>
              </div>

              {/* Tarjeta de Fidelidad Digital (Propuesta B) */}
              <div className="bg-gradient-to-r from-neutral-900 to-elegant-bg border border-elegant-gold/20 p-5 rounded-2xl relative overflow-hidden space-y-3 shadow-md">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none rotate-12">
                  <Gift className="h-28 w-28 text-elegant-gold" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-elegant-gold/10 text-elegant-gold border border-elegant-gold/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Club de Fidelidad SYNCBARBER
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-1.5 font-sans">Mi Tarjeta de Sellos</h4>
                    <p className="text-[10px] text-elegant-text-muted mt-0.5">
                      Completa 5 visitas y obtén un <strong className="text-elegant-gold">Corte o Servicio 100% GRATIS</strong> en tu próximo turno.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-elegant-gold bg-elegant-sub border border-elegant-border px-2.5 py-1 rounded-xl">
                      {loggedClient.loyaltyPoints || 0} / 5
                    </span>
                  </div>
                </div>

                {/* Sellos */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((index) => {
                    const isStamped = (loggedClient.loyaltyPoints || 0) >= index;
                    return (
                      <div 
                        key={index}
                        className={`aspect-square rounded-full border flex flex-col items-center justify-center relative transition-all ${
                          isStamped 
                            ? "bg-elegant-gold/15 border-elegant-gold shadow-md shadow-elegant-gold/5" 
                            : "bg-elegant-sub/40 border-elegant-border/80 text-elegant-text-muted/50"
                        }`}
                      >
                        {isStamped ? (
                          <div className="flex flex-col items-center justify-center">
                            <Scissors className="h-5 w-5 text-elegant-gold rotate-90" />
                            <span className="text-[8px] font-mono text-elegant-gold font-bold mt-0.5">¡Listo!</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[10px] font-mono font-bold">{index}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Reward state */}
                {(loggedClient.loyaltyPoints || 0) >= 5 ? (
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-[10px] text-emerald-400">
                    <Gift className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>¡Felicidades! Tienes tu tarjeta llena. Puedes aplicar tu <strong>Corte Gratis</strong> en el formulario de reserva.</span>
                  </div>
                ) : (
                  <p className="text-[9px] text-elegant-text-muted italic text-center">
                    Te faltan {Math.max(0, 5 - (loggedClient.loyaltyPoints || 0))} visitas completadas para reclamar tu recompensa.
                  </p>
                )}
              </div>

              {/* My active client portal bookings */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-elegant-border pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted">Mis Próximos Turnos Agendados</h4>
                  <span className="text-[10px] font-mono text-elegant-text-muted">Asociados a tu cuenta</span>
                </div>

                {(() => {
                  // Find all appointments matching client email or phone
                  const myUserAppointments = appointments.filter(
                    app => app.clientPhone === loggedClient.phone || (loggedClient.email && app.clientEmail?.toLowerCase() === loggedClient.email.toLowerCase())
                  ).sort((a, b) => {
                    const dComp = a.date.localeCompare(b.date);
                    if (dComp !== 0) return dComp;
                    return a.time.localeCompare(b.time);
                  });

                  if (myUserAppointments.length === 0) {
                    return (
                      <div className="py-6 text-center text-elegant-text-muted text-xs border border-dashed border-elegant-border rounded-2xl">
                        Aún no tienes turnos reservados con esta cuenta.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {myUserAppointments.map(app => (
                        <div key={app.id} className="p-3 bg-elegant-sub border border-elegant-border rounded-xl flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-white">{app.serviceName}</p>
                            <p className="text-[10px] text-elegant-text-muted">
                              {formatDateLabel(app.date).full} • {app.time} • {app.barberName}
                            </p>
                            <span className="text-[10px] text-elegant-gold font-semibold">Total pagado: {formatPrice(app.price)}</span>
                          </div>
                          
                          <div>
                            {app.status === "pending" && (
                              <span className="bg-amber-950/50 text-amber-400 border border-amber-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                                Pendiente
                              </span>
                            )}
                            {app.status === "confirmed" && (
                              <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Confirmada
                              </span>
                            )}
                            {app.status === "completed" && (
                              <span className="bg-blue-950/50 text-blue-400 border border-blue-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Realizada
                              </span>
                            )}
                            {app.status === "canceled" && (
                              <span className="bg-rose-950/50 text-rose-400 border border-rose-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Cancelada
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          ) : (
            /* Auth Login/Registration Forms */
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-6 shadow-xs">
              
              {/* Form Toggles */}
              <div className="flex border-b border-elegant-border pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 py-2 font-sans font-bold text-sm transition-all border-b-2 text-center ${
                    authMode === "login"
                      ? "text-elegant-gold border-elegant-gold"
                      : "text-elegant-text-muted hover:text-white border-transparent"
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 py-2 font-sans font-bold text-sm transition-all border-b-2 text-center ${
                    authMode === "register"
                      ? "text-elegant-gold border-elegant-gold"
                      : "text-elegant-text-muted hover:text-white border-transparent"
                  }`}
                >
                  Crear Cuenta de Socio
                </button>
              </div>

              {/* Status alerts */}
              {authError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{authError}</p>
                </div>
              )}
              {authSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{authSuccess}</p>
                </div>
              )}

              {/* Form implementation */}
              {authMode === "login" ? (
                <form onSubmit={handleClientLoginSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Contraseña</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {authLoading ? "Cargando..." : "Ingresar a Mi Cuenta"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleClientRegisterSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Ej: Laura Sofía"
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Número de Celular</label>
                      <input
                        type="text"
                        required
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="Ej: +57 301 234 5678"
                        className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Contraseña</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {authLoading ? "Creando Cuenta..." : "Registrarme e Iniciar"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              <p className="text-[11px] text-elegant-text-muted leading-relaxed text-center">
                Al unirte a nuestro programa, podrás suscribirte de inmediato a cualquiera de nuestros planes bronce, plata u oro para conseguir descuentos instantáneos en cada cita de corte o barba.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
