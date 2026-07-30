const mongoose = require('mongoose');

const SystemAnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['info', 'warning', 'maintenance', 'update', 'success'], default: 'info' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  pinned: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SystemAnnouncement', SystemAnnouncementSchema);
