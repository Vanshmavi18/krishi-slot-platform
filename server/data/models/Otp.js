// server/data/models/Otp.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  emailOrPhone: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  userId: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL automatic expiry index
  createdAt: { type: Date, default: Date.now }
});

export const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
export default Otp;
