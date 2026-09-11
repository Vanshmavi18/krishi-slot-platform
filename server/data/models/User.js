// server/data/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['farmer', 'admin', 'officer', 'buyer'], default: 'farmer' },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
  phone: { type: String, sparse: true, index: true },
  passwordHash: { type: String },
  village: { type: String, default: '' },
  aadhaarMasked: { type: String, default: '' },
  bankName: { type: String, default: 'State Bank of India' },
  bankAccMasked: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  landAcres: { type: Number, default: 0 },
  khasraNumber: { type: String, default: '' },
  staffId: { type: String, sparse: true },
  buyerId: { type: String, sparse: true },
  company: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  mandiLicense: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
