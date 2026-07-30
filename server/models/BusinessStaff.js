const mongoose = require('mongoose');

const BusinessStaffSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'manager', 'sales_agent', 'support'], default: 'support' },
  permissions: {
    manageProducts: { type: Boolean, default: false },
    manageServices: { type: Boolean, default: false },
    manageAppointments: { type: Boolean, default: false },
    manageStaff: { type: Boolean, default: false },
    manageSettings: { type: Boolean, default: false },
    viewAnalytics: { type: Boolean, default: false },
    sendBroadcasts: { type: Boolean, default: false }
  },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now }
});

BusinessStaffSchema.index({ businessId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('BusinessStaff', BusinessStaffSchema);
