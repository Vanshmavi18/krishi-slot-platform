// server/services/notificationService.js
import { EventEmitter } from 'events';
import { db } from '../data/db.js';

export const notificationEvents = new EventEmitter();

/**
 * Get notifications filtered by user or role
 */
export function getNotifications({ userId, role, unreadOnly = false }) {
  let list = db.get('notifications') || [];

  if (userId) {
    list = list.filter(n => n.userId === userId || (!n.userId && (n.role === role || n.role === 'all')));
  } else if (role) {
    list = list.filter(n => n.role === role || n.role === 'all');
  }

  if (unreadOnly) {
    list = list.filter(n => !n.read);
  }

  // Sort descending by timestamp
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const unreadCount = list.filter(n => !n.read).length;

  return {
    success: true,
    notifications: list,
    unreadCount,
    total: list.length
  };
}

/**
 * Create a new notification and emit SSE event
 */
export function createNotification({
  userId = null,
  role = 'all',
  type = 'INFO',
  title,
  message,
  category = 'alerts',
  link = null,
  meta = {}
}) {
  const notification = {
    id: `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId,
    role,
    type,
    title,
    message,
    category, // 'slots' | 'payments' | 'orders' | 'alerts' | 'marketplace'
    read: false,
    link,
    meta,
    timestamp: new Date().toISOString()
  };

  db.insert('notifications', notification);

  // Emit event for real-time SSE stream
  notificationEvents.emit('notification_created', notification);

  return notification;
}

/**
 * Mark a single notification as read
 */
export function markAsRead(id) {
  const updated = db.update('notifications', n => n.id === id, n => ({ ...n, read: true }));
  if (!updated) {
    throw new Error('Notification not found');
  }
  return { success: true, notification: updated };
}

/**
 * Mark all notifications as read for a user or role
 */
export function markAllAsRead({ userId, role }) {
  const all = db.get('notifications') || [];
  let count = 0;

  const updated = all.map(n => {
    const matchesUser = userId && (n.userId === userId || (!n.userId && (n.role === role || n.role === 'all')));
    const matchesRole = !userId && role && (n.role === role || n.role === 'all');
    if ((matchesUser || matchesRole) && !n.read) {
      count++;
      return { ...n, read: true };
    }
    return n;
  });

  db.set('notifications', updated);
  return { success: true, markedCount: count };
}

/**
 * Clear (delete) read notifications for a user/role
 */
export function clearNotifications({ userId, role }) {
  const all = db.get('notifications') || [];
  const filtered = all.filter(n => {
    const matches = userId ? (n.userId === userId || n.role === role) : (n.role === role);
    return !(matches && n.read);
  });

  db.set('notifications', filtered);
  return { success: true };
}
