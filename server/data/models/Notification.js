// server/data/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, default: 'farmer' },
  type: { type: String, default: 'GENERAL' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, default: 'queue' },
  link: { type: String, default: 'queue' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
