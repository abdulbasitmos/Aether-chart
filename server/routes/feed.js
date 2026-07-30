const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_aether_key_12948194', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = decoded.id;
    next();
  });
};

// Create a post (text, image, or video)
router.post('/', authenticateToken, async (req, res) => {
  const { text, mediaUrl, mediaType, tags } = req.body;
  if (!text && !mediaUrl) {
    return res.status(400).json({ error: 'Post must contain text or media' });
  }

  try {
    let type = mediaType || 'none';
    if (mediaUrl && type === 'none') {
      if (mediaUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) || mediaUrl.includes('video')) {
        type = 'video';
      } else {
        type = 'image';
      }
    }

    const post = new Post({
      author: req.userId,
      text: text || '',
      mediaUrl: mediaUrl || '',
      mediaType: type,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      likes: [],
      comments: [],
      sharesCount: 0
    });

    await post.save();
    const populated = await Post.findById(post._id)
      .populate('author', 'name username avatar')
      .lean();

    res.status(201).json({ message: 'Post created', post: populated });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Fetch feed posts
router.get('/', async (req, res) => {
  const { filter, tag, limit = 50 } = req.query;
  try {
    let query = {};
    if (tag) {
      query.tags = tag;
    }
    if (filter === 'media') {
      query.mediaType = { $in: ['image', 'video'] };
    }

    const posts = await Post.find(query)
      .populate('author', 'name username avatar')
      .populate('comments.userId', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Toggle Like
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const likedIndex = post.likes.indexOf(req.userId);
    let isLiked = false;

    if (likedIndex > -1) {
      post.likes.splice(likedIndex, 1);
      isLiked = false;
    } else {
      post.likes.push(req.userId);
      isLiked = true;

      // Create notification for post author if not self
      if (post.author.toString() !== req.userId) {
        const liker = await User.findById(req.userId).select('name');
        await new Notification({
          userId: post.author,
          type: 'contact_request',
          title: '❤️ Post Liked',
          content: `${liker?.name || 'Someone'} liked your post`,
          fromUserId: req.userId
        }).save();
      }
    }

    await post.save();
    res.json({ message: isLiked ? 'Post liked' : 'Post unliked', likesCount: post.likes.length, isLiked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update like' });
  }
});

// Add Comment
router.post('/:postId/comment', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({
      userId: req.userId,
      text: text.trim()
    });

    await post.save();

    // Create notification for post author if not self
    if (post.author.toString() !== req.userId) {
      const commenter = await User.findById(req.userId).select('name');
      await new Notification({
        userId: post.author,
        type: 'contact_request',
        title: '💬 New Comment',
        content: `${commenter?.name || 'Someone'} commented on your post: "${text.substring(0, 30)}..."`,
        fromUserId: req.userId
      }).save();
    }

    const updatedPost = await Post.findById(post._id)
      .populate('comments.userId', 'name username avatar');

    res.status(201).json({ message: 'Comment added', comments: updatedPost.comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete Comment
router.delete('/:postId/comment/:commentId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Allow comment author or post author to delete
    if (comment.userId.toString() !== req.userId && post.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    post.comments.pull({ _id: req.params.commentId });
    await post.save();

    res.json({ message: 'Comment deleted', comments: post.comments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Share Post
router.post('/:postId/share', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.sharesCount = (post.sharesCount || 0) + 1;
    await post.save();

    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    res.json({ message: 'Post shared', sharesCount: post.sharesCount, shareUrl: `${baseUrl}/feed?post=${post._id}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// Get single post by ID
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'name username avatar')
      .populate('comments.userId', 'name username avatar');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Delete Post
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.author.toString() !== req.userId) {
      const user = await User.findById(req.userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete this post' });
      }
    }

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
