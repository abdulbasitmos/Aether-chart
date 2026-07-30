const mongoose = require('mongoose');

const JoinRequestSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  message: { type: String, default: '' },
  respondedAt: { type: Date },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

JoinRequestSchema.index({ organizationId: 1, applicantId: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', JoinRequestSchema);
