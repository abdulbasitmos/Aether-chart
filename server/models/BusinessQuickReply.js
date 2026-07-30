const mongoose = require('mongoose');

const BusinessQuickReplySchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  shortcut: { type: String, default: '' },
  category: { type: String, default: 'general' },
  createdAt: { type: Date, default: Date.now }
});

BusinessQuickReplySchema.index({ businessId: 1 });

module.exports = mongoose.model('BusinessQuickReply', BusinessQuickReplySchema);
