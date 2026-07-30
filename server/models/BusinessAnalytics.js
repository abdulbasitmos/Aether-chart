const mongoose = require('mongoose');

const BusinessAnalyticsSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  totalCustomers: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  profileViews: { type: Number, default: 0 },
  productViews: { type: Number, default: 0 },
  salesInquiries: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  weeklyData: [{
    date: { type: Date },
    customers: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('BusinessAnalytics', BusinessAnalyticsSchema);
