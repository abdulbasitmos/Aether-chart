const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  name: { type: String, default: '' }, // For group chats
  avatar: { type: String, default: '' }, // For group chats
  description: { type: String, default: '' }, // For group description
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  onlyAdminsCanMessage: { type: Boolean, default: false },
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  userEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserEvent' },
  isOrgInbox: { type: Boolean, default: false }
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ pinnedBy: 1 });
ConversationSchema.index({ archivedBy: 1 });
ConversationSchema.index({ favoritedBy: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ orgId: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
