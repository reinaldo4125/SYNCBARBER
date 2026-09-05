// Utility for Web Push Notifications & WhatsApp Notification links

export interface AppointmentNotificationData {
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  barberName?: string;
  date: string;
  time: string;
  price?: number;
  salonName?: string;
  isBirthdayBenefit?: boolean;
}

/**
 * Format a clean, professional WhatsApp notification message for the barber or salon
 */
export function formatAppointmentWhatsAppMessage(data: AppointmentNotificationData): string {
  const salon = data.salonName ? ` en *${data.salonName}*` : '';
  const birthdayTag = data.isBirthdayBenefit ? `\n🎂 *BENEFICIO DE CUMPLEAÑOS:* ¡Corte 100% GRATUITO de Regalo! 🎉` : '';
  const priceText = data.isBirthdayBenefit 
    ? `\n💵 *Precio:* $0 COP *(Regalo de Cumpleaños)*` 
    : (data.price !== undefined ? `\n💵 *Precio:* $${data.price.toLocaleString('es-CO')}` : '');
  const phoneText = data.clientPhone ? `\n📱 *Teléfono Cliente:* ${data.clientPhone}` : '';

  return (
    `🚨 *¡NUEVA CITA CONFIRMADA!* 💈${salon}\n\n` +
    `👤 *Cliente:* ${data.clientName}` +
    `${birthdayTag}` +
    `${phoneText}\n` +
    `💈 *Servicio:* ${data.serviceName}` +
    `${priceText}\n` +
    `📅 *Fecha:* ${data.date}\n` +
    `⏰ *Hora:* ${data.time}\n` +
    `✂️ *Barbero:* ${data.barberName || 'Cualquier Barbero'}\n\n` +
    `⚡ _Notificación automática enviada desde SYNCBARBER_`
  );
}

/**
 * Generate a direct wa.me link for WhatsApp notification
 */
export function getWhatsAppNotificationUrl(targetPhone: string, data: AppointmentNotificationData): string {
  let cleanPhone = targetPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `57${cleanPhone}`; // Default to Colombia code if 10 digits
  }
  const msg = encodeURIComponent(formatAppointmentWhatsAppMessage(data));
  return `https://wa.me/${cleanPhone}?text=${msg}`;
}

/**
 * Check if Web Notifications are supported in current browser
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission state
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorkerForPush();
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Register or ensure Service Worker is ready for Push
 */
export async function registerServiceWorkerForPush(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Error registering service worker for push:', err);
    return null;
  }
}

export interface CustomNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  url?: string;
  badge?: string;
}

/**
 * Show a native Web Push notification (works even when tab is backgrounded)
 */
export async function showPushNotification(title: string, options?: CustomNotificationOptions): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body: options?.body || 'Nueva notificación de SYNCBARBER',
        icon: options?.icon || '/favicon.svg',
        badge: options?.badge || '/favicon.svg',
        vibrate: options?.vibrate || [200, 100, 200, 100, 200],
        tag: options?.tag || `syncbarber-notif-${Date.now()}`,
        data: { url: options?.url || '/' },
        ...(options as any)
      } as any);
      return true;
    } else {
      // Fallback to standard Notification API
      new Notification(title, options as any);
      return true;
    }
  } catch (err) {
    console.error('Error triggering push notification:', err);
    return false;
  }
}
