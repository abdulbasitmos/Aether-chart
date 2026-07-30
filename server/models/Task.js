const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Todo', 'In Progress', 'Blocked', 'Completed', 'Cancelled'], 
    default: 'Todo' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, default: null },
  labels: [{ type: String }],
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }, // e.g. 'image', 'document'
    size: { type: String }
  }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  history: [{
    action: { type: String, required: true }, // e.g., 'created', 'updated', 'assigned', 'status_changed', 'priority_changed', 'comment_added', 'completed', 'reopened'
    details: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
}, { timestamps: true });

// Database Indexes for query optimization
TaskSchema.index({ conversationId: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ title: 'text', description: 'text', labels: 'text' }); // Text index for multi-field search

module.exports = mongoose.model('Task', TaskSchema);
