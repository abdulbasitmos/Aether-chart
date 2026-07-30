const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: '' },
  items: [{
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    content: { type: String, default: '' },
    background: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    caption: { type: String, default: '' },
    timestamp: { type: String, default: 'Just now' },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Status', StatusSchema);
