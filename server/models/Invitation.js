const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
  role: { type: String, enum: ['super_admin','admin','manager','moderator','staff','member','guest'], default: 'member' },
  respondedAt: { type: Date }
}, { timestamps: true });

InvitationSchema.index({ organizationId: 1, receiverId: 1 });
InvitationSchema.index({ receiverId: 1, status: 1 });

module.exports = mongoose.model('Invitation', InvitationSchema);
