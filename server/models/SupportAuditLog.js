const mongoose = require('mongoose');

const supportAuditLogSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentName: { type: String, required: true },
  action: { type: String, required: true }, // e.g. 'BAN_USER', 'UNBAN_USER', 'SUSPEND_USER', 'UNSUSPEND_USER', 'CHANGE_ROLE', 'DELETE_USER', 'CREATE_ANNOUNCEMENT', 'RESOLVE_TICKET', 'CREATE_FAQ', 'DELETE_FAQ', 'ADD_NOTE'
  targetType: { type: String, default: 'User' }, // 'User', 'SupportMessage', 'SystemAnnouncement', 'SupportFaq'
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportAuditLog', supportAuditLogSchema);
