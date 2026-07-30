const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

TeamSchema.index({ organizationId: 1, departmentId: 1 });

module.exports = mongoose.model('Team', TeamSchema);
