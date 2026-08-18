import React, { useState, useRef, useEffect } from "react";
import { Appointment, ClientAccount, Barber, HaircutPhoto, TechnicalPreferences, InventoryItem, Service } from "../types";
import { 
  Smartphone, 
  Scissors, 
  User, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  ChevronRight, 
  X, 
  Upload, 
  MessageSquare, 
  Check, 
  Plus, 
  Search, 
  Award, 
  Zap,
  Info,
  Layers,
  UserX,
  ArrowLeft,
  Volume2,
  RefreshCw,
  Share2,
  Maximize2,
  Megaphone,
  Wine,
  Banknote,
  CreditCard,
  QrCode,
  DollarSign
} from "lucide-react";
import RetentionEngineModal from "./RetentionEngineModal";
import AutoReagendaModal from "./AutoReagendaModal";

interface ModoSillaPWAProps {
  appointments: Appointment[];
  clients: ClientAccount[];
  barbers: Barber[];
  services?: Service[];
  config?: any;
  inventory?: InventoryItem[];
  loggedBarberId?: string;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => Promise<any>;
  onUpdateClient: (id: string, updates: Partial<ClientAccount>) => Promise<any>;
  onCreateAppointment?: (appointmentData: any) => Promise<any>;
  onRefresh?: () => void;
  formatPrice: (price: number) => string;
  onClose?: () => void;
  salonName?: string;
}

export default function ModoSillaPWA({
  appointments,
  clients,
  barbers,
  services = [],
  config,
  inventory = [],
  loggedBarberId,
  onUpdateAppointment,
  onUpdateClient,
  onCreateAppointment,
  onRefresh,
  formatPrice,
  onClose,
  salonName = "Barbería Pro",
}: ModoSillaPWAProps) {
  // Barber selection state
  const [selectedBarberId, setSelectedBarberId] = useState<string>(() => {
    if (loggedBarberId) return loggedBarberId;
    return barbers[0]?.id || "b1";
  });

  // Active appointment / client selection
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  
  // Search state for quick client lookup
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Photo Zoom Modal
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  // Retention Engine Modal trigger
  const [retentionClient, setRetentionClient] = useState<ClientAccount | null>(null);

  // PWA Installation Guide Modal
  const [showPwaGuide, setShowPwaGuide] = useState<boolean>(false);

  // Auto Reagenda Modal
  const [showAutoReagenda, setShowAutoReagenda] = useState<boolean>(false);
  const [autoReagendaApp, setAutoReagendaApp] = useState<Appointment | null>(null);
  const [autoReagendaClient, setAutoReagendaClient] = useState<ClientAccount | null>(null);

  // Upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing technical notes on the fly
  const [quickNote, setQuickNote] = useState<string>("");
  const [editingTechPrefs, setEditingTechPrefs] = useState<boolean>(false);
  const [tempFade, setTempFade] = useState<string>("");
  const [tempTop, setTempTop] = useState<string>("");
  const [tempBeard, setTempBeard] = useState<string>("");
  const [tempSkin, setTempSkin] = useState<string>("");

  // Success / Info toast message inside PWA
  const [pwaToast, setPwaToast] = useState<string>("");

  // Announcements State in ModoSilla
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  // Daily Earnings Modal for Barbero
  const [showMyEarningsModal, setShowMyEarningsModal] = useState<boolean>(false);

  // Payment Modal state for Facturar
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'transferencia' | 'nequi_daviplata' | 'tarjeta'>('efectivo');
  const [customTip, setCustomTip] = useState<number>(0);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Reasignación Express de Silla state
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [targetBarberId, setTargetBarberId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Date selection state (defaults strictly to today)
  const now = new Date();
  const defaultToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayISO = now.toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(defaultToday);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data.announcements) setAnnouncements(data.announcements);
        }
      } catch (e) {
        console.warn("Error obteniendo anuncios en ModoSilla:", e);
      }
    };
    fetchAnnouncements();
  }, []);

  const visibleAnnouncements = announcements.filter(
    (a) => a.active !== false && (!a.expiresAt || new Date(a.expiresAt).getTime() > Date.now()) && !dismissedAnnouncements.includes(a.id)
  );

  const triggerPwaToast = (msg: string) => {
    setPwaToast(msg);
    setTimeout(() => setPwaToast(""), 3500);
  };

  // Consumptions state inside chair view
  const [showAddConsumption, setShowAddConsumption] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [consumptionQty, setConsumptionQty] = useState<number>(1);
  const [isSubmittingConsumption, setIsSubmittingConsumption] = useState<boolean>(false);

  const handleAddConsumptionPWA = async (appId: string) => {
    if (!selectedItemId) return;
    if (activeAppointment?.status === "completed") {
      triggerPwaToast("⚠️ Cita ya completada y facturada. No se pueden agregar consumos.");
      return;
    }
    setIsSubmittingConsumption(true);
    try {
      const res = await fetch(`/api/appointments/${appId}/add-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedItemId,
          quantity: consumptionQty
        })
      });
      if (res.ok) {
        triggerPwaToast("🥤 ¡Consumo añadido a la silla! Totalizado actualizado.");
        if (onRefresh) onRefresh();
        setSelectedItemId("");
        setConsumptionQty(1);
        setShowAddConsumption(false);
      } else {
        const err = await res.json();
        triggerPwaToast(`⚠️ ${err.error || "No se pudo añadir consumo"}`);
      }
    } catch (e) {
      triggerPwaToast("❌ Error al añadir consumo");
    } finally {
      setIsSubmittingConsumption(false);
    }
  };

  const handleRemoveConsumptionPWA = async (appId: string, index: number) => {
    if (activeAppointment?.status === "completed") {
      triggerPwaToast("⚠️ Cita ya completada y facturada. No se pueden eliminar consumos.");
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${appId}/remove-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumptionIndex: index })
      });
      if (res.ok) {
        triggerPwaToast("🗑️ Consumo eliminado y stock devuelto.");
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        triggerPwaToast(`⚠️ ${err.error || "Error al eliminar"}`);
      }
    } catch (e) {
      triggerPwaToast("❌ Error al eliminar consumo");
    }
  };

  // Filter appointments for selected barber AND selected date (defaults strictly to today)
  const barberAppointments = appointments.filter(app => {
    const isMatchingDate = app.date === selectedDate || (selectedDate === defaultToday && app.date === todayISO);
    if (!isMatchingDate) return false;
    if (selectedBarberId === "all") return true;
    return app.barberId === selectedBarberId || !app.barberId;
  });

  // Sort appointments by status (pending/confirmed first) then time
  const sortedAppointments = [...barberAppointments].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      confirmed: 1,
      pending: 2,
      completed: 3,
      canceled: 4,
    };
    const orderDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    if (orderDiff !== 0) return orderDiff;
    return a.time.localeCompare(b.time);
  });

  // Auto-select first active appointment if none selected or selection not in current date list
  useEffect(() => {
    if (sortedAppointments.length > 0) {
      const exists = sortedAppointments.some(a => a.id === selectedAppointmentId);
      if (!exists || !selectedAppointmentId) {
        setSelectedAppointmentId(sortedAppointments[0].id);
      }
    } else {
      setSelectedAppointmentId("");
    }
  }, [selectedBarberId, selectedDate, appointments]);

  const activeAppointment = sortedAppointments.find(a => a.id === selectedAppointmentId) || sortedAppointments[0];

  // Find client account matching active appointment
  const matchingClient = clients.find(c => {
    if (!activeAppointment) return false;
    const phoneMatch = c.phone.replace(/\s+/g, '') === activeAppointment.clientPhone.replace(/\s+/g, '');
    const emailMatch = c.email && activeAppointment.clientEmail && c.email.toLowerCase() === activeAppointment.clientEmail.toLowerCase();
    const nameMatch = c.name.toLowerCase().trim() === activeAppointment.clientName.toLowerCase().trim();
    return phoneMatch || emailMatch || nameMatch;
  });

  // Fallback client structure if no client account matched yet
  const displayClient: ClientAccount = matchingClient || {
    id: `temp_${activeAppointment?.id || '1'}`,
    name: activeAppointment?.clientName || "Cliente Actual",
    phone: activeAppointment?.clientPhone || "",
    email: activeAppointment?.clientEmail || "",
    createdAt: new Date().toISOString(),
    loyaltyPoints: 1,
    technicalPreferences: {
      fadeType: "Medio (Mid Fade)",
      topStyle: "Tijera Texturizado",
      beardStyle: "Delineado Navaja & Bálsamo",
      skinSensitivity: "Normal",
      favoriteProducts: ["Cera Efecto Mate"]
    },
    galleryPhotos: [
      {
        id: "demo_photo",
        url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
        date: "2026-07-01",
        styleTag: "Mid Fade + Barba",
        barberName: activeAppointment?.barberName || "Barbero"
      }
    ]
  };

  // Initialize tech prefs form when active client changes
  useEffect(() => {
    if (displayClient.technicalPreferences) {
      setTempFade(displayClient.technicalPreferences.fadeType || "Medio (Mid Fade)");
      setTempTop(displayClient.technicalPreferences.topStyle || "Tijera Texturizado");
      setTempBeard(displayClient.technicalPreferences.beardStyle || "Ritual Navaja");
      setTempSkin(displayClient.technicalPreferences.skinSensitivity || "Normal");
    }
  }, [displayClient.id]);

  // Handle camera photo capture / upload
  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const photoDataUrl = e.target?.result as string;
        if (!photoDataUrl) return;

        const newPhoto: HaircutPhoto = {
          id: `photo_${Date.now()}`,
          url: photoDataUrl,
          date: new Date().toISOString().split("T")[0],
          styleTag: `${tempFade} + ${tempTop}`,
          barberName: activeAppointment?.barberName || "Barbero Silla",
          notes: quickNote || "Foto tomada desde Modo Silla PWA"
        };

        const currentPhotos = displayClient.galleryPhotos || [];
        const updatedPhotos = [newPhoto, ...currentPhotos];

        // Save to client
        if (matchingClient) {
          await onUpdateClient(matchingClient.id, {
            galleryPhotos: updatedPhotos,
            lastCutDate: new Date().toISOString().split("T")[0]
          });
        }

        triggerPwaToast("📸 ¡Foto del corte guardada en la ficha del cliente!");
        setIsUploadingPhoto(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      triggerPwaToast("❌ Error al guardar foto.");
      setIsUploadingPhoto(false);
    }
  };

  // Open Payment Selection Modal
  const handleOpenPaymentModal = () => {
    if (!activeAppointment) return;
    if (activeAppointment.status === "completed") {
      triggerPwaToast("⚠️ Esta cita ya fue completada y facturada. El agendamiento automático ya se realizó.");
      return;
    }
    setSelectedPaymentMethod("efectivo");
    setCustomTip(0);
    setShowPaymentModal(true);
  };

  // Confirm payment method and complete appointment
  const handleConfirmPaymentAndComplete = async () => {
    if (!activeAppointment) return;
    setIsSubmittingPayment(true);
    try {
      const updatePayload: Partial<Appointment> = {
        status: "completed",
        paymentMethod: selectedPaymentMethod,
        tip: customTip > 0 ? customTip : 0,
      };

      if (quickNote && quickNote.trim()) {
        updatePayload.hairdresserNotes = (activeAppointment.hairdresserNotes ? activeAppointment.hairdresserNotes + "\n" : "") + `[${new Date().toLocaleDateString()}] ${quickNote.trim()}`;
      }

      await onUpdateAppointment(activeAppointment.id, updatePayload);
      
      const targetClientId = matchingClient?.id || (displayClient?.id && !displayClient.id.startsWith("temp_") ? displayClient.id : null);
      
      if (targetClientId) {
        const currentPoints = matchingClient?.loyaltyPoints || 0;
        const currentPenalty = displayClient.pendingPenalty || 0;

        // If client had a pending penalty, clear it since it was collected in this checkout
        if (currentPenalty > 0) {
          try {
            await fetch(`/api/clients/${targetClientId}/penalties/waive`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ waivedBy: "Cobrado en Silla PWA" })
            });
          } catch (e) {
            console.error("Error al limpiar multa recaudada:", e);
          }
        }

        await onUpdateClient(targetClientId, {
          loyaltyPoints: currentPoints + 1,
          pendingPenalty: 0,
          lastCutDate: new Date().toISOString().split("T")[0]
        });
      }

      const payLabel = 
        selectedPaymentMethod === "efectivo" ? "Efectivo" :
        selectedPaymentMethod === "transferencia" ? "Transferencia" :
        selectedPaymentMethod === "nequi_daviplata" ? "Nequi/Daviplata" : "Tarjeta";

      setShowPaymentModal(false);
      triggerPwaToast(`🎉 ¡Pago registrado (${payLabel})! Sugiriendo próxima cita...`);
      setAutoReagendaApp(activeAppointment);
      setAutoReagendaClient(matchingClient || displayClient);
      setShowAutoReagenda(true);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      triggerPwaToast("❌ Error al finalizar pago.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Reasignación Express de Silla handler
  const handleConfirmReassignment = async (newBarberId: string) => {
    if (!activeAppointment) return;
    const targetBarber = barbers.find(b => b.id === newBarberId);
    if (!targetBarber) return;

    setIsReassigning(true);
    try {
      const reasonText = reassignReason.trim() ? ` [Motivo: ${reassignReason.trim()}]` : "";
      const updatedNotes = ((activeAppointment.notes || "") + `\n[Reasignación Express de Silla -> ${targetBarber.name}${reasonText}]`).trim();

      await onUpdateAppointment(activeAppointment.id, {
        barberId: targetBarber.id,
        barberName: targetBarber.name,
        notes: updatedNotes
      });

      triggerPwaToast(`🔄 Cita de ${activeAppointment.clientName} reasignada express a ${targetBarber.name}`);
      setShowReassignModal(false);
      // Switch view to target barber chair
      setSelectedBarberId(targetBarber.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      triggerPwaToast("❌ Error al reasignar la cita.");
    } finally {
      setIsReassigning(false);
    }
  };

  // Mark appointment as No-Show and apply penalty to client
  const handleMarkNoShow = async () => {
    if (!activeAppointment) return;
    if (activeAppointment.status === "completed") {
      triggerPwaToast("⚠️ Esta cita ya fue completada y no se puede marcar como inasistencia.");
      return;
    }
    if (!confirm(`¿Confirmar que el cliente ${activeAppointment.clientName} NO asistió a la cita de las ${activeAppointment.time} hs?\n\nSe cancelará la cita y se registrará automáticamente una multa de $10.000 en su ficha para cobrar en su próxima reserva.`)) {
      return;
    }

    try {
      await onUpdateAppointment(activeAppointment.id, {
        status: "canceled",
        notes: (activeAppointment.notes || "") + " [Inasistencia registrada por barbero]"
      });

      let targetClientId = matchingClient?.id || (displayClient?.id && !displayClient.id.startsWith("temp_") ? displayClient.id : null);

      // If client account doesn't exist yet, create it automatically so the penalty persists
      if (!targetClientId) {
        try {
          const createRes = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: activeAppointment.clientName,
              phone: activeAppointment.clientPhone,
              email: activeAppointment.clientEmail || "",
              notes: "Cliente registrado automáticamente por inasistencia previa"
            })
          });
          if (createRes.ok) {
            const newCli = await createRes.json();
            targetClientId = newCli.id;
          }
        } catch (e) {
          console.error("Error creando cliente para multa:", e);
        }
      }

      const penaltyVal = config?.noShowPenaltyAmount !== undefined ? config.noShowPenaltyAmount : 10000;
      if (targetClientId) {
        const res = await fetch(`/api/clients/${targetClientId}/penalties/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: penaltyVal,
            reason: `Inasistencia a cita del ${activeAppointment.date} (${activeAppointment.time} hs)`
          })
        });
        const data = await res.json();
        if (res.ok && data.client) {
          onUpdateClient(targetClientId, { pendingPenalty: data.client.pendingPenalty });
        }
      }

      triggerPwaToast(`⚠️ Inasistencia registrada. Multa de ${formatPrice(penaltyVal)} asignada a la ficha del cliente.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      triggerPwaToast("❌ Error al marcar inasistencia.");
    }
  };

  // Save updated preferences
  const handleSavePreferences = async () => {
    if (!matchingClient) {
      triggerPwaToast("⚠️ Registra el cliente para guardar preferencias.");
      setEditingTechPrefs(false);
      return;
    }

    try {
      await onUpdateClient(matchingClient.id, {
        technicalPreferences: {
          fadeType: tempFade,
          topStyle: tempTop,
          beardStyle: tempBeard,
          skinSensitivity: tempSkin,
          favoriteProducts: displayClient.technicalPreferences?.favoriteProducts || ["Cera Efecto Mate"]
        },
        internalNotes: quickNote ? `${displayClient.internalNotes || ''}\n[${new Date().toLocaleDateString()}] ${quickNote}` : displayClient.internalNotes
      });
      triggerPwaToast("✅ Preferences técnicas actualizadas en 1 clic.");
      setEditingTechPrefs(false);
    } catch (err) {
      triggerPwaToast("❌ Error al actualizar preferencias.");
    }
  };

  // Quick preset notes
  const addQuickPresetNote = (tag: string) => {
    setQuickNote(prev => prev ? `${prev} | ${tag}` : tag);
  };

  // Clean WhatsApp number
  const cleanPhone = (displayClient.phone || "").replace(/[^0-9+]/g, '');

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0E] text-white overflow-y-auto flex flex-col font-sans select-none animate-fadeIn">
      
      {/* HEADER PWA TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#121217]/95 backdrop-blur-md border-b border-elegant-gold/30 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-elegant-gold text-black flex items-center justify-center font-extrabold shadow-lg shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider font-sans">
                MODO SILLA PWA
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                &lt; 2 SEC
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Vista Ultra Rápida de Teléfono para Barberos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Mi Nómina del Día */}
          <button
            onClick={() => setShowMyEarningsModal(true)}
            className="px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
          >
            <Award className="h-3 w-3 text-emerald-400" />
            <span>💰 Mis Ganancias</span>
          </button>

          {/* Botón Instalar App Móvil */}
          <button
            onClick={() => setShowPwaGuide(true)}
            className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Share2 className="h-3 w-3" />
            <span className="hidden sm:inline">Instalar PWA</span>
          </button>

          {/* Salir / Cerrar */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800/60 border border-neutral-700/60 rounded-xl cursor-pointer"
              title="Salir de Modo Silla"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* TOAST FLOTANTE */}
      {pwaToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 border border-emerald-400 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <span>{pwaToast}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL MÓVIL */}
      <div className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 pb-28">

        {/* Global Announcements Banner */}
        {visibleAnnouncements.length > 0 && (
          <div className="space-y-2">
            {visibleAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 shadow-lg ${
                  ann.type === "alert"
                    ? "bg-rose-950/90 border-rose-600/70 text-rose-100"
                    : ann.type === "warning"
                    ? "bg-amber-950/90 border-amber-600/70 text-amber-100"
                    : ann.type === "success"
                    ? "bg-emerald-950/90 border-emerald-600/70 text-emerald-100"
                    : "bg-sky-950/90 border-sky-600/70 text-sky-100"
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <Megaphone className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/15 tracking-wider border border-white/20 inline-block mb-1">
                      {ann.type === "alert" ? "🚨 Urgente" : ann.type === "warning" ? "⚠️ Aviso" : ann.type === "success" ? "🎉 Novedad" : "📢 Anuncio"}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">{ann.title}</h4>
                    <p className="text-[11px] opacity-90 leading-normal font-sans">{ann.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedAnnouncements(prev => [...prev, ann.id])}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 shrink-0 cursor-pointer"
                  title="Descartar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SELECTOR DE BARBERO Y FECHA DE TURNOS */}
        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center px-1 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-elegant-gold flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5" />
                Barbero:
              </span>

              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="bg-[#1A1A22] border border-elegant-border text-white text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none focus:border-elegant-gold cursor-pointer"
              >
                <option value="all">Todos los Barberos</option>
                {barbers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase font-mono flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                Día:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#1A1A22] border border-amber-500/30 text-amber-300 text-xs px-2 py-1 rounded-xl font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              />
              {selectedDate !== defaultToday && (
                <button
                  onClick={() => setSelectedDate(defaultToday)}
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all"
                  title="Volver a Hoy"
                >
                  Hoy
                </button>
              )}
            </div>
          </div>

          {/* TARJETA DE GAMIFICACIÓN Y OBJETIVOS DIARIOS */}
          {(() => {
            const currentBarber = barbers.find(b => b.id === selectedBarberId) || barbers[0];
            const barberTodayApps = appointments.filter(a => (selectedBarberId === "all" || a.barberId === selectedBarberId) && (a.date === selectedDate || (selectedDate === defaultToday && a.date === todayISO)));
            const completedCount = barberTodayApps.filter(a => a.status === "completed").length;
            const goalCuts = currentBarber?.dailyGoalCuts || 8;
            const cutsPct = Math.min(100, Math.round((completedCount / goalCuts) * 100));

            // Product Sales revenue
            let prodRevenue = 0;
            barberTodayApps.forEach(a => {
              if (a.status === "completed" && a.consumptions) {
                a.consumptions.forEach(c => prodRevenue += (c.price || 0) * (c.quantity || 1));
              }
            });
            const goalSales = currentBarber?.dailyGoalSales || 30000;
            const salesPct = Math.min(100, Math.round((prodRevenue / goalSales) * 100));

            return (
              <div className="bg-[#14141B] border border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg bg-gradient-to-br from-amber-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/40">
                      🏆
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        DESAFÍO DEL DÍA
                        <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                          LVL {currentBarber?.level || 3}
                        </span>
                      </h4>
                      <p className="text-[10px] text-neutral-400">Objetivos diarios en la silla</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-black/40 px-2 py-1 rounded-xl border border-amber-500/30 font-mono">
                    <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span>{currentBarber?.xp || 420} XP</span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  {/* Meta Cortes */}
                  <div className="space-y-1 bg-[#1C1C26] p-2 rounded-xl border border-neutral-800">
                    <div className="flex justify-between font-bold">
                      <span className="text-neutral-300">✂️ Cortes: {completedCount}/{goalCuts}</span>
                      <span className="text-amber-400">{cutsPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${cutsPct}%` }}></div>
                    </div>
                  </div>

                  {/* Meta Productos */}
                  <div className="space-y-1 bg-[#1C1C26] p-2 rounded-xl border border-neutral-800">
                    <div className="flex justify-between font-bold">
                      <span className="text-cyan-300">🥤 Venta: ${prodRevenue.toLocaleString()}</span>
                      <span className="text-cyan-400">{salesPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${salesPct}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Badges unlocked */}
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none">
                  {cutsPct >= 100 && (
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🥇 Meta Cortes Cumplida
                    </span>
                  )}
                  {salesPct >= 100 && (
                    <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                      🥤 Rey de la Nevera
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                    🔥 Racha de {completedCount} Atenciones
                  </span>
                </div>
              </div>
            );
          })()}

          {/* CAROUSEL HORIZONTAL DE TURNOS (1-TAP SELECTION) */}
          {sortedAppointments.length === 0 ? (
            <div className="bg-[#16161D] border border-neutral-800 rounded-2xl p-4 text-center text-xs text-neutral-400 space-y-1">
              <Clock className="h-5 w-5 mx-auto text-neutral-500" />
              <p>No hay turnos registrados para este barbero hoy.</p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              {sortedAppointments.map((app) => {
                const isSelected = activeAppointment?.id === app.id;
                const isCompleted = app.status === "completed";
                const isCanceled = app.status === "canceled";

                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppointmentId(app.id)}
                    className={`snap-start shrink-0 p-3 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer min-w-[140px] relative ${
                      isSelected
                        ? "bg-gradient-to-b from-amber-500/20 to-[#1F1E1A] border-amber-500 text-white shadow-lg ring-1 ring-amber-500/50"
                        : isCompleted
                        ? "bg-[#14141A] border-neutral-800/80 text-neutral-500 opacity-60"
                        : isCanceled
                        ? "bg-rose-950/20 border-rose-900/40 text-rose-400 opacity-50"
                        : "bg-[#16161D] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-black/40 px-1.5 py-0.5 rounded">
                        {app.time}
                      </span>
                      {isCompleted ? (
                        <span className="text-[9px] text-emerald-400 font-extrabold">✓ Hecho</span>
                      ) : isSelected ? (
                        <span className="text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          EN SILLA
                        </span>
                      ) : null}
                    </div>

                    <span className="text-xs font-bold block truncate text-white">{app.clientName}</span>
                    <span className="text-[9px] text-neutral-400 block truncate">{app.serviceName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* TARJETA PRINCIPAL DEL CLIENTE EN SILLA */}
        {activeAppointment && (
          <div className="bg-[#15151C] border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl relative overflow-hidden">
            
            {/* Banner Superior de Cliente & Acciones Rápidas */}
            <div className="border-b border-neutral-800 pb-3 space-y-2">
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                {/* Info del cliente */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-amber-500/40 flex items-center justify-center text-amber-400 text-base font-extrabold shrink-0 relative shadow-inner">
                    {displayClient.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-black border border-black">
                      💈
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-white leading-tight truncate">
                      {displayClient.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
                      <span className="font-mono text-amber-400 font-bold shrink-0">{activeAppointment.time}</span>
                      <span>•</span>
                      <span className="truncate">{activeAppointment.serviceName}</span>
                    </div>
                  </div>
                </div>

                {/* Botones rápidos organizados: Reasignar Silla Express + WhatsApp */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeAppointment.status !== "completed" && (
                    <button
                      onClick={() => {
                        setTargetBarberId("");
                        setReassignReason("");
                        setShowReassignModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 text-[11px] font-extrabold"
                      title="Reasignación Express de Silla / Barbero"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span>Reasignar</span>
                    </button>
                  )}

                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 text-[11px] font-extrabold"
                      title="Abrir WhatsApp del cliente"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* BANNER PROMINENTE DE CITA YA COMPLETADA Y FACTURADA */}
            {activeAppointment.status === "completed" && (
              <div className="bg-emerald-950/90 border border-emerald-500/60 p-3.5 rounded-2xl flex items-center justify-between text-emerald-300 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-900 border border-emerald-600 rounded-xl shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-200 block">
                      ✓ CITA COMPLETADA Y FACTURADA
                    </span>
                    <span className="text-[10px] text-emerald-300/90 leading-tight block">
                      Este servicio ya fue registrado. No se permite refacturar ni volver a agendar.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BANNER PROMINENTE DE MULTA / SEÑA PENDIENTE POR INASISTENCIA */}
            {activeAppointment.status !== "completed" && (displayClient.pendingPenalty || 0) > 0 && (
              <div className="bg-rose-950/90 border-2 border-rose-500/80 p-3.5 rounded-2xl space-y-2 text-rose-100 shadow-xl animate-pulse">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-900 border border-rose-600 rounded-xl shrink-0">
                      <UserX className="h-5 w-5 text-rose-300" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-rose-200 block">
                        🚨 MULTA PENDIENTE POR INASISTENCIA PREVIA
                      </span>
                      <span className="text-[10px] text-rose-300 leading-tight block">
                        El cliente no asistió a su reserva anterior. Se incluyó automáticamente este cobro de recaudo.
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black font-mono text-rose-200 bg-rose-900 border border-rose-600 px-2.5 py-1 rounded-xl block shadow-sm">
                      +${(displayClient.pendingPenalty || 0).toLocaleString()} COP
                    </span>
                    <button
                      onClick={async () => {
                        const targetId = displayClient.id || "cli_waive";
                        await fetch(`/api/clients/${targetId}/penalties/waive`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            waivedBy: "Barbero Modo Silla",
                            clientPhone: displayClient.phone || activeAppointment?.clientPhone,
                            clientName: displayClient.name || activeAppointment?.clientName
                          })
                        });
                        if (displayClient.id && !displayClient.id.startsWith("temp_")) {
                          onUpdateClient(displayClient.id, { pendingPenalty: 0 });
                        }
                        if (onRefresh) onRefresh();
                        triggerPwaToast("🛡️ Multa exonerada correctamente.");
                      }}
                      className="mt-1 text-[10px] font-extrabold text-emerald-300 hover:text-white bg-emerald-950 border border-emerald-500/50 px-2 py-0.5 rounded-lg block cursor-pointer transition-all shadow-sm"
                    >
                      🛡️ Exonerar multa
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FOTO DE REFERENCIA ELEGIDA POR EL CLIENTE EN EL CATÁLOGO (LOOKBOOK) */}
            {(activeAppointment.selectedStyleName || activeAppointment.selectedStylePhotoUrl) && (
              <div className="bg-gradient-to-r from-[#1E1B18] via-[#2A241C] to-[#1E1B18] border-2 border-amber-500/60 p-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl">
                {activeAppointment.selectedStylePhotoUrl ? (
                  <a
                    href={activeAppointment.selectedStylePhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative shrink-0 block"
                    title="Ver imagen en tamaño completo"
                  >
                    <img
                      src={activeAppointment.selectedStylePhotoUrl}
                      alt={activeAppointment.selectedStyleName || "Corte de referencia"}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 shadow-md group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-bold transition-opacity">
                      🔍
                    </span>
                  </a>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-amber-950/60 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Scissors className="h-7 w-7" />
                  </div>
                )}

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-black uppercase bg-amber-400 text-black px-2 py-0.5 rounded-md shadow-xs">
                      ✂️ CORTE SOLICITADO POR EL CLIENTE
                    </span>
                    {activeAppointment.selectedStyleCategory && (
                      <span className="text-[9px] text-amber-300 font-mono uppercase font-bold">
                        {activeAppointment.selectedStyleCategory}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white truncate">
                    {activeAppointment.selectedStyleName}
                  </h4>
                  {activeAppointment.selectedStyleNotes && (
                    <p className="text-[10.5px] text-amber-200/90 line-clamp-2 italic">
                      "{activeAppointment.selectedStyleNotes}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TOTALIZADO Y CONSUMOS DE LA SILLA (NEVERA / BEBIDAS) */}
            {(() => {
              const consumptionsTotal = activeAppointment.consumptions ? activeAppointment.consumptions.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 1)), 0) : (activeAppointment.consumptionsTotal || 0);
              const clientPenalty = displayClient?.pendingPenalty || 0;
              const grandTotal = activeAppointment.price + consumptionsTotal + clientPenalty;

              return (
                <div className="bg-gradient-to-r from-[#1A1A26] to-[#12121D] border border-cyan-500/40 p-3.5 rounded-2xl space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1 font-mono">
                        <Wine className="h-3.5 w-3.5" />
                        Totalizado Cita & Consumos
                      </span>
                      <div className="text-[11px] text-neutral-300 font-medium space-x-2">
                        <span>Corte: <strong>{formatPrice(activeAppointment.price)}</strong></span>
                        {consumptionsTotal > 0 && (
                          <span className="text-cyan-300 font-bold">
                            + Consumos: <strong>{formatPrice(consumptionsTotal)}</strong>
                          </span>
                        )}
                        {clientPenalty > 0 && (
                          <span className="text-rose-400 font-bold block mt-0.5">
                            + Multa Inasistencia: <strong>{formatPrice(clientPenalty)}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-cyan-950/80 border border-cyan-500/60 px-3 py-1.5 rounded-xl text-right">
                      <span className="text-[9px] uppercase tracking-wider text-cyan-300 font-extrabold block">TOTAL COBRO</span>
                      <span className="text-sm font-black font-mono text-amber-400">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Botón destacado para exonerar multa de inasistencia en la silla */}
                  {(clientPenalty > 0 || (activeAppointment.notes && (activeAppointment.notes.toLowerCase().includes("multa") || activeAppointment.notes.toLowerCase().includes("inasistencia")))) && (
                    <div className="pt-2 border-t border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40">
                      <div className="text-[10px] text-rose-200 font-mono">
                        <span className="font-extrabold text-rose-300 block">⚠️ MULTA DE INASISTENCIA INCLUIDA EN CITA</span>
                        <span>{activeAppointment.notes || "Tiene una multa asignada a la reserva o cliente."}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const targetId = matchingClient?.id || displayClient.id || "cli_waive";
                          try {
                            // 1. If appointment price includes penalty note, deduct penalty from appointment price and clean notes
                            const hasPenaltyNote = activeAppointment.notes && activeAppointment.notes.toLowerCase().includes("multa");
                            if (hasPenaltyNote) {
                              const serviceObj = services.find(s => s.id === activeAppointment.serviceId);
                              const originalCutPrice = serviceObj ? serviceObj.price : Math.max(0, activeAppointment.price - 10000);
                              const cleanedNotes = activeAppointment.notes.replace(/\[Incluye recaudo de multa[^\]]*\]/gi, "").trim();

                              await onUpdateAppointment(activeAppointment.id, {
                                price: originalCutPrice,
                                notes: cleanedNotes
                              });
                            }

                            // 2. Waive client pending penalty
                            await fetch(`/api/clients/${targetId}/penalties/waive`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                waivedBy: "Barbero Modo Silla - Cobrar solo corte",
                                clientPhone: displayClient.phone || activeAppointment?.clientPhone,
                                clientName: displayClient.name || activeAppointment?.clientName
                              })
                            });
                            if (matchingClient?.id && onUpdateClient) {
                              await onUpdateClient(matchingClient.id, { pendingPenalty: 0 });
                            }
                            if (onRefresh) await onRefresh();
                            triggerPwaToast("✨ Multa exonerada: Ahora solo se cobra el corte");
                          } catch (e) {
                            console.error(e);
                            triggerPwaToast("❌ Error al exonerar la multa.");
                          }
                        }}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>✨ Exonerar (Cobrar solo corte)</span>
                      </button>
                    </div>
                  )}

                  {/* Lista de consumos agregados */}
                  {activeAppointment.consumptions && activeAppointment.consumptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-neutral-800">
                      {activeAppointment.consumptions.map((c, i) => (
                        <span key={i} className="bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5">
                          <span>🥤 {c.quantity}x {c.name} ({formatPrice((c.price || 0) * (c.quantity || 1))})</span>
                          {activeAppointment.status !== "completed" && (
                            <button
                              onClick={() => handleRemoveConsumptionPWA(activeAppointment.id, i)}
                              className="text-red-400 hover:text-red-200 hover:bg-red-950/50 p-0.5 rounded cursor-pointer transition-colors"
                              title="Eliminar este consumo y devolver stock"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Selector para añadir consumos desde el perfil del barbero */}
                  {activeAppointment.status !== "completed" && (
                    <div className="pt-2 border-t border-neutral-800 space-y-2">
                      <button
                        onClick={() => setShowAddConsumption(!showAddConsumption)}
                        className="text-[10px] font-extrabold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{showAddConsumption ? "Ocultar lista de nevera" : "🥤 Añadir Bebida o Producto en Silla"}</span>
                      </button>

                      {showAddConsumption && (
                        <div className="bg-[#0E0E16] border border-cyan-800/60 p-3 rounded-xl space-y-2">
                          <label className="text-[10px] font-bold text-cyan-300 uppercase block">Seleccionar de Nevera / Inventario:</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={selectedItemId}
                              onChange={(e) => setSelectedItemId(e.target.value)}
                              className="flex-1 text-xs p-2 bg-[#1A1A24] border border-neutral-700 rounded-xl text-white font-medium"
                            >
                              <option value="">-- Seleccionar producto --</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.id} disabled={inv.stock <= 0}>
                                  {inv.name} ({formatPrice(inv.price)}) - Stock: {inv.stock}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={consumptionQty}
                                onChange={(e) => setConsumptionQty(Number(e.target.value))}
                                className="w-14 text-xs p-2 bg-[#1A1A24] border border-neutral-700 rounded-xl text-white text-center font-bold"
                              />
                              <button
                                onClick={() => handleAddConsumptionPWA(activeAppointment.id)}
                                disabled={!selectedItemId || isSubmittingConsumption}
                                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                              >
                                {isSubmittingConsumption ? "Añadiendo..." : "Agregar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 🚨 CRÍTICO: ALERTA DE PIEL Y SENSIBILIDAD EN ALTO CONTRASTE */}
            {displayClient.technicalPreferences?.skinSensitivity && 
             displayClient.technicalPreferences.skinSensitivity !== "Normal" && (
              <div className="bg-rose-950/80 border-2 border-rose-500 p-3.5 rounded-2xl flex items-start gap-3 shadow-lg animate-pulse">
                <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest block">
                    🚨 ADVERTENCIA TÉCNICA - PIEL & NAVAJA
                  </span>
                  <p className="text-xs font-bold text-white leading-snug">
                    {displayClient.technicalPreferences.skinSensitivity}
                  </p>
                </div>
              </div>
            )}

            {/* FICHA TÉCNICA RÁPIDA DE CORTE (< 2 SEGUNDOS) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Ficha Técnica de Estilo
                </span>

                <button
                  onClick={() => setEditingTechPrefs(!editingTechPrefs)}
                  className="text-[10px] text-neutral-400 hover:text-white underline font-bold cursor-pointer"
                >
                  {editingTechPrefs ? "Cancelar" : "✏️ Editar Ficha"}
                </button>
              </div>

              {editingTechPrefs ? (
                /* FORMULARIO RÁPIDO DE PREFERENCIAS EN SILLA */
                <div className="bg-[#1A1A24] border border-amber-500/30 rounded-2xl p-3.5 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Tipo de Fade / Degradado</label>
                    <input
                      type="text"
                      value={tempFade}
                      onChange={(e) => setTempFade(e.target.value)}
                      className="w-full text-xs p-2 bg-black/60 border border-neutral-700 rounded-xl text-white font-bold"
                      placeholder="Ej. Low Fade (Bajo), Mid Fade, Taper"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Estilo Superior / Peinado</label>
                    <input
                      type="text"
                      value={tempTop}
                      onChange={(e) => setTempTop(e.target.value)}
                      className="w-full text-xs p-2 bg-black/60 border border-neutral-700 rounded-xl text-white font-bold"
                      placeholder="Ej. Tijera Texturizado, Buzz Cut"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Estilo Barba & Ritual</label>
                    <input
                      type="text"
                      value={tempBeard}
                      onChange={(e) => setTempBeard(e.target.value)}
                      className="w-full text-xs p-2 bg-black/60 border border-neutral-700 rounded-xl text-white font-bold"
                      placeholder="Ej. Ritual Toalla Caliente & Navaja"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Piel / Sensibilidad Navaja</label>
                    <select
                      value={tempSkin}
                      onChange={(e) => setTempSkin(e.target.value)}
                      className="w-full text-xs p-2 bg-black/60 border border-neutral-700 rounded-xl text-white font-bold"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Piel Sensible / Usar Bálsamo Especial">Piel Sensible / Usar Bálsamo Especial</option>
                      <option value="Propenso a Irritación con Navaja">Propenso a Irritación con Navaja</option>
                      <option value="Cuidado especial en cuello">Cuidado especial en cuello</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSavePreferences}
                    className="w-full py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer"
                  >
                    Guardar Ficha Técnica
                  </button>
                </div>
              ) : (
                /* MOSTRAR CARDS DE PREFERENCIAS */
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#1C1C26] border border-neutral-800 p-2.5 rounded-2xl space-y-0.5">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Fade / Degradado</span>
                    <span className="text-xs font-black text-amber-300 block truncate">
                      {displayClient.technicalPreferences?.fadeType || "Medio (Mid Fade)"}
                    </span>
                  </div>

                  <div className="bg-[#1C1C26] border border-neutral-800 p-2.5 rounded-2xl space-y-0.5">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Parte Superior</span>
                    <span className="text-xs font-black text-white block truncate">
                      {displayClient.technicalPreferences?.topStyle || "Tijera Texturizado"}
                    </span>
                  </div>

                  <div className="bg-[#1C1C26] border border-neutral-800 p-2.5 rounded-2xl space-y-0.5 col-span-2">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Barba & Perfilado</span>
                    <span className="text-xs font-bold text-neutral-200 block truncate">
                      {displayClient.technicalPreferences?.beardStyle || "Delineado Navaja Suave"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN FOTO DEL CORTE PREVIO (VISUAL 1-CLIC) */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" />
                  Foto del Corte Previo
                </span>

                {/* Hidden File Input for Camera Snap */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  <span>{isUploadingPhoto ? "Guardando..." : "📸 Tomar Foto Final"}</span>
                </button>
              </div>

              {/* FOTO ACTUAL O PLACEHOLDER */}
              {displayClient.galleryPhotos && displayClient.galleryPhotos.length > 0 ? (
                <div className="relative group rounded-2xl overflow-hidden border border-amber-500/30 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={displayClient.galleryPhotos[0].url}
                    alt="Corte previo"
                    className="w-full h-full object-cover object-center cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setZoomPhotoUrl(displayClient.galleryPhotos![0].url)}
                  />

                  {/* Overlay Info */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 block">
                        {displayClient.galleryPhotos[0].styleTag || "Corte Habitual"}
                      </span>
                      <span className="text-[9px] text-neutral-300 block">
                        {displayClient.galleryPhotos[0].date} • {displayClient.galleryPhotos[0].barberName || "Barbero"}
                      </span>
                    </div>

                    <button
                      onClick={() => setZoomPhotoUrl(displayClient.galleryPhotos![0].url)}
                      className="p-1.5 bg-black/60 border border-neutral-600 rounded-xl text-white cursor-pointer"
                      title="Ver en Pantalla Completa"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-800 rounded-2xl p-6 text-center text-neutral-500 space-y-1.5 cursor-pointer hover:border-amber-500/50 transition-colors"
                >
                  <Camera className="h-6 w-6 mx-auto stroke-1" />
                  <p className="text-xs font-bold text-neutral-400">No hay foto previa guardada</p>
                  <p className="text-[10px]">Toca aquí para tomar la primera foto con tu celular</p>
                </div>
              )}
            </div>

            {/* SECCIÓN NOTAS RÁPIDAS DEL BARBERO EN SILLA */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Notas del Barbero (1-Toque)
              </span>

              {/* Tags predeterminados rápidos */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => addQuickPresetNote("Toalla extra caliente")}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + Toalla caliente
                </button>
                <button
                  type="button"
                  onClick={() => addQuickPresetNote("Cera mate final")}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + Cera mate
                </button>
                <button
                  type="button"
                  onClick={() => addQuickPresetNote("Raya marked izquierda")}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + Raya izq
                </button>
                <button
                  type="button"
                  onClick={() => addQuickPresetNote("Cuello pulido navaja")}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + Cuello navaja
                </button>
              </div>

              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Añadir nota rápida para el próximo servicio..."
                className="w-full text-xs p-2.5 bg-black/60 border border-neutral-800 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* BOTONES DE ACCIÓN DE PULGAR EN PIE DE PÁGINA (BIG TOUCH TARGETS) */}
            <div className="pt-3 border-t border-neutral-800">
              {activeAppointment.status === "completed" ? (
                <div className="w-full py-3.5 px-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-black text-center flex items-center justify-center gap-2 shadow-inner">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>✓ Cita Facturada — Agendamiento automático realizado</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleMarkNoShow}
                    className="py-3 px-2 bg-rose-950/80 border border-rose-700/60 text-rose-300 hover:bg-rose-900 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                    title="Registrar inasistencia y aplicar multa de $10.000 al cliente"
                  >
                    <UserX className="h-4 w-4 text-rose-400" />
                    <span>No Asistió</span>
                  </button>

                  <button
                    onClick={() => setRetentionClient(displayClient)}
                    className="py-3 px-2 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span>Re-Corte IA</span>
                  </button>

                  {(() => {
                    const cSum = activeAppointment.consumptions ? activeAppointment.consumptions.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 1)), 0) : (activeAppointment.consumptionsTotal || 0);
                    const gTotal = activeAppointment.price + cSum;
                    return (
                      <button
                        onClick={handleOpenPaymentModal}
                        className="py-3 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-2xl text-[11px] flex items-center justify-center gap-1 transition-all shadow-lg active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Facturar ({formatPrice(gTotal)})</span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* MODAL ZOOM FOTO EN PANTALLA COMPLETA */}
      {zoomPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setZoomPhotoUrl(null)}
            className="absolute top-4 right-4 p-3 bg-neutral-800 text-white rounded-full cursor-pointer z-50"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={zoomPhotoUrl}
            alt="Foto zoom"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-neutral-800"
          />
          <p className="text-xs text-neutral-400 mt-3 font-mono">Vista HD de Referencia para Silla</p>
        </div>
      )}

      {/* MODAL MOTOR DE RE-CORTE IA */}
      {retentionClient && (
        <RetentionEngineModal
          client={retentionClient}
          appointments={appointments}
          onClose={() => setRetentionClient(null)}
          salonName={salonName}
        />
      )}

      {/* GUÍA DE INSTALACIÓN PWA */}
      {showPwaGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#16161E] border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 relative shadow-2xl">
            <button
              onClick={() => setShowPwaGuide(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Instalar Modo Silla PWA</h3>
                <p className="text-[10px] text-neutral-400">Acceso instantáneo de 1 clic desde la pantalla principal</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 border-t border-neutral-800 pt-3">
              <div className="space-y-1">
                <span className="font-extrabold text-amber-400 block">En iPhone / Safari:</span>
                <p className="text-[11px]">1. Toca el botón <strong>Compartir</strong> (cuadrado con flecha abajo).</p>
                <p className="text-[11px]">2. Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</p>
              </div>

              <div className="space-y-1">
                <span className="font-extrabold text-amber-400 block">En Android / Chrome:</span>
                <p className="text-[11px]">1. Toca los <strong>3 puntos</strong> de la esquina superior.</p>
                <p className="text-[11px]">2. Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla principal"</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowPwaGuide(false)}
              className="w-full py-2.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* AUTO REAGENDAMIENTO MODAL */}
      <AutoReagendaModal
        isOpen={showAutoReagenda}
        onClose={() => setShowAutoReagenda(false)}
        client={autoReagendaClient}
        completedAppointment={autoReagendaApp}
        services={services}
        barbers={barbers}
        salonName={salonName}
        onCreateAppointment={async (data) => {
          if (onCreateAppointment) {
            return await onCreateAppointment(data);
          }
          const res = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error("Error agendando próxima cita");
          return await res.json();
        }}
        onToast={(msg) => triggerPwaToast(msg)}
      />

      {/* MODAL MIS GANANCIAS Y NÓMINA DEL DÍA */}
      {showMyEarningsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Mis Ganancias del Día</h3>
              </div>
              <button
                onClick={() => setShowMyEarningsModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const currentBarber = barbers.find(b => b.id === selectedBarberId) || barbers[0];
              const myTodayApps = appointments.filter(a => (a.date === selectedDate || (selectedDate === defaultToday && a.date === todayISO)) && a.barberId === currentBarber?.id && a.status === "completed");
              
              const commPercent = currentBarber?.commissionPercent !== undefined ? currentBarber.commissionPercent : 50;
              const cutsRevenue = myTodayApps.reduce((s, a) => s + (a.price || 0), 0);
              const cutsCommission = (cutsRevenue * commPercent) / 100;
              const tipsTotal = myTodayApps.reduce((s, a) => s + (a.tip || 0), 0);

              let productsComm = 0;
              myTodayApps.forEach(a => {
                if (a.consumptions) {
                  a.consumptions.forEach(c => {
                    const cRev = (c.price || 0) * (c.quantity || 1);
                    const invItem = inventory.find(i => i.id === c.productId || i.name === c.name);
                    const pct = invItem?.commissionPercent !== undefined ? invItem.commissionPercent : 10;
                    if (invItem?.allowBarberCommission !== false) {
                      productsComm += cRev * (pct / 100);
                    }
                  });
                }
              });

              const advances = (currentBarber?.advances || []).reduce((s, adv) => s + adv.amount, 0);
              const netPayout = Math.max(0, cutsCommission + productsComm + tipsTotal - advances);

              return (
                <div className="space-y-4 text-xs font-mono">
                  <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-neutral-400 block text-[10px] uppercase">Barbero Registrado:</span>
                    <span className="font-extrabold text-amber-300 text-sm block">{currentBarber?.name}</span>
                    <span className="text-[10px] text-emerald-400 block font-bold">Comisión Configurada: {commPercent}%</span>
                  </div>

                  <div className="space-y-2 border border-neutral-800 p-3 rounded-2xl bg-black/40">
                    <div className="flex justify-between text-neutral-300">
                      <span>Cortes Realizados Hoy:</span>
                      <span className="font-bold">{myTodayApps.length} servicios</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Comisión de Cortes ({commPercent}%):</span>
                      <span className="font-bold text-white">{formatPrice(cutsCommission)}</span>
                    </div>
                    <div className="flex justify-between text-cyan-300">
                      <span>Comisión Venta Productos:</span>
                      <span className="font-bold">{formatPrice(productsComm)}</span>
                    </div>
                    <div className="flex justify-between text-amber-300">
                      <span>Propinas Recibidas (100%):</span>
                      <span className="font-bold">{formatPrice(tipsTotal)}</span>
                    </div>
                    {advances > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>(-) Vales / Adelantos:</span>
                        <span className="font-bold">-{formatPrice(advances)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-neutral-800 font-bold text-white">
                      <span>GANANCIA NETA DÍA:</span>
                      <span className="text-emerald-400 font-black">{formatPrice(netPayout)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setShowMyEarningsModal(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl hover:brightness-110"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE MEDIO DE PAGO Y FACTURACIÓN */}
      {showPaymentModal && activeAppointment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121218] border border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-400">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Facturar Servicio</h3>
                  <p className="text-[10px] text-neutral-400">Selecciona el método de pago del cliente</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* DETALLE DEL COBRO */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-extrabold text-white">{activeAppointment.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Servicio ({activeAppointment.serviceName}):</span>
                <span className="font-bold text-amber-300">{formatPrice(activeAppointment.price)}</span>
              </div>

              {(() => {
                const cSum = activeAppointment.consumptions ? activeAppointment.consumptions.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 1)), 0) : (activeAppointment.consumptionsTotal || 0);
                if (cSum <= 0) return null;
                return (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Consumos Nevera / Productos:</span>
                    <span className="font-bold text-cyan-300">{formatPrice(cSum)}</span>
                  </div>
                );
              })()}

              {activeAppointment.penaltyApplied && activeAppointment.penaltyApplied > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Abono / Multa Inasistencia previa:</span>
                  <span className="font-bold text-rose-300">{formatPrice(activeAppointment.penaltyApplied)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-sm">
                <span className="font-extrabold text-neutral-200">Subtotal Servicio:</span>
                <span className="font-black text-amber-400">
                  {(() => {
                    const cSum = activeAppointment.consumptions ? activeAppointment.consumptions.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 1)), 0) : (activeAppointment.consumptionsTotal || 0);
                    return formatPrice(activeAppointment.price + cSum);
                  })()}
                </span>
              </div>
            </div>

            {/* MEDIOS DE PAGO (OPCIONES EFECTIVO, TRANSFERENCIA, NEQUI/DAVIPLATA, TARJETA) */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 block">
                Medio de Pago Utilizado:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* EFECTIVO */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('efectivo')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    selectedPaymentMethod === 'efectivo'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedPaymentMethod === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">💵 Efectivo</span>
                    <span className="text-[10px] text-neutral-400 block">Pago en caja física</span>
                  </div>
                </button>

                {/* TRANSFERENCIA */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('transferencia')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    selectedPaymentMethod === 'transferencia'
                      ? 'bg-amber-950/80 border-amber-500 text-white shadow-lg shadow-amber-950/50 ring-1 ring-amber-500'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedPaymentMethod === 'transferencia' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'}`}>
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">🏦 Transferencia</span>
                    <span className="text-[10px] text-neutral-400 block">Bancolombia / PSE</span>
                  </div>
                </button>

                {/* NEQUI / DAVIPLATA */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('nequi_daviplata')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    selectedPaymentMethod === 'nequi_daviplata'
                      ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg shadow-purple-950/50 ring-1 ring-purple-500'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedPaymentMethod === 'nequi_daviplata' ? 'bg-purple-500/20 text-purple-400' : 'bg-neutral-800 text-neutral-500'}`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">📱 Nequi / Daviplata</span>
                    <span className="text-[10px] text-neutral-400 block">Billetera móvil QR</span>
                  </div>
                </button>

                {/* TARJETA */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('tarjeta')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    selectedPaymentMethod === 'tarjeta'
                      ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${selectedPaymentMethod === 'tarjeta' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-neutral-800 text-neutral-500'}`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">💳 Tarjeta</span>
                    <span className="text-[10px] text-neutral-400 block">Débito o Crédito</span>
                  </div>
                </button>
              </div>
            </div>

            {/* PROPINA VOLUNTARIA */}
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Propina Voluntaria para Barbero:
                </label>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  {formatPrice(customTip)}
                </span>
              </div>

              <div className="flex gap-2">
                {[0, 2000, 5000, 10000].map(tipVal => (
                  <button
                    key={tipVal}
                    type="button"
                    onClick={() => setCustomTip(tipVal)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      customTip === tipVal
                        ? 'bg-amber-500 text-black border-amber-400 shadow'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {tipVal === 0 ? "Sin tip" : `+$${(tipVal/1000)}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* GRAN TOTAL */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400 block">Total Final a Facturar:</span>
                <span className="text-[11px] text-neutral-300 block">Servicio + Consumos + Propina</span>
              </div>
              <span className="text-xl font-black text-amber-300 font-mono">
                {(() => {
                  const cSum = activeAppointment.consumptions ? activeAppointment.consumptions.reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 1)), 0) : (activeAppointment.consumptionsTotal || 0);
                  return formatPrice(activeAppointment.price + cSum + customTip);
                })()}
              </span>
            </div>

            {/* BOTÓN FINALIZAR / CONFIRMAR */}
            <button
              onClick={handleConfirmPaymentAndComplete}
              disabled={isSubmittingPayment}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-sm rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{isSubmittingPayment ? "Facturando..." : "✓ Confirmar y Facturar Cita"}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE REASIGNACIÓN EXPRESS DE SILLA */}
      {showReassignModal && activeAppointment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121218] border border-cyan-500/50 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/15 border border-cyan-500/40 rounded-xl text-cyan-400">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">Reasignación Express de Silla</h3>
                  <p className="text-[10px] text-neutral-400">Transfiere esta cita a otro barbero en 1 toque</p>
                </div>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* DETALLE CITA ACTUAL */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Cliente:</span>
                <span className="font-extrabold text-white">{activeAppointment.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Hora & Servicio:</span>
                <span className="font-bold text-amber-300">{activeAppointment.time} - {activeAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Silla / Barbero Actual:</span>
                <span className="font-bold text-rose-300">{activeAppointment.barberName || "Sin asignar"}</span>
              </div>
            </div>

            {/* MOTIVO RÁPIDO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                Motivo de Reasignación (Opcional):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "⚡ Silla libre ahora",
                  "⏳ Barbero ocupado",
                  "👤 Preferencia de cliente",
                  "✂️ Especialidad de corte"
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReassignReason(preset)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                      reassignReason === preset
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* SELECCIÓN DE NUEVO BARBERO / SILLA */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                Seleccionar Nueva Silla / Barbero Destino:
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {barbers.map((barber) => {
                  const isCurrent = barber.id === activeAppointment.barberId;
                  const barberAppsToday = appointments.filter(a => a.barberId === barber.id && a.date === activeAppointment.date && a.status !== "canceled");

                  return (
                    <div
                      key={barber.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? "bg-neutral-900/40 border-neutral-800 opacity-60"
                          : "bg-neutral-900 border-neutral-800 hover:border-cyan-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-extrabold text-xs shrink-0 overflow-hidden">
                          {(barber.photoUrl || barber.avatarUrl || (barber as any).avatar) ? (
                            <img 
                              src={barber.photoUrl || barber.avatarUrl || (barber as any).avatar} 
                              alt={barber.name} 
                              className="h-full w-full object-cover rounded-xl"
                              referrerPolicy="no-referrer"
                              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                            />
                          ) : (
                            barber.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{barber.name}</span>
                          <span className="text-[10px] text-neutral-400 block">
                            {isCurrent ? "⚠️ Silla Actual" : `${barberAppsToday.length} citas hoy`}
                          </span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleConfirmReassignment(barber.id)}
                          disabled={isReassigning}
                          className="py-2 px-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isReassigning ? "Transfiriendo..." : "🪑 Reasignar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
