// server/data/models/Booking.js
import mongoose from 'mongoose';

const buyerRequestSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  offeredPrice: { type: Number },
  notes: { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  // Core Slot Booking System Fields
  bookingId: { type: String, required: true, unique: true, index: true },
  id: { type: String, index: true }, // Alias / backward compatibility
  farmerId: { type: String, required: true, index: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String },
  farmerEmail: { type: String, lowercase: true, trim: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true, min: [0.1, 'Quantity must be greater than 0'] },
  quantityUnit: { 
    type: String, 
    enum: ['kg', 'quintal', 'ton'], 
    default: 'quintal' 
  },
  expectedPrice: { type: Number, required: true, min: [0, 'Expected price must be non-negative'] },
  preferredDate: { type: Date, required: true, index: true },
  timeSlot: { type: String, required: true },
  location: { type: String, required: true },
  notes: { type: String, default: '' },
  
  // Buyer Assignment & Requests
  buyerId: { type: String, default: null, index: true },
  buyerName: { type: String, default: null },
  buyerRequests: [buyerRequestSchema],

  // Booking Lifecycle Status: Pending -> Approved / Rejected -> Completed (or Cancelled)
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled', 'CONFIRMED'], 
    default: 'Pending',
    index: true 
  },

  // Operational / Mandi Gate compatibility fields
  token: { type: String, index: true },
  centreId: { type: String, index: true },
  centreName: { type: String },
  cropId: { type: String },
  date: { type: String, index: true },
  displayDate: { type: String },
  vehicle: { type: String, default: 'Tractor Trolley' },
  queueStatus: { type: String, enum: ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'DELAYED'], default: 'WAITING' },
  qrCodeData: { type: String },
  procurementId: { type: String, default: null }
}, {
  timestamps: true
});

// Compound indexes for optimal querying
bookingSchema.index({ farmerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, preferredDate: 1 });
bookingSchema.index({ buyerId: 1, status: 1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;

