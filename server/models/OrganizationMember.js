const mongoose = require('mongoose');

const OrganizationMemberSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['founder','super_admin','admin','manager','moderator','staff','member','guest'], default: 'member' },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

OrganizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMemberSchema.index({ userId: 1 });

module.exports = mongoose.model('OrganizationMember', OrganizationMemberSchema);
