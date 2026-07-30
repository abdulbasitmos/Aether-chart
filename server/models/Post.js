const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' },
  tags: [{ type: String }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  sharesCount: { type: Number, default: 0 }
}, { timestamps: true });

PostSchema.index({ createdAt: -1 });
PostSchema.index({ author: 1 });
PostSchema.index({ tags: 1 });

module.exports = mongoose.model('Post', PostSchema);
