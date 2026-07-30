const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, default: 'General Issue' },
  message: { type: String, required: true },
  aiMode: { type: Boolean, default: false },
  replies: [{
    supportId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAi: { type: Boolean, default: false },
    senderName: { type: String, default: 'Support Agent' },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
