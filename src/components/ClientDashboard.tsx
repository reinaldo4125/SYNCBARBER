import React, { useState, useEffect } from "react";
import { Appointment, Service, SalonConfig, AppointmentStatus, Barber, MembershipPlan, ClientAccount, BarberReview, CatalogStyle } from "../types";
import PWAInstallBanner, { PWAHeaderButton, PWABookingSuccessPrompt } from "./PWAInstallBanner";
import ClientStyleLookbookModal from "./ClientStyleLookbookModal";
import { showPushNotification, getWhatsAppNotificationUrl } from "../utils/pushNotifications";
import { formatTime } from "../utils/formatters";
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
  Percent,
  History,
  Camera,
  Image as ImageIcon,
  BookOpen,
  MessageCircle
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
  clients?: ClientAccount[];
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
  clients = [],
}: ClientDashboardProps) {
  // Navigation categories
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Client Portal & Membership Tabs
  const [clientTab, setClientTab] = useState<"booking" | "memberships" | "account">("booking");
  const [loggedClient, setLoggedClient] = useState<ClientAccount | null>(null);

  // Client Auth Form States
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authBirthDate, setAuthBirthDate] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  // Profile birth date editing state
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [userBirthDateInput, setUserBirthDateInput] = useState("");

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
  const [selectedCatalogStyle, setSelectedCatalogStyle] = useState<CatalogStyle | null>(null);
  const [showLookbookModal, setShowLookbookModal] = useState<boolean>(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientBirthDate, setClientBirthDate] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redeemReward, setRedeemReward] = useState(false);
  const [useBirthdayBenefit, setUseBirthdayBenefit] = useState(false);

  // Review Form States (Propuesta A)
  const [reviewBarberId, setReviewBarberId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Client's own appointments tracked in localStorage or phone search
  const [appointmentsTab, setAppointmentsTab] = useState<"active" | "history">("active");
  const [myAppIds, setMyAppIds] = useState<string[]>([]);
  const [searchPhone, setSearchPhone] = useState<string>(() => {
    return localStorage.getItem("bella_barba_last_phone") || "";
  });

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
      const queryParams = new URLSearchParams();
      if (loggedClient.phone) queryParams.set("phone", loggedClient.phone);
      if (loggedClient.email) queryParams.set("email", loggedClient.email);
      const queryString = queryParams.toString();
      const url = `/api/clients/${loggedClient.id}${queryString ? `?${queryString}` : ""}`;

      fetch(url)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.client) {
              setLoggedClient(data.client);
              localStorage.setItem("bella_barba_logged_client", JSON.stringify(data.client));
            }
          } else if (res.status === 404) {
            console.warn("[ClientDashboard] Sesión de cliente obsoleta en servidor, limpiando cache local.");
            setLoggedClient(null);
            localStorage.removeItem("bella_barba_logged_client");
          }
        })
        .catch((err) => {
          console.warn("[ClientDashboard] No se pudo sincronizar perfil con servidor (posible modo offline):", err);
        });
    }
  }, [clientTab]);

  // Autofill booking details if logged in
  useEffect(() => {
    if (loggedClient) {
      setClientName(loggedClient.name);
      setClientPhone(loggedClient.phone);
      setClientEmail(loggedClient.email);
      if (loggedClient.birthDate) {
        setClientBirthDate(loggedClient.birthDate);
        setUserBirthDateInput(loggedClient.birthDate);
      }
    } else {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientBirthDate("");
      setUserBirthDateInput("");
    }
  }, [loggedClient]);

  const handleSaveProfileBirthDate = async () => {
    if (!loggedClient) return;
    if (!userBirthDateInput) return;
    try {
      const res = await fetch(`/api/clients/${loggedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: userBirthDateInput })
      });
      if (res.ok) {
        const updated = { ...loggedClient, birthDate: userBirthDateInput };
        setLoggedClient(updated);
        localStorage.setItem("bella_barba_logged_client", JSON.stringify(updated));
        setEditingBirthDate(false);
      }
    } catch (err) {
      console.error("Error al actualizar fecha de cumpleaños:", err);
    }
  };

  // Check if a direct barber has been requested via URL/QR Code
  useEffect(() => {
    const directBarberId = localStorage.getItem("direct_barber_id");
    if (directBarberId && barbers && barbers.some(b => b.id === directBarberId)) {
      console.log("[ClientDashboard] Auto-selecting direct barber:", directBarberId);
      setSelectedBarberId(directBarberId);
      localStorage.removeItem("direct_barber_id"); // clear after selection
    }
  }, [barbers]);

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
  // Format working days readable text
  const formatWorkingDays = (days?: number[]) => {
    const list = days && days.length > 0 ? days : [1, 2, 3, 4, 5, 6];
    if (list.length === 7) return "Lunes a Domingo";
    const dayNames: Record<number, string> = {
      1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 0: "Dom"
    };
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.length === 5 && sorted.every((d, idx) => d === idx + 1)) return "Lunes a Viernes";
    if (sorted.length === 6 && sorted.every((d, idx) => d === idx + 1)) return "Lunes a Sábado";
    return sorted.map((d) => dayNames[d] || `Día ${d}`).join(", ");
  };

  const getAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();
    const activeWorkingDays = config.workingDays && config.workingDays.length > 0 
      ? config.workingDays 
      : [1, 2, 3, 4, 5, 6];
    
    // Check up to 21 days out to find up to 7 valid working days
    for (let i = 0; i < 21; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...

      // Express server working days
      if (activeWorkingDays.includes(dayOfWeek)) {
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
    const [openH, openM] = (config.openTime || "08:00").split(":").map(Number);
    const [closeH, closeM] = (config.closeTime || "20:00").split(":").map(Number);

    const safeOpenH = isNaN(openH) ? 8 : openH;
    const safeOpenM = isNaN(openM) ? 0 : openM;
    const safeCloseH = isNaN(closeH) ? 20 : closeH;
    const safeCloseM = isNaN(closeM) ? 0 : closeM;
    const step = config.intervalMinutes && config.intervalMinutes >= 10 ? config.intervalMinutes : 30;

    let currentMinutes = safeOpenH * 60 + safeOpenM;
    const closeMinutes = safeCloseH * 60 + safeCloseM;

    while (currentMinutes < closeMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeString = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      slots.push(timeString);
      currentMinutes += step;
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Overlap checker: check if a specific slot is busy taking preferred barber into account
  const isSlotBusy = (date: string, time: string) => {
    // Check if the selected date is today and the slot time has already passed
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (date === todayStr) {
      const curH = today.getHours();
      const curM = today.getMinutes();
      const currentTimeMinutes = curH * 60 + curM;

      const [h, m] = time.split(":").map(Number);
      const slotTimeMinutes = h * 60 + m;

      if (slotTimeMinutes <= currentTimeMinutes) {
        return true; // Past timeslot is disabled/busy for clients
      }
    }

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

      // Check if barber has a time block (lunch/rest) on this date & time
      if (targetBarber && targetBarber.timeBlocks) {
        const hasBlock = targetBarber.timeBlocks.some((block: any) => {
          if (block.date !== date) return false;
          const blockStart = startToMin(block.startTime);
          const blockEnd = startToMin(block.endTime);
          return startA < blockEnd && blockStart < endA;
        });
        if (hasBlock) return true;
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
        // Check if this barber has any time block on this date & time
        if (barber.timeBlocks) {
          const hasBlock = barber.timeBlocks.some((block: any) => {
            if (block.date !== date) return false;
            const blockStart = startToMin(block.startTime);
            const blockEnd = startToMin(block.endTime);
            return startA < blockEnd && blockStart < endA;
          });
          if (hasBlock) return false; // not free
        }

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

    // Check if the selected date/time is in the past
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (selectedDate === todayStr) {
      const curH = today.getHours();
      const curM = today.getMinutes();
      const currentTimeMinutes = curH * 60 + curM;

      const [h, m] = selectedTime.split(":").map(Number);
      const slotTimeMinutes = h * 60 + m;

      if (slotTimeMinutes <= currentTimeMinutes) {
        setBookingError("La hora seleccionada ya ha pasado. Por favor selecciona una hora futura.");
        setIsSubmitting(false);
        return;
      }
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
        birthDate: clientBirthDate || (loggedClient?.birthDate || undefined),
        isBirthdayBenefit: useBirthdayBenefit,
        selectedStyleId: selectedCatalogStyle?.id,
        selectedStyleName: selectedCatalogStyle?.title,
        selectedStylePhotoUrl: selectedCatalogStyle?.photoUrl,
        selectedStyleCategory: selectedCatalogStyle?.category,
        selectedStyleNotes: selectedCatalogStyle?.description
      });

      if (newApp && newApp.id) {
        // Save ID and Phone locally
        const updatedIds = [...myAppIds, newApp.id];
        setMyAppIds(updatedIds);
        localStorage.setItem("bella_barba_appointments", JSON.stringify(updatedIds));
        if (clientPhone) {
          localStorage.setItem("bella_barba_last_phone", clientPhone);
          setSearchPhone(clientPhone);
        }
        
        // Show success
        setBookingSuccess(newApp);

        // Trigger local Web Push notification if enabled
        showPushNotification("🚨 ¡Tu Cita fue Confirmada! 💈", {
          body: `Turno reservado para ${newApp.serviceName} el ${newApp.date} a las ${newApp.time}.`,
          vibrate: [200, 100, 200]
        });
        
        // Reset process
        setSelectedService(null);
        setSelectedCatalogStyle(null);
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

  const handleClientResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    if (!authEmail || !authPassword) {
      setAuthError("Ingresa tu correo registrado y tu nueva contraseña.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/clients/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          phone: authPhone,
          newPassword: authPassword
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo restablecer la contraseña.");
      }

      setAuthSuccess(data.message || "¡Contraseña restablecida con éxito!");
      if (data.client) {
        setLoggedClient(data.client);
        localStorage.setItem("bella_barba_logged_client", JSON.stringify(data.client));
      }
      setTimeout(() => {
        setAuthMode("login");
        setAuthSuccess("");
      }, 2500);
    } catch (err: any) {
      setAuthError(err.message || "Error al restablecer contraseña.");
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
          birthDate: authBirthDate || undefined,
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
      setAuthBirthDate("");
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
    .filter((app) => {
      // 1. Direct match by local storage app IDs
      if (myAppIds.includes(app.id)) return true;

      // 2. Match by logged-in client profile
      if (loggedClient) {
        if (app.clientId && app.clientId === loggedClient.id) return true;

        const cleanLoggedPhone = loggedClient.phone ? loggedClient.phone.replace(/\D/g, "") : "";
        const cleanAppPhone = app.clientPhone ? app.clientPhone.replace(/\D/g, "") : "";
        if (cleanLoggedPhone && cleanAppPhone && cleanLoggedPhone.length >= 7 &&
            (cleanLoggedPhone.includes(cleanAppPhone.slice(-7)) || cleanAppPhone.includes(cleanLoggedPhone.slice(-7)))) {
          return true;
        }

        if (loggedClient.email && app.clientEmail && loggedClient.email.toLowerCase().trim() === app.clientEmail.toLowerCase().trim()) {
          return true;
        }

        if (loggedClient.name && app.clientName && loggedClient.name.toLowerCase().trim() === app.clientName.toLowerCase().trim()) {
          return true;
        }
      }

      // 3. Match by searched phone or phone saved in booking form/localStorage
      const targetPhone = searchPhone || clientPhone || localStorage.getItem("bella_barba_last_phone") || "";
      if (targetPhone) {
        const cleanTarget = targetPhone.replace(/\D/g, "");
        const cleanAppPhone = app.clientPhone ? app.clientPhone.replace(/\D/g, "") : "";
        if (cleanTarget.length >= 7 && cleanAppPhone.length >= 7 &&
            (cleanTarget.includes(cleanAppPhone.slice(-7)) || cleanAppPhone.includes(cleanTarget.slice(-7)))) {
          return true;
        }
      }

      return false;
    })
    .sort((a, b) => {
      // Priority status order: upcoming/active (confirmed, pending) first, then completed, then canceled
      const statusOrder: Record<string, number> = {
        confirmed: 1,
        pending: 2,
        completed: 3,
        canceled: 4,
      };
      const orderA = statusOrder[a.status] || 5;
      const orderB = statusOrder[b.status] || 5;

      if (orderA !== orderB) return orderA - orderB;

      // Compare dates descending (newest dates top)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });

  // Separate active (pending/confirmed) vs history (completed/canceled)
  const myActiveAppointments = myAppointments.filter(
    (app) => app.status === "pending" || app.status === "confirmed"
  );
  const myHistoryAppointments = myAppointments.filter(
    (app) => app.status === "completed" || app.status === "canceled"
  );

  // Client cancels their own booking
  const handleCancelMyBooking = async (id: string, dateStr?: string, timeStr?: string) => {
    const confirmMsg = dateStr && timeStr
      ? `¿Estás seguro de cancelar tu cita reservada para el ${dateStr} a las ${timeStr}?`
      : "¿Estás seguro de cancelar tu reserva de peluquería?";

    if (window.confirm(confirmMsg)) {
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans text-white text-custom-brand">
            Bienvenido a {config.name}
          </h1>
          {config.tagline ? (
            <p className="text-xs md:text-sm text-elegant-gold/90 font-medium italic max-w-lg">
              "{config.tagline}"
            </p>
          ) : (
            <p className="text-xs md:text-sm text-elegant-text-muted max-w-lg">
              Agenda tu cita en tiempo real. Selecciona el servicio que deseas, elige fecha y hora disponibles, y el peluquero la confirmará al instante.
            </p>
          )}
        </div>
        
        {/* Salon Details Badge */}
        <div className="bg-elegant-sub/80 border border-elegant-border p-4 rounded-2xl space-y-1 relative z-10 text-xs shrink-0 w-full md:w-auto">
          <p className="font-bold text-elegant-gold uppercase tracking-wider text-[10px]">Horario de Atención</p>
          <p className="font-medium text-white">{formatWorkingDays(config.workingDays)}</p>
          <p className="font-mono text-elegant-text-muted">{config.openTime || "08:00"} - {config.closeTime || "20:00"}</p>
        </div>
      </div>

      {/* Banner de Instalación PWA para Clientes */}
      <PWAInstallBanner config={config} />

      {/* Navigation Tabs bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-elegant-border pb-1">
        <div className="flex flex-wrap items-center gap-2">
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

        {/* Acceso Directo / PWA Quick Action */}
        <div className="pb-1.5 sm:pb-0">
          <PWAHeaderButton config={config} />
        </div>
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
                  <h3 className="font-bold text-white text-sm">¡Tu cita ha sido confirmada!</h3>
                  <p className="text-xs text-emerald-300">
                    Tu turno para <strong>{bookingSuccess.serviceName}</strong> con <strong>{bookingSuccess.barberName || "Cualquier Barbero"}</strong> el día <strong>{formatDateLabel(bookingSuccess.date).full}</strong> a las <strong>{formatTime(bookingSuccess.time, config?.timeFormat)}</strong> está confirmado.
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Tu reserva ha sido registrada y confirmada automáticamente. Te esperamos en la barbería en el horario seleccionado.
                  </p>
                </div>

                {/* Estilo de Catálogo Elegido por el Cliente */}
                {bookingSuccess.selectedStyleName && (
                  <div className="bg-neutral-900/90 border border-amber-500/40 rounded-2xl p-3.5 max-w-sm mx-auto text-left flex items-center gap-3.5 shadow-md">
                    {bookingSuccess.selectedStylePhotoUrl ? (
                      <img 
                        src={bookingSuccess.selectedStylePhotoUrl} 
                        alt={bookingSuccess.selectedStyleName} 
                        className="w-16 h-16 rounded-xl object-cover border border-amber-400/50 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-amber-950/40 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Scissors className="h-6 w-6" />
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9.5px] font-extrabold uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30">
                        ✂️ Corte de Referencia
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">
                        {bookingSuccess.selectedStyleName}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        El barbero verá esta foto en su tablet al momento de atenderte.
                      </p>
                    </div>
                  </div>
                )}

                {/* Acceso Directo Móvil en Pantalla de Inicio */}
                <PWABookingSuccessPrompt config={config} />

                {/* Botón Inmediato de WhatsApp al Barbero */}
                {(() => {
                  const targetBarber = barbers?.find(b => b.id === bookingSuccess.barberId);
                  const targetPhone = targetBarber?.whatsapp || targetBarber?.phone || config?.whatsapp || config?.phone || "";
                  if (!targetPhone) return null;
                  const waUrl = getWhatsAppNotificationUrl(targetPhone, {
                    clientName: bookingSuccess.clientName,
                    clientPhone: bookingSuccess.clientPhone,
                    serviceName: bookingSuccess.serviceName,
                    barberName: bookingSuccess.barberName,
                    date: bookingSuccess.date,
                    time: bookingSuccess.time,
                    price: bookingSuccess.price,
                    salonName: config?.name,
                    isBirthdayBenefit: bookingSuccess.isBirthdayBenefit
                  });
                  return (
                    <div className="pt-2 max-w-sm mx-auto">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg hover:shadow-emerald-500/20 transition-all border border-emerald-400/30 cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-100 animate-pulse" />
                        <span>📲 Confirmar por WhatsApp con el Barbero</span>
                      </a>
                    </div>
                  );
                })()}

                <div className="pt-2">
                  <button
                    onClick={() => setBookingSuccess(null)}
                    className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </div>
            )}

            {!bookingSuccess && (
              <div className="space-y-6">
                
                {/* Banner Lookbook: ¿No sabes qué corte hacerte? */}
                <div className="bg-gradient-to-r from-neutral-900 via-elegant-card to-neutral-900 border border-elegant-gold/40 rounded-2xl p-4 md:p-5 relative overflow-hidden shadow-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-2xl bg-elegant-gold/20 border border-elegant-gold/40 flex items-center justify-center text-elegant-gold shrink-0 shadow-md">
                        <Camera className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-elegant-gold text-black font-extrabold px-2 py-0.2 rounded uppercase tracking-wider">
                            ¿Indeciso?
                          </span>
                          <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Catálogo Visual de Estilos
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white">
                          ¿No sabes qué corte pedirte hoy?
                        </h4>
                        <p className="text-[11px] text-elegant-text-muted">
                          Abre nuestro catálogo con fotos reales de Fades, Pompadour, Barbas y Diseños para elegir el tuyo.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowLookbookModal(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-elegant-gold hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                    >
                      <Scissors className="h-4 w-4" />
                      <span>Ver Catálogo de Cortes</span>
                    </button>
                  </div>

                  {/* Estilo Seleccionado Actualmente */}
                  {selectedCatalogStyle && (
                    <div className="mt-4 pt-3.5 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 p-3 rounded-xl border border-amber-500/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={selectedCatalogStyle.photoUrl}
                          alt={selectedCatalogStyle.title}
                          className="w-12 h-12 rounded-lg object-cover border border-amber-400/40 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                              ✓ Foto de Referencia Adjunta
                            </span>
                            <span className="text-[9px] text-neutral-400 uppercase">
                              {selectedCatalogStyle.categoryLabel || selectedCatalogStyle.category}
                            </span>
                          </div>
                          <p className="text-xs font-black text-white truncate">
                            {selectedCatalogStyle.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setShowLookbookModal(true)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          Cambiar corte
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCatalogStyle(null)}
                          className="text-[11px] font-bold text-neutral-400 hover:text-red-400 cursor-pointer ml-2"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Paso 1: Selección de Servicio */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-2">
                    <span className="bg-elegant-gold text-elegant-bg w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-black">1</span>
                    Selecciona un Servicio
                  </h3>

                  {/* Filtro de Categorías */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "all", label: "Todos" },
                      ...(config.serviceCategories || [
                        { id: "cabello", name: "Corte de Cabello" },
                        { id: "barba", name: "Barbería & Barba" },
                        { id: "color", name: "Tinte & Color" },
                        { id: "tratamiento", name: "Tratamientos" }
                      ]).map(c => ({ id: c.id, label: c.name }))
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          activeCategory === cat.id
                            ? "bg-elegant-gold text-elegant-bg font-bold shadow-sm"
                            : "bg-elegant-sub border border-elegant-border text-elegant-text hover:bg-elegant-border"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Servicios en Grid */}
                  {filteredServices.length === 0 ? (
                    <div className="p-8 text-center bg-elegant-sub/50 border border-dashed border-elegant-border rounded-2xl space-y-2">
                      <Scissors className="h-9 w-9 mx-auto text-elegant-gold/60 animate-pulse" />
                      <p className="text-sm font-bold text-white">No hay servicios registrados en esta categoría aún.</p>
                      <p className="text-xs text-elegant-text-muted">
                        El administrador de la barbería está configurando el menú de atención.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredServices.map((service) => {
                        const isSelected = selectedService?.id === service.id;
                        return (
                          <div
                            key={service.id}
                            id={`client-service-${service.id}`}
                            onClick={() => {
                              setSelectedService(service);
                              setSelectedTime(""); // reset time when service changes
                              if (service.allowRewardRedemption === false) {
                                setUseBirthdayBenefit(false);
                                setRedeemReward(false);
                              }
                            }}
                            className={`border rounded-2xl p-4.5 cursor-pointer transition-all flex flex-col justify-between space-y-3.5 ${
                              isSelected
                                ? "border-elegant-gold bg-elegant-gold/10 ring-2 ring-elegant-gold shadow-md shadow-amber-500/5"
                                : "border-elegant-border bg-elegant-sub hover:border-neutral-600 hover:bg-elegant-card"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm text-white">{service.name}</h4>
                                  {service.allowRewardRedemption === false ? (
                                    <span className="inline-block text-[9px] bg-rose-950/60 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded-full font-bold">
                                      🚫 No canjeable gratis
                                    </span>
                                  ) : (
                                    <span className="inline-block text-[9px] bg-amber-950/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                      🎁 Apto para Regalo/Cumpleaños
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm font-bold font-mono text-elegant-gold whitespace-nowrap shrink-0">
                                  {formatPrice(service.price)}
                                </span>
                              </div>
                              <p className="text-xs text-elegant-text-muted line-clamp-2 leading-relaxed">
                                {service.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-elegant-border/80 text-xs text-elegant-text-muted font-mono">
                              <span className="flex items-center gap-1.5 text-neutral-300">
                                <Clock className="h-3.5 w-3.5 text-elegant-gold" />
                                {service.duration} minutos
                              </span>
                              {isSelected && (
                                <span className="text-elegant-gold font-sans font-bold flex items-center gap-1">
                                  Seleccionado <CheckCircle className="h-4 w-4 fill-elegant-gold text-elegant-bg" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Paso 2: Selección de Barbero */}
                {selectedService && (
                  <div className="space-y-3.5 pt-5 border-t border-elegant-border animate-fadeIn">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-2">
                      <span className="bg-elegant-gold text-elegant-bg w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-black">2</span>
                      Elige tu Barbero / Peluquero
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                      {/* Cualquier Barbero option */}
                      <div
                        onClick={() => {
                          setSelectedBarberId("any");
                          setSelectedTime("");
                        }}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-center gap-3 ${
                          selectedBarberId === "any"
                            ? "border-elegant-gold bg-elegant-gold/10 ring-2 ring-elegant-gold shadow-md shadow-elegant-gold/10"
                            : "border-elegant-border bg-elegant-sub hover:border-neutral-600 hover:bg-elegant-card"
                        }`}
                      >
                        <div className="h-12 w-12 rounded-xl bg-elegant-border/80 text-elegant-gold flex items-center justify-center font-bold text-xl border border-elegant-gold/30 shrink-0">
                          ✨
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white leading-tight">Cualquier Barbero</h4>
                          <p className="text-xs text-elegant-text-muted mt-0.5">Asignación automática</p>
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Mayor disponibilidad
                          </span>
                        </div>
                      </div>

                      {/* Barbers list */}
                      {barbers.filter(b => b.isActive).map((barber) => {
                        const isSelected = selectedBarberId === barber.id;
                        const ratingInfo = getBarberRating(barber.id);
                        const isBlockedToday = selectedDate && barber.blockedDates && barber.blockedDates.includes(selectedDate);
                        const photo = barber.photoUrl || barber.avatarUrl || (barber as any).avatar;
                        
                        return (
                          <div
                            key={barber.id}
                            onClick={() => {
                              if (isBlockedToday) return;
                              setSelectedBarberId(barber.id);
                              setSelectedTime("");
                            }}
                            className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-center gap-3 relative overflow-hidden ${
                              isBlockedToday
                                ? "border-rose-950/40 bg-rose-950/5 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "border-elegant-gold bg-elegant-gold/10 ring-2 ring-elegant-gold shadow-lg shadow-elegant-gold/10"
                                  : "border-elegant-border bg-elegant-sub hover:border-neutral-600 hover:bg-elegant-card"
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className={`h-12 w-12 rounded-xl border overflow-hidden flex items-center justify-center font-bold text-sm ${
                                isBlockedToday 
                                  ? "bg-rose-950/40 border-rose-800 text-rose-400" 
                                  : isSelected 
                                    ? "border-elegant-gold bg-elegant-card shadow-sm" 
                                    : "border-elegant-border bg-elegant-card"
                              }`}>
                                {photo ? (
                                  <img 
                                    src={photo} 
                                    alt={barber.name} 
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span className="font-mono text-sm font-black text-white">
                                    {barber.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {!isBlockedToday && (
                                <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 h-3 w-3 rounded-full border-2 border-elegant-bg" title="Disponible" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className={`font-bold text-sm truncate leading-tight ${isBlockedToday ? "text-rose-400" : "text-white"}`}>
                                {barber.name}
                              </h4>
                              {isBlockedToday ? (
                                <p className="text-[11px] text-rose-400 font-bold mt-0.5">🔴 Ausente / Descanso</p>
                              ) : (
                                <>
                                  <p className="text-xs text-elegant-text-muted mt-0.5 truncate">
                                    {barber.specialties && barber.specialties.length > 0 
                                      ? barber.specialties.slice(0, 2).map(s => {
                                          const cat = (config?.serviceCategories || []).find(c => c.id === s);
                                          return cat ? cat.name : s;
                                        }).join(" • ")
                                      : "Especialista"}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1 text-xs text-elegant-gold font-bold">
                                    <span>★ {ratingInfo.avg}</span>
                                    <span className="text-elegant-text-muted text-[11px] font-normal">
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
                    <h3 className="text-sm font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-2">
                      <span className="bg-elegant-gold text-elegant-bg w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-black">3</span>
                      Elige Fecha y Horario Disponible
                    </h3>

                    {/* Fecha de Agendamiento */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-300 block uppercase tracking-wider">Día Seleccionado:</label>
                      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
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
                              className={`p-2 xs:p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-elegant-gold bg-elegant-gold text-elegant-bg font-bold shadow-md shadow-amber-500/10"
                                  : "border-elegant-border bg-elegant-sub text-elegant-text hover:bg-elegant-card hover:border-neutral-600"
                              }`}
                            >
                              <span className={`text-xs font-bold uppercase ${isSelected ? "text-elegant-bg font-extrabold" : "text-neutral-400"}`}>
                                {label.dayName.slice(0, 3)}
                              </span>
                              <span className="text-base xs:text-lg font-bold font-sans mt-0.5">
                                {label.dayNum}
                              </span>
                              <span className={`text-[11px] font-mono ${isSelected ? "text-elegant-bg/90 font-bold" : "text-neutral-400"}`}>
                                {label.monthName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hora de Agendamiento */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                          Horas Disponibles ({formatDateLabel(selectedDate).full}):
                        </label>
                        <span className="text-xs text-elegant-text-muted font-medium hidden xs:inline">Los horarios ocupados se deshabilitan automáticamente</span>
                      </div>
                      
                      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-2.5">
                        {timeSlots.map((timeStr) => {
                          const isBusy = isSlotBusy(selectedDate, timeStr);
                          const isSelected = selectedTime === timeStr;

                          return (
                            <button
                              key={timeStr}
                              type="button"
                              disabled={isBusy}
                              onClick={() => setSelectedTime(timeStr)}
                              className={`py-2.5 px-2 text-center font-mono font-bold text-xs xs:text-sm rounded-xl transition-all ${
                                isBusy 
                                  ? "bg-elegant-sub/30 border border-elegant-border/30 text-neutral-600 cursor-not-allowed line-through" 
                                  : isSelected
                                    ? "bg-elegant-gold text-elegant-bg font-black ring-2 ring-elegant-gold shadow-md shadow-amber-500/10"
                                    : "bg-elegant-gold/10 border border-elegant-gold/30 hover:bg-elegant-gold/25 hover:border-elegant-gold text-elegant-gold cursor-pointer"
                              }`}
                            >
                              {formatTime(timeStr, config?.timeFormat)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* Paso 4: Formulario de Contacto */}
                {selectedService && selectedDate && selectedTime && (
                  <form onSubmit={handleBookingSubmit} className="space-y-4 pt-5 border-t border-elegant-border animate-fadeIn text-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-elegant-gold flex items-center gap-2">
                      <span className="bg-elegant-gold text-elegant-bg w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-black">4</span>
                      Tus Datos para Confirmación
                    </h3>

                    {loggedClient ? (
                      <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <UserCheck className="h-4 w-4" />
                              Sesión de Cliente Iniciada
                            </p>
                            <h4 className="text-base font-bold text-white">{loggedClient.name}</h4>
                            <p className="text-xs text-neutral-300 font-mono">{loggedClient.phone} | {loggedClient.email}</p>
                          </div>
                          {loggedClient.membershipActive && (
                            <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 text-xs font-extrabold px-3 py-1 rounded-xl uppercase">
                              Socio Activo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-300 italic">
                          Tus datos de contacto se han cargado automáticamente. Tu descuento de membresía se aplicará en el resumen final.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-elegant-sub/60 p-3.5 rounded-2xl border border-elegant-border text-xs text-neutral-300 flex items-center justify-between">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-300 block uppercase tracking-wider">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="Ej: Sofía Martínez"
                              className="w-full px-3.5 py-3 border border-elegant-border rounded-xl text-sm focus:ring-2 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-300 block uppercase tracking-wider">Número de Celular *</label>
                            <input
                              type="text"
                              required
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="Ej: +57 301 234 5678"
                              className="w-full px-3.5 py-3 border border-elegant-border rounded-xl text-sm focus:ring-2 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-300 block uppercase tracking-wider">Correo Electrónico (Opcional)</label>
                            <input
                              type="email"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="Ej: sofia@example.com"
                              className="w-full px-3.5 py-3 border border-elegant-border rounded-xl text-sm focus:ring-2 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-amber-300 block uppercase tracking-wider flex items-center gap-1">
                              <span>🎂 Fecha de Nacimiento / Cumpleaños</span>
                            </label>
                            <input
                              type="date"
                              value={clientBirthDate}
                              onChange={(e) => setClientBirthDate(e.target.value)}
                              className="w-full px-3.5 py-3 border border-amber-500/40 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 bg-elegant-sub text-white placeholder-neutral-500"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Beneficio Especial de Cumpleaños ($0 COP) */}
                    {(() => {
                      const activeBday = clientBirthDate || loggedClient?.birthDate || (() => {
                        if (clientPhone) {
                          const cleanP = clientPhone.replace(/\D/g, "");
                          if (cleanP.length >= 7) {
                            const match = clients.find(c => c.phone && c.phone.replace(/\D/g, "").includes(cleanP.slice(-7)));
                            if (match) return match.birthDate;
                          }
                        }
                        return "";
                      })();

                      const apptMonth = selectedDate ? selectedDate.substring(5, 7) : "";
                      let bdayMonth = "";
                      if (activeBday) {
                        if (activeBday.includes("-")) {
                          const parts = activeBday.split("-");
                          bdayMonth = parts.length === 3 ? parts[1] : parts[0];
                        }
                      }

                      const isBdayMonth = apptMonth && bdayMonth && apptMonth === bdayMonth;
                      const currentYear = selectedDate ? selectedDate.substring(0, 4) : new Date().getFullYear().toString();
                      const usedYears = loggedClient?.birthdayBenefitUsedYears || [];
                      const alreadyUsed = usedYears.includes(currentYear);

                      if (!isBdayMonth) return null;

                      const isEligible = selectedService ? selectedService.allowRewardRedemption !== false : true;

                      return (
                        <div className="bg-gradient-to-r from-purple-950/80 via-amber-950/70 to-purple-950/80 border-2 border-amber-500/70 p-4 rounded-2xl text-sm flex items-center justify-between gap-3 animate-fadeIn shadow-lg">
                          <div className="space-y-1 flex-1">
                            <p className="font-extrabold text-amber-300 flex items-center gap-2 uppercase tracking-wider text-xs">
                              <span>🎂 ¡FELIZ MES DE CUMPLEAÑOS!</span>
                            </p>
                            <p className="text-xs text-neutral-200">
                              {alreadyUsed ? (
                                <span className="text-amber-200/80 italic">Ya has utilizado tu regalo de corte gratis correspondiente a este año.</span>
                              ) : !isEligible ? (
                                <span className="text-rose-200/90 font-medium">
                                  🚫 El servicio seleccionado (<strong>{selectedService?.name}</strong>) no aplica para corte gratis de cumpleaños. Por favor selecciona un servicio apto (ej. Corte Tradicional) si deseas aplicar tu regalo.
                                </span>
                              ) : (
                                <span>🎉 Estás agendando en tu mes de cumpleaños. Tienes <strong>1 corte 100% GRATUITO de regalo ($0 COP)</strong>.</span>
                              )}
                            </p>
                          </div>
                          {!alreadyUsed && isEligible && (
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                checked={useBirthdayBenefit} 
                                onChange={(e) => setUseBirthdayBenefit(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-neutral-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-black"></div>
                            </label>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300 block uppercase tracking-wider">Notas para el Peluquero (Opcional)</label>
                      <textarea
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Escribe si tienes alguna preferencia para tu corte, el servicio o tienes dudas..."
                        rows={2.5}
                        className="w-full px-3.5 py-3 border border-elegant-border rounded-xl text-sm focus:ring-2 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500"
                      />
                    </div>

                    {/* Recompensa de fidelidad (Propuesta B) */}
                    {loggedClient && (loggedClient.loyaltyPoints || 0) >= 5 && (() => {
                      const isEligible = selectedService ? selectedService.allowRewardRedemption !== false : true;
                      return (
                        <div className="bg-elegant-gold/5 border border-elegant-gold/30 p-4 rounded-2xl text-sm flex items-center justify-between gap-3 animate-fadeIn">
                          <div className="space-y-1 flex-1">
                            <p className="font-bold text-elegant-gold flex items-center gap-2 uppercase tracking-wider text-xs">
                              <Gift className="h-4 w-4" />
                              ¡Recompensa Lista!
                            </p>
                            <p className="text-xs text-neutral-300">
                              {!isEligible ? (
                                <span className="text-rose-200/90 font-medium">
                                  🚫 El servicio seleccionado (<strong>{selectedService?.name}</strong>) no es apto para canjear por puntos de fidelización. Selecciona otro servicio para usar tus 5 puntos.
                                </span>
                              ) : (
                                <span>Tienes <strong>{loggedClient.loyaltyPoints} puntos</strong>. Puedes canjear 5 de ellos para que esta cita sea <strong>totalmente gratis</strong>.</span>
                              )}
                            </p>
                          </div>
                          {isEligible && (
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                checked={redeemReward} 
                                onChange={(e) => setRedeemReward(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-elegant-sub peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-elegant-gold peer-checked:after:bg-elegant-bg"></div>
                            </label>
                          )}
                        </div>
                      );
                    })()}

                    {/* Detection of active penalty surcharge */}
                    {(() => {
                      const clientPen = (() => {
                        if (loggedClient && (loggedClient.pendingPenalty || 0) > 0) return loggedClient.pendingPenalty;
                        if (clientPhone) {
                          const cleanP = clientPhone.replace(/\D/g, "");
                          if (cleanP.length >= 7) {
                            const match = clients.find(c => c.phone && c.phone.replace(/\D/g, "").includes(cleanP.slice(-7)));
                            if (match && (match.pendingPenalty || 0) > 0) return match.pendingPenalty;
                          }
                        }
                        return 0;
                      })();

                      if (clientPen <= 0) return null;

                      return (
                        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-4 rounded-2xl text-sm text-rose-100 space-y-1.5 animate-pulse shadow-lg">
                          <div className="flex items-center gap-2 font-black text-rose-200 uppercase tracking-wider text-xs">
                            <AlertCircle className="h-5 w-5 text-rose-300 shrink-0" />
                            <span>Recargo por Inasistencia Previa Incluido</span>
                          </div>
                          <p className="text-xs text-rose-200 leading-normal">
                            Se adicionó automáticamente un cobro de recaudo de <strong>{formatPrice(clientPen)}</strong> por inasistencia o cancelación previa sin aviso previo.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Resumen Final */}
                    <div className="bg-elegant-gold/10 border border-elegant-gold/30 p-4.5 rounded-2xl text-sm space-y-3">
                      <p className="font-bold text-elegant-gold flex items-center gap-2 text-sm uppercase tracking-wider">
                        <UserCheck className="h-4.5 w-4.5 text-elegant-gold" />
                        Resumen de Reserva:
                      </p>
                      <p className="text-neutral-200">
                        Servicio: <strong className="text-white">{selectedService.name}</strong> ({selectedService.duration} min)
                      </p>
                      
                      <div className="flex items-center gap-2.5 text-neutral-200 flex-wrap">
                        <span>Peluquero/Barbero:</span>
                        {(() => {
                          if (selectedBarberId === "any") {
                            return (
                              <span className="font-bold text-white flex items-center gap-1.5 bg-elegant-sub/80 px-2.5 py-1 rounded-xl border border-elegant-border">
                                <span>✨</span>
                                <span>Cualquier Barbero (Automático)</span>
                              </span>
                            );
                          }
                          const b = barbers.find(b => b.id === selectedBarberId);
                          const photo = b?.photoUrl || b?.avatarUrl || (b as any)?.avatar;
                          return (
                            <span className="font-bold text-white flex items-center gap-2 bg-elegant-sub/80 px-3 py-1 rounded-xl border border-elegant-gold/30">
                              <div className="h-6 w-6 rounded-full overflow-hidden bg-elegant-card border border-elegant-gold/40 flex items-center justify-center text-xs text-white shrink-0">
                                {photo ? (
                                  <img 
                                    src={photo} 
                                    alt={b?.name} 
                                    className="h-full w-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <span>{b?.name?.substring(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <span>{b?.name || "Cualquier Barbero"}</span>
                            </span>
                          );
                        })()}
                      </div>

                      <p className="text-neutral-200">
                        Fecha y Hora: <strong className="text-white">{formatDateLabel(selectedDate).full}</strong> a las <strong className="text-elegant-gold font-mono">{selectedTime}</strong>
                      </p>
                      {(() => {
                        const clientPen = (() => {
                          if (loggedClient && (loggedClient.pendingPenalty || 0) > 0) return loggedClient.pendingPenalty;
                          if (clientPhone) {
                            const cleanP = clientPhone.replace(/\D/g, "");
                            if (cleanP.length >= 7) {
                              const match = clients.find(c => c.phone && c.phone.replace(/\D/g, "").includes(cleanP.slice(-7)));
                              if (match && (match.pendingPenalty || 0) > 0) return match.pendingPenalty;
                            }
                          }
                          return 0;
                        })();

                        const basePrice = (useBirthdayBenefit || redeemReward)
                          ? 0 
                          : (discountPercent 
                              ? Math.round(selectedService.price * (1 - discountPercent / 100)) 
                              : selectedService.price);
                        
                        const totalPrice = basePrice + clientPen;

                        return (
                          <>
                            {clientPen > 0 && (
                              <p className="text-rose-300 font-bold flex justify-between items-center text-xs pt-1.5 border-t border-rose-900/40">
                                <span>+ Multa / Recargo Inasistencia Previa:</span>
                                <span className="font-mono text-rose-200">{formatPrice(clientPen)}</span>
                              </p>
                            )}
                            <div className="text-neutral-200 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-elegant-gold/25">
                              <span className="text-sm font-semibold">Total a Pagar:</span>
                              {useBirthdayBenefit ? (
                                <div className="text-right">
                                  <span className="line-through text-neutral-400 mr-2 font-mono text-xs">
                                    {formatPrice(selectedService.price)}
                                  </span>
                                  <strong className="text-amber-300 font-mono text-base uppercase font-black bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-xl">
                                    {clientPen > 0 ? `${formatPrice(totalPrice)} (Corte Gratis + Multa)` : "¡$0 COP! (🎂 Regalo Cumpleaños)"}
                                  </strong>
                                </div>
                              ) : redeemReward ? (
                                <div className="text-right">
                                  <span className="line-through text-elegant-text-muted mr-2 font-mono text-xs">
                                    {formatPrice(selectedService.price)}
                                  </span>
                                  <strong className="text-emerald-400 font-mono text-base uppercase font-black">
                                    {clientPen > 0 ? `${formatPrice(totalPrice)} (Servicio Gratis + Multa)` : "¡Gratis! (Canjeando Recompensa)"}
                                  </strong>
                                </div>
                              ) : (
                                <strong className="text-elegant-gold font-mono text-lg font-black">
                                  {formatPrice(totalPrice)}
                                </strong>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold rounded-2xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/20 active:scale-[0.99]"
                    >
                      {isSubmitting ? "Solicitando Turno..." : "Confirmar Mi Cita de Peluquería"}
                      <ArrowRight className="h-4.5 w-4.5" />
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
                Mis Citas & Historial
              </h3>
              <p className="text-[11px] text-elegant-text-muted">Consulta tus citas pendientes o explora tu historial de servicios.</p>
            </div>

            {/* Sincronizador / Buscador por Teléfono */}
            <div className="bg-elegant-sub/60 border border-elegant-border p-3 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-extrabold text-elegant-gold uppercase tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Sincronizar Citas por Celular
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchPhone}
                  onChange={(e) => {
                    setSearchPhone(e.target.value);
                    localStorage.setItem("bella_barba_last_phone", e.target.value);
                  }}
                  placeholder="Tu número de celular..."
                  className="w-full bg-elegant-bg border border-elegant-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-elegant-gold"
                />
              </div>
              <p className="text-[9px] text-elegant-text-muted leading-tight">
                Ingresa tu celular para ver automáticamente tus reservas activas e historial.
              </p>
            </div>

            {/* Tabs de Selección: Citas Pendientes vs Historial */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-elegant-border gap-1">
              <button
                onClick={() => setAppointmentsTab("active")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  appointmentsTab === "active"
                    ? "bg-amber-500 text-black font-extrabold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Activas</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  appointmentsTab === "active" ? "bg-black/30 text-black font-extrabold" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {myActiveAppointments.length}
                </span>
              </button>

              <button
                onClick={() => setAppointmentsTab("history")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  appointmentsTab === "history"
                    ? "bg-amber-500 text-black font-extrabold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Historial</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  appointmentsTab === "history" ? "bg-black/30 text-black font-extrabold" : "bg-neutral-800 text-neutral-300"
                }`}>
                  {myHistoryAppointments.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: CITAS PENDIENTES */}
            {appointmentsTab === "active" && (
              <div>
                {myActiveAppointments.length === 0 ? (
                  <div className="py-8 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
                    <HelpCircle className="h-7 w-7 mx-auto stroke-1 text-amber-400/60" />
                    <p className="text-xs text-white font-medium">No tienes citas pendientes agendadas.</p>
                    <p className="text-[10px] text-neutral-400 max-w-[220px] mx-auto">
                      Las reservas activas o agendadas automáticamente aparecerán aquí para que puedas gestionarlas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {myActiveAppointments.map((app) => (
                      <div
                        key={app.id}
                        className={`border rounded-2xl p-3.5 space-y-2.5 text-xs bg-elegant-sub transition-all ${
                          app.status === "confirmed" ? "border-emerald-900/50 bg-emerald-950/20" : "border-amber-900/50 bg-amber-950/20"
                        }`}
                      >
                        {/* Cabecera cita: Status */}
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-mono font-bold text-white bg-elegant-card px-2 py-0.5 rounded-lg border border-elegant-border text-xs">
                            {formatTime(app.time, config?.timeFormat)}
                          </span>

                          {app.status === "pending" && (
                            <span className="bg-amber-950/60 text-amber-300 border border-amber-700/50 text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse uppercase">
                              Esperando Aprobación
                            </span>
                          )}
                          {app.status === "confirmed" && (
                            <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              ¡Cita Confirmada!
                            </span>
                          )}
                        </div>

                        {/* Info de servicio */}
                        <div className="space-y-1">
                          <p className="font-bold text-white text-xs">{app.serviceName}</p>
                          
                          {/* Barber info with photo */}
                          <div className="flex items-center gap-1.5 text-[10px] text-elegant-gold font-semibold">
                            {(() => {
                              const b = barbers.find(item => item.id === app.barberId || item.name === app.barberName);
                              const photo = b?.photoUrl || b?.avatarUrl || (b as any)?.avatar;
                              if (photo) {
                                return (
                                  <div className="h-4 w-4 rounded-full overflow-hidden border border-elegant-gold/40 shrink-0">
                                    <img 
                                      src={photo} 
                                      alt={app.barberName || "Barbero"} 
                                      className="h-full w-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                    />
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <span>Peluquero: {app.barberName || "Cualquier Barbero"}</span>
                          </div>

                          <p className="text-[10px] text-elegant-text-muted font-mono">
                            {formatDateLabel(app.date).full} • {app.duration} mins
                          </p>
                          {app.notes && app.notes.includes("Agendado automáticamente") && (
                            <p className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md mt-1 inline-block font-mono">
                              ⚡ Agendamiento por Ciclo Habitual
                            </p>
                          )}
                        </div>

                        {/* Precio y Botón de Cancelación */}
                        <div className="flex justify-between items-center pt-2 border-t border-elegant-border/60">
                          <span className="text-elegant-text-muted text-[10px]">
                            A pagar: <strong className="text-elegant-gold font-mono text-xs">{formatPrice(app.price)}</strong>
                          </span>
                          
                          <button
                            onClick={() => handleCancelMyBooking(app.id, formatDateLabel(app.date).full, app.time)}
                            className="bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-extrabold text-[10px] px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Cancelar cita"
                          >
                            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            <span>Cancelar Cita</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: HISTORIAL DE CITAS */}
            {appointmentsTab === "history" && (
              <div>
                {myHistoryAppointments.length === 0 ? (
                  <div className="py-8 text-center text-elegant-text-muted space-y-2 border border-dashed border-elegant-border rounded-2xl">
                    <History className="h-7 w-7 mx-auto stroke-1 text-neutral-500" />
                    <p className="text-xs text-white font-medium">Aún no tienes historial de citas realizadas o canceladas.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {myHistoryAppointments.map((app) => (
                      <div
                        key={app.id}
                        className={`border rounded-2xl p-3.5 space-y-2 text-xs bg-elegant-sub/60 transition-all ${
                          app.status === "completed" ? "border-blue-900/40 bg-blue-950/10" : "border-rose-900/40 bg-rose-950/10 opacity-75"
                        }`}
                      >
                        {/* Cabecera status */}
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-mono font-bold text-neutral-300 bg-black/40 px-2 py-0.5 rounded-lg border border-elegant-border text-[11px]">
                            {formatTime(app.time, config?.timeFormat)}
                          </span>

                          {app.status === "completed" && (
                            <span className="bg-blue-950/50 text-blue-300 border border-blue-800/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Servicio Realizado
                            </span>
                          )}
                          {app.status === "canceled" && (
                            <span className="bg-rose-950/50 text-rose-300 border border-rose-800/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Cancelado
                            </span>
                          )}
                        </div>

                        {/* Info de servicio */}
                        <div className="space-y-1">
                          <p className="font-bold text-white text-xs">{app.serviceName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-elegant-gold font-semibold">
                            {(() => {
                              const b = barbers.find(item => item.id === app.barberId || item.name === app.barberName);
                              const photo = b?.photoUrl || b?.avatarUrl || (b as any)?.avatar;
                              if (photo) {
                                return (
                                  <div className="h-4 w-4 rounded-full overflow-hidden border border-elegant-gold/40 shrink-0">
                                    <img 
                                      src={photo} 
                                      alt={app.barberName || "Barbero"} 
                                      className="h-full w-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                    />
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <span>Peluquero: {app.barberName || "Cualquier Barbero"}</span>
                          </div>
                          <p className="text-[10px] text-elegant-text-muted font-mono">
                            {formatDateLabel(app.date).full} • {app.duration} mins
                          </p>
                        </div>

                        {/* Precio */}
                        <div className="flex justify-between items-center pt-2 border-t border-elegant-border/60">
                          <span className="text-elegant-text-muted text-[10px]">
                            Monto: <strong className="text-elegant-gold font-mono text-xs">{formatPrice(app.price)}</strong>
                          </span>
                        </div>

                        {/* Hairdresser Notes Feedback */}
                        {app.hairdresserNotes && app.status === "completed" && (
                          <div className="mt-1 bg-blue-950/30 p-2 rounded-lg text-[10px] border border-blue-800/40 text-blue-300">
                            <span className="font-bold text-blue-400 block">Fórmula de Peluquero:</span>
                            "{app.hairdresserNotes}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-300 font-mono">
                      <span>🎂 Cumpleaños:</span>
                      <strong>
                        {loggedClient.birthDate
                          ? loggedClient.birthDate.split("-").reverse().join("/")
                          : "Sin registrar"}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBirthDate(!editingBirthDate);
                          setUserBirthDateInput(loggedClient.birthDate || "");
                        }}
                        className="ml-1 text-[10px] text-amber-400 hover:text-amber-200 underline cursor-pointer font-sans font-bold"
                      >
                        {loggedClient.birthDate ? "Modificar" : "+ Añadir"}
                      </button>
                    </div>

                    {editingBirthDate && (
                      <div className="mt-2 flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-amber-500/40">
                        <input
                          type="date"
                          value={userBirthDateInput}
                          onChange={(e) => setUserBirthDateInput(e.target.value)}
                          className="px-2.5 py-1.5 bg-elegant-sub border border-elegant-border rounded-lg text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={handleSaveProfileBirthDate}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          Guardar
                        </button>
                      </div>
                    )}
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

              {/* My active client portal bookings & history */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-elegant-border pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-elegant-text-muted flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-amber-400" />
                    Historial y Próximos Turnos
                  </h4>
                  <span className="text-[10px] font-mono text-elegant-text-muted">Asociados a tu cuenta</span>
                </div>

                {(() => {
                  // Find all appointments matching client email or phone
                  const myUserAppointments = appointments.filter(
                    app => app.clientPhone === loggedClient.phone || (loggedClient.email && app.clientEmail?.toLowerCase() === loggedClient.email.toLowerCase())
                  ).sort((a, b) => {
                    const dComp = b.date.localeCompare(a.date);
                    if (dComp !== 0) return dComp;
                    return b.time.localeCompare(a.time);
                  });

                  const activeUserApps = myUserAppointments.filter(a => a.status === "pending" || a.status === "confirmed");
                  const historyUserApps = myUserAppointments.filter(a => a.status === "completed" || a.status === "canceled");

                  if (myUserAppointments.length === 0) {
                    return (
                      <div className="py-6 text-center text-elegant-text-muted text-xs border border-dashed border-elegant-border rounded-2xl">
                        Aún no tienes turnos registrados con esta cuenta.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {/* Section: Próximos Turnos */}
                      {activeUserApps.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                            ⚡ Próximos Turnos ({activeUserApps.length})
                          </span>
                          <div className="space-y-2">
                            {activeUserApps.map(app => (
                              <div key={app.id} className="p-3 bg-elegant-sub border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                                <div className="space-y-1">
                                  <p className="font-bold text-white">{app.serviceName}</p>
                                  <p className="text-[10px] text-elegant-text-muted">
                                    {formatDateLabel(app.date).full} • {formatTime(app.time, config?.timeFormat)} • {app.barberName}
                                  </p>
                                  <span className="text-[10px] text-elegant-gold font-semibold">A pagar: {formatPrice(app.price)}</span>
                                </div>
                                <div>
                                  {app.status === "pending" && (
                                    <span className="bg-amber-950/50 text-amber-400 border border-amber-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                                      Pendiente
                                    </span>
                                  )}
                                  {app.status === "confirmed" && (
                                    <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                      ¡Confirmada!
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: Historial de Servicios */}
                      {historyUserApps.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-elegant-border/50">
                          <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                            📜 Historial de Citas ({historyUserApps.length})
                          </span>
                          <div className="space-y-2">
                            {historyUserApps.map(app => (
                              <div key={app.id} className="p-3 bg-elegant-sub/50 border border-elegant-border rounded-xl flex items-center justify-between text-xs opacity-90">
                                <div className="space-y-1">
                                  <p className="font-bold text-white">{app.serviceName}</p>
                                  <p className="text-[10px] text-elegant-text-muted">
                                    {formatDateLabel(app.date).full} • {formatTime(app.time, config?.timeFormat)} • {app.barberName}
                                  </p>
                                  <span className="text-[10px] text-elegant-gold font-semibold">Monto: {formatPrice(app.price)}</span>
                                </div>
                                <div>
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
                        </div>
                      )}
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
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot");
                          setAuthError("");
                          setAuthSuccess("");
                        }}
                        className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        🔑 ¿Olvidaste tu clave?
                      </button>
                    </div>
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
              ) : authMode === "register" ? (
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-300 block uppercase flex items-center gap-1">
                        <span>🎂 Fecha de Nacimiento / Cumpleaños</span>
                      </label>
                      <input
                        type="date"
                        value={authBirthDate}
                        onChange={(e) => setAuthBirthDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-amber-500/40 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 bg-elegant-sub text-white placeholder-neutral-500"
                      />
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
              ) : (
                /* Forgot Password Form */
                <form onSubmit={handleClientResetPasswordSubmit} className="space-y-4 text-xs animate-fadeIn">
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-amber-200 text-xs leading-relaxed">
                    🔑 <strong>Restablecimiento de Contraseña:</strong> Ingresa el correo electrónico registrado en tu cuenta y crea tu nueva contraseña.
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Correo Electrónico Registrado *</label>
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
                    <label className="text-[10px] font-bold text-elegant-text-muted block uppercase">Número de Celular (Verificación opcional)</label>
                    <input
                      type="text"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="Ej: +57 301 234 5678"
                      className="w-full px-3 py-2.5 border border-elegant-border rounded-xl text-xs focus:ring-1 focus:ring-elegant-gold bg-elegant-sub text-white placeholder-neutral-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-300 block uppercase">Nueva Contraseña *</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Escribe tu nueva clave"
                      className="w-full px-3 py-2.5 border border-amber-500/50 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 bg-elegant-sub text-white placeholder-neutral-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {authLoading ? "Restableciendo..." : "Restablecer mi Contraseña"}
                    <Check className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                        setAuthSuccess("");
                      }}
                      className="text-xs text-neutral-400 hover:text-white font-bold underline cursor-pointer"
                    >
                      ← Volver a Iniciar Sesión
                    </button>
                  </div>
                </form>
              )}

              <p className="text-[11px] text-elegant-text-muted leading-relaxed text-center">
                Al unirte a nuestro programa, podrás suscribirte de inmediato a cualquiera de nuestros planes bronce, plata u oro para conseguir descuentos instantáneos en cada cita de corte o barba.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Lookbook / Catálogo de Estilos de Referencia */}
      <ClientStyleLookbookModal
        isOpen={showLookbookModal}
        onClose={() => setShowLookbookModal(false)}
        onSelectStyle={(style) => {
          setSelectedCatalogStyle(style);
          if (style.serviceId) {
            const matched = services.find(s => s.id === style.serviceId);
            if (matched) setSelectedService(matched);
          } else if (!selectedService && services.length > 0) {
            setSelectedService(services[0]);
          }
        }}
        services={services}
        config={config}
        currentSelectedStyleId={selectedCatalogStyle?.id}
        formatPrice={formatPrice}
      />
    </div>
  );
}
