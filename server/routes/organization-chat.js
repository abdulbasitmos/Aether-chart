const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_aether_key_12948194', async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = decoded.id;
    next();
  });
};

const requireOrgMember = async (req, res, next) => {
  const orgId = req.params.id || req.body.orgId;
  try {
    const member = await OrganizationMember.findOne({ organizationId: orgId, userId: req.userId });
    if (!member) return res.status(403).json({ error: 'Not a member of this organization' });
    req.orgMember = member;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

const requireOrgAdmin = async (req, res, next) => {
  const orgId = req.params.id || req.body.orgId;
  try {
    const member = await OrganizationMember.findOne({ organizationId: orgId, userId: req.userId });
    if (!member) return res.status(403).json({ error: 'Not a member of this organization' });
    const adminRoles = ['founder', 'super_admin', 'admin'];
    if (!adminRoles.includes(member.role)) return res.status(403).json({ error: 'Admin role required' });
    req.orgMember = member;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

// Public profile - no auth required
router.get('/:id/public', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('name orgType description logo coverImage email phone website address verified events announcements');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Public events
router.get('/:id/events', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('events');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org.events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Public announcements
router.get('/:id/announcements', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('announcements');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org.announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Non-member starts a chat with the organization
// Creates a group conversation between the user and org members with admin roles
router.post('/:id/start-chat', authenticate, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Check if user is already a member
    const existingMember = await OrganizationMember.findOne({ organizationId: req.params.id, userId: req.userId });
    if (existingMember) return res.status(400).json({ error: 'You are already a member. Use the internal chat.' });

    // Check if a conversation already exists between this user and this org
    const existingConv = await Conversation.findOne({
      orgId: req.params.id,
      participants: req.userId,
      type: 'group',
      isOrgInbox: true
    });
    if (existingConv) {
      return res.json({ conversation: existingConv, existing: true });
    }

    // Get org members who can receive external messages (admin+ and optionally managers)
    const orgMembers = await OrganizationMember.find({
      organizationId: req.params.id,
      role: { $in: ['founder', 'super_admin', 'admin', 'manager'] }
    }).populate('userId', 'name avatar');

    const participantIds = [req.userId, ...orgMembers.map(m => m.userId._id.toString())];
    const uniqueParticipants = [...new Set(participantIds)];

    const conversation = new Conversation({
      type: 'group',
      name: org.name + ' Support',
      participants: uniqueParticipants,
      creator: req.userId,
      admins: [req.userId],
      orgId: req.params.id,
      isOrgInbox: true
    });
    await conversation.save();

    res.json({ conversation, existing: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start chat' });
  }
});

// Get org's internal chat (for members)
router.get('/:id/internal-chat', authenticate, requireOrgMember, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    if (!org.internalChatId) return res.status(404).json({ error: 'Internal chat not found' });
    const conversation = await Conversation.findById(org.internalChatId).populate('participants', 'name username avatar email');
    if (!conversation) return res.status(404).json({ error: 'Internal chat not found' });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch internal chat' });
  }
});

// List inbox conversations (external chats with non-members) - admin+
router.get('/:id/inbox', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      orgId: req.params.id,
      isOrgInbox: true
    }).sort({ updatedAt: -1 }).populate('participants', 'name username avatar email');

    // For each conversation, get the latest message
    const enriched = await Promise.all(conversations.map(async (conv) => {
      const lastMessage = await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 }).populate('senderId', 'name');
      return { ...conv.toObject(), lastMessage };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// Get org's public-facing info + events + announcements for the public profile page
router.get('/:id/public-profile', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('name orgType description logo coverImage email phone website address verified publicStatus events announcements');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const memberCount = await OrganizationMember.countDocuments({ organizationId: req.params.id });
    res.json({ ...org.toObject(), memberCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
