import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  tokenId: { type: String, required: true, unique: true },
  tokenNumber: { type: Number, required: true },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['general', 'followup', 'report', 'emergency'],
    default: 'general'
  },
  priority: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['waiting', 'active', 'done', 'absent'],
    default: 'waiting'
  },
  urgentReason: { type: String },
  registeredAt: { type: Date, default: Date.now },
  // Set when a no-show patient is put back in line so equal-priority sort
  // places the returning patient behind those who never left.
  requeuedAt: { type: Date },
  calledAt: { type: Date },
  completedAt: { type: Date }
});

export const Patient = mongoose.model('Patient', patientSchema);
