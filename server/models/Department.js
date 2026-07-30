const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  announcements: [{
    title: { type: String, required: true },
    content: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

DepartmentSchema.index({ organizationId: 1, name: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
