// server/data/models/Procurement.js
import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  time: { type: String, required: true },
  done: { type: Boolean, default: false }
}, { _id: false });

const procurementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  bookingId: { type: String, default: null, index: true },
  token: { type: String, required: true },
  farmerId: { type: String, required: true, index: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, required: true },
  farmerEmail: { type: String, lowercase: true, trim: true },
  date: { type: String, required: true },
  crop: { type: String, required: true },
  cropId: { type: String, required: true },
  cropFullName: { type: String },
  centre: { type: String, required: true },
  centreDistrict: { type: String },
  grossWeight: { type: Number, required: true },
  tareWeight: { type: Number, required: true },
  netWeight: { type: Number, required: true },
  moisturePercent: { type: Number, required: true },
  mspRate: { type: Number, required: true },
  effectiveRate: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'COMPLETED' },
  paymentStatus: { type: String, enum: ['PROCESSING', 'PAID', 'FAILED'], default: 'PROCESSING' },
  expectedDate: { type: String },
  utr: { type: String, default: null },
  officer: { type: String, default: 'Mandi Officer' },
  bankName: { type: String, default: 'State Bank of India' },
  bankAccMasked: { type: String, default: '•••• 4862' },
  milestones: [milestoneSchema]
}, {
  timestamps: true
});

export const Procurement = mongoose.models.Procurement || mongoose.model('Procurement', procurementSchema);
export default Procurement;
