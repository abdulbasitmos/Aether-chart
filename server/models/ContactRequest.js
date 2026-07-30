const mongoose = require('mongoose');

const ContactRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'blocked'], 
    default: 'pending' 
  },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null }
}, { 
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Prevent duplicate requests
ContactRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('ContactRequest', ContactRequestSchema);