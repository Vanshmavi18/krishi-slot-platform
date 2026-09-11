// server/data/models/Otp.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  emailOrPhone: { type: String, required: true, lowercase: true, trim: true, index: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  otpHash: { type: String, required: true },
  otp: { type: String }, // Optional debug / legacy field
  purpose: { type: String, enum: ['signup', 'reset-password', 'login'], default: 'signup' },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  userId: { type: String, default: null },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL automatic expiry index
  createdAt: { type: Date, default: Date.now }
});

export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
export default Otp;
