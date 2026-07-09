export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: 'cabello' | 'barba' | 'color' | 'tratamiento';
  description: string;
}

export interface Barber {
  id: string;
  name: string;
  username: string;
  password?: string;
  isActive: boolean;
  specialties?: string[];
  commissionPercent?: number; // percentage of service price they earn (e.g. 50)
  blockedDates?: string[]; // list of blocked YYYY-MM-DD dates e.g. sick, resting
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'canceled' | 'completed';

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
  tip?: number; // tip registered for this appointment
}

export interface SalonConfig {
  name: string;
  openTime: string; // "09:00"
  closeTime: string; // "20:00"
  workingDays: number[]; // [1, 2, 3, 4, 5, 6] (Mon-Sat)
  intervalMinutes: number; // 30
  licenseType?: 'basica' | 'profesional' | 'premium';
  activeLicenseKey?: string;
  needsSetup?: boolean;
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
}

export interface BarberReview {
  id: string;
  clientName: string;
  barberId: string;
  rating: number; // 1 to 5 stars
  comment: string;
  date: string;
}
