export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  description: string;
  allowRewardRedemption?: boolean; // Permite canjear este servicio con puntos de fidelización o cumpleaños
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface BarberAdvance {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason: string;
  createdAt: string;
}

export interface BarberPayrollSettlement {
  id: string;
  barberId: string;
  barberName: string;
  startDate: string;
  endDate: string;
  cutsCount: number;
  cutsRevenue: number;
  cutsCommission: number;
  productsRevenue: number;
  productsCommission: number;
  tipsTotal: number;
  advancesTotal: number;
  netPayout: number;
  settledAt: string;
  settledBy: string;
  notes?: string;
}

export interface Barber {
  id: string;
  name: string;
  username: string;
  password?: string;
  isActive: boolean;
  specialties?: string[];
  avatarUrl?: string;
  photoUrl?: string;
  phone?: string; // Número de contacto / WhatsApp del barbero
  whatsapp?: string; // WhatsApp directo
  commissionPercent?: number; // percentage of service price they earn (e.g. 50)
  blockedDates?: string[]; // list of blocked YYYY-MM-DD dates e.g. sick, resting
  timeBlocks?: TimeBlock[];
  advances?: BarberAdvance[];
  payrollSettlements?: BarberPayrollSettlement[];
  
  // Gamificación y Objetivos
  dailyGoalCuts?: number; // e.g. 8 cuts
  dailyGoalSales?: number; // e.g. 30000 COP in products
  xp?: number;
  level?: number;
  achievements?: string[]; // e.g. ["Racha de 5 Cortes", "Leyenda de la Nevera", "Atención VIP"]
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed' | 'en_espera';

export interface CatalogStyle {
  id: string;
  title: string;
  category: 'fade' | 'clasico' | 'barba' | 'diseno' | 'tendencias' | 'general';
  categoryLabel?: string;
  photoUrl: string;
  description?: string;
  recommendedFace?: string;
  recommendedHair?: string;
  serviceId?: string;
  serviceName?: string;
  isActive: boolean;
  tags?: string[];
  createdAt?: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  status: AppointmentStatus;
  notes?: string;
  hairdresserNotes?: string;
  barberId?: string; // ID of the assigned barber
  barberName?: string; // Name of the assigned barber
  createdAt: string;
  membershipId?: string; // ID of membership if booked with discount
  membershipDiscountPercent?: number; // Discount percentage applied
  clientId?: string; // ID of client account if linked
  tenantId?: string; // Multi-tenant salon identifier
  tip?: number; // tip registered for this appointment
  paymentMethod?: 'efectivo' | 'transferencia' | 'nequi_daviplata' | 'tarjeta';
  consumptions?: AppointmentConsumption[];
  consumptionsTotal?: number;
  
  // Check-In Kiosco y Señas/Multas
  checkedIn?: boolean;
  checkInTime?: string;
  penaltyApplied?: number; // Abono o multa cobrada en esta cita

  // Beneficio de Cumpleaños
  isBirthdayBenefit?: boolean; // Corte regalo por mes de cumpleaños
  birthDate?: string; // YYYY-MM-DD o MM-DD

  // Catálogo de Estilo Elegido por el Cliente
  selectedStyleId?: string;
  selectedStyleName?: string;
  selectedStylePhotoUrl?: string;
  selectedStyleCategory?: string;
  selectedStyleNotes?: string;
}

export interface AppointmentConsumption {
  productId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  addedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'nevera' | 'cabello' | 'barba' | 'estilizado' | 'accesorios';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  barcode?: string;
  imageUrl?: string;
  allowBarberCommission?: boolean;
  commissionPercent?: number;
}

export interface ProductSaleItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  subtotal: number;
}

export interface ProductSale {
  id: string;
  appointmentId?: string;
  clientId?: string;
  clientName: string;
  barberId?: string;
  barberName?: string;
  items: ProductSaleItem[];
  totalAmount: number;
  paymentMethod: 'efectivo' | 'nequi_daviplata' | 'tarjeta' | 'incluido_en_cita';
  createdAt: string;
}

export interface GeneratedLicense {
  key: string;
  salonName: string;
  licenseType: 'basica' | 'profesional' | 'premium';
  createdAt: string; // Fecha de activación / emisión (ISO string)
  expirationDate: string; // Fecha de inactivación / vencimiento (ISO / YYYY-MM-DD string)
  durationMonths: number;
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  city?: string;
  address?: string;
  status: 'active' | 'warning_15' | 'warning_8' | 'warning_1' | 'expired';
  lastNotificationSent?: '15_days' | '8_days' | '1_day' | 'expired' | null;
  activatedAt?: string;
}

export interface SalonConfig {
  name: string;
  openTime: string; // "09:00"
  closeTime: string; // "20:00"
  workingDays: number[]; // [1, 2, 3, 4, 5, 6] (Mon-Sat)
  intervalMinutes: number; // 30
  timeFormat?: '12h' | '24h'; // '12h' (8:00 AM, 2:30 PM) o '24h' (08:00, 14:30)
  licenseType?: 'basica' | 'profesional' | 'premium';
  activeLicenseKey?: string;
  activationDate?: string; // Fecha de activación (e.g. "2026-07-24")
  expirationDate?: string; // Fecha de inactivación / vencimiento (e.g. "2026-08-24")
  ownerName?: string;
  ownerEmail?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  needsSetup?: boolean;
  serviceCategories?: { id: string; name: string }[];
  customLogoUrl?: string;
  accentColor?: string; // hex or color name (e.g., gold, emerald, blue, indigo, rose)
  textColor?: string;   // hex or classes
  tagline?: string;     // e.g. "El mejor corte de la ciudad"
  backgroundColor?: string; // hex color for page background
  cardColor?: string;       // hex color for main sections/cards
  subCardColor?: string;    // hex color for subsections/inner-containers
  borderColor?: string;     // hex color for borders
  noShowPenaltyAmount?: number; // valor en COP de la multa por inasistencia (e.g. 10000)
  
  // Dynamic Admin & Feature Flags
  featureFlags?: {
    enableOnlineBooking?: boolean;
    enableInventory?: boolean;
    enableMemberships?: boolean;
    enableOnlinePayments?: boolean;
    enableCashClosure?: boolean;
    enableAiChat?: boolean;
    enableReviews?: boolean;
  };

  // Maintenance Lockdown Mode
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceAllowAdmins?: boolean;

  // SaaS Billing & Suspension Motor
  billingStatus?: 'active' | 'grace_period' | 'overdue_locked';
  billingDueDate?: string;
  billingAmountDue?: number;
  billingGraceDays?: number;
  billingCustomMessage?: string;
  billingPaymentLink?: string;
  billingAccountInfo?: string;
  isComplimentary?: boolean; // Licencia bonificada/obsequiada ($0 facturación)
  billingExempt?: boolean; // Exenta de cobros recurrentes en SaaS
  customMaxBarbers?: number; // Cupo negociado especial autorizado para el salón

  // Catálogo de Cortes & Estilos Lookbook
  catalogStyles?: CatalogStyle[];
}

export interface DashboardStats {
  totalIncome: number;
  completedCount: number;
  pendingCount: number;
  confirmedCount: number;
  todayCount: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  discountPercent: number;
  description: string;
  benefits: string[];
}

export interface HaircutPhoto {
  id: string;
  url: string; // base64 or URL
  date: string; // YYYY-MM-DD
  styleTag?: string; // e.g. "Mid Fade + Barba"
  barberName?: string;
  notes?: string;
}

export interface TechnicalPreferences {
  fadeType?: string; // e.g. "Bajo (Low Fade)", "Medio (Mid Fade)", "Alto (High Fade)", "Taper Fade", "Burst Fade", "Clásico / Tijera"
  topStyle?: string; // e.g. "Tijera texturizado", "Guía #2 (6mm)", "Guía #3 (10mm)", "Buzz cut", "Pompadour", "Slick back"
  beardStyle?: string; // e.g. "Ritual Toalla Caliente", "Delineado Navaja", "Rebaje Guía #1", "Sin barba"
  skinSensitivity?: string; // e.g. "Piel Sensible", "Propenso a Irritación con Cuchilla", "Usar Bálsamo sin Alcohol", "Normal"
  favoriteProducts?: string[]; // e.g. ["Cera Mate", "Polvo de Volumen", "Aceite para Barba"]
  preferredBarberId?: string;
}

export interface ClientPenalty {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  status: 'pending' | 'paid' | 'waived';
  waivedBy?: string;
  appointmentId?: string;
}

export interface ClientAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  membershipId?: string; // e.g. "bronze", "silver", "gold" or undefined
  membershipActive?: boolean;
  createdAt: string;
  loyaltyPoints?: number; // Current accumulated loyalty points/stamps
  internalNotes?: string; // Internal preferences notes (Ficha técnica)
  
  // Ficha Visual y Preferencias
  technicalPreferences?: TechnicalPreferences;
  galleryPhotos?: HaircutPhoto[];
  
  // Inteligencia de Retención y Re-Corte
  avgCutCycleDays?: number; // Frecuencia de corte en días (default 15)
  lastCutDate?: string; // YYYY-MM-DD del último corte realizado

  // Cumpleaños y Beneficio de Regalo
  birthDate?: string; // YYYY-MM-DD o MM-DD
  birthdayBenefitUsedYears?: string[]; // Ej: ["2026"]

  // Señas, Abonos y Multas acumuladas
  pendingPenalty?: number; // Total acumulado en multas / señas pendientes
  penaltyHistory?: ClientPenalty[];
}

export interface DailyClosure {
  id: string;
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO string
  closedBy: string;
  initialBase: number;
  expectedCash: number;
  countedCash: number;
  cashDifference: number; // countedCash - expectedCash
  expectedDigital: number; // Nequi / Daviplata / Transferencia
  expectedCard: number;
  totalCutsRevenue: number;
  totalProductsRevenue: number;
  totalTips: number;
  totalGross: number;
  withdrawals: number;
  notes?: string;
  status: 'closed';
}

export interface BarberReview {
  id: string;
  clientName: string;
  barberId: string;
  rating: number; // 1 to 5 stars
  comment: string;
  date: string;
}
