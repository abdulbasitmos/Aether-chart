const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'document', 'audio', 'location', 'poll', 'sticker', 'gif'], 
    default: 'text' 
  },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: String, default: '' },
  duration: { type: String, default: '' }, // For audio files
  waveform: [{ type: Number }], // Pre-computed audio waveform peaks (0-1)
  locationName: { type: String, default: '' },
  coordinates: { type: String, default: '' },
  pollQuestion: { type: String, default: '' },
  pollOptions: [{
    optionId: { type: String },
    text: { type: String },
    votes: { type: Number, default: 0 },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  expiresAt: { type: Date, default: null }, // For disappearing messages
  viewOnce: { type: Boolean, default: false }, // For view-once media messages
  viewOnceOpenedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track users who opened the view-once message
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Track users who deleted this message for themselves
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ starredBy: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ type: 1 });

module.exports = mongoose.model('Message', MessageSchema);
