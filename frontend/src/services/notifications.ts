const PERMISSION_KEY = 'notification_permission_asked';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  localStorage.setItem(PERMISSION_KEY, 'true');
  return result === 'granted';
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function showNotification(title: string, options?: { body?: string; tag?: string; onClick?: () => void }) {
  if (!canNotify()) return;

  // Don't notify if tab is focused
  if (document.visibilityState === 'visible') return;

  const notification = new Notification(title, {
    body: options?.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options?.tag || 'default',
  } as NotificationOptions);

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick!();
      notification.close();
    };
  }

  // Auto-close after 5s
  setTimeout(() => notification.close(), 5000);
}

export function hasAskedPermission(): boolean {
  return localStorage.getItem(PERMISSION_KEY) === 'true';
}
