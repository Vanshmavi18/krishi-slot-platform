// server/routes/notificationRoutes.js
import { Router } from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications
} from '../services/notificationService.js';

const router = Router();

// GET /api/notifications?userId=...&role=...&unreadOnly=true
router.get('/', (req, res) => {
  try {
    const { userId, role, unreadOnly } = req.query;
    const result = getNotifications({
      userId,
      role,
      unreadOnly: unreadOnly === 'true'
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/send
router.post('/send', (req, res) => {
  try {
    const { userId, role, type, title, message, category, link, meta } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }
    const notif = createNotification({
      userId,
      role,
      type,
      title,
      message,
      category,
      link,
      meta
    });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', (req, res) => {
  try {
    const result = markAsRead(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', (req, res) => {
  try {
    const { userId, role } = req.body;
    const result = markAllAsRead({ userId, role });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/clear
router.post('/clear', (req, res) => {
  try {
    const { userId, role } = req.body;
    const result = clearNotifications({ userId, role });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
