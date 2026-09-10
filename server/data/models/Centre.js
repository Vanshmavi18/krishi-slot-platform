// server/data/models/Centre.js
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  currentToken: { type: String, required: true },
  officer: { type: String, required: true }
}, { _id: false });

const centreSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  nameHi: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  distanceKm: { type: Number, default: 0 },
  operatingHours: { type: String, default: '09:00 AM - 05:00 PM' },
  counters: [counterSchema],
  dailyCapacity: { type: Number, default: 100 },
  todayBooked: { type: Number, default: 0 },
  todayCompleted: { type: Number, default: 0 }
}, {
  timestamps: true
});

export const Centre = mongoose.models.Centre || mongoose.model('Centre', centreSchema);
export default Centre;
