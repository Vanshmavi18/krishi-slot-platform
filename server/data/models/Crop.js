// server/data/models/Crop.js
import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  mspRate: { type: Number, required: true },
  unit: { type: String, default: 'quintal' },
  maxMoisture: { type: Number, default: 17 }
}, {
  timestamps: true
});

export const Crop = mongoose.models.Crop || mongoose.model('Crop', cropSchema);
export default Crop;
