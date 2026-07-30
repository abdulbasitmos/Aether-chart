const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tagline: { type: String, default: '' },
  avatar: { type: String, default: '' },
  description: { type: String, default: '' },
  joined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  announcements: [{
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
}, { timestamps: true });

module.exports = mongoose.model('Community', CommunitySchema);
