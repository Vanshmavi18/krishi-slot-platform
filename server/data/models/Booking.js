// server/data/models/Booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  token: { type: String, required: true, index: true },
  farmerId: { type: String, required: true, index: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, required: true },
  farmerEmail: { type: String, lowercase: true, trim: true },
  centreId: { type: String, required: true, index: true },
  centreName: { type: String, required: true },
  cropId: { type: String, required: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  vehicle: { type: String, default: 'Tractor Trolley' },
  date: { type: String, required: true, index: true },
  displayDate: { type: String },
  timeSlot: { type: String, required: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'], default: 'CONFIRMED' },
  queueStatus: { type: String, enum: ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'DELAYED'], default: 'WAITING' },
  qrCodeData: { type: String },
  procurementId: { type: String, default: null }
}, {
  timestamps: true
});

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
