const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  orgType: { type: String, default: 'other' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  address: { type: String, default: '' },
  founder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verificationInfo: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  joinCode: { type: String, default: '' },
  publicStatus: { type: String, default: 'Active' },
  announcements: [{
    title: { type: String, required: true },
    content: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  events: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date },
    location: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: 'file' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  // Polls for team decision making
  polls: [{
    question: { type: String, required: true },
    options: [{ text: String, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  }],
  internalChatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
}, { timestamps: true });

OrganizationSchema.index({ name: 'text', description: 'text', orgType: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
