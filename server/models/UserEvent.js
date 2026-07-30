const mongoose = require('mongoose');

const UserEventSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  endTime: { type: String, default: '' },
  location: { type: String, default: 'Online' },
  locationUrl: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  capacity: { type: Number, default: 0 }, // 0 = unlimited
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  tags: [{ type: String }],
  // Multi-part rich text sections (e.g., agenda, details, requirements)
  sections: [{
    title: { type: String },
    content: { type: String },
    order: { type: Number, default: 0 }
  }],
  // Attendees who RSVP'd
  rsvps: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'maybe', 'not_going'], default: 'going' },
    respondedAt: { type: Date, default: Date.now }
  }],
  // Invite link
  inviteToken: { type: String, default: '' },
  // Status
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  // Recurring settings
  recurring: { type: Boolean, default: false },
  recurrenceRule: { type: String, default: '' }, // e.g., 'weekly', 'monthly'
  // Reminders sent
  reminderSent: { type: Boolean, default: false },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
}, { timestamps: true });

UserEventSchema.index({ creator: 1, date: 1 });
UserEventSchema.index({ inviteToken: 1 });
UserEventSchema.index({ 'rsvps.userId': 1 });

module.exports = mongoose.model('UserEvent', UserEventSchema);
