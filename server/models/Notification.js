const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['task_assigned', 'task_updated', 'task_completed', 'task_overdue', 'task_due_today', 'mention', 'contact_request', 'contact_accepted', 'announcement'], 
    required: true 
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  contactRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactRequest', default: null },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  unread: { type: Boolean, default: true }
}, { timestamps: true });

NotificationSchema.index({ userId: 1, unread: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
