// server/data/models/BuyerOrder.js
import mongoose from 'mongoose';

const buyerOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  buyerId: { type: String, required: true, index: true },
  buyerName: { type: String, required: true },
  cropId: { type: String, required: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  offeredRate: { type: Number, required: true },
  totalValue: { type: Number, required: true },
  centreId: { type: String, required: true },
  farmerId: { type: String, required: true },
  farmerName: { type: String, required: true },
  status: { type: String, enum: ['CONTRACT_ISSUED', 'PAYMENT_ESCROWED', 'GATE_INWARD', 'COMPLETED', 'CANCELLED'], default: 'CONTRACT_ISSUED' },
  gatePassId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const BuyerOrder = mongoose.models.BuyerOrder || mongoose.model('BuyerOrder', buyerOrderSchema);
export default BuyerOrder;
