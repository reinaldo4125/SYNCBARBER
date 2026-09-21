export interface LoggedNotification {
  id: string;
  type: 'new_booking' | '30min_reminder' | 'shift_start' | 'checkin_arrived' | 'test';
  title: string;
  message: string;
  timestamp: string; // ISO
  read: boolean;
  metadata?: {
    clientName?: string;
    time?: string;
    serviceName?: string;
    barberName?: string;
    appointmentId?: string;
  };
}

const STORAGE_KEY = 'syncbarber_notification_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieve persistent notifications history from local storage.
 */
export function getNotificationHistory(): LoggedNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading notification history:', e);
    return [];
  }
}

/**
 * Record a new notification in the persistent history log.
 */
export function addNotificationToHistory(item: Omit<LoggedNotification, 'id' | 'timestamp' | 'read'>): LoggedNotification {
  const history = getNotificationHistory();
  const newItem: LoggedNotification = {
    ...item,
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    read: false
  };

  const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for real-time reactivity inside components
    window.dispatchEvent(new CustomEvent('syncbarber_notification_added', { detail: newItem }));
  } catch (e) {
    console.warn('Error saving notification history:', e);
  }

  return newItem;
}

/**
 * Mark a single notification as read.
 */
export function markNotificationAsRead(id: string): void {
  const history = getNotificationHistory();
  const updated = history.map(item => item.id === id ? { ...item, read: true } : item);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('syncbarber_notification_history_updated'));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Mark all notifications as read.
 */
export function markAllNotificationsAsRead(): void {
  const history = getNotificationHistory();
  const updated = history.map(item => ({ ...item, read: true }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('syncbarber_notification_history_updated'));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Clear all history items.
 */
export function clearNotificationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('syncbarber_notification_history_updated'));
  } catch (e) {
    console.warn(e);
  }
}
