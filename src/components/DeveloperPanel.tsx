import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Terminal as TerminalIcon, 
  Key, 
  Cpu, 
  Layers, 
  Activity, 
  Sparkles, 
  Copy, 
  Plus, 
  Play, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Globe, 
  Database, 
  ShieldAlert,
  Clock,
  ExternalLink,
  Lock,
  Unlock,
  Check,
  Server,
  UserCheck,
  Code,
  Network,
  Calendar,
  Users,
  Palette,
  Image as ImageIcon,
  Tag,
  QrCode,
  Printer,
  Download,
  Share2,
  Scissors,
  BarChart3,
  LifeBuoy,
  MessageSquare,
  TrendingUp,
  Send,
  CheckCircle2,
  Mail,
  Edit3,
  Megaphone,
  DollarSign,
  HardDrive,
  Radio,
  FileJson,
  Zap,
  Trash2,
  Sliders,
  Bell,
  Building2,
  ShieldCheck,
  FileText
} from "lucide-react";
import { SalonConfig } from "../types";
import SaaSContractModal from "./SaaSContractModal";
import TelemetrySimulator from "./TelemetrySimulator";

interface DeveloperPanelProps {
  config: SalonConfig;
  onUpdateConfig: (newConfig: Partial<SalonConfig>) => Promise<any>;
  formatPrice: (price: number) => string;
  triggerToast: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

interface License {
  key: string;
  salonName: string;
  licenseType: 'basica' | 'profesional' | 'premium';
  createdAt: string;
  activatedAt?: string;
  status: 'active' | 'pending' | 'expired';
}

export default function DeveloperPanel({
  config,
  onUpdateConfig,
  formatPrice,
  triggerToast
}: DeveloperPanelProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Demo Multi-Tenant selection
  const [activeTab, setActiveTab] = useState<"licenses" | "multitenant" | "featureflags" | "billing" | "pricing" | "bi" | "announcements" | "helpdesk" | "health" | "backup">("licenses");
  const [selectedDemoTenant, setSelectedDemoTenant] = useState<"bella-barba" | "el-figaro" | "estilo-tijera">("bella-barba");

  // Feature Flags & Maintenance Lockdown states
  const [selectedFlagTenantId, setSelectedFlagTenantId] = useState<string>("bella-barba");
  const [tenantFlags, setTenantFlags] = useState<{
    enableOnlineBooking: boolean;
    enableInventory: boolean;
    enableMemberships: boolean;
    enableOnlinePayments: boolean;
    enableCashClosure: boolean;
    enableAiChat: boolean;
    enableReviews: boolean;
  }>({
    enableOnlineBooking: true,
    enableInventory: true,
    enableMemberships: true,
    enableOnlinePayments: true,
    enableCashClosure: true,
    enableAiChat: true,
    enableReviews: true
  });
  const [maintMode, setMaintMode] = useState<boolean>(false);
  const [maintMsg, setMaintMsg] = useState<string>("Estamos realizando mantenimiento preventivo y mejoras en la plataforma. Volvemos pronto.");
  const [maintAllowAdmins, setMaintAllowAdmins] = useState<boolean>(true);
  const [savingFlags, setSavingFlags] = useState<boolean>(false);

  // SaaS Billing, Due Date & Suspension Lock states
  const [selectedBillingTenantId, setSelectedBillingTenantId] = useState<string>("bella-barba");
  const [billingStatusInput, setBillingStatusInput] = useState<'active' | 'grace_period' | 'overdue_locked'>("active");
  const [billingDueDateInput, setBillingDueDateInput] = useState<string>("2026-08-30");
  const [billingAmountDueInput, setBillingAmountDueInput] = useState<number>(75000);
  const [billingGraceDaysInput, setBillingGraceDaysInput] = useState<number>(5);
  const [billingCustomMsgInput, setBillingCustomMsgInput] = useState<string>("Estimado Administrador, tu suscripción al Plan Profesional vence pronto. Realiza tu pago para evitar la interrupción del servicio.");
  const [billingPaymentLinkInput, setBillingPaymentLinkInput] = useState<string>("https://nequi.com.co/pago-syncbarber");
  const [billingAccountInfoInput, setBillingAccountInfoInput] = useState<string>("Nequi/Daviplata: 300 845 2109 | Bancolombia Ahorros: 901-845210-9");
  const [savingBilling, setSavingBilling] = useState<boolean>(false);

  // Selective Data Purge & Reset states
  const [selectedPurgeTenantId, setSelectedPurgeTenantId] = useState<string>("bella-barba");
  const [purgeConfirmText, setPurgeConfirmText] = useState<string>("");
  const [purgeAppointmentsCheck, setPurgeAppointmentsCheck] = useState<boolean>(true);
  const [purgeCashClosuresCheck, setPurgeCashClosuresCheck] = useState<boolean>(false);
  const [purgeSalesCheck, setPurgeSalesCheck] = useState<boolean>(false);
  const [purgeClientsCheck, setPurgeClientsCheck] = useState<boolean>(false);
  const [factoryResetCheck, setFactoryResetCheck] = useState<boolean>(false);
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [executingPurge, setExecutingPurge] = useState<boolean>(false);

  // Latency & Cache Clear states
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  // --- States for Business Intelligence (BI) and Helpdesk ---
  const [biData, setBiData] = useState<any>(null);
  const [loadingBi, setLoadingBi] = useState(false);
  const [biFilterSalon, setBiFilterSalon] = useState<string>("all");

  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReplyMessage, setTicketReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  
  // Create New Ticket form states (within panel)
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [newTicketSeverity, setNewTicketSeverity] = useState<"baja" | "media" | "alta" | "critica">("media");
  const [newTicketTenant, setNewTicketTenant] = useState("bella-barba");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Real multi-tenant states
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Admin and Tenant form states
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newAdminSalon, setNewAdminSalon] = useState("bella-barba");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [updatingLicense, setUpdatingLicense] = useState(false);

  // Tenant Branding Standards form states
  const [editingBrandingTenantId, setEditingBrandingTenantId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [brandAccent, setBrandAccent] = useState("gold");
  const [brandTextColor, setBrandTextColor] = useState("#FFFFFF");
  const [brandBgColor, setBrandBgColor] = useState("#0B0C10");
  const [brandCardColor, setBrandCardColor] = useState("#141414");
  const [brandSubCardColor, setBrandSubCardColor] = useState("#1A1A1A");
  const [brandBorderColor, setBrandBorderColor] = useState("#262626");
  const [savingBranding, setSavingBranding] = useState(false);

  // Tenant Memberships form states
  const [editingMembershipsTenantId, setEditingMembershipsTenantId] = useState<string | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<any[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planIdInput, setPlanIdInput] = useState("");
  const [planNameInput, setPlanNameInput] = useState("");
  const [planPriceInput, setPlanPriceInput] = useState(10000);
  const [planDiscountInput, setPlanDiscountInput] = useState(10);
  const [planDescriptionInput, setPlanDescriptionInput] = useState("");
  const [planBenefitsText, setPlanBenefitsText] = useState("");
  const [savingMemberships, setSavingMemberships] = useState(false);
  const [isEditingPlanMode, setIsEditingPlanMode] = useState(false);

  // States for QR Promotion Banner Designer
  const [selectedQRGroup, setSelectedQRGroup] = useState<any | null>(null); // holds the active tenant object to design QR for
  const [qrType, setQrType] = useState<"salon" | "barber">("salon");
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [qrAccentTheme, setQrAccentTheme] = useState<string>("gold"); // gold, cyan, emerald, violet, amber, rose, classic-pole
  const [qrCustomTitle, setQrCustomTitle] = useState<string>("¡ESCANEA Y AGENDA TU CITA!");
  const [showQrTagline, setShowQrTagline] = useState<boolean>(true);

  // States for SaaS Service Contract Modal
  const [selectedContractTenant, setSelectedContractTenant] = useState<any | null>(null);
  const [selectedContractLicense, setSelectedContractLicense] = useState<any | null>(null);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);

  const openContractModal = (tenant: any, license?: any) => {
    setSelectedContractTenant(tenant);
    setSelectedContractLicense(license || null);
    setShowContractModal(true);
  };

  const openQRDesigner = (tenant: any) => {
    setSelectedQRGroup(tenant);
    setQrType("salon");
    const tenantBarbers = tenant.barbers || [];
    if (tenantBarbers.length > 0) {
      setSelectedBarberId(tenantBarbers[0].id);
    } else {
      setSelectedBarberId("");
    }
    setQrAccentTheme(tenant.config?.accentColor || "gold");
    setQrCustomTitle("¡ESCANEA Y AGENDA TU CITA!");
    setShowQrTagline(true);
  };

  const startEditingBranding = (tenant: any) => {
    setEditingBrandingTenantId(tenant.id);
    setBrandName(tenant.name);
    setBrandLogo(tenant.config?.customLogoUrl || "");
    setBrandTagline(tenant.config?.tagline || "");
    setBrandAccent(tenant.config?.accentColor || "gold");
    setBrandTextColor(tenant.config?.textColor || "#FFFFFF");
    setBrandBgColor(tenant.config?.backgroundColor || "#0B0C10");
    setBrandCardColor(tenant.config?.cardColor || "#141414");
    setBrandSubCardColor(tenant.config?.subCardColor || "#1A1A1A");
    setBrandBorderColor(tenant.config?.borderColor || "#262626");
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrandingTenantId) return;

    try {
      setSavingBranding(true);
      addLog("MARCA", `Actualizando estándares visuales de '${editingBrandingTenantId}'...`, "info");
      const res = await fetch(`/api/developer/tenants/${editingBrandingTenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandName,
          customLogoUrl: brandLogo,
          tagline: brandTagline,
          accentColor: brandAccent,
          textColor: brandTextColor,
          backgroundColor: brandBgColor,
          cardColor: brandCardColor,
          subCardColor: brandSubCardColor,
          borderColor: brandBorderColor
        })
      });

      if (res.ok) {
        triggerToast("Estándares de Marca Actualizados", `Estándares de diseño aplicados con éxito para ${brandName}.`, "success");
        addLog("MARCA", `Branding de '${editingBrandingTenantId}' actualizado en servidor`, "success");
        setEditingBrandingTenantId(null);
        await fetchTenants();
      } else {
        const err = await res.json();
        triggerToast("Fallo al Guardar", err.error || "No se pudieron guardar los cambios.", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al comunicar cambios de branding", "error");
    } finally {
      setSavingBranding(false);
    }
  };

  const startEditingMemberships = (tenant: any) => {
    setEditingMembershipsTenantId(tenant.id);
    setTenantMemberships(tenant.memberships || []);
    setIsEditingPlanMode(false);
    setEditingPlanId(null);
  };

  const startCreatingNewPlan = () => {
    setEditingPlanId(null);
    setPlanIdInput("");
    setPlanNameInput("");
    setPlanPriceInput(10000);
    setPlanDiscountInput(10);
    setPlanDescriptionInput("");
    setPlanBenefitsText("");
    setIsEditingPlanMode(true);
  };

  const startEditingPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanIdInput(plan.id);
    setPlanNameInput(plan.name);
    setPlanPriceInput(plan.monthlyPrice);
    setPlanDiscountInput(plan.discountPercent);
    setPlanDescriptionInput(plan.description || "");
    setPlanBenefitsText((plan.benefits || []).join("\n"));
    setIsEditingPlanMode(true);
  };

  const handleSavePlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planIdInput || !planNameInput) {
      triggerToast("Campos Faltantes", "Por favor ingresa ID y Nombre para la membresía.", "warning");
      return;
    }

    const benefits = planBenefitsText
      .split("\n")
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const planData = {
      id: planIdInput.trim().toLowerCase(),
      name: planNameInput.trim(),
      monthlyPrice: Number(planPriceInput),
      discountPercent: Number(planDiscountInput),
      description: planDescriptionInput.trim(),
      benefits
    };

    if (editingPlanId) {
      // Edit existing plan
      setTenantMemberships(prev => prev.map(p => p.id === editingPlanId ? planData : p));
      addLog("MEMBRESÍA", `Modificado plan local '${planData.name}'`, "info");
    } else {
      // Add new plan
      if (tenantMemberships.some(p => p.id === planData.id)) {
        triggerToast("ID Duplicado", "Ya existe un plan con este ID.", "warning");
        return;
      }
      setTenantMemberships(prev => [...prev, planData]);
      addLog("MEMBRESÍA", `Creado plan local '${planData.name}'`, "success");
    }

    setIsEditingPlanMode(false);
    setEditingPlanId(null);
  };

  const handleDeletePlan = (pId: string) => {
    setTenantMemberships(prev => prev.filter(p => p.id !== pId));
    addLog("MEMBRESÍA", `Eliminado plan local con ID '${pId}'`, "warn");
  };

  const handleSaveAllTenantMemberships = async () => {
    if (!editingMembershipsTenantId) return;
    try {
      setSavingMemberships(true);
      addLog("MEMBRESÍA", `Guardando membresías para '${editingMembershipsTenantId}' en el servidor...`, "info");
      const res = await fetch(`/api/developer/tenants/${editingMembershipsTenantId}/memberships`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberships: tenantMemberships })
      });

      if (res.ok) {
        triggerToast("Membresías Guardadas", "Membresías actualizadas con éxito en el servidor y Firestore.", "success");
        addLog("MEMBRESÍA", `Membresías de '${editingMembershipsTenantId}' actualizadas y persistidas`, "success");
        setEditingMembershipsTenantId(null);
        await fetchTenants();
      } else {
        const err = await res.json();
        triggerToast("Fallo al Guardar", err.error || "No se pudieron guardar las membresías.", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al comunicar cambios de membresías", "error");
    } finally {
      setSavingMemberships(false);
    }
  };

  // Form State for Rich Barber Shop Creation
  const [salonNameInput, setSalonNameInput] = useState("");
  const [ownerNameInput, setOwnerNameInput] = useState("");
  const [taglineInput, setTaglineInput] = useState("Arte, Precisión & Estilo Masculino");
  const [phoneInput, setPhoneInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [licenseTypeInput, setLicenseTypeInput] = useState<'basica' | 'profesional' | 'premium'>("premium");
  const [selectedTemplate, setSelectedTemplate] = useState<'gold' | 'urban' | 'traditional'>("gold");
  const [durationMonthsInput, setDurationMonthsInput] = useState<number>(1);
  const [ownerEmailInput, setOwnerEmailInput] = useState("");
  const [openTimeInput, setOpenTimeInput] = useState("08:00");
  const [closeTimeInput, setCloseTimeInput] = useState("20:00");
  const [barbersCountInput, setBarbersCountInput] = useState<number>(2);
  const [customAdminPasswordInput, setCustomAdminPasswordInput] = useState("admin");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Developer Panel Sub-Tabs
  const [devTab, setDevTab] = useState<'overview' | 'announcements' | 'pricing' | 'health' | 'backup'>('overview');

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "alert" | "success">("info");
  const [annExpiryOption, setAnnExpiryOption] = useState<"none" | "1d" | "3d" | "7d" | "30d" | "custom">("none");
  const [annCustomExpiry, setAnnCustomExpiry] = useState<string>("");
  const [publishingAnn, setPublishingAnn] = useState(false);

  // Pricing & SaaS Config State
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [basicaPrice, setBasicaPrice] = useState<number>(35000);
  const [proPrice, setProPrice] = useState<number>(75000);
  const [premPrice, setPremPrice] = useState<number>(139000);
  const [savingPricing, setSavingPricing] = useState(false);

  // Server Diagnostics & Health State
  const [healthData, setHealthData] = useState<any>(null);
  const [fetchingHealth, setFetchingHealth] = useState(false);

  // Backup & Import State
  const [backupJsonStr, setBackupJsonStr] = useState("");
  const [importingBackup, setImportingBackup] = useState(false);

  // Expiration & Notification Modal States
  const [simulatedEmailModal, setSimulatedEmailModal] = useState<any>(null);
  const [sendingReminderKey, setSendingReminderKey] = useState<string | null>(null);
  const [renewingKey, setRenewingKey] = useState<string | null>(null);
  const [editExpModal, setEditExpModal] = useState<{ key: string; salonName: string; currentExp: string; currentEmail?: string } | null>(null);
  const [customExpDateInput, setCustomExpDateInput] = useState("");
  const [customEmailInput, setCustomEmailInput] = useState("");

  // Manual Activation Input
  const [activationInput, setActivationInput] = useState("");
  const [activating, setActivating] = useState(false);

  // Simulated Telemetry logs
  const [logs, setLogs] = useState<{ id: string; timestamp: string; tag: string; text: string; type: "info" | "success" | "warn" | "error" }[]>([]);

  // Statistics
  const [activeConnections, setActiveConnections] = useState(3); // Simulated default

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const res = await fetch("/api/developer/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants);
        return data.tenants;
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al cargar inquilinos del servidor", "error");
    } finally {
      setLoadingTenants(false);
    }
    return [];
  };

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch("/api/developer/admins");
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data.admins);
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al cargar administradores del servidor", "error");
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleUpdateTenantLicense = async (tenantId: string, type: 'basica' | 'profesional' | 'premium') => {
    try {
      setUpdatingLicense(true);
      addLog("LICENCIA", `Actualizando licencia de '${tenantId}' a ${type.toUpperCase()}...`, "info");
      const res = await fetch(`/api/developer/tenants/${tenantId}/license`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseType: type })
      });

      if (res.ok) {
        triggerToast("Licencia Actualizada", `Licencia para el salón fue modificada a ${type.toUpperCase()}`, "success");
        addLog("LICENCIA", `Licencia de '${tenantId}' actualizada a ${type.toUpperCase()} en servidor`, "success");
        await fetchTenants();
        fetchLicenses(true);
      } else {
        const err = await res.json();
        triggerToast("Fallo al Actualizar", err.error || "No se pudo actualizar.", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al comunicar actualización de licencia", "error");
    } finally {
      setUpdatingLicense(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminUser.trim() || !newAdminPass.trim()) {
      triggerToast("Campos Faltantes", "Todos los campos de administrador son obligatorios.", "warning");
      return;
    }

    try {
      setCreatingAdmin(true);
      addLog("ADMINISTRADOR", `Creando administrador '${newAdminUser}' para barbería '${newAdminSalon}'...`, "info");
      const res = await fetch("/api/developer/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAdminName.trim(),
          username: newAdminUser.trim(),
          password: newAdminPass.trim(),
          salonId: newAdminSalon
        })
      });

      if (res.ok) {
        triggerToast("Administrador Creado", `El usuario administrador '${newAdminUser}' fue creado con éxito.`, "success");
        addLog("ADMINISTRADOR", `Administrador de barbería creado con éxito: ${newAdminUser}`, "success");
        setNewAdminName("");
        setNewAdminUser("");
        setNewAdminPass("");
        await fetchAdmins();
      } else {
        const err = await res.json();
        triggerToast("Error de Creación", err.error || "Fallo en el servidor.", "warning");
        addLog("ADMINISTRADOR", `Fallo al crear administrador: ${err.error || "Fallo"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo de comunicación al registrar administrador", "error");
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Load licenses from server
  const fetchLicenses = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch("/api/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses);
        addLog("API", `GET /api/licenses - Cargadas ${data.licenses.length} licencias con éxito`, "info");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al conectar con la API de licencias", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    fetchTenants();
    fetchAdmins();
    fetchPricing();
    fetchAnnouncements();
    
    // Setup initial developer terminal logs
    const initialLogs = [
      { id: "1", timestamp: new Date(Date.now() - 3600 * 1000).toLocaleTimeString(), tag: "SYS", text: "Controlador de Microservicios Iniciado", type: "info" as const },
      { id: "2", timestamp: new Date(Date.now() - 3000 * 1000).toLocaleTimeString(), tag: "LICENCIA", text: "Licencia Premium activa validada en servidor", type: "success" as const },
      { id: "3", timestamp: new Date(Date.now() - 1500 * 1000).toLocaleTimeString(), tag: "SSE", text: "Real-time SSE event pipeline conectado", type: "info" as const },
    ];
    setLogs(initialLogs);

    // Dynamic logging simulation
    const interval = setInterval(() => {
      const randomLogs = [
        { tag: "SSE", text: "Enviando ping de telemetría para mantener canal abierto", type: "info" as const },
        { tag: "SYS", text: "Comprobando integridad de slots de tiempo...", type: "info" as const },
        { tag: "API", text: "GET /api/appointments - Sincronizado", type: "info" as const },
      ];
      const selected = randomLogs[Math.floor(Math.random() * randomLogs.length)];
      addLog(selected.tag, selected.text, selected.type);
      setActiveConnections(prev => Math.max(1, prev + (Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0)));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // --- Fetch BI and Helpdesk Data ---
  const fetchBiData = async () => {
    try {
      setLoadingBi(true);
      const res = await fetch("/api/developer/analytics");
      if (res.ok) {
        const data = await res.json();
        setBiData(data);
        addLog("BI", "GET /api/developer/analytics - Cargadas métricas globales", "success");
      }
    } catch (e) {
      console.error(e);
      addLog("BI", "Error al cargar analíticas globales", "error");
    } finally {
      setLoadingBi(false);
    }
  };

  const fetchTicketsList = async () => {
    try {
      setLoadingTickets(true);
      const res = await fetch("/api/developer/tickets");
      if (res.ok) {
        const data = await res.json();
        setTicketsList(data.tickets);
        addLog("SOPORTE", `GET /api/developer/tickets - Cargados ${data.tickets.length} tickets con éxito`, "info");
        
        // Sync selected ticket
        if (selectedTicket) {
          const updated = data.tickets.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (e) {
      console.error(e);
      addLog("SOPORTE", "Error al cargar tickets de ayuda", "error");
    } finally {
      setLoadingTickets(false);
    }
  };

  // Submit support ticket reply
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyMessage.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const res = await fetch(`/api/developer/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ticketReplyMessage.trim(), sender: "soporte" })
      });

      if (res.ok) {
        setTicketReplyMessage("");
        addLog("SOPORTE", `Respuesta enviada para ticket #${selectedTicket.id}`, "success");
        await fetchTicketsList();
      } else {
        triggerToast("Fallo al responder", "No se pudo registrar la respuesta en el servidor.", "warning");
      }
    } catch (err) {
      console.error(err);
      addLog("SOPORTE", "Fallo de conexión al enviar respuesta", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // Update ticket status
  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`/api/developer/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        triggerToast("Estado Actualizado", `El ticket fue marcado como ${status.replace("_", " ").toUpperCase()}`, "success");
        addLog("SOPORTE", `Ticket #${ticketId} actualizado a ${status}`, "info");
        await fetchTicketsList();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDesc.trim()) {
      triggerToast("Campos faltantes", "Ingresa título y descripción para continuar.", "warning");
      return;
    }

    try {
      setCreatingTicket(true);
      const res = await fetch("/api/developer/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTicketTitle.trim(),
          description: newTicketDesc.trim(),
          severity: newTicketSeverity,
          tenantId: newTicketTenant
        })
      });

      if (res.ok) {
        triggerToast("Ticket Creado", "Ticket de asistencia registrado con éxito.", "success");
        addLog("SOPORTE", "Nuevo ticket de ayuda creado de forma manual", "success");
        setNewTicketTitle("");
        setNewTicketDesc("");
        setShowNewTicketModal(false);
        await fetchTicketsList();
      }
    } catch (err) {
      console.error(err);
      addLog("SOPORTE", "Error al crear ticket en servidor", "error");
    } finally {
      setCreatingTicket(false);
    }
  };

  // Trigger loading when tab changes
  useEffect(() => {
    if (activeTab === "bi") {
      fetchBiData();
    } else if (activeTab === "helpdesk") {
      fetchTicketsList();
    } else if (activeTab === "announcements") {
      fetchAnnouncements();
    } else if (activeTab === "pricing") {
      fetchPricing();
    } else if (activeTab === "health") {
      fetchHealth();
    }
  }, [activeTab]);

  const addLog = (tag: string, text: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      { id: Date.now().toString() + Math.random(), timestamp, tag, text, type },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Helper for multi-tenant simulation database view
  const getSimulatedBarbers = (tenant: string) => {
    return [
      { id: "b1", name: "Mateo Gómez (Fade Master)", username: "mateo", salon_id: "bella-barba" },
      { id: "b2", name: "Santiago Mendoza (Ritual & Afeitado)", username: "santiago", salon_id: "bella-barba" },
      { id: "b3", name: "Andrés Castro (Classic & Scissors)", username: "andres", salon_id: "bella-barba" },
    ];
  };

  const getSimulatedAppointments = (tenant: string) => {
    return [
      { id: "a1", clientName: "Carlos Andrés Gómez", serviceName: "Corte de Autor (Fade / Degradado)", barberName: "Mateo Gómez (Fade Master)", date: "2026-07-16", time: "10:30", price: 20000, salon_id: "bella-barba" },
      { id: "a2", clientName: "Juan David Castro", serviceName: "Ritual de Barba a Navaja y Vapor", barberName: "Santiago Mendoza (Ritual & Afeitado)", date: "2026-07-16", time: "12:00", price: 15000, salon_id: "bella-barba" },
      { id: "a3", clientName: "Santiago Pérez", serviceName: "Combo Imperial (Corte + Ritual de Barba)", barberName: "Andrés Castro (Classic & Scissors)", date: "2026-07-17", time: "11:00", price: 32000, salon_id: "bella-barba" },
    ];
  };

  // Generate License
  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonNameInput.trim()) {
      triggerToast("Error", "Debes ingresar el nombre del salón titular.", "warning");
      return;
    }

    try {
      setGenerating(true);
      addLog("LICENCIA", `Generando clave de licencia con fecha de inactivación para '${salonNameInput}'...`, "info");
      const res = await fetch("/api/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: salonNameInput.trim(),
          licenseType: licenseTypeInput,
          templateType: selectedTemplate,
          durationMonths: durationMonthsInput,
          ownerName: ownerNameInput.trim() || undefined,
          ownerEmail: ownerEmailInput.trim() || undefined,
          phone: phoneInput.trim() || undefined,
          city: cityInput.trim() || undefined,
          address: addressInput.trim() || undefined,
          tagline: taglineInput.trim() || undefined,
          openTime: openTimeInput || "08:00",
          closeTime: closeTimeInput || "20:00",
          initialBarbersCount: barbersCountInput || 2,
          customAdminPassword: customAdminPasswordInput.trim() || "admin"
        })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("¡Barbería & Licencia Creada!", `Licencia ${licenseTypeInput.toUpperCase()} activa para '${salonNameInput}'`, "success");
        triggerToast("Credenciales Admin", `Usuario: admin-${data.tenantId} | Clave: ${customAdminPasswordInput || 'admin'}`, "info");
        addLog("LICENCIA", `Nueva clave generada: ${data.license.key} (Vence: ${data.license.expirationDate})`, "success");
        addLog("SaaS", `Inquilino '${data.tenantId}' registrado con ${barbersCountInput} barberos iniciales.`, "success");
        fetchLicenses(true);
        const updatedTenants = await fetchTenants();
        const createdTenantObj = (updatedTenants && Array.isArray(updatedTenants)) 
          ? updatedTenants.find(t => t.id === data.tenantId) 
          : null;

        const tenantForContract = createdTenantObj || {
          id: data.tenantId,
          tenantId: data.tenantId,
          name: salonNameInput || "Nueva Barbería",
          ownerName: ownerNameInput,
          ownerEmail: ownerEmailInput,
          phone: phoneInput,
          city: cityInput,
          address: addressInput,
          config: { licenseType: licenseTypeInput, licenseKey: data.license?.key }
        };

        triggerToast("📜 Contrato SaaS Generado", "Generado contrato formal listo para PDF, WhatsApp y Email.", "success");
        openContractModal(tenantForContract, data.license);

        setSalonNameInput("");
        setOwnerNameInput("");
        setOwnerEmailInput("");
        setPhoneInput("");
        setCityInput("");
        setAddressInput("");
        setTaglineInput("Arte, Precisión & Estilo Masculino");
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al generar llave de licencia", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Handler to simulate sending automated payment reminder email
  const handleSendReminderEmail = async (key: string, alertType?: string) => {
    try {
      setSendingReminderKey(key);
      addLog("EMAIL", `Simulando envío de notificación de cobro para ${key}...`, "info");
      const res = await fetch("/api/licenses/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, alertType })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Correo Notificación Enviado", `Enviado a ${data.email.to} | Asunto: ${data.email.subject}`, "success");
        addLog("EMAIL", `Correo enviado con éxito a ${data.email.to}. Asunto: ${data.email.subject}`, "success");
        setSimulatedEmailModal(data.email);
        fetchLicenses(true);
      } else {
        const err = await res.json();
        triggerToast("Error", err.error || "Fallo al enviar correo de recordatorio", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al procesar envío de correo", "error");
    } finally {
      setSendingReminderKey(null);
    }
  };

  // Handler to renew license immediately
  const handleRenewLicense = async (key: string, extensionMonths: number = 1) => {
    try {
      setRenewingKey(key);
      addLog("RENOVACIÓN", `Renovando licencia ${key} por +${extensionMonths} mes(es)...`, "info");
      const res = await fetch("/api/licenses/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, extensionMonths })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Licencia Renovada", `NUEVA FECHA DE VENCIMIENTO: ${data.license.expirationDate}`, "success");
        addLog("RENOVACIÓN", `Licencia ${key} extendida con éxito hasta el ${data.license.expirationDate}`, "success");
        fetchLicenses(true);
      } else {
        const err = await res.json();
        triggerToast("Error", err.error || "No se pudo renovar la licencia", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al procesar renovación de licencia", "error");
    } finally {
      setRenewingKey(null);
    }
  };

  // Handler to save modified custom expiration date
  const handleSaveUpdatedDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpModal || !customExpDateInput) return;

    try {
      addLog("LICENCIA", `Actualizando fecha de inactivación de ${editExpModal.key} a ${customExpDateInput}...`, "info");
      const res = await fetch("/api/licenses/update-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editExpModal.key,
          expirationDate: customExpDateInput,
          ownerEmail: customEmailInput.trim() || undefined
        })
      });

      if (res.ok) {
        triggerToast("Fecha Actualizada", `Nueva fecha de inactivación: ${customExpDateInput}`, "success");
        addLog("LICENCIA", `Inactivación de ${editExpModal.key} ajustada a ${customExpDateInput}`, "success");
        setEditExpModal(null);
        fetchLicenses(true);
      } else {
        const err = await res.json();
        triggerToast("Error", err.error || "Fallo al guardar nueva fecha", "warning");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error al actualizar fecha de licencia", "error");
    }
  };

  // Activate license by key
  const handleActivateLicense = async (keyToActivate: string) => {
    try {
      setActivating(true);
      addLog("LICENCIA", `Enviando solicitud de activación para llave: ${keyToActivate}`, "info");
      const res = await fetch("/api/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToActivate })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Licencia Activada", `El salón ahora opera bajo la licencia ${data.license.licenseType.toUpperCase()}`, "success");
        addLog("LICENCIA", `Licencia activada con éxito para el salón: ${data.config.name} (${data.license.licenseType})`, "success");
        setActivationInput("");
        fetchLicenses(true);
        await fetchTenants();
      } else {
        const errData = await res.json();
        triggerToast("Activación Fallida", errData.error || "La licencia no es válida.", "warning");
        addLog("LICENCIA", `Intento de activación fallido: ${errData.error || "No válida"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Error en el pipeline de activación", "error");
    } finally {
      setActivating(false);
    }
  };

  // Revoke License
  const handleRevokeLicense = async (keyToRevoke: string) => {
    if (!confirm(`¿Estás seguro de revocar la licencia ${keyToRevoke}? Esto degradará el salón si está en uso.`)) {
      return;
    }

    try {
      addLog("LICENCIA", `Solicitando revocación de licencia: ${keyToRevoke}`, "warn");
      const res = await fetch("/api/licenses/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToRevoke })
      });

      if (res.ok) {
        triggerToast("Licencia Revocada", "La licencia seleccionada ha sido inhabilitada.", "info");
        addLog("LICENCIA", `Licencia revocada con éxito.`, "warn");
        fetchLicenses(true);
        await fetchTenants();
      } else {
        throw new Error("Fallo al revocar");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo de comunicación al revocar licencia", "error");
    }
  };

  // Simulate Guest booking injection
  const handleSimulateBooking = async () => {
    try {
      addLog("SIMULACIÓN", "Inyectando cita de cliente simulada...", "info");
      
      const mockNames = ["Andrés Felipe", "Diana Carolina", "Mateo Gómez", "Valentina Ríos", "Santiago López", "Gabriel Restrepo", "Mariana Vélez"];
      const mockPhones = ["3004561234", "3128765432", "3159081273", "3204981122", "3105554433"];
      const mockNotes = ["Corte degradado bajo", "Arreglo de barba con navaja", "Servicio rápido, llego sobre el tiempo", "Sin observaciones"];

      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const randomPhone = mockPhones[Math.floor(Math.random() * mockPhones.length)];
      const randomNote = mockNotes[Math.floor(Math.random() * mockNotes.length)];
      
      // Select barber b1, b2, or b3
      const randomBarberNum = Math.floor(1 + Math.random() * 3);
      const barberId = `b${randomBarberNum}`;
      const barberNames: Record<string, string> = { b1: "Carlos Barber", b2: "Mateo Estilos", b3: "Andrés Cortes" };

      // Set date to today
      const todayStr = new Date().toISOString().split("T")[0];
      
      // Pick a random time during working hours
      const hour = Math.floor(9 + Math.random() * 10);
      const min = Math.random() > 0.5 ? "00" : "30";
      const timeStr = `${hour.toString().padStart(2, "0")}:${min}`;

      const serviceRes = await fetch("/api/services");
      const servicesList = await serviceRes.json();
      const randomService = servicesList[Math.floor(Math.random() * servicesList.length)] || { id: "s1", name: "Corte Premium", price: 18000, duration: 30 };

      const appointmentData = {
        clientName: randomName,
        clientPhone: randomPhone,
        serviceId: randomService.id,
        serviceName: randomService.name,
        price: randomService.price,
        date: todayStr,
        time: timeStr,
        duration: randomService.duration,
        barberId,
        barberName: barberNames[barberId],
        notes: randomNote
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData)
      });

      if (res.ok) {
        addLog("SIMULACIÓN", `Cita simulada creada para '${randomName}' en tiempo real`, "success");
      } else {
        const err = await res.json();
        addLog("SIMULACIÓN", `Fallo al agendar cita simulada: ${err.message || "Conflicto de horario"}`, "warn");
      }
    } catch (e) {
      console.error(e);
      addLog("SYS", "Fallo al inyectar cita simulada", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    triggerToast("Clave Copiada", "La clave se copió al portapapeles.", "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getLicenseBadge = (type: string) => {
    switch (type) {
      case "premium":
        return <span className="text-[10px] bg-amber-950 text-elegant-gold border border-amber-800/80 px-2 py-0.5 rounded-full font-bold">🥇 Premium</span>;
      case "profesional":
        return <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full font-bold">🥈 Profesional</span>;
      default:
        return <span className="text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full font-bold">🥉 Básica</span>;
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/developer/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    let calculatedExpiresAt: string | null = null;
    if (annExpiryOption === "1d") {
      calculatedExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (annExpiryOption === "3d") {
      calculatedExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    } else if (annExpiryOption === "7d") {
      calculatedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (annExpiryOption === "30d") {
      calculatedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (annExpiryOption === "custom" && annCustomExpiry) {
      calculatedExpiresAt = new Date(annCustomExpiry).toISOString();
    }

    try {
      setPublishingAnn(true);
      const res = await fetch("/api/developer/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle.trim(),
          message: annMessage.trim(),
          type: annType,
          expiresAt: calculatedExpiresAt
        })
      });

      if (res.ok) {
        triggerToast("Anuncio Publicado", "Se ha enviado la transmisión global a todos los inquilinos.", "success");
        addLog("ANUNCIO", `Publicado mensaje global '${annTitle}'`, "success");
        setAnnTitle("");
        setAnnMessage("");
        setAnnExpiryOption("none");
        setAnnCustomExpiry("");
        await fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPublishingAnn(false);
    }
  };

  // Toggle Announcement Active / Inactive State
  const handleToggleAnnouncementActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/developer/announcements/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive })
      });
      if (res.ok) {
        triggerToast("Estado del Anuncio", !currentActive ? "Anuncio ACTIVADO y visible" : "Anuncio INACTIVADO (Oculto)", "info");
        await fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Anuncio Eliminado", "Transmisión removida definitivamente.", "info");
        await fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Pricing Configuration
  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/developer/pricing");
      if (res.ok) {
        const data = await res.json();
        setPricingConfig(data.pricing);
        if (data.pricing?.basica) setBasicaPrice(data.pricing.basica.price);
        if (data.pricing?.profesional) setProPrice(data.pricing.profesional.price);
        if (data.pricing?.premium) setPremPrice(data.pricing.premium.price);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Pricing Configuration
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPricing(true);
      const res = await fetch("/api/developer/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basicaPrice, profesionalPrice: proPrice, premiumPrice: premPrice })
      });

      if (res.ok) {
        triggerToast("Precios Actualizados", "Nuevas tarifas SaaS guardadas.", "success");
        addLog("PRICING", "Tarifas SaaS actualizadas en la base de datos", "success");
        await fetchPricing();
        await fetchLicenses();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPricing(false);
    }
  };

  // Fetch Health Diagnostics
  const fetchHealth = async () => {
    try {
      setFetchingHealth(true);
      const res = await fetch("/api/developer/health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        addLog("HEALTH", `Diagnóstico servidor: ${data.status} | Memoria: ${data.memory?.heapUsed}`, "info");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingHealth(false);
    }
  };

  // Export Full Backup JSON
  const handleExportBackup = () => {
    window.open("/api/developer/backup-export", "_blank");
    triggerToast("Descargando Backup", "Descargando copia de seguridad JSON completa...", "info");
    addLog("BACKUP", "Copia de seguridad del sistema exportada a archivo JSON", "success");
  };

  // Import Backup JSON
  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupJsonStr.trim()) return;

    try {
      setImportingBackup(true);
      const parsed = JSON.parse(backupJsonStr);
      const res = await fetch("/api/developer/backup-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenses: parsed.generatedLicenses, tenantsDataImport: parsed.tenantData })
      });

      if (res.ok) {
        triggerToast("Copia Restaurada", "La base de datos se ha actualizado con el backup.", "success");
        addLog("BACKUP", "Base de datos restaurada desde JSON", "success");
        setBackupJsonStr("");
        await fetchLicenses(true);
        await fetchTenants();
      }
    } catch (err: any) {
      triggerToast("Error de Formato", "El texto ingresado no es un JSON válido de backup.", "warning");
    } finally {
      setImportingBackup(false);
    }
  };

  // Save Feature Flags & Maintenance Mode
  const handleSaveFlags = async () => {
    try {
      setSavingFlags(true);
      const res = await fetch(`/api/developer/tenants/${selectedFlagTenantId}/flags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureFlags: tenantFlags,
          maintenanceMode: maintMode,
          maintenanceMessage: maintMsg,
          maintenanceAllowAdmins: maintAllowAdmins
        })
      });

      if (res.ok) {
        triggerToast("Flags Actualizadas", "Configuración de módulos y mantenimiento guardada en vivo.", "success");
        addLog("FLAGS", `Feature Flags de '${selectedFlagTenantId}' actualizadas. Mantenimiento: ${maintMode ? "ACTIVADO" : "INACTIVO"}`, "info");
        await fetchTenants();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error", "No se pudo guardar la configuración de flags.", "warning");
    } finally {
      setSavingFlags(false);
    }
  };

  // Save Billing, Due Date & Lock Status
  const handleSaveBilling = async () => {
    try {
      setSavingBilling(true);
      const res = await fetch(`/api/developer/tenants/${selectedBillingTenantId}/billing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingStatus: billingStatusInput,
          billingDueDate: billingDueDateInput,
          billingAmountDue: billingAmountDueInput,
          billingGraceDays: billingGraceDaysInput,
          billingCustomMessage: billingCustomMsgInput,
          billingPaymentLink: billingPaymentLinkInput,
          billingAccountInfo: billingAccountInfoInput
        })
      });

      if (res.ok) {
        triggerToast("Facturación Guardada", `Estado de cobro para '${selectedBillingTenantId}' actualizado a ${billingStatusInput.toUpperCase()}`, "success");
        addLog("COBROS", `Estado de cobro de '${selectedBillingTenantId}' modificado a ${billingStatusInput}`, "success");
        await fetchTenants();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error", "No se pudo guardar el estado de facturación.", "warning");
    } finally {
      setSavingBilling(false);
    }
  };

  // Execute Selective Purge
  const handleExecutePurge = async () => {
    if (purgeConfirmText !== selectedPurgeTenantId) {
      triggerToast("Confirmación Incorrecta", `Debes escribir exactamente '${selectedPurgeTenantId}' para confirmar.`, "warning");
      return;
    }

    try {
      setExecutingPurge(true);
      const res = await fetch(`/api/developer/tenants/${selectedPurgeTenantId}/purge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purgeAppointments: purgeAppointmentsCheck,
          purgeCashClosures: purgeCashClosuresCheck,
          purgeSales: purgeSalesCheck,
          purgeClients: purgeClientsCheck,
          factoryReset: factoryResetCheck
        })
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast("Purga Realizada", data.message || "Proceso de purga de datos completado.", "success");
        addLog("PURGA", `Purga ejecutada en '${selectedPurgeTenantId}'. ${data.message}`, "warn");
        setShowPurgeModal(false);
        setPurgeConfirmText("");
        await fetchTenants();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error de Purga", "No se pudo realizar la purga.", "warning");
    } finally {
      setExecutingPurge(false);
    }
  };

  // Ping Latency Test
  const handleRunPingTest = async () => {
    const start = performance.now();
    try {
      const res = await fetch("/api/developer/health");
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setPingLatency(duration);
        addLog("PING", `Prueba de latencia API completada en ${duration} ms`, "success");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear Server & Client Cache
  const handleClearSystemCache = async () => {
    try {
      setClearingCache(true);
      const res = await fetch("/api/developer/health/clear-cache", { method: "POST" });
      if (res.ok) {
        triggerToast("Caché Purgada", "Caché de servidor y almacenamiento local limpiados con éxito.", "success");
        addLog("CACHE", "Purga total de memoria caché realizada", "success");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchPricing();
    fetchHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Activa</span>;
      case "expired":
        return <span className="text-[9px] bg-rose-950/80 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Revocada</span>;
      default:
        return <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-scaleUp">
      
      {/* 1. Header del Dashboard de Desarrollo */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
          <Cpu className="h-32 w-32" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-500/10 text-elegant-gold rounded-lg border border-amber-500/20 text-xs font-bold px-2 py-0.5 font-mono">
                SUPERUSER PORTAL
              </span>
              <span className="flex items-center text-emerald-400 gap-1 text-[10px] font-mono font-bold bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Consola Lista
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Panel de Control del Desarrollador & Licencias
            </h1>
            <p className="text-xs text-elegant-text-muted leading-relaxed max-w-2xl">
              Como administrador global o desarrollador del software SaaS SYNCBARBER, puedes emitir nuevas licencias, activar suscripciones para salones de belleza y monitorizar la telemetría del servidor en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchLicenses()}
              className="p-3 bg-elegant-sub border border-elegant-border hover:bg-elegant-card rounded-2xl text-elegant-text-muted hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Refrescar Servidor"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <div className="bg-elegant-sub border border-elegant-border px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] text-elegant-text-muted font-bold font-mono">SSE CLIENTS</span>
              <span className="text-sm font-extrabold text-white font-mono flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-400 animate-pulse" />
                {activeConnections}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Navegación Categorizada & Submenús Interactivos */}
      {(() => {
        const DEV_MODULE_GROUPS = [
          {
            id: "ops",
            label: "Operaciones & SaaS",
            icon: Building2,
            description: "Licencias, Inquilinos y Tarifas",
            tabs: [
              { id: "licenses", label: "Licencias & Telemetría", icon: Key, color: "text-amber-400" },
              { id: "multitenant", label: "Arquitectura Multi-Inquilino", icon: Network, color: "text-sky-400" },
              { id: "featureflags", label: "Feature Flags & Mantenimiento", icon: Sliders, color: "text-amber-300" },
              { id: "billing", label: "Cobros & Morosidad", icon: AlertTriangle, color: "text-rose-400" },
              { id: "pricing", label: "Tarifas & Planes SaaS", icon: DollarSign, color: "text-emerald-400", onSelect: fetchPricing },
            ]
          },
          {
            id: "analytics",
            label: "Analíticas & Difusión",
            icon: BarChart3,
            description: "Métricas BI y Broadcasts",
            tabs: [
              { id: "bi", label: "Métricas & Analíticas (BI)", icon: BarChart3, color: "text-purple-400" },
              { id: "announcements", label: "Anuncios & Broadcast", icon: Megaphone, color: "text-amber-300", onSelect: fetchAnnouncements },
            ]
          },
          {
            id: "support",
            label: "Soporte & Mantenimiento",
            icon: ShieldCheck,
            description: "Helpdesk, Diagnóstico y Backups",
            tabs: [
              { id: "helpdesk", label: "Mesa de Ayuda (Helpdesk)", icon: LifeBuoy, color: "text-rose-400" },
              { id: "health", label: "Diagnóstico & Salud", icon: Zap, color: "text-cyan-400", onSelect: fetchHealth },
              { id: "backup", label: "Respaldo & Backup Data", icon: FileJson, color: "text-indigo-400" },
            ]
          }
        ];

        const activeGroup = DEV_MODULE_GROUPS.find(g => g.tabs.some(t => t.id === activeTab)) || DEV_MODULE_GROUPS[0];

        return (
          <div className="bg-elegant-card/90 border border-elegant-border/90 rounded-3xl p-3.5 md:p-4 space-y-3.5 shadow-xl">
            {/* Nivel 1: Categorías Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {DEV_MODULE_GROUPS.map((group) => {
                const Icon = group.icon;
                const isGroupActive = group.tabs.some(t => t.id === activeTab);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      if (!isGroupActive) {
                        const firstTab = group.tabs[0];
                        setActiveTab(firstTab.id as any);
                        if (firstTab.onSelect) firstTab.onSelect();
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isGroupActive
                        ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/60 text-white shadow-md ring-1 ring-amber-500/30"
                        : "bg-black/30 border-elegant-border/80 text-elegant-text-muted hover:text-white hover:bg-elegant-sub/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isGroupActive ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-black/40 text-neutral-400"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isGroupActive ? "text-amber-300 font-extrabold" : "text-white"}`}>
                            {group.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-elegant-text-muted block mt-0.5">
                          {group.description}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isGroupActive ? "bg-amber-400/20 text-amber-300 border border-amber-500/40" : "bg-black/50 text-neutral-500"
                    }`}>
                      {group.tabs.length} sub-módulos
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Nivel 2: Sub-menú de Pestañas Interactivas */}
            <div className="pt-2.5 border-t border-elegant-border/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none w-full md:w-auto">
                <span className="text-[10px] font-extrabold text-amber-400/90 uppercase tracking-wider pr-1.5 flex items-center gap-1.5 shrink-0 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  Sub-módulos:
                </span>
                {activeGroup.tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        if (tab.onSelect) tab.onSelect();
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                        isTabActive
                          ? "bg-amber-500/25 border-amber-500/80 text-amber-200 font-extrabold shadow-sm ring-1 ring-amber-500/40"
                          : "bg-black/40 border-elegant-border/70 text-elegant-text-muted hover:text-white hover:bg-elegant-sub/60"
                      }`}
                    >
                      <TabIcon className={`h-3.5 w-3.5 ${tab.color}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selector Rápido Directo */}
              <div className="flex items-center gap-2 shrink-0 ml-auto bg-black/40 border border-elegant-border/80 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-mono text-elegant-text-muted hidden sm:inline">⚡ Saltar a:</span>
                <select
                  value={activeTab}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setActiveTab(val);
                    const found = DEV_MODULE_GROUPS.flatMap(g => g.tabs).find(t => t.id === val);
                    if (found?.onSelect) found.onSelect();
                  }}
                  className="px-2 py-0.5 bg-transparent border-0 text-xs text-amber-300 font-bold focus:ring-0 cursor-pointer outline-none"
                >
                  <optgroup label="🏢 Operaciones & SaaS">
                    <option value="licenses" className="bg-neutral-900 text-white">🔑 Licencias & Telemetría</option>
                    <option value="multitenant" className="bg-neutral-900 text-white">🌐 Multi-Inquilino</option>
                    <option value="featureflags" className="bg-neutral-900 text-white">🎛️ Feature Flags & Mantenimiento</option>
                    <option value="billing" className="bg-neutral-900 text-white">⚠️ Cobros & Morosidad</option>
                    <option value="pricing" className="bg-neutral-900 text-white">💰 Tarifas & Planes SaaS</option>
                  </optgroup>
                  <optgroup label="📊 Analíticas & Difusión">
                    <option value="bi" className="bg-neutral-900 text-white">📈 Métricas & Analíticas (BI)</option>
                    <option value="announcements" className="bg-neutral-900 text-white">📢 Anuncios & Broadcast</option>
                  </optgroup>
                  <optgroup label="🛠️ Soporte & Mantenimiento">
                    <option value="helpdesk" className="bg-neutral-900 text-white">🎧 Mesa de Ayuda (Helpdesk)</option>
                    <option value="health" className="bg-neutral-900 text-white">⚡ Diagnóstico & Salud</option>
                    <option value="backup" className="bg-neutral-900 text-white">💾 Respaldo & Backup Data</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === "licenses" && (
        <>
          {/* 2. Grid de Acción Rápida (12 columnas) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Formulario Completo de Alta de Barbería & Licencia (Izquierda - 6 cols) */}
            <div className="lg:col-span-6 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <div className="border-b border-elegant-border pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                    <Scissors className="h-4.5 w-4.5 text-elegant-gold" />
                    Alta Completa de Barbería & Licencia SaaS
                  </h2>
                  <p className="text-[11px] text-elegant-text-muted mt-0.5">
                    Registra datos comerciales, propietario, plantilla, horarios y equipo inicial.
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Multi-Inquilino
                </span>
              </div>

              <form onSubmit={handleGenerateLicense} className="space-y-3.5">
                
                {/* Bloque 1: Identificación de la Barbería */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Scissors className="h-3 w-3" />
                      1. Datos Comerciales de la Barbería
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">Paso 1/4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Nombre de la Barbería *:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Barbería Don Carlos"
                        value={salonNameInput}
                        onChange={(e) => setSalonNameInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Eslogan / Filosofía:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Arte, Precisión & Estilo"
                        value={taglineInput}
                        onChange={(e) => setTaglineInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Ciudad / Sede:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Bogotá / Zona Rosa"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Dirección Física:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Av. Principal #45-12"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Contacto & Propietario */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      2. Propietario & Cobranza
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">Paso 2/4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Dueño:
                      </label>
                      <input
                        type="text"
                        placeholder="Carlos Mendoza"
                        value={ownerNameInput}
                        onChange={(e) => setOwnerNameInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Correo:
                      </label>
                      <input
                        type="email"
                        placeholder="owner@salon.com"
                        value={ownerEmailInput}
                        onChange={(e) => setOwnerEmailInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        WhatsApp:
                      </label>
                      <input
                        type="text"
                        placeholder="+57 300 123 4567"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 3: Plan SaaS & Personalización */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Key className="h-3 w-3" />
                      3. Plan SaaS, Duración & Plantilla
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">Paso 3/4</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Plan Suscripción:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {(["basica", "profesional", "premium"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setLicenseTypeInput(type)}
                            className={`py-1 rounded-xl text-[9px] font-bold transition-all border cursor-pointer text-center ${
                              licenseTypeInput === type
                                ? "bg-elegant-gold border-elegant-gold text-elegant-bg font-extrabold"
                                : "bg-elegant-sub border-elegant-border text-neutral-400 hover:border-neutral-700"
                            }`}
                          >
                            {type === "premium" ? "🥇 Prem" : type === "profesional" ? "🥈 Pro" : "🥉 Bás"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Tema Visual:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "gold", label: "✨ Gold" },
                          { id: "urban", label: "⚡ Cyan" },
                          { id: "traditional", label: "📜 Trad." }
                        ].map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplate(tpl.id as any)}
                            className={`py-1 rounded-xl text-[9px] font-bold transition-all border cursor-pointer text-center ${
                              selectedTemplate === tpl.id
                                ? "bg-amber-500/20 border-amber-500/70 text-amber-300 font-extrabold"
                                : "bg-elegant-sub border-elegant-border text-neutral-400 hover:border-neutral-700"
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block flex justify-between items-center">
                      <span>Duración de Suscripción:</span>
                      <span className="text-[8px] text-emerald-400 font-mono font-bold">Inactivación Automática</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { months: 1, label: "1 Mes", sub: "30 Días" },
                        { months: 3, label: "3 Meses", sub: "90 Días" },
                        { months: 6, label: "6 Meses", sub: "180 Días" },
                        { months: 12, label: "1 Año", sub: "365 Días" }
                      ].map((dur) => (
                        <button
                          key={dur.months}
                          type="button"
                          onClick={() => setDurationMonthsInput(dur.months)}
                          className={`py-1.5 rounded-xl text-[9px] font-bold transition-all border cursor-pointer text-center ${
                            durationMonthsInput === dur.months
                              ? "bg-amber-500/20 border-amber-500/70 text-amber-300 font-extrabold"
                              : "bg-elegant-sub border-elegant-border text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          <span className="block font-bold">{dur.label}</span>
                          <span className="block text-[8px] opacity-70 font-mono">{dur.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bloque 4: Operación & Equipo Inicial */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      4. Horarios & Equipo Inicial
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono">Paso 4/4</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Apertura:
                      </label>
                      <input
                        type="time"
                        value={openTimeInput}
                        onChange={(e) => setOpenTimeInput(e.target.value)}
                        className="w-full px-2 py-1 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Cierre:
                      </label>
                      <input
                        type="time"
                        value={closeTimeInput}
                        onChange={(e) => setCloseTimeInput(e.target.value)}
                        className="w-full px-2 py-1 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Barberos:
                      </label>
                      <select
                        value={barbersCountInput}
                        onChange={(e) => setBarbersCountInput(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold font-mono cursor-pointer"
                      >
                        <option value={1}>1 Barbero</option>
                        <option value={2}>2 Barberos</option>
                        <option value={3}>3 Barberos</option>
                        <option value={4}>4 Barberos</option>
                        <option value={6}>6 Barberos</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Clave Admin:
                      </label>
                      <input
                        type="text"
                        value={customAdminPasswordInput}
                        onChange={(e) => setCustomAdminPasswordInput(e.target.value)}
                        className="w-full px-2 py-1 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Calculation Summary */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-2.5 space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Fecha de Activación:
                    </span>
                    <span className="font-bold">{new Date().toISOString().split("T")[0]}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Fecha Inactivación Límite:
                    </span>
                    <span className="font-bold">
                      {(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + durationMonthsInput * 30);
                        return d.toISOString().split("T")[0];
                      })()}
                    </span>
                  </div>
                  <div className="text-[9px] text-neutral-400 pt-1 border-t border-neutral-900 flex justify-between">
                    <span>👤 Usuario Admin:</span>
                    <span className="text-amber-300 font-bold">
                      admin-{salonNameInput ? salonNameInput.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) : 'salon'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 uppercase tracking-wide"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>{generating ? "Creando Barbería & Licencia..." : "Registrar Barbería & Generar Licencia"}</span>
                </button>
              </form>
            </div>

            {/* Columna Derecha (6 cols): Activador Manual, Estado de Licencia & Simulador Telemetría */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Quick Activate Card */}
              <div className="bg-elegant-card border border-elegant-border rounded-3xl p-4 md:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-elegant-border pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Unlock className="h-4 w-4 text-emerald-400" />
                      Activador Manual & Cambio de Suscripción
                    </h3>
                    <p className="text-[10px] text-elegant-text-muted mt-0.5">
                      Ingresa una llave de suscripción para aplicarla inmediatamente a tu salón actual.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                    Sustitución Directa
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pega la llave de licencia (ej. LIC-PREM-...)"
                    value={activationInput}
                    onChange={(e) => setActivationInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 text-white text-xs font-mono rounded-xl focus:outline-none focus:border-amber-500 placeholder-neutral-600 uppercase"
                  />
                  <button
                    type="button"
                    disabled={activating || !activationInput}
                    onClick={() => handleActivateLicense(activationInput)}
                    className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-md active:scale-95"
                  >
                    <span>{activating ? "Activando..." : "Activar"}</span>
                  </button>
                </div>

                {config.activeLicenseKey && (
                  <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl flex items-center justify-between text-[10px]">
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Licencia en Uso: <strong className="font-mono text-white">{config.activeLicenseKey}</strong></span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono bg-emerald-900/40 px-1.5 py-0.5 rounded border border-emerald-700/50">
                      {config.licenseType ? config.licenseType.toUpperCase() : "PREMIUM"}
                    </span>
                  </div>
                )}
              </div>

              {/* Simulador y Telemetría en Vivo */}
              <TelemetrySimulator
                logs={logs}
                onSimulateBooking={handleSimulateBooking}
                onClearLogs={() => setLogs([])}
                onAddLog={addLog}
                triggerToast={triggerToast}
              />
            </div>

          </div>

      {/* 3. Tabla / Listado de Licencias Emitidas */}
      <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="border-b border-elegant-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-elegant-gold" />
              Historial de Licencias & Activaciones
            </h2>
            <p className="text-[11px] text-elegant-text-muted mt-0.5">
              Lista general de claves generadas para la simulación del negocio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-elegant-text-muted font-bold font-mono">
              TOTAL EMITIDAS: {licenses.length}
            </span>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-elegant-text-muted">Cargando licencias del servidor...</div>
        ) : licenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-elegant-text-muted italic">No se han emitido licencias de software todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-elegant-border text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                  <th className="py-3 px-3">Salón de Belleza</th>
                  <th className="py-3 px-3">Módulo Plan</th>
                  <th className="py-3 px-3">Clave de Licencia</th>
                  <th className="py-3 px-3">Activación</th>
                  <th className="py-3 px-3">Inactivación (Vencimiento)</th>
                  <th className="py-3 px-3">Días Restantes & Estado</th>
                  <th className="py-3 px-3 text-right">Acciones de Cobro & Administración</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => {
                  const isActiveOnThisSalon = config.activeLicenseKey === lic.key;
                  const expStr = lic.expirationDate || "2026-12-31";
                  const daysLeft = lic.daysRemaining !== undefined 
                    ? lic.daysRemaining 
                    : Math.ceil((new Date(expStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  const isExpired = daysLeft <= 0;
                  const is1Day = daysLeft === 1 || daysLeft === 0;
                  const is8Days = daysLeft > 1 && daysLeft <= 8;
                  const is15Days = daysLeft > 8 && daysLeft <= 15;

                  return (
                    <tr 
                      key={lic.key} 
                      className={`border-b border-elegant-border/60 hover:bg-elegant-sub/20 transition-colors ${
                        isActiveOnThisSalon ? "bg-emerald-950/10" : isExpired ? "bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            {lic.salonName}
                            {isActiveOnThisSalon && (
                              <span className="text-[9px] bg-emerald-500 text-elegant-bg px-1.5 py-0.5 rounded-md font-black">
                                Este Salón
                              </span>
                            )}
                          </p>
                          {lic.ownerEmail && (
                            <p className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="h-2.5 w-2.5 text-neutral-400" />
                              {lic.ownerEmail}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">{getLicenseBadge(lic.licenseType)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-elegant-sub border border-elegant-border px-2 py-1 rounded-lg text-[10px]">
                            {lic.key}
                          </span>
                          <button
                            onClick={() => copyToClipboard(lic.key)}
                            className="text-elegant-text-muted hover:text-white p-1 transition-colors hover:bg-elegant-sub rounded-lg"
                            title="Copiar llave"
                          >
                            {copiedKey === lic.key ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-mono text-[11px] font-bold">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>{lic.createdAt ? lic.createdAt.split("T")[0] : "2026-07-24"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold">
                        <div className={`flex items-center gap-1 ${isExpired ? "text-rose-400" : is8Days || is1Day ? "text-amber-400" : "text-white"}`}>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{expStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isExpired ? (
                          <span className="px-2 py-1 bg-rose-950/80 text-rose-300 border border-rose-800 rounded-lg text-[9px] font-extrabold font-mono inline-flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> Expirada ({daysLeft}d)
                          </span>
                        ) : is1Day ? (
                          <span className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-lg text-[9px] font-extrabold font-mono inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-rose-400" /> ¡Último Día! (1d)
                          </span>
                        ) : is8Days ? (
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/50 rounded-lg text-[9px] font-extrabold font-mono inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-400" /> Alerta 8 Días ({daysLeft}d)
                          </span>
                        ) : is15Days ? (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded-lg text-[9px] font-bold font-mono inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-400" /> Recordatorio 15d ({daysLeft}d)
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800 rounded-lg text-[9px] font-bold font-mono inline-flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-400" /> Activa ({daysLeft}d)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* SaaS Contract PDF / WhatsApp / Email Button */}
                          <button
                            onClick={() => {
                              const matchedTenant = tenantsList.find(t => t.id === lic.tenantId || t.name === lic.salonName) || {
                                id: lic.tenantId || "salondemo",
                                name: lic.salonName || "Barbería Registrada",
                                ownerName: lic.ownerName,
                                ownerEmail: lic.ownerEmail,
                                phone: lic.phone,
                                city: lic.city,
                                address: lic.address,
                                config: { licenseType: lic.licenseType, licenseKey: lic.key }
                              };
                              openContractModal(matchedTenant, lic);
                            }}
                            className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Ver y descargar Contrato de Licenciamiento SaaS en PDF/WhatsApp/Email"
                          >
                            <FileText className="h-3 w-3 text-amber-400" />
                            <span>Contrato PDF</span>
                          </button>

                          {/* Simulated Reminder Email Button */}
                          <button
                            onClick={() => handleSendReminderEmail(lic.key)}
                            disabled={sendingReminderKey === lic.key}
                            className="px-2 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-sky-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Simular envío automático de correo electrónico de cobro y renovación"
                          >
                            <Mail className="h-3 w-3" />
                            <span>{sendingReminderKey === lic.key ? "Enviando..." : "Enviar Correo"}</span>
                          </button>

                          {/* Renew 1 Month Button */}
                          <button
                            onClick={() => handleRenewLicense(lic.key, 1)}
                            disabled={renewingKey === lic.key}
                            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/60 text-amber-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Renovar +1 mes de suscripción"
                          >
                            <RefreshCw className={`h-3 w-3 ${renewingKey === lic.key ? "animate-spin" : ""}`} />
                            <span>+1 Mes</span>
                          </button>

                          {/* Edit Expiration Date Button */}
                          <button
                            onClick={() => {
                              setEditExpModal({
                                key: lic.key,
                                salonName: lic.salonName,
                                currentExp: lic.expirationDate || "2026-12-31",
                                currentEmail: lic.ownerEmail || ""
                              });
                              setCustomExpDateInput(lic.expirationDate || "2026-12-31");
                              setCustomEmailInput(lic.ownerEmail || "");
                            }}
                            className="p-1.5 bg-elegant-sub hover:bg-neutral-800 text-neutral-300 border border-elegant-border text-[10px] rounded-lg transition-all cursor-pointer"
                            title="Modificar fecha de inactivación manualmente"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>

                          {!isActiveOnThisSalon && !isExpired && (
                            <button
                              onClick={() => handleActivateLicense(lic.key)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Activar esta licencia en este salón"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Aplicar</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleRevokeLicense(lic.key)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            title="Revocar licencia"
                          >
                            <span>Revocar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === "multitenant" && (
        <div className="space-y-6 animate-scaleUp">
          
          {/* 1. Arquitectura de Aislamiento Explicativa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Col 1: Cómo se identifica el Cliente */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">1. Portal de Clientes</h3>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">Por Slug de URL</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Cada barbería afiliada tiene un identificador único o <strong>slug</strong> de negocio (ej: <code className="font-mono text-white bg-neutral-900 px-1 py-0.5 rounded">bella-barba</code>). El cliente ingresa a:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] font-mono font-bold text-neutral-400 break-all select-all flex items-center justify-between">
                  <span>{`https://bellaybarba.com/c/${selectedDemoTenant}`}</span>
                  <ExternalLink className="h-3 w-3 text-neutral-600 shrink-0" />
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  El frontend lee este slug, solicita la configuración de ese salón al servidor (<code>GET /api/config?salonId={selectedDemoTenant}</code>), y carga la marca, servicios y agenda de ese inquilino.
                </p>
              </div>
            </div>

            {/* Col 2: Cómo se identifica el Barbero / Admin */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">2. Login del Personal</h3>
                    <span className="text-[9px] font-mono text-blue-400 font-bold uppercase">Por ID de Inquilino</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Cuando los barberos o administradores inician sesión con su usuario, el sistema en el backend verifica a qué <strong>ID de Inquilino (salon_id)</strong> pertenece su cuenta:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] space-y-1 font-mono text-neutral-400">
                  <p className="text-blue-400 font-bold"># Barbero Autenticado:</p>
                  <p className="text-[9px]">nombre: <span className="text-white">Carlos Barber</span></p>
                  <p className="text-[9px]">salon_id: <span className="text-elegant-gold">"{selectedDemoTenant}"</span></p>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  El servidor emite un token de sesión JWT que contiene el <code>salon_id</code> inmutable. Todas las consultas posteriores se restringen automáticamente a este ID.
                </p>
              </div>
            </div>

            {/* Col 3: Aislamiento en Base de Datos */}
            <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">3. Base de Datos</h3>
                    <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">Aislamiento Lógico (SaaS)</span>
                  </div>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  Los datos de todas las barberías residen en las mismas tablas (Appointments, Barbers, Clients), pero cada fila tiene una columna <strong>salon_id</strong>.
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-900 text-[10px] font-mono text-neutral-400 leading-relaxed">
                  <p className="text-emerald-500">-- Consulta aislada:</p>
                  <code className="text-neutral-300">
                    SELECT * FROM appointments <br />
                    WHERE <span className="text-elegant-gold font-bold">salon_id = '{selectedDemoTenant}'</span>;
                  </code>
                </div>
                <p className="text-[11px] text-elegant-text-muted leading-relaxed">
                  ¡Ningún barbero de otra peluquería podrá jamás acceder o ver la agenda de <em>Barberia Demo</em> porque el backend y las reglas de seguridad imponen este filtro inmutable por inquilino!
                </p>
              </div>
            </div>

          </div>

          {/* 2. Simulador Interactivo de Base de Datos SaaS */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-6">
            
            {/* Selector de Inquilino Demo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-elegant-border/70 pb-5">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="h-4.5 w-4.5 text-elegant-gold animate-pulse" />
                  Simulador de Consultas SaaS en Tiempo Real
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Selecciona una barbería para simular la petición de su Base de Datos y ver cómo cambian sus barberos y citas.
                </p>
              </div>

              {/* Botones de Selección */}
              <div className="flex flex-wrap gap-2">
                {(["bella-barba"] as const).map((tenant) => {
                  const label = "Barberia Demo (Premium)";
                  return (
                    <button
                      key={tenant}
                      onClick={() => setSelectedDemoTenant(tenant)}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                        selectedDemoTenant === tenant
                          ? "bg-elegant-gold text-elegant-bg border-elegant-gold shadow-sm font-black"
                          : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Tablas Simuladas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Tabla Barberos (Izquierda) */}
              <div className="lg:col-span-4 bg-elegant-sub/30 border border-elegant-border/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-elegant-border/60 pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    Tabla: <code className="text-white text-[10px] bg-neutral-950 px-1 py-0.5 rounded">Barbers</code>
                  </h3>
                  <span className="text-[9px] font-mono text-elegant-text-muted">SELECT</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {getSimulatedBarbers(selectedDemoTenant).map((b) => (
                    <div key={b.id} className="p-2.5 bg-neutral-950 border border-neutral-900 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[9px] text-elegant-text-muted font-mono">Usuario: {b.username}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold bg-blue-950/80 text-blue-400 border border-blue-900/60 px-1.5 py-0.5 rounded">
                          {b.salon_id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla Citas (Derecha) */}
              <div className="lg:col-span-8 bg-elegant-sub/30 border border-elegant-border/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-elegant-border/60 pb-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    Tabla: <code className="text-white text-[10px] bg-neutral-950 px-1 py-0.5 rounded">Appointments</code>
                  </h3>
                  <span className="text-[9px] font-mono text-elegant-text-muted">SELECT</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[9px] font-bold uppercase text-elegant-text-muted">
                        <th className="py-2">Cliente</th>
                        <th className="py-2">Servicio</th>
                        <th className="py-2">Barbero</th>
                        <th className="py-2">Fecha/Hora</th>
                        <th className="py-2">Precio</th>
                        <th className="py-2 text-right">Inquilino (SaaS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSimulatedAppointments(selectedDemoTenant).map((app) => (
                        <tr key={app.id} className="border-b border-neutral-900/40 hover:bg-neutral-950/30">
                          <td className="py-2 font-bold text-white">{app.clientName}</td>
                          <td className="py-2 text-neutral-300">{app.serviceName}</td>
                          <td className="py-2 text-neutral-400">{app.barberName}</td>
                          <td className="py-2 text-neutral-400 font-mono">{app.date} {app.time}</td>
                          <td className="py-2 text-white font-bold">{formatPrice(app.price)}</td>
                          <td className="py-2 text-right">
                            <span className="text-[8px] bg-amber-950/80 text-elegant-gold border border-amber-900/60 font-bold px-1.5 py-0.5 rounded">
                              {app.salon_id}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* 3. Administración Real de Inquilinos & Licencias SaaS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {editingMembershipsTenantId ? (
              /* Formulario Personalizar Planes de Membresías */
              <div className="lg:col-span-5 bg-elegant-card border border-amber-500/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-md animate-scaleUp">
                <div className="border-b border-elegant-border pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                      <Tag className="h-4.5 w-4.5 text-amber-500" />
                      Membresías Personalizadas
                    </h2>
                    <p className="text-[11px] text-elegant-text-muted mt-0.5 font-mono">
                      Inquilino: {editingMembershipsTenantId}
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingMembershipsTenantId(null)}
                    className="text-neutral-500 hover:text-white text-xs font-bold cursor-pointer hover:underline"
                  >
                    Cerrar
                  </button>
                </div>

                {isEditingPlanMode ? (
                  /* Formulario de un Plan Individual */
                  <form onSubmit={handleSavePlanForm} className="space-y-3.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {editingPlanId ? "Editar Plan de Membresía" : "Nuevo Plan de Membresía"}
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        ID único del Plan:
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!!editingPlanId}
                        placeholder="ej: gold, vip, black"
                        value={planIdInput}
                        onChange={(e) => setPlanIdInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500 disabled:opacity-50 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Nombre del Plan:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej: Plan Diamante"
                        value={planNameInput}
                        onChange={(e) => setPlanNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                          Precio Mensual:
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={planPriceInput}
                          onChange={(e) => setPlanPriceInput(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                          % Descuento en Servicios:
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          value={planDiscountInput}
                          onChange={(e) => setPlanDiscountInput(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Descripción corta:
                      </label>
                      <input
                        type="text"
                        placeholder="ej: Ahorra un 20% y accede a mimos especiales"
                        value={planDescriptionInput}
                        onChange={(e) => setPlanDescriptionInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Beneficios (Uno por línea):
                      </label>
                      <textarea
                        rows={4}
                        placeholder="20% de descuento en todos los servicios&#10;Bebida premium gratis en cada visita&#10;Atención VIP sin tiempos de espera"
                        value={planBenefitsText}
                        onChange={(e) => setPlanBenefitsText(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-amber-500 font-sans leading-relaxed"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingPlanMode(false)}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-elegant-bg font-extrabold text-xs rounded-xl cursor-pointer"
                      >
                        Aplicar Plan
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Lista de Planes de la Barbería */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                        Planes Configurables ({tenantMemberships.length})
                      </span>
                      <button
                        type="button"
                        onClick={startCreatingNewPlan}
                        className="text-[9px] bg-amber-950/50 text-amber-400 hover:text-white border border-amber-800/40 px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Nuevo Plan
                      </button>
                    </div>

                    {tenantMemberships.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-elegant-border rounded-2xl text-neutral-500 text-[11px] space-y-1">
                        <Tag className="h-5 w-5 mx-auto opacity-30 text-amber-500" />
                        <p className="font-bold">No hay membresías creadas</p>
                        <p className="text-[9px]">Crea un plan o se usarán los globales por defecto.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {tenantMemberships.map((m) => (
                          <div key={m.id} className="p-3 bg-elegant-sub border border-elegant-border rounded-2xl space-y-1 relative group">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                                  {m.name}
                                  <span className="text-[9px] text-amber-400 font-mono font-bold uppercase bg-amber-950/80 border border-amber-900/60 px-1 py-0.2 rounded">
                                    {m.id}
                                  </span>
                                </h4>
                                <p className="text-[10px] text-neutral-400 font-mono font-semibold">
                                  {formatPrice(m.monthlyPrice)} / mes • <span className="text-emerald-400">-{m.discountPercent}% desc.</span>
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEditingPlan(m)}
                                  className="p-1 text-neutral-400 hover:text-white cursor-pointer bg-neutral-800 rounded"
                                  title="Editar"
                                >
                                  <Code className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(m.id)}
                                  className="p-1 text-red-400 hover:text-red-300 cursor-pointer bg-red-950/20 border border-red-900/10 rounded"
                                  title="Eliminar"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {m.description && (
                              <p className="text-[10px] text-elegant-text-muted italic leading-relaxed pt-0.5">
                                "{m.description}"
                              </p>
                            )}
                            {m.benefits && m.benefits.length > 0 && (
                              <ul className="text-[9px] text-neutral-500 space-y-0.5 pl-2 list-disc pt-1">
                                {m.benefits.map((b: string, idx: number) => (
                                  <li key={idx} className="leading-snug">{b}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 pt-3 border-t border-elegant-border/60">
                      <button
                        type="button"
                        onClick={() => setEditingMembershipsTenantId(null)}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAllTenantMemberships}
                        disabled={savingMemberships}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>{savingMemberships ? "Guardando..." : "Confirmar Cambios"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : editingBrandingTenantId ? (
              /* Formulario Personalizar Estándares de Marca */
              <div className="lg:col-span-5 bg-elegant-card border border-elegant-gold/30 rounded-3xl p-5 md:p-6 space-y-4 shadow-md">
                <div className="border-b border-elegant-border pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-sm font-bold text-elegant-gold flex items-center gap-2">
                      <Palette className="h-4.5 w-4.5" />
                      Diseño y Estándares
                    </h2>
                    <p className="text-[11px] text-elegant-text-muted mt-0.5 font-mono">
                      Inquilino: {editingBrandingTenantId}
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingBrandingTenantId(null)}
                    className="text-neutral-500 hover:text-white text-xs font-bold cursor-pointer hover:underline"
                  >
                    Cerrar
                  </button>
                </div>

                <form onSubmit={handleSaveBranding} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Nombre de la Barbería:
                    </label>
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block flex justify-between items-center">
                      <span>Logo de la Barbería:</span>
                      <span className="text-[8px] text-neutral-500 font-mono italic">Marca Dual (sin quitar SyncBarber)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 💈, ✂️, o una URL de imagen"
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 font-mono text-[10px]"
                    />
                    
                    {/* File Upload Logic for Base64 Logo */}
                    <div className="mt-1.5 flex flex-col gap-2">
                      <div className="flex items-center gap-3 bg-elegant-sub/40 p-2 rounded-xl border border-elegant-border/50">
                        {brandLogo && (
                          <div className="h-10 w-10 rounded-lg bg-elegant-sub border border-elegant-border flex items-center justify-center text-lg overflow-hidden shrink-0">
                            {brandLogo.startsWith("http") || brandLogo.startsWith("data:image") ? (
                              <img src={brandLogo} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold">{brandLogo}</span>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] bg-elegant-gold/15 hover:bg-elegant-gold/25 border border-elegant-gold/40 hover:border-elegant-gold/60 text-elegant-gold px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all inline-block">
                            Subir imagen de Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setBrandLogo(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <span className="block text-[8px] text-neutral-500 mt-1">Soporta PNG, JPG, SVG</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] text-neutral-500">Ejemplos rápidos:</span>
                      <button 
                        type="button"
                        onClick={() => setBrandLogo("💈")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-1.5 py-0.5 rounded border border-elegant-border/40"
                      >
                        💈 Barbero
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBrandLogo("✂️")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-1.5 py-0.5 rounded border border-elegant-border/40"
                      >
                        ✂️ Tijera
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBrandLogo("👑")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-1.5 py-0.5 rounded border border-elegant-border/40"
                      >
                        👑 Corona
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Eslogan / Mensaje de Marca (Tagline):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: El mejor corte de la ciudad"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Color de Fondo (Negro de la Página):
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandBgColor}
                        onChange={(e) => setBrandBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden"
                      />
                      <input
                        type="text"
                        value={brandBgColor}
                        onChange={(e) => setBrandBgColor(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBrandBgColor("#0B0C10")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-2 py-0.5 rounded border border-elegant-border/40"
                      >
                        Fondo Original (#0B0C10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandBgColor("#0F172A")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-2 py-0.5 rounded border border-elegant-border/40"
                      >
                        Azul Slate (#0F172A)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandBgColor("#1F1105")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-2 py-0.5 rounded border border-elegant-border/40"
                      >
                        Marrón Café (#1F1105)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrandBgColor("#111827")}
                        className="text-[9px] bg-elegant-sub hover:bg-elegant-border text-white px-2 py-0.5 rounded border border-elegant-border/40"
                      >
                        Gris Carbón (#111827)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Color de Acento:
                      </label>
                      <select
                        value={brandAccent}
                        onChange={(e) => setBrandAccent(e.target.value)}
                        className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                      >
                        <option value="gold" className="bg-elegant-bg text-white">Dorado Elegante</option>
                        <option value="cyan" className="bg-elegant-bg text-cyan-400">Cian Tecnológico</option>
                        <option value="emerald" className="bg-elegant-bg text-emerald-400">Verde Esmeralda</option>
                        <option value="blue" className="bg-elegant-bg text-blue-400">Azul Zafiro</option>
                        <option value="violet" className="bg-elegant-bg text-violet-400">Morado Real</option>
                        <option value="rose" className="bg-elegant-bg text-rose-400">Rosa Carmesí</option>
                        <option value="amber" className="bg-elegant-bg text-amber-500">Ámbar Cálido</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Color de Texto Accent:
                      </label>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="color"
                          value={brandTextColor}
                          onChange={(e) => setBrandTextColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden"
                        />
                        <input
                          type="text"
                          value={brandTextColor}
                          onChange={(e) => setBrandTextColor(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1.5 bg-elegant-sub border border-elegant-border text-white text-[10px] rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Fondo Tarjeta:
                      </label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={brandCardColor}
                          onChange={(e) => setBrandCardColor(e.target.value)}
                          className="w-6 h-6 rounded border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                        />
                        <input
                          type="text"
                          value={brandCardColor}
                          onChange={(e) => setBrandCardColor(e.target.value)}
                          className="w-full px-1 py-1 bg-elegant-sub border border-elegant-border text-white text-[9px] rounded font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Fondo Subcard:
                      </label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={brandSubCardColor}
                          onChange={(e) => setBrandSubCardColor(e.target.value)}
                          className="w-6 h-6 rounded border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                        />
                        <input
                          type="text"
                          value={brandSubCardColor}
                          onChange={(e) => setBrandSubCardColor(e.target.value)}
                          className="w-full px-1 py-1 bg-elegant-sub border border-elegant-border text-white text-[9px] rounded font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Color Bordes:
                      </label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={brandBorderColor}
                          onChange={(e) => setBrandBorderColor(e.target.value)}
                          className="w-6 h-6 rounded border border-elegant-border bg-transparent p-0 cursor-pointer overflow-hidden shrink-0"
                        />
                        <input
                          type="text"
                          value={brandBorderColor}
                          onChange={(e) => setBrandBorderColor(e.target.value)}
                          className="w-full px-1 py-1 bg-elegant-sub border border-elegant-border text-white text-[9px] rounded font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBrandingTenantId(null)}
                      className="flex-1 py-2 bg-elegant-sub hover:bg-elegant-border border border-elegant-border text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingBranding}
                      className="flex-1 py-2 bg-elegant-gold hover:bg-elegant-gold-hover disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>{savingBranding ? "Guardando..." : "Guardar Estándares"}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Formulario Crear Administrador */
              <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
                <div className="border-b border-elegant-border pb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-elegant-gold" />
                    Crear Administrador de Barbería
                  </h2>
                  <p className="text-[11px] text-elegant-text-muted mt-0.5">
                    Registra un usuario administrador para gestionar una barbería específica de la plataforma.
                  </p>
                </div>

                <form onSubmit={handleCreateAdmin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Barbería / Inquilino Destino:
                    </label>
                    <select
                      value={newAdminSalon}
                      onChange={(e) => setNewAdminSalon(e.target.value)}
                      className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                    >
                      {tenantsList.map(t => (
                        <option key={t.id} value={t.id} className="bg-elegant-bg text-white">
                          {t.name} ({t.licenseType.toUpperCase()}) - [id: {t.id}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Nombre Completo:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Sofía Administradora"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Usuario:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: sofia_admin"
                        value={newAdminUser}
                        onChange={(e) => setNewAdminUser(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Contraseña:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contraseña"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="w-full py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{creatingAdmin ? "Creando..." : "Crear Administrador"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Listado de Inquilinos y cambio de licencia */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-elegant-gold" />
                  Gestionar Licencias de Barberías
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Cambia de inmediato la licencia activa de cualquier inquilino del ecosistema SaaS.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-elegant-border/80 text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                      <th className="py-2.5 px-2">Barbería</th>
                      <th className="py-2.5 px-2">Licencia Actual</th>
                      <th className="py-2.5 px-2">Cambiar Nivel de Licencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsList.map((t) => (
                      <tr key={t.id} className="border-b border-elegant-border/40 hover:bg-elegant-sub/10">
                        <td className="py-3 px-2 font-bold text-white">
                          <div className="flex items-center gap-2">
                            {t.config?.customLogoUrl && (
                              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-elegant-sub text-xs overflow-hidden shrink-0 border border-elegant-border">
                                {t.config.customLogoUrl.startsWith("http") || t.config.customLogoUrl.startsWith("data:image") ? (
                                  <img src={t.config.customLogoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span>{t.config.customLogoUrl}</span>
                                )}
                              </div>
                            )}
                            <div>
                              <span className="block">{t.name}</span>
                              <span className="block text-[8px] text-neutral-500 font-mono">id: {t.id}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <button
                              onClick={() => startEditingBranding(t)}
                              className="text-[9px] text-elegant-gold hover:text-amber-400 font-extrabold flex items-center gap-1 cursor-pointer bg-elegant-sub/60 px-1.5 py-0.5 rounded border border-elegant-border/60 transition-colors"
                            >
                              <Palette className="h-2.5 w-2.5" />
                              Personalizar Estándares
                            </button>
                             <button
                              onClick={() => openQRDesigner(t)}
                              className="text-[9px] text-emerald-400 hover:text-emerald-300 font-extrabold flex items-center gap-1 cursor-pointer bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 transition-colors"
                            >
                              <QrCode className="h-2.5 w-2.5" />
                              Generar Banner QR
                            </button>
                            <button
                              onClick={() => startEditingMemberships(t)}
                              className="text-[9px] text-amber-500 hover:text-amber-400 font-extrabold flex items-center gap-1 cursor-pointer bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40 transition-colors"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              Modificar Membresías
                            </button>
                            <button
                              onClick={() => {
                                const matchedLicense = licenses.find(l => l.tenantId === t.id);
                                openContractModal(t, matchedLicense);
                              }}
                              className="text-[9px] text-amber-300 hover:text-amber-200 font-extrabold flex items-center gap-1 cursor-pointer bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/60 transition-colors"
                              title="Ver y descargar Contrato de Licenciamiento SaaS en PDF/WhatsApp/Email"
                            >
                              <FileText className="h-2.5 w-2.5 text-amber-400" />
                              Contrato SaaS
                            </button>
                            <button
                              onClick={() => {
                                localStorage.setItem("active_tenant_id", t.id);
                                window.location.href = window.location.origin + window.location.pathname + "?salonId=" + t.id;
                              }}
                              className="text-[9px] text-cyan-400 hover:text-cyan-300 font-extrabold flex items-center gap-1 cursor-pointer bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/40 transition-colors font-sans"
                              title="Cambiar al entorno de esta barbería para reservaciones y administración"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              Ver / Probar
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            t.licenseType === "premium" 
                              ? "bg-amber-950/80 text-elegant-gold border-amber-800/60" 
                              : t.licenseType === "profesional" 
                                ? "bg-slate-800 text-slate-200 border-slate-700" 
                                : "bg-neutral-900 text-neutral-400 border-neutral-800"
                          }`}>
                            {t.licenseType}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1.5">
                            {(["basica", "profesional", "premium"] as const).map((level) => (
                              <button
                                key={level}
                                disabled={updatingLicense}
                                onClick={() => handleUpdateTenantLicense(t.id, level)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all border ${
                                  t.licenseType === level
                                    ? "bg-elegant-gold border-elegant-gold text-elegant-bg font-extrabold"
                                    : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700 hover:text-white"
                                }`}
                              >
                                {level === "basica" ? "Básica" : level === "profesional" ? "Pro" : "Premium"}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Listado de Administradores Registrados */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
            <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-elegant-gold" />
                  Administradores del Sistema SaaS
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Cuentas habilitadas con rol de Administrador. Pueden iniciar sesión y operar de forma aislada su barbería.
                </p>
              </div>
              <button 
                onClick={fetchAdmins}
                className="p-2 bg-elegant-sub border border-elegant-border hover:bg-elegant-card rounded-xl text-elegant-text-muted hover:text-white transition-all cursor-pointer flex items-center justify-center"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adminsList.map((adm) => {
                const salonName = tenantsList.find(t => t.id === adm.salonId)?.name || adm.salonId;
                return (
                  <div key={adm.id} className="p-4 bg-elegant-sub/40 border border-elegant-border rounded-2xl flex flex-col justify-between space-y-3">
                    <div>
                      <p className="font-bold text-white text-xs">{adm.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 font-mono">Usuario: <span className="text-neutral-300 font-bold">{adm.username}</span></p>
                      <p className="text-[10px] text-neutral-500 font-mono">Clave: <span className="text-neutral-400">{adm.password || "••••"}</span></p>
                    </div>
                    <div className="border-t border-elegant-border/40 pt-2 flex items-center justify-between">
                      <span className="text-[9px] text-elegant-text-muted uppercase font-bold">Barbería:</span>
                      <span className="text-[10px] bg-neutral-900 text-elegant-gold font-bold px-2 py-0.5 rounded-lg border border-neutral-800">
                        {salonName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA: FEATURE FLAGS Y MANTENIMIENTO */}
      {activeTab === "featureflags" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-elegant-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-amber-400" />
                  Gestor Dinámico de Feature Flags & Mantenimiento
                </h2>
                <p className="text-xs text-elegant-text-muted mt-0.5">
                  Activa o inhabilita módulos en tiempo real por barbería sin desplegar código ni reiniciar el servidor.
                </p>
              </div>

              {/* Selector de Inquilino Target */}
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-2 rounded-2xl shrink-0">
                <Building2 className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-neutral-300">Barbería Target:</span>
                <select
                  value={selectedFlagTenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setSelectedFlagTenantId(tid);
                    const found = tenantsList.find(t => t.id === tid);
                    if (found && found.config) {
                      if (found.config.featureFlags) {
                        setTenantFlags({
                          enableOnlineBooking: found.config.featureFlags.enableOnlineBooking ?? true,
                          enableInventory: found.config.featureFlags.enableInventory ?? true,
                          enableMemberships: found.config.featureFlags.enableMemberships ?? true,
                          enableOnlinePayments: found.config.featureFlags.enableOnlinePayments ?? true,
                          enableCashClosure: found.config.featureFlags.enableCashClosure ?? true,
                          enableAiChat: found.config.featureFlags.enableAiChat ?? true,
                          enableReviews: found.config.featureFlags.enableReviews ?? true
                        });
                      }
                      setMaintMode(Boolean(found.config.maintenanceMode));
                      setMaintMsg(found.config.maintenanceMessage || "Estamos realizando mantenimiento preventivo y mejoras en la plataforma. Volvemos pronto.");
                      setMaintAllowAdmins(found.config.maintenanceAllowAdmins !== false);
                    }
                  }}
                  className="bg-neutral-900 border border-neutral-700 text-white font-bold text-xs px-2.5 py-1 rounded-xl outline-none"
                >
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Switches de Módulos (Izquierda) */}
              <div className="lg:col-span-7 bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Módulos Operativos Activos en Vivo
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "enableOnlineBooking", label: "Agendamiento & Reservas Online", desc: "Permite a los clientes reservar citas desde la web pública." },
                    { key: "enableInventory", label: "Control de Inventario & Nevera", desc: "Módulo de ventas de bebidas, productos y comisiones." },
                    { key: "enableMemberships", label: "Planes de Membresía VIP", desc: "Venta de planes de suscripción mensual con descuento." },
                    { key: "enableOnlinePayments", label: "Pasarela de Pagos (Nequi/PSE)", desc: "Habilita recargos y pago directo en línea." },
                    { key: "enableCashClosure", label: "Cierre de Caja & Arqueos", desc: "Módulo de balance financiero diario para administradores." },
                    { key: "enableAiChat", label: "Asistente Virtual IA de Cortes", desc: "Recomendaciones inteligentes de corte y perfilado por fotos." },
                    { key: "enableReviews", label: "Calificación & Reseñas de Clientes", desc: "Estrellas y valoraciones visibles de barberos." }
                  ].map((flag) => {
                    const isChecked = Boolean((tenantFlags as any)[flag.key]);
                    return (
                      <div key={flag.key} className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-white block">{flag.label}</span>
                          <span className="text-[10px] text-neutral-400 block">{flag.desc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTenantFlags(prev => ({ ...prev, [flag.key]: !isChecked }))}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
                            isChecked ? "bg-emerald-500 border-emerald-400" : "bg-neutral-800 border-neutral-700"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isChecked ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mantenimiento Global / Lockdown (Derecha) */}
              <div className="lg:col-span-5 bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-neutral-800 pb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      Modo Bloqueo por Mantenimiento
                    </h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      maintMode ? "bg-rose-950 text-rose-400 border-rose-800 animate-pulse" : "bg-emerald-950 text-emerald-400 border-emerald-800"
                    }`}>
                      {maintMode ? "EN MANTENIMIENTO" : "PLATAFORMA LIBRE"}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Al activar el modo mantenimiento, se desplegará una pantalla de bloqueo preventivo en la web del cliente de esta barbería.
                  </p>

                  <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Activar Mantenimiento:</span>
                      <button
                        type="button"
                        onClick={() => setMaintMode(!maintMode)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
                          maintMode ? "bg-rose-500 border-rose-400" : "bg-neutral-800 border-neutral-700"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${maintMode ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-300 block">Mensaje Emergencia para Clientes:</label>
                      <textarea
                        rows={3}
                        value={maintMsg}
                        onChange={(e) => setMaintMsg(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-neutral-300 font-bold">Permitir Acceso a Administradores:</span>
                      <input
                        type="checkbox"
                        checked={maintAllowAdmins}
                        onChange={(e) => setMaintAllowAdmins(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveFlags}
                  disabled={savingFlags}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Check className="h-4 w-4" />
                  <span>{savingFlags ? "Aplicando..." : "Guardar Feature Flags en Vivo"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: COBROS Y SUSPENSIÓN POR MORA */}
      {activeTab === "billing" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-elegant-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  Motor de Facturación, Cobros & Suspensión por Mora
                </h2>
                <p className="text-xs text-elegant-text-muted mt-0.5">
                  Configura alertas de vencimiento de suscripción SaaS, banderas de periodo de gracia o suspende barberías por impago sin modificar código.
                </p>
              </div>

              {/* Selector de Inquilino Target */}
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-2 rounded-2xl shrink-0">
                <Building2 className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-bold text-neutral-300">Barbería Target:</span>
                <select
                  value={selectedBillingTenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setSelectedBillingTenantId(tid);
                    const found = tenantsList.find(t => t.id === tid);
                    if (found && found.config) {
                      setBillingStatusInput(found.config.billingStatus || "active");
                      setBillingDueDateInput(found.config.billingDueDate || "2026-08-30");
                      setBillingAmountDueInput(found.config.billingAmountDue || 75000);
                      setBillingGraceDaysInput(found.config.billingGraceDays || 5);
                      setBillingCustomMsgInput(found.config.billingCustomMessage || "Estimado Administrador, tu suscripción al Plan Profesional vence pronto. Realiza tu pago para evitar la interrupción del servicio.");
                      setBillingPaymentLinkInput(found.config.billingPaymentLink || "https://nequi.com.co/pago-syncbarber");
                      setBillingAccountInfoInput(found.config.billingAccountInfo || "Nequi/Daviplata: 300 845 2109 | Bancolombia Ahorros: 901-845210-9");
                    }
                  }}
                  className="bg-neutral-900 border border-neutral-700 text-white font-bold text-xs px-2.5 py-1 rounded-xl outline-none"
                >
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controles de Estado de Cobro (Izquierda) */}
              <div className="lg:col-span-6 bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-neutral-800 pb-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Estado de Suscripción SaaS & Fechas de Cobro
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Estado de Pago de la Licencia *:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "active", label: "🟢 Al Día", desc: "Acceso total sin avisos" },
                        { id: "grace_period", label: "🟡 Periodo Gracia", desc: "Alerta de pago pendiente" },
                        { id: "overdue_locked", label: "🔴 Suspendido", desc: "Bloqueo total por mora" }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setBillingStatusInput(st.id as any)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            billingStatusInput === st.id
                              ? "bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500/40"
                              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <span className="text-xs font-extrabold block">{st.label}</span>
                          <span className="text-[9px] text-neutral-500 block mt-0.5">{st.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 block">Fecha Límite de Pago:</label>
                      <input
                        type="date"
                        value={billingDueDateInput}
                        onChange={(e) => setBillingDueDateInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white font-mono text-xs rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 block">Monto Cobro Mensual (COP):</label>
                      <input
                        type="number"
                        step="1000"
                        value={billingAmountDueInput}
                        onChange={(e) => setBillingAmountDueInput(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-emerald-400 font-mono font-bold text-xs rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 block">Días de Periodo de Gracia antes de Suspensión:</label>
                    <input
                      type="number"
                      value={billingGraceDaysInput}
                      onChange={(e) => setBillingGraceDaysInput(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white font-mono text-xs rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Links de Pago & Modal Personalizado (Derecha) */}
              <div className="lg:col-span-6 bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-neutral-800 pb-2">
                    <QrCode className="h-4 w-4 text-sky-400" />
                    Pasarelas de Pago Directo & Mensaje Personalizado
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 block">Link de Pago Electrónico (PSE / Nequi / Wompi):</label>
                    <input
                      type="url"
                      value={billingPaymentLinkInput}
                      onChange={(e) => setBillingPaymentLinkInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-sky-300 font-mono text-xs rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 block">Cuentas Bancarias / Nequi / Daviplata:</label>
                    <input
                      type="text"
                      value={billingAccountInfoInput}
                      onChange={(e) => setBillingAccountInfoInput(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 block">Mensaje de Recordatorio / Pantalla de Bloqueo:</label>
                    <textarea
                      rows={3}
                      value={billingCustomMsgInput}
                      onChange={(e) => setBillingCustomMsgInput(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveBilling}
                  disabled={savingBilling}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{savingBilling ? "Guardando..." : "Aplicar Estado de Facturación"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Panel de Métricas y Analíticas Globales (Business Intelligence) */}
      {activeTab === "bi" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tarjetas de Resumen de BI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-elegant-card border border-elegant-border rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-[10px] text-elegant-text-muted font-bold uppercase tracking-wider block">Ingreso Mensual Recurrente (MRR)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{biData ? formatPrice(biData.summary.mrr) : "$0"}</span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">SaaS MRR</span>
              </div>
              <p className="text-[9px] text-neutral-500 mt-2">Suma de las tarifas fijas de todas las licencias de salones activas en el mes.</p>
            </div>

            <div className="bg-elegant-card border border-elegant-border rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-[10px] text-elegant-text-muted font-bold uppercase tracking-wider block">Ingreso Medio por Cuenta (ARPU)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{biData ? formatPrice(biData.summary.arpu) : "$0"}</span>
                <span className="text-[10px] text-elegant-gold font-bold font-mono">ARPU</span>
              </div>
              <p className="text-[9px] text-neutral-500 mt-2">Valor promedio facturado por salón registrado en el sistema.</p>
            </div>

            <div className="bg-elegant-card border border-elegant-border rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-[10px] text-elegant-text-muted font-bold uppercase tracking-wider block">Licencias Activas</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{biData ? biData.summary.activeLicensesCount : "0"}</span>
                <span className="text-[10px] text-cyan-400 font-bold font-mono">En Producción</span>
              </div>
              <p className="text-[9px] text-neutral-500 mt-2">Salones que han completado el registro y tienen una clave válida.</p>
            </div>

            <div className="bg-elegant-card border border-elegant-border rounded-2xl p-5 flex flex-col justify-between">
              <span className="text-[10px] text-elegant-text-muted font-bold uppercase tracking-wider block">Estado del Ecosistema de Llaves</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{biData ? biData.summary.totalLicensesCount : "0"}</span>
                <span className="text-xs text-elegant-text-muted">Emitidas</span>
              </div>
              <p className="text-[9px] text-neutral-500 mt-2">
                Llaves pendientes: <span className="text-white font-mono font-bold">{biData ? biData.summary.pendingLicensesCount : 0}</span> | Expiradas: <span className="text-white font-mono font-bold">{biData ? biData.summary.expiredLicensesCount : 0}</span>
              </p>
            </div>
          </div>

          {/* Gráficos Interactivos de BI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico de Ingresos por Licencias */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-elegant-gold" />
                    Proyección de Crecimiento de Ingresos SaaS (MRR)
                  </h3>
                  <p className="text-[11px] text-elegant-text-muted">Evolución mensual acumulada basada en licenciamiento.</p>
                </div>
              </div>

              {/* Contenedor del Gráfico de Barra SVG */}
              <div className="h-64 flex flex-col justify-end pt-4 font-mono text-[10px]">
                {biData && biData.growthTrend ? (
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex-1 flex items-end gap-6 md:gap-10 px-4 h-48 border-b border-elegant-border/30">
                      {biData.growthTrend.map((gt: any) => {
                        const maxVal = Math.max(...biData.growthTrend.map((x: any) => x.mrr), 240000);
                        const pct = ((gt.mrr || 0) / maxVal) * 100;
                        
                        return (
                          <div key={gt.period} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-2 bg-elegant-bg border border-elegant-border text-white p-2.5 rounded-xl text-[9px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none min-w-[140px] text-center font-sans">
                              <p className="font-bold border-b border-elegant-border pb-1 mb-1 text-white">{gt.period}</p>
                              <p className="text-elegant-gold">MRR SaaS: {formatPrice(gt.mrr)}</p>
                              <p className="text-cyan-400">Salones Activos: {gt.activeSalons}</p>
                            </div>

                            {/* Bar */}
                            <div className="w-10 sm:w-16 flex flex-col justify-end h-full rounded-t-lg overflow-hidden border border-elegant-border/20">
                              <div 
                                className="bg-gradient-to-t from-cyan-600 to-cyan-400 hover:brightness-110 transition-all duration-300"
                                style={{ height: `${pct || 10}%` }}
                              />
                            </div>

                            <span className="block text-white text-[10px] mt-2 text-center max-w-[80px] truncate font-sans">{gt.period}</span>
                            <span className="block text-neutral-500 text-[9px] font-bold font-mono mt-0.5">{formatPrice(gt.mrr)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Leyenda */}
                    <div className="pt-3 flex justify-center gap-6 mt-2 font-sans">
                      <div className="flex items-center gap-1.5 text-[10px] text-elegant-text-muted">
                        <div className="w-3 h-3 rounded bg-cyan-400" />
                        <span>Suscripción Mensual SaaS Recurrente</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-elegant-text-muted">
                    No hay datos de analíticas disponibles.
                  </div>
                )}
              </div>
            </div>

            {/* Distribución de Niveles de Licencia */}
            <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-elegant-gold" />
                  Estructura de Planes Vendidos
                </h3>
                <p className="text-[11px] text-elegant-text-muted">Preferencia de planes de suscripción en el mercado.</p>
              </div>

              <div className="space-y-4 pt-2">
                {biData && biData.licenseCounts ? (
                  ([
                    { name: "Premium ($120k/mes)", count: biData.licenseCounts.premium, color: "from-amber-500 to-elegant-gold" },
                    { name: "Profesional ($60k/mes)", count: biData.licenseCounts.profesional, color: "from-cyan-500 to-cyan-300" },
                    { name: "Básica ($30k/mes)", count: biData.licenseCounts.basica, color: "from-slate-500 to-slate-300" }
                  ]).map((lvl: any) => {
                    const totalLics = (biData.licenseCounts.premium + biData.licenseCounts.profesional + biData.licenseCounts.basica) || 1;
                    const pct = (lvl.count / totalLics) * 100;
                    return (
                      <div key={lvl.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-neutral-200 truncate pr-4">{lvl.name}</span>
                          <span className="font-mono text-elegant-gold font-bold shrink-0">{lvl.count} {lvl.count === 1 ? 'salón' : 'salones'}</span>
                        </div>
                        <div className="w-full bg-elegant-sub rounded-full h-2 overflow-hidden border border-elegant-border/60">
                          <div 
                            className={`bg-gradient-to-r ${lvl.color} h-full rounded-full transition-all duration-1000`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-elegant-text-muted text-xs">
                    No hay licencias activas para calcular planes.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabla de Desempeño por Inquilino */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
            <div className="border-b border-elegant-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-elegant-gold" />
                Matriz de Licenciamiento y Estado de Inquilinos (SaaS BI)
              </h3>
              <p className="text-[11px] text-elegant-text-muted">Consolidado del estado de suscripciones y vigencia de claves de la plataforma.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-elegant-border/80 text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted">
                    <th className="py-3 px-3">Inquilino (Barbería)</th>
                    <th className="py-3 px-3">Plan de Suscripción</th>
                    <th className="py-3 px-3">Clave de Licencia Activa</th>
                    <th className="py-3 px-3 text-center">Fecha Activación</th>
                    <th className="py-3 px-3 text-center">Estado Plataforma</th>
                    <th className="py-3 px-3 text-right font-bold text-white">Tarifa Mensual</th>
                  </tr>
                </thead>
                <tbody>
                  {biData?.salonMetrics.map((sm: any) => (
                    <tr key={sm.id} className="border-b border-elegant-border/30 hover:bg-elegant-sub/10 transition-colors">
                      <td className="py-3.5 px-3">
                        <div>
                          <span className="font-extrabold text-white text-xs block">{sm.name}</span>
                          <span className="text-[9px] font-mono text-neutral-500 block">ID: {sm.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          sm.licenseType === "premium" 
                            ? "bg-amber-950/80 text-elegant-gold border-amber-800/60" 
                            : sm.licenseType === "profesional" 
                              ? "bg-slate-800 text-slate-200 border-slate-700" 
                              : "bg-neutral-900 text-neutral-400 border-neutral-800"
                        }`}>
                          {sm.licenseType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-neutral-300 text-xs">{sm.activeLicenseKey}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-neutral-400">{sm.activationDate}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                          {sm.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400">{formatPrice(sm.licenseSubscriptionRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Consola de Soporte Técnico y Tickets de Ayuda (Helpdesk) */}
      {activeTab === "helpdesk" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header de Helpdesk con botón de crear ticket */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-elegant-card border border-elegant-border rounded-3xl p-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LifeBuoy className="h-4.5 w-4.5 text-elegant-gold" />
                Mesa de Ayuda de Inquilinos & Soporte Técnico (Helpdesk)
              </h3>
              <p className="text-[11px] text-elegant-text-muted mt-0.5">
                Atiende de forma directa los problemas, incidencias y solicitudes de asistencia de los salones del ecosistema.
              </p>
            </div>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 bg-elegant-gold hover:bg-elegant-gold-hover text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Crear Ticket de Soporte</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lista de Tickets (Izquierda) */}
            <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Bandeja de Casos de Soporte</h4>
                <button
                  onClick={fetchTicketsList}
                  disabled={loadingTickets}
                  className="p-1.5 bg-elegant-sub border border-elegant-border hover:bg-elegant-card rounded-lg text-elegant-text-muted hover:text-white transition-colors cursor-pointer"
                  title="Refrescar Tickets"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingTickets ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {ticketsList.length > 0 ? (
                  ticketsList.map((tk) => {
                    const isSelected = selectedTicket && selectedTicket.id === tk.id;
                    const sevColor = 
                      tk.severity === "critica" ? "text-red-400 bg-red-950/80 border-red-900/60" :
                      tk.severity === "alta" ? "text-amber-400 bg-amber-950/80 border-amber-900/60" :
                      tk.severity === "media" ? "text-cyan-400 bg-cyan-950/80 border-cyan-900/40" :
                      "text-slate-300 bg-slate-900/80 border-slate-800";
                    
                    const statusColor = 
                      tk.status === "resuelto" ? "text-emerald-400 bg-emerald-950/60 border-emerald-900/40" :
                      tk.status === "en_progreso" ? "text-amber-400 bg-amber-950/60 border-amber-900/40" :
                      "text-red-400 bg-red-950/60 border-red-900/40";

                    return (
                      <div
                        key={tk.id}
                        onClick={() => setSelectedTicket(tk)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between space-y-3.5 ${
                          isSelected 
                            ? "bg-elegant-sub/50 border-elegant-gold shadow-md" 
                            : "bg-elegant-sub/20 border-elegant-border/80 hover:bg-elegant-sub/30"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-elegant-text-muted font-bold">CASE #{tk.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${sevColor}`}>
                              {tk.severity}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white line-clamp-1 leading-snug">{tk.title}</h5>
                          <p className="text-[10px] text-elegant-text-muted line-clamp-2 leading-relaxed">{tk.description}</p>
                        </div>

                        <div className="border-t border-elegant-border/40 pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400 font-extrabold truncate max-w-[120px]">{tk.salonName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${statusColor}`}>
                            {tk.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-elegant-text-muted text-xs">
                    No se han registrado tickets de soporte técnico.
                  </div>
                )}
              </div>
            </div>

            {/* Detalle de Ticket Seleccionado (Derecha) */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-5 md:p-6 space-y-4 min-h-[500px] flex flex-col justify-between font-sans">
              {selectedTicket ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Cabecera de Detalle */}
                  <div className="border-b border-elegant-border pb-4 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-elegant-gold">TICKET #{selectedTicket.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          selectedTicket.severity === "critica" ? "text-red-400 bg-red-950/80 border-red-900/60" :
                          selectedTicket.severity === "alta" ? "text-amber-400 bg-amber-950/80 border-amber-900/60" :
                          selectedTicket.severity === "media" ? "text-cyan-400 bg-cyan-950/80 border-cyan-900/40" :
                          "text-slate-300 bg-slate-900/80 border-slate-800"
                        }`}>
                          {selectedTicket.severity}
                        </span>
                      </div>
                      
                      {/* Acciones de Estado */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, "abierto")}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer border ${
                            selectedTicket.status === "abierto"
                              ? "bg-red-950 text-red-400 border-red-800"
                              : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700 hover:text-white"
                          }`}
                        >
                          Abierto
                        </button>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, "en_progreso")}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer border ${
                            selectedTicket.status === "en_progreso"
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700 hover:text-white"
                          }`}
                        >
                          En Progreso
                        </button>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, "resuelto")}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer border ${
                            selectedTicket.status === "resuelto"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700 hover:text-white"
                          }`}
                        >
                          Resuelto
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">{selectedTicket.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-400">
                        <span className="font-extrabold text-white">{selectedTicket.salonName}</span>
                        <span>•</span>
                        <span>Iniciado: {new Date(selectedTicket.createdAt).toLocaleDateString()} {new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-elegant-sub/30 border border-elegant-border/80 rounded-2xl text-xs leading-relaxed text-neutral-300">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {/* Historial de Mensajes / Conversación */}
                  <div className="flex-1 overflow-y-auto space-y-4 my-4 max-h-[180px] pr-1 scrollbar-thin">
                    <p className="text-center text-[9px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Inicio de Conversación</p>
                    
                    {selectedTicket.replies && selectedTicket.replies.map((rep: any) => {
                      const isSupport = rep.sender === "soporte";
                      return (
                        <div key={rep.id} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl p-3 text-xs space-y-1 ${
                            isSupport 
                              ? "bg-elegant-gold/10 border border-elegant-gold/20 text-white rounded-tr-none" 
                              : "bg-elegant-sub/60 border border-elegant-border text-neutral-200 rounded-tl-none"
                          }`}>
                            <div className="flex items-center justify-between gap-4">
                              <span className={`text-[8px] font-black uppercase tracking-wider ${isSupport ? "text-elegant-gold" : "text-cyan-400"}`}>
                                {isSupport ? "Soporte SyncBarber" : selectedTicket.salonName}
                              </span>
                              <span className="text-[8px] text-neutral-500 font-mono">
                                {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{rep.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Formulario de Respuesta */}
                  <form onSubmit={handleSendTicketReply} className="border-t border-elegant-border/60 pt-4 flex gap-2">
                    <input
                      type="text"
                      required
                      disabled={selectedTicket.status === "resuelto" || sendingReply}
                      placeholder={selectedTicket.status === "resuelto" ? "Este ticket está resuelto. Reabre el ticket para enviar respuestas." : "Escribe una respuesta técnica..."}
                      value={ticketReplyMessage}
                      onChange={(e) => setTicketReplyMessage(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={selectedTicket.status === "resuelto" || !ticketReplyMessage.trim() || sendingReply}
                      className="px-4 py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{sendingReply ? "Enviando..." : "Responder"}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-elegant-text-muted space-y-2">
                  <MessageSquare className="h-10 w-10 text-elegant-border" />
                  <div>
                    <p className="text-sm font-bold text-white">Ningún Ticket Seleccionado</p>
                    <p className="text-xs text-elegant-text-muted max-w-[280px] mt-1">
                      Selecciona un caso de la bandeja de entrada de la izquierda para ver su historial y responder.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: ANUNCIOS & BROADCAST GLOBAL */}
      {(activeTab as string) === "announcements" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario de Emisión de Anuncio */}
            <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Megaphone className="h-4.5 w-4.5 text-amber-400" />
                    Emitir Anuncio Global (Broadcast)
                  </h2>
                  <p className="text-[11px] text-elegant-text-muted mt-0.5">
                    Envía un banner o notificación flotante a todas las barberías en vivo.
                  </p>
                </div>
                <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  Live Broadcast
                </span>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Título del Anuncio *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mantenimiento Programado HOY a las 11:00 PM"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Categoría / Tipo:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "info", label: "ℹ️ Info", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
                      { id: "success", label: "✅ Novedad", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
                      { id: "warning", label: "⚠️ Aviso", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                      { id: "alert", label: "🚨 Urgente", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAnnType(t.id as any)}
                        className={`py-1.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          annType === t.id ? t.color + " font-black shadow-xs" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Periodo de Caducidad / Expiración:
                  </label>
                  <select
                    value={annExpiryOption}
                    onChange={(e) => setAnnExpiryOption(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="none">♾️ Sin Caducidad (Permanente hasta inactivar)</option>
                    <option value="1d">⏱️ 1 Día (24 Horas)</option>
                    <option value="3d">⏱️ 3 Días</option>
                    <option value="7d">⏱️ 1 Semana (7 Días)</option>
                    <option value="30d">⏱️ 1 Mes (30 Días)</option>
                    <option value="custom">📅 Fecha / Hora Personalizada...</option>
                  </select>
                </div>

                {annExpiryOption === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Fecha y Hora de Expiración *:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={annCustomExpiry}
                      onChange={(e) => setAnnCustomExpiry(e.target.value)}
                      className="w-full px-3.5 py-2 bg-neutral-900 border border-amber-500/50 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Mensaje Detallado *:
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe el mensaje o cambio de plataforma..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={publishingAnn}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <Send className="h-4 w-4" />
                  <span>{publishingAnn ? "Publicando..." : "Transmitir Anuncio Global"}</span>
                </button>
              </form>
            </div>

            {/* Lista de Anuncios Activos */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="h-4.5 w-4.5 text-sky-400 animate-pulse" />
                  Anuncios Globales Transmitidos ({announcements.length})
                </h2>
                <button
                  onClick={fetchAnnouncements}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1 font-mono"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refrescar</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                    No hay anuncios transmitidos actualmente.
                  </div>
                ) : (
                  announcements.map((ann) => {
                    const isExpired = ann.expiresAt && new Date(ann.expiresAt).getTime() <= Date.now();
                    const isActive = ann.active !== false && !isExpired;

                    return (
                      <div
                        key={ann.id}
                        className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 border shadow-inner transition-all ${
                          !isActive
                            ? "bg-neutral-950/50 border-neutral-800/80 opacity-75"
                            : "bg-neutral-950/90 border-neutral-800"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                ann.type === "alert"
                                  ? "bg-rose-950 text-rose-400 border-rose-800"
                                  : ann.type === "warning"
                                  ? "bg-amber-950 text-amber-400 border-amber-800"
                                  : ann.type === "success"
                                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                  : "bg-sky-950 text-sky-400 border-sky-800"
                              }`}
                            >
                              {ann.type}
                            </span>

                            {ann.active === false ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700">
                                🚫 Inactivo
                              </span>
                            ) : isExpired ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
                                ⏳ Expirado
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                                🟢 En Vivo
                              </span>
                            )}

                            <span className="text-[10px] text-neutral-500 font-mono">
                              {new Date(ann.createdAt).toLocaleString("es-ES", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                          <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">{ann.message}</p>

                          <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 pt-0.5">
                            <span>⏳ Expiración:</span>
                            {ann.expiresAt ? (
                              <span className={isExpired ? "text-amber-400 font-bold" : "text-sky-300"}>
                                {new Date(ann.expiresAt).toLocaleString("es-ES", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {isExpired && " (EXPIRADO)"}
                              </span>
                            ) : (
                              <span className="text-neutral-500">Sin expiración (Permanente)</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleToggleAnnouncementActive(ann.id, ann.active)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                              ann.active !== false
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }`}
                            title={ann.active !== false ? "Inactivar Anuncio" : "Activar Anuncio"}
                          >
                            <span>{ann.active !== false ? "⏸️ Inactivar" : "▶️ Activar"}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                            title="Eliminar Anuncio Definitivamente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: TARIFAS & PLANES SAAS */}
      {(activeTab as string) === "pricing" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-elegant-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Configurador Global de Tarifas & Planes SaaS
                </h2>
                <p className="text-xs text-elegant-text-muted mt-0.5">
                  Ajusta los precios mensuales por suscripción (MRR) de cada nivel y gestiona las características disponibles.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold">
                Cálculo MRR En Vivo
              </span>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Plan Básica */}
                <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400">🥉 Plan Básica</span>
                      <span className="text-[9px] bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 rounded-full">Bronce</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Precio Mensual (COP) *:
                      </label>
                      <input
                        type="number"
                        step="1000"
                        required
                        value={basicaPrice}
                        onChange={(e) => setBasicaPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-emerald-400 font-mono font-bold text-sm rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 text-[11px] text-neutral-300 space-y-1">
                      <p className="flex items-center gap-1.5 text-neutral-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Hasta 2 barberos</p>
                      <p className="flex items-center gap-1.5 text-neutral-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Agenda en Vivo</p>
                      <p className="flex items-center gap-1.5 text-neutral-500 line-through">Bot de WhatsApp Alertas</p>
                      <p className="flex items-center gap-1.5 text-neutral-500 line-through">Reporte Financiero Completo</p>
                    </div>
                  </div>
                </div>

                {/* Plan Profesional */}
                <div className="bg-neutral-950/80 border border-amber-500/30 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-lg shadow-amber-500/5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-400">🥈 Plan Profesional</span>
                      <span className="text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono px-2 py-0.5 rounded-full">Pro</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Precio Mensual (COP) *:
                      </label>
                      <input
                        type="number"
                        step="1000"
                        required
                        value={proPrice}
                        onChange={(e) => setProPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-emerald-400 font-mono font-bold text-sm rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 text-[11px] text-neutral-300 space-y-1">
                      <p className="flex items-center gap-1.5 text-sky-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Hasta 5 barberos</p>
                      <p className="flex items-center gap-1.5 text-sky-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Agenda en Vivo Multi-pantalla</p>
                      <p className="flex items-center gap-1.5 text-sky-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Bot de WhatsApp Alertas</p>
                      <p className="flex items-center gap-1.5 text-neutral-500 line-through">Reporte Financiero Completo</p>
                    </div>
                  </div>
                </div>

                {/* Plan Premium Enterprise */}
                <div className="bg-gradient-to-b from-amber-950/30 to-neutral-950/90 border border-amber-500/50 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-amber-500/30 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">🥇 Plan Premium Enterprise</span>
                      <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Enterprise</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Precio Mensual (COP) *:
                      </label>
                      <input
                        type="number"
                        step="1000"
                        required
                        value={premPrice}
                        onChange={(e) => setPremPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-emerald-400 font-mono font-bold text-sm rounded-xl focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 text-[11px] text-neutral-300 space-y-1">
                      <p className="flex items-center gap-1.5 text-amber-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Barberos Ilimitados</p>
                      <p className="flex items-center gap-1.5 text-amber-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Control Financiero & Caja Chica</p>
                      <p className="flex items-center gap-1.5 text-amber-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Bot de WhatsApp Ilimitado</p>
                      <p className="flex items-center gap-1.5 text-amber-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Banner QR Personalizado</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2 border-t border-elegant-border">
                <button
                  type="submit"
                  disabled={savingPricing}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer flex items-center gap-2 uppercase tracking-wider"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>{savingPricing ? "Guardando..." : "Guardar Tarifas SaaS"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑA: DIAGNÓSTICO & SALUD DEL SERVIDOR */}
      {(activeTab as string) === "health" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="border-b border-elegant-border pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-sky-400" />
                  Consola de Diagnóstico & Telemetría del Servidor
                </h2>
                <p className="text-xs text-elegant-text-muted mt-0.5">
                  Monitoreo en tiempo real del uso de memoria, tiempo de actividad (uptime) y conexiones activas.
                </p>
              </div>

              <button
                onClick={fetchHealth}
                disabled={fetchingHealth}
                className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingHealth ? "animate-spin" : ""}`} />
                <span>Ejecutar Test de Salud</span>
              </button>
            </div>

            {healthData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">Estado Servidor</span>
                  <p className="text-lg font-black text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    {healthData.status}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-mono block">Node.js Express Engine</span>
                </div>

                <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">Uptime / Tiempo Activo</span>
                  <p className="text-lg font-black text-sky-300 font-mono">
                    {healthData.uptime}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-mono block">Sin interrupciones</span>
                </div>

                <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">Uso de Memoria (Heap)</span>
                  <p className="text-lg font-black text-amber-300 font-mono">
                    {healthData.memory?.heapUsed} / {healthData.memory?.heapTotal}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-mono block">RSS: {healthData.memory?.rss}</span>
                </div>

                <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">Base de Datos Firestore</span>
                  <p className="text-xs font-bold text-purple-300 font-mono pt-1">
                    {healthData.firestoreSyncStatus}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-mono block">Conexión Cloud Nivel Enterprise</span>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500 font-mono text-xs">
                Cargando diagnóstico del servidor...
              </div>
            )}

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  Especificaciones de Infraestructura SaaS
                </h3>
                <button
                  onClick={handleClearSystemCache}
                  disabled={clearingCache}
                  className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-mono"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? "animate-spin" : ""}`} />
                  <span>{clearingCache ? "Limpiando..." : "Vaciar Caché Global RAM"}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-neutral-400">
                <div>• Inquilinos Activos: <strong className="text-white">{healthData?.tenantsCount || 1}</strong></div>
                <div>• Licencias Emitidas: <strong className="text-white">{healthData?.activeLicensesCount || 1}</strong></div>
                <div>• Clientes WebSockets: <strong className="text-white">{healthData?.webSocketsActiveClients || 1}</strong></div>
                <div>• Entorno: <strong className="text-emerald-400">{healthData?.environment || "production"}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: RESPALDO & BACKUP GLOBAL */}
      {(activeTab as string) === "backup" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Exportar Backup */}
            <div className="lg:col-span-5 bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-elegant-border pb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="h-4.5 w-4.5 text-purple-400" />
                    Exportar Copia de Seguridad JSON
                  </h2>
                  <p className="text-[11px] text-elegant-text-muted mt-0.5">
                    Descarga en un archivo cifrado todos los barberos, citas, licencias e inquilinos registrados.
                  </p>
                </div>

                <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-2 text-[11px] text-neutral-300">
                  <p className="font-bold text-amber-300">📦 Incluye en la copia:</p>
                  <ul className="space-y-1 font-mono text-[10px] text-neutral-400 list-disc pl-4">
                    <li>Lista de todas las barberías e IDs</li>
                    <li>Licencias emitidas y fechas de vencimiento</li>
                    <li>Catálogo de servicios, precios y equipos de barberos</li>
                    <li>Configuración de colores y plantillas</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleExportBackup}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Download className="h-4 w-4" />
                <span>Descargar Backup JSON Completo</span>
              </button>
            </div>

            {/* Importar Backup */}
            <div className="lg:col-span-7 bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4">
              <div className="border-b border-elegant-border pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileJson className="h-4.5 w-4.5 text-amber-400" />
                  Restaurar Base de Datos desde JSON
                </h2>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Pega el código JSON de un backup previo para restaurar el estado completo de la plataforma.
                </p>
              </div>

              <form onSubmit={handleImportBackup} className="space-y-4">
                <textarea
                  rows={8}
                  placeholder="Pega el contenido JSON de tu copia de seguridad aquí..."
                  value={backupJsonStr}
                  onChange={(e) => setBackupJsonStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 text-amber-300 font-mono text-[11px] rounded-xl focus:outline-none focus:border-amber-400"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={importingBackup || !backupJsonStr.trim()}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{importingBackup ? "Restaurando..." : "Restaurar Backup"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Purga Seleccionable de Datos & Restablecimiento de Fábrica */}
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-6 space-y-4">
              <div className="border-b border-rose-900/40 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="h-4.5 w-4.5 text-rose-400" />
                    Purga Seleccionable de Datos / Limpieza de Mantenimiento
                  </h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Permite vaciar colecciones específicas (Citas, Ventas de Inventario, Clientes) o realizar un reset completo a valores de fábrica por barbería.
                  </p>
                </div>
                <span className="text-[9px] bg-rose-900/40 text-rose-300 border border-rose-800/60 px-3 py-1 rounded-full font-mono font-bold uppercase">
                  Acción Irreversible
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Inquilino / Barbería Target:</label>
                  <select
                    value={selectedPurgeTenantId}
                    onChange={(e) => setSelectedPurgeTenantId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white font-bold text-xs px-3 py-2 rounded-xl outline-none"
                  >
                    {tenantsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Módulos a vaciar:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-1.5 text-white font-bold cursor-pointer">
                      <input type="checkbox" checked={purgeAppointmentsCheck} onChange={e => setPurgeAppointmentsCheck(e.target.checked)} className="accent-rose-500 rounded" />
                      <span>📅 Citas</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-white font-bold cursor-pointer">
                      <input type="checkbox" checked={purgeSalesCheck} onChange={e => setPurgeSalesCheck(e.target.checked)} className="accent-rose-500 rounded" />
                      <span>💰 Ventas</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-white font-bold cursor-pointer">
                      <input type="checkbox" checked={purgeClientsCheck} onChange={e => setPurgeClientsCheck(e.target.checked)} className="accent-rose-500 rounded" />
                      <span>👥 Clientes</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-rose-300 font-extrabold cursor-pointer">
                      <input type="checkbox" checked={factoryResetCheck} onChange={e => setFactoryResetCheck(e.target.checked)} className="accent-rose-500 rounded" />
                      <span>🔥 Reset Todo</span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-3 pt-4 md:pt-0">
                  <button
                    onClick={() => setShowPurgeModal(true)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Confirmar Purga</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PURGA DE DATOS & CONFIRMACIÓN DE SEGURIDAD */}
      {showPurgeModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md font-sans">
          <div className="bg-neutral-950 border border-rose-900/60 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp">
            <div className="border-b border-rose-900/40 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Confirmación de Purga Definitiva de Datos
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Inquilino afectado: <strong className="text-white font-mono">{selectedPurgeTenantId}</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowPurgeModal(false)}
                className="text-neutral-400 hover:text-white font-bold font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl space-y-2 text-xs text-rose-200">
              <p className="font-bold">⚠️ ADVERTENCIA DE SEGURIDAD SAAS:</p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Esta acción eliminará de forma permanente los registros seleccionados para la barbería <strong>{selectedPurgeTenantId}</strong>. Esta acción NO se puede deshacer.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-300 block">
                Escribe <span className="font-mono text-amber-300 font-extrabold">{selectedPurgeTenantId}</span> para confirmar:
              </label>
              <input
                type="text"
                placeholder={selectedPurgeTenantId}
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-rose-300 font-mono font-bold text-xs rounded-xl focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={executingPurge || purgeConfirmText !== selectedPurgeTenantId}
                onClick={handleExecutePurge}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>{executingPurge ? "Purgando..." : "Ejecutar Purga Definitiva"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: REGISTRO DE TICKET DE SOPORTE MANUAL */}
      {showNewTicketModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md font-sans">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 w-full max-w-lg shadow-xl space-y-4 animate-scaleUp">
            <div className="border-b border-elegant-border pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="h-4.5 w-4.5 text-elegant-gold" />
                  Abrir Nuevo Ticket de Soporte Técnico
                </h3>
                <p className="text-[11px] text-elegant-text-muted mt-0.5">
                  Registra de forma manual una incidencia técnica a nombre de un inquilino.
                </p>
              </div>
              <button 
                onClick={() => setShowNewTicketModal(false)}
                className="text-elegant-text-muted hover:text-white font-bold font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Salón / Inquilino Afectado:
                </label>
                <select
                  value={newTicketTenant}
                  onChange={(e) => setNewTicketTenant(e.target.value)}
                  className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold"
                >
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id} className="bg-elegant-bg text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Título de la Incidencia:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caída de pasarela de pagos, error de diseño"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Nivel de Severidad:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { val: "baja", label: "🟢 Baja" },
                    { val: "media", label: "🔵 Media" },
                    { val: "alta", label: "🟡 Alta" },
                    { val: "critica", label: "🔴 Crítica" }
                  ] as const).map((sev) => (
                    <button
                      key={sev.val}
                      type="button"
                      onClick={() => setNewTicketSeverity(sev.val)}
                      className={`py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                        newTicketSeverity === sev.val
                          ? "bg-elegant-gold border-elegant-gold text-elegant-bg"
                          : "bg-elegant-sub border-elegant-border text-elegant-text-muted hover:border-neutral-700"
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Descripción Detallada del Problema:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe detalladamente los síntomas del problema, pasos para reproducir o solicitudes técnicas del inquilino..."
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold placeholder-neutral-600 transition-all"
                />
              </div>

              <div className="pt-2 flex gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 py-2.5 bg-elegant-sub hover:bg-elegant-border border border-elegant-border text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="flex-1 py-2.5 bg-elegant-gold hover:bg-elegant-gold-hover disabled:opacity-50 text-elegant-bg font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{creatingTicket ? "Registrando..." : "Registrar Ticket"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: DISEÑADOR DE BANNER PROMOCIONAL CON QR */}
      {selectedQRGroup && createPortal(
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-6 backdrop-blur-md overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none print:z-[9999999]">
          
          {/* Inject dynamic print override CSS */}
          <style>{`
            @media print {
              /* Hide standard React application root completely */
              #root {
                display: none !important;
              }
              
              /* Hide background overlay and parent margins of the portal */
              body, html {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
              }

              /* Hide left column and text hints */
              .print\\:hidden, .print-hidden {
                display: none !important;
              }

              /* Container of columns needs to be unstyled on print */
              .print-container-override {
                background: white !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                height: 100% !important;
                display: block !important;
                box-shadow: none !important;
              }

              /* Inner column containing the preview banner */
              .print-preview-col-override {
                background: white !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }

              /* The printable banner card itself */
              #syncbarber-printable-banner {
                position: relative !important;
                width: 148mm !important; /* Standard size to fit A4 perfectly without clipping */
                height: 210mm !important; /* A5 aspect ratio */
                margin: auto !important;
                padding: 16mm !important;
                border-radius: 24px !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
              }

              /* Magnified styling specifically when printing */
              #syncbarber-printable-banner h4 {
                font-size: 26px !important;
              }
              #syncbarber-printable-banner h2 {
                font-size: 36px !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
              }
              #syncbarber-printable-banner .banner-tagline {
                font-size: 15px !important;
              }
              #syncbarber-printable-banner .banner-welcome {
                font-size: 14px !important;
              }
              #syncbarber-printable-banner .banner-special-badge {
                padding: 14px !important;
                border-radius: 16px !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
              }
              #syncbarber-printable-banner .banner-special-title {
                font-size: 11px !important;
              }
              #syncbarber-printable-banner .banner-special-name {
                font-size: 22px !important;
              }
              #syncbarber-printable-banner .banner-special-desc {
                font-size: 12px !important;
              }
              #syncbarber-printable-banner .qr-container {
                padding: 24px !important;
                border-width: 3px !important;
                border-radius: 20px !important;
              }
              #syncbarber-printable-banner .qr-img {
                width: 190px !important;
                height: 190px !important;
              }
              #syncbarber-printable-banner .qr-subtext {
                font-size: 10px !important;
                margin-top: 10px !important;
              }
              #syncbarber-printable-banner .cta-badge {
                font-size: 16px !important;
                padding: 8px 24px !important;
                border-radius: 9999px !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
              }
              #syncbarber-printable-banner .steps-box {
                padding: 18px !important;
                border-radius: 20px !important;
                margin-top: 12px !important;
              }
              #syncbarber-printable-banner .steps-main-title {
                font-size: 13px !important;
                margin-bottom: 10px !important;
              }
              #syncbarber-printable-banner .step-number {
                width: 30px !important;
                height: 30px !important;
                font-size: 14px !important;
                margin-bottom: 8px !important;
              }
              #syncbarber-printable-banner .step-title {
                font-size: 14px !important;
              }
              #syncbarber-printable-banner .step-desc {
                font-size: 10px !important;
                line-height: 1.3 !important;
                margin-top: 4px !important;
              }
              #syncbarber-printable-banner .banner-footer {
                font-size: 9px !important;
                padding-top: 12px !important;
                margin-top: 12px !important;
              }

              /* Force background graphics (borders, gradients) on print */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          <div className="max-w-5xl w-full bg-[#0E1524] border border-[#1F314D] rounded-[32px] p-6 md:p-8 flex flex-col md:grid md:grid-cols-12 gap-8 relative shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 print-container-override">
            
            {/* Left Column: Controles de Diseño */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-6 print:hidden">
              <div>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-elegant-border/80 pb-4 mb-5">
                  <div className="h-10 w-10 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 border border-emerald-800">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Banners Promocionales</h3>
                    <p className="text-[11px] text-elegant-text-muted">Generador de Material Impreso & Digital</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Select Target (Salon vs Barber) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Vincular Código QR A:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQrType("salon")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          qrType === "salon"
                            ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                            : "bg-elegant-sub/50 border-elegant-border text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        Toda la Barbería
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQrType("barber");
                          const bList = selectedQRGroup.barbers || [];
                          if (bList.length > 0 && !selectedBarberId) {
                            setSelectedBarberId(bList[0].id);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          qrType === "barber"
                            ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                            : "bg-elegant-sub/50 border-elegant-border text-elegant-text-muted hover:text-white"
                        }`}
                      >
                        Un Barbero Específico
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Barbero (si se elige barbero) */}
                  {qrType === "barber" && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                        Selecciona el Barbero:
                      </label>
                      <select
                        value={selectedBarberId}
                        onChange={(e) => setSelectedBarberId(e.target.value)}
                        className="w-full px-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-emerald-500"
                      >
                        {(selectedQRGroup.barbers || []).map((b: any) => (
                          <option key={b.id} value={b.id} className="bg-elegant-bg text-white">
                            {b.name} ({b.specialties?.join(", ") || "Corte"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Input Texto Título */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Título del Banner (Llamado a la Acción):
                    </label>
                    <input
                      type="text"
                      value={qrCustomTitle}
                      onChange={(e) => setQrCustomTitle(e.target.value.toUpperCase())}
                      placeholder="Ej: ¡ESCANEA Y AGENDA TU CITA!"
                      maxLength={40}
                      className="w-full px-3.5 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Toggle Tagline */}
                  <div className="flex items-center justify-between bg-elegant-sub/30 p-3 rounded-xl border border-elegant-border/60">
                    <div>
                      <p className="text-xs font-bold text-white">Mostrar Eslogan del Salón</p>
                      <p className="text-[10px] text-elegant-text-muted">Añade el eslogan oficial de la barbería en el letrero</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrTagline(!showQrTagline)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        showQrTagline ? "bg-emerald-500" : "bg-neutral-800"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          showQrTagline ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Paleta de Temas */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                      Tema de Color & Estilo:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "gold", name: "Oro Imperial", bg: "bg-amber-500", border: "border-amber-500" },
                        { id: "cyan", name: "Cian Neón", bg: "bg-cyan-500", border: "border-cyan-500" },
                        { id: "emerald", name: "Esmeralda", bg: "bg-emerald-500", border: "border-emerald-500" },
                        { id: "violet", name: "Violeta Real", bg: "bg-violet-500", border: "border-violet-500" },
                        { id: "amber", name: "Ámbar Cálido", bg: "bg-orange-500", border: "border-orange-500" },
                        { id: "rose", name: "Rosa Vibrante", bg: "bg-rose-500", border: "border-rose-500" },
                        { id: "classic-pole", name: "Barber Pole", bg: "bg-gradient-to-r from-red-500 via-blue-500 to-red-500", border: "border-red-500" },
                        { id: "dark", name: "Matriz Oscura", bg: "bg-zinc-800", border: "border-zinc-700" },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setQrAccentTheme(theme.id)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer text-[8px] font-bold text-center ${
                            qrAccentTheme === theme.id
                              ? "border-white bg-elegant-sub text-white"
                              : "border-elegant-border bg-elegant-sub/20 text-elegant-text-muted hover:text-white"
                          }`}
                          title={theme.name}
                        >
                          <div className={`h-4.5 w-4.5 rounded-full ${theme.bg} mb-1`} />
                          <span className="truncate w-full block text-[8px]">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Print and Download Actions */}
              <div className="space-y-3 pt-4 border-t border-elegant-border/80">
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl text-[10px] text-emerald-400 leading-relaxed">
                  💡 <strong>Consejo de Impresión:</strong> Haz clic en <strong>Imprimir Banner</strong>. El letrero está optimizado para imprimirse solo, a pantalla completa, listo para colocar en un acrílico de mesa o espejo.
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQRGroup(null)}
                    className="flex-1 py-2.5 bg-elegant-sub hover:bg-elegant-border border border-elegant-border text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cerrar Diseñador
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#000000] font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Imprimir Banner</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Previsualización del Letrero (Renderizado) */}
            <div className="md:col-span-7 bg-[#080B11] border border-elegant-border/60 rounded-[24px] p-6 flex flex-col items-center justify-center overflow-hidden print-preview-col-override">
              <div className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted mb-3 flex items-center gap-1 print:hidden">
                <span>VISTA PREVIA DEL LETRERO IMPRESO</span>
              </div>
              
              {/* Outer printable flyer container */}
              {(() => {
                const getThemeStyles = () => {
                  switch (qrAccentTheme) {
                    case "dark":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#18181b] to-[#09090b]",
                        cardTextClass: "text-white",
                        titleColor: "#ffffff",
                        subColor: "#a1a1aa",
                        badgeBg: "bg-zinc-800 text-zinc-200 border border-zinc-700",
                        stepsBg: "bg-zinc-900 border border-zinc-800",
                        stepsTitleColor: "#ffffff",
                        stepsTextColor: "#a1a1aa",
                        stepsNumBg: "bg-zinc-700 text-white",
                        borderHex: "#27272a",
                        accentColor: "#a1a1aa",
                        taglineClass: "text-zinc-400"
                      };
                    case "cyan":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#020617] via-[#0B132B] to-[#01040F]",
                        cardTextClass: "text-white",
                        titleColor: "#06b6d4",
                        subColor: "#22d3ee",
                        badgeBg: "bg-cyan-950/50 text-cyan-400 border border-cyan-800/50",
                        stepsBg: "bg-[#0B132B]/90 border border-cyan-950",
                        stepsTitleColor: "#ffffff",
                        stepsTextColor: "#94a3b8",
                        stepsNumBg: "bg-cyan-500 text-black",
                        borderHex: "#06b6d4",
                        accentColor: "#06b6d4",
                        taglineClass: "text-slate-400"
                      };
                    case "emerald":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#F2FDF9] to-[#E6F4EA]",
                        cardTextClass: "text-[#0F3725]",
                        titleColor: "#0F5A3E",
                        subColor: "#10b981",
                        badgeBg: "bg-[#E6F4EA] text-[#0F5A3E] border border-[#C2E7CE]",
                        stepsBg: "bg-[#E6F4EA]/70 border border-[#C2E7CE]/60",
                        stepsTitleColor: "#0F3725",
                        stepsTextColor: "#344e41",
                        stepsNumBg: "bg-[#0F5A3E] text-white",
                        borderHex: "#10b981",
                        accentColor: "#10b981",
                        taglineClass: "text-[#344e41]"
                      };
                    case "violet":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#FAF5FF] to-[#F3E8FF]",
                        cardTextClass: "text-[#3B0764]",
                        titleColor: "#6B21A8",
                        subColor: "#8b5cf6",
                        badgeBg: "bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]",
                        stepsBg: "bg-[#F3E8FF]/70 border border-[#E9D5FF]/60",
                        stepsTitleColor: "#3B0764",
                        stepsTextColor: "#581c87",
                        stepsNumBg: "bg-[#6B21A8] text-white",
                        borderHex: "#8b5cf6",
                        accentColor: "#8b5cf6",
                        taglineClass: "text-[#581c87]"
                      };
                    case "amber":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7]",
                        cardTextClass: "text-[#78350F]",
                        titleColor: "#D97706",
                        subColor: "#f59e0b",
                        badgeBg: "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]",
                        stepsBg: "bg-[#FEF3C7]/70 border border-[#FDE68A]/60",
                        stepsTitleColor: "#78350F",
                        stepsTextColor: "#92400e",
                        stepsNumBg: "bg-[#D97706] text-white",
                        borderHex: "#f59e0b",
                        accentColor: "#f59e0b",
                        taglineClass: "text-[#92400e]"
                      };
                    case "rose":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#FFF1F2] to-[#FFE4E6]",
                        cardTextClass: "text-[#881337]",
                        titleColor: "#E11D48",
                        subColor: "#f43f5e",
                        badgeBg: "bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]",
                        stepsBg: "bg-[#FFE4E6]/70 border border-[#FECDD3]/60",
                        stepsTitleColor: "#881337",
                        stepsTextColor: "#9f1239",
                        stepsNumBg: "bg-[#E11D48] text-white",
                        borderHex: "#f43f5e",
                        accentColor: "#f43f5e",
                        taglineClass: "text-[#9f1239]"
                      };
                    case "classic-pole":
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#FAF8F5] via-[#FFFDFB] to-[#F5F2EB]",
                        cardTextClass: "text-[#0F172A]",
                        titleColor: "#DC2626",
                        subColor: "#2563EB",
                        badgeBg: "bg-blue-50 text-blue-700 border border-blue-200",
                        stepsBg: "bg-white border border-neutral-250 shadow-xs",
                        stepsTitleColor: "#0F172A",
                        stepsTextColor: "#475569",
                        stepsNumBg: "bg-gradient-to-r from-red-500 to-blue-500 text-white",
                        borderHex: "#3b82f6",
                        accentColor: "#ef4444",
                        taglineClass: "text-slate-500"
                      };
                    case "gold":
                    default:
                      return {
                        cardBgClass: "bg-gradient-to-b from-[#FAF8F5] via-[#FFFDFB] to-[#F5F2EB]",
                        cardTextClass: "text-[#1C1917]",
                        titleColor: "#A37B3F",
                        subColor: "#C5A267",
                        badgeBg: "bg-[#FAF7F2] text-[#A37B3F] border border-[#EBE3D3]",
                        stepsBg: "bg-[#FAF7F2]/90 border border-[#EBE3D3]/60 shadow-sm",
                        stepsTitleColor: "#1C1917",
                        stepsTextColor: "#57534E",
                        stepsNumBg: "bg-[#C5A267] text-white",
                        borderHex: "#C5A267",
                        accentColor: "#C5A267",
                        taglineClass: "text-stone-500"
                      };
                  }
                };

                const theme = getThemeStyles();
                const accentHex = theme.borderHex;

                const getTargetUrl = () => {
                  if (!selectedQRGroup) return "";
                  const base = window.location.origin;
                  if (qrType === "salon") {
                    return `${base}/?salonId=${selectedQRGroup.id}`;
                  } else {
                    return `${base}/?salonId=${selectedQRGroup.id}&barber=${selectedBarberId}`;
                  }
                };

                const targetUrl = getTargetUrl();
                const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0b0c10&data=${encodeURIComponent(targetUrl)}`;

                const selectedBarber = qrType === "barber"
                  ? (selectedQRGroup.barbers || []).find((b: any) => b.id === selectedBarberId)
                  : null;

                return (
                  <div
                    id="syncbarber-printable-banner"
                    className={`w-[280px] sm:w-[320px] aspect-[1/1.414] ${theme.cardBgClass} ${theme.cardTextClass} p-5 sm:p-6 rounded-2xl border-4 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all duration-300`}
                    style={{ borderColor: accentHex }}
                  >
                    {/* Retro striped details if barber pole */}
                    {qrAccentTheme === "classic-pole" && (
                      <>
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-repeat-y bg-[linear-gradient(45deg,#ef4444_25%,#ffffff_25%,#ffffff_50%,#3b82f6_50%,#3b82f6_75%,#ffffff_75%)] bg-[size:10px_20px]" />
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-repeat-y bg-[linear-gradient(45deg,#ef4444_25%,#ffffff_25%,#ffffff_50%,#3b82f6_50%,#3b82f6_75%,#ffffff_75%)] bg-[size:10px_20px]" />
                      </>
                    )}

                    {/* Banner Card Double Thin Border */}
                    <div className="absolute inset-2 border border-dashed pointer-events-none rounded-lg opacity-35" style={{ borderColor: theme.accentColor }} />

                    {/* Logo/Header */}
                    <div className="text-center space-y-1 z-10">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[7px] font-mono font-bold tracking-widest opacity-65" style={{ color: theme.accentColor }}>★ ★ ★ ★ ★</span>
                      </div>
                      <h4 className="text-[14px] font-black tracking-widest font-sans leading-none">
                        SYNC<span style={{ color: theme.titleColor === "#ffffff" ? "#22d3ee" : theme.titleColor }}>BARBER</span>
                      </h4>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <div className="h-[1px] w-6 opacity-30" style={{ backgroundColor: theme.accentColor }} />
                        <span className="text-[6px] font-mono uppercase tracking-widest font-extrabold opacity-65">SOCIOS EXCLUSIVOS SaaS</span>
                        <div className="h-[1px] w-6 opacity-30" style={{ backgroundColor: theme.accentColor }} />
                      </div>
                    </div>

                    {/* Call to Action Title */}
                    <div className="text-center z-10 px-1">
                      <p className="text-[8px] font-mono font-bold tracking-wider uppercase opacity-65 banner-welcome">Bienvenido a</p>
                      <h2 className="text-[16px] sm:text-[18px] font-black tracking-tight uppercase leading-tight mt-0.5" style={{ color: theme.titleColor }}>
                        {selectedQRGroup.name}
                      </h2>
                      {showQrTagline && selectedQRGroup.config?.tagline && (
                        <p className="text-[8px] font-serif italic mt-1 banner-tagline opacity-80" style={{ color: theme.stepsTextColor }}>
                          "{selectedQRGroup.config.tagline}"
                        </p>
                      )}
                    </div>

                    {/* Special Barber Badge (if selected) */}
                    {qrType === "barber" && selectedBarber && (
                      <div className="rounded-xl p-2 text-center my-1 z-10 shadow-xs animate-in zoom-in-95 duration-150 banner-special-badge" style={{ backgroundColor: `${theme.accentColor}0e`, borderColor: `${theme.accentColor}30`, borderWidth: "1px" }}>
                        <p className="text-[7px] font-bold uppercase tracking-wider banner-special-title opacity-65">RESERVA DIRECTA CON:</p>
                        <p className="text-[11px] font-black flex items-center justify-center gap-1 mt-0.5 banner-special-name">
                          <Scissors className="h-3 w-3 shrink-0" style={{ color: theme.titleColor }} />
                          {selectedBarber.name}
                        </p>
                        <p className="text-[6.5px] font-mono mt-0.5 uppercase tracking-wide banner-special-desc opacity-75" style={{ color: theme.stepsTextColor }}>
                          Especialidades: {selectedBarber.specialties?.join(" & ") || "Corte General"}
                        </p>
                      </div>
                    )}

                    {/* QR Code Graphic Frame */}
                    <div className="flex flex-col items-center justify-center z-10">
                      <div className="p-3 bg-white rounded-xl border-2 border-dashed flex flex-col items-center justify-center shadow-md hover:scale-[1.01] transition-transform duration-200 qr-container" style={{ borderColor: theme.titleColor }}>
                        {/* High resolution QR */}
                        <img
                          src={qrImgSrc}
                          alt="Vínculo QR"
                          className="w-[110px] sm:w-[130px] aspect-square object-contain qr-img"
                          referrerPolicy="no-referrer"
                        />
                        <div className="h-[1.5px] w-full bg-neutral-100 my-1.5" />
                        <p className="text-[6.5px] font-mono tracking-widest text-neutral-400 font-extrabold uppercase qr-subtext">
                          APUNTA TU CÁMARA PARA RESERVAR
                        </p>
                      </div>
                    </div>

                    {/* Call to Action Text */}
                    <div className="text-center z-10 my-1">
                      <div className="inline-block px-3 py-1 rounded-full font-black tracking-wider text-[7.5px] sm:text-[8px] cta-badge" style={{ backgroundColor: theme.titleColor, color: theme.cardBgClass.includes("from-[#FAF8F5]") || theme.cardBgClass.includes("from-[#F2FDF9]") ? "#ffffff" : "#000000" }}>
                        {qrCustomTitle}
                      </div>
                    </div>

                    {/* Quick Steps Instructions Box */}
                    <div className={`p-2.5 sm:p-3 rounded-xl ${theme.stepsBg} z-10 border border-black/5 steps-box`}>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-center mb-1.5 opacity-80 steps-main-title" style={{ color: theme.titleColor }}>
                        ¿CÓMO AGENDAR TU CITA?
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="flex flex-col items-center">
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-black ${theme.stepsNumBg} mb-1 shadow-xs step-number`}>
                            1
                          </div>
                          <span className="block text-[8px] font-black tracking-tight step-title" style={{ color: theme.titleColor }}>
                            ESCANEA
                          </span>
                          <span className="block text-[5.5px] mt-0.5 leading-tight font-mono step-desc" style={{ color: theme.stepsTextColor }}>
                            El código QR con tu móvil
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-x border-black/5 px-1">
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-black ${theme.stepsNumBg} mb-1 shadow-xs step-number`}>
                            2
                          </div>
                          <span className="block text-[8px] font-black tracking-tight step-title" style={{ color: theme.titleColor }}>
                            ELIGE
                          </span>
                          <span className="block text-[5.5px] mt-0.5 leading-tight font-mono step-desc" style={{ color: theme.stepsTextColor }}>
                            Tu barbero y servicio ideal
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-black ${theme.stepsNumBg} mb-1 shadow-xs step-number`}>
                            3
                          </div>
                          <span className="block text-[8px] font-black tracking-tight step-title" style={{ color: theme.titleColor }}>
                            CONFIRMA
                          </span>
                          <span className="block text-[5.5px] mt-0.5 leading-tight font-mono step-desc" style={{ color: theme.stepsTextColor }}>
                            Tu cita lista al instante
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Info / Tech Brand */}
                    <div className="text-center border-t border-black/10 pt-2 flex items-center justify-between text-neutral-400 z-10 banner-footer">
                      <span className="text-[5px] font-mono uppercase font-bold tracking-widest">
                        TECNOLOGÍA DE AUTOGESTIÓN SYNCBARBER
                      </span>
                      <div className="flex items-center gap-[1px]">
                        {/* Mock mini barcode */}
                        <div className="w-[1px] h-2 bg-neutral-300" />
                        <div className="w-[2px] h-2 bg-neutral-300" />
                        <div className="w-[1px] h-2 bg-neutral-300" />
                        <div className="w-[1px] h-2 bg-neutral-300" />
                        <div className="w-[3px] h-2 bg-neutral-300" />
                        <div className="w-[1px] h-2 bg-neutral-300" />
                        <div className="w-[2px] h-2 bg-neutral-300" />
                        <span className="text-[4px] font-mono ml-1 font-bold">2026-SaaS</span>
                      </div>
                    </div>

                  </div>
                );
              })()}

              <p className="text-[10px] text-elegant-text-muted mt-4 text-center leading-relaxed max-w-[280px] print:hidden">
                Presiona <strong>Imprimir Banner</strong> para imprimir directamente, o haz clic derecho en el código QR superior para descargarlo.
              </p>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Simulated Email Notification Modal Portal */}
      {simulatedEmailModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 md:p-5 bg-gradient-to-r from-sky-950 via-slate-900 to-elegant-card border-b border-sky-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Notificación por Correo Electrónico Enviada
                    <span className="text-[9px] bg-sky-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase">
                      Simulación Servidor
                    </span>
                  </h3>
                  <p className="text-[11px] text-sky-300/80 font-mono">
                    Para: {simulatedEmailModal.to}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedEmailModal(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Email Metadata */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
              <div className="flex gap-2">
                <span className="text-neutral-500 font-bold shrink-0">ASUNTO:</span>
                <span className="font-bold text-amber-300">{simulatedEmailModal.subject}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 pt-1 border-t border-slate-900">
                <span>ESTADO: <span className="text-emerald-400 font-bold">200 OK (Entregado en Bandeja)</span></span>
                <span>FECHA: {new Date(simulatedEmailModal.timestamp || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            {/* Email Body Preview */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-neutral-900">
              {simulatedEmailModal.html ? (
                <div 
                  className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner"
                  dangerouslySetInnerHTML={{ __html: simulatedEmailModal.html }}
                />
              ) : (
                <div className="p-4 font-mono text-xs text-neutral-300 whitespace-pre-wrap">
                  {simulatedEmailModal.text || "Vista previa de correo no disponible"}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-elegant-card border-t border-elegant-border flex justify-between items-center gap-3">
              <p className="text-[10px] text-neutral-400 font-mono hidden sm:block">
                💡 Este correo alerta al cliente con botón directo de pago y renovación.
              </p>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(simulatedEmailModal.subject + "\n\n" + (simulatedEmailModal.text || ""));
                    triggerToast("Copiado", "Contenido del correo copiado al portapapeles", "info");
                  }}
                  className="px-3 py-2 bg-elegant-sub border border-elegant-border hover:border-neutral-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Texto</span>
                </button>
                <button
                  onClick={() => setSimulatedEmailModal(null)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Aceptar & Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Expiration Date Modal Portal */}
      {editExpModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-elegant-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Editar Fecha de Inactivación</h3>
              </div>
              <button
                onClick={() => setEditExpModal(null)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-elegant-text-muted">
              Modifica manualmente la fecha de inactivación de la suscripción para el salón{" "}
              <strong className="text-white">{editExpModal.salonName}</strong> (Clave: <span className="font-mono text-amber-300">{editExpModal.key}</span>).
            </p>

            <form onSubmit={handleSaveUpdatedDates} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Fecha de Inactivación Límite (AAAA-MM-DD):
                </label>
                <input
                  type="date"
                  required
                  value={customExpDateInput}
                  onChange={(e) => setCustomExpDateInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-white text-xs font-mono rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-elegant-text-muted block">
                  Correo del Propietario / Cobranza:
                </label>
                <input
                  type="email"
                  placeholder="propietario@barberia.com"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 text-white text-xs font-mono rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-elegant-border">
                <button
                  type="button"
                  onClick={() => setEditExpModal(null)}
                  className="px-3.5 py-2 bg-elegant-sub border border-elegant-border text-neutral-300 text-xs font-bold rounded-xl hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SaaS Service Contract Modal */}
      <SaaSContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        tenant={selectedContractTenant}
        license={selectedContractLicense}
        pricingConfig={pricingConfig}
        formatPrice={formatPrice}
      />

    </div>
  );
}
