const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const SupportMessage = require('../models/SupportMessage');
const SystemAnnouncement = require('../models/SystemAnnouncement');
const Notification = require('../models/Notification');
const SupportAuditLog = require('../models/SupportAuditLog');
const SupportFaq = require('../models/SupportFaq');
const { sendAnnouncementEmail } = require('../services/otpService');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_aether_key_12948194';

// ─── Audit Logger Helper ──────────────────────────────────────────────────────
async function logAudit({ agentId, agentName, action, targetType = 'System', targetId = '', targetName = '', details = '' }) {
  try {
    await SupportAuditLog.create({
      agentId,
      agentName: agentName || 'Support Staff',
      action,
      targetType,
      targetId,
      targetName,
      details
    });
  } catch (err) {
    console.error('[Support Audit Log Error]:', err);
  }
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const requireAuth = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    try {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      req.userId = decoded.id;
      req.user = user;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Authentication error' });
    }
  });
};

const requireSupport = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Support role required.' });
    }
    next();
  });
};

const requireAdmin = (req, res, next) => {
  requireSupport(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
  });
};

// ─── Dashboard Stats & System Health ──────────────────────────────────────────

router.get('/dashboard', requireSupport, async (req, res) => {
  try {
    const now = new Date();
    const [totalUsers, bannedUsers, supportUsers, suspendedUsers, pendingMessages, recentUsers, faqCount] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ banned: true }),
      User.countDocuments({ role: { $in: ['support', 'admin'] } }),
      User.countDocuments({ suspendedUntil: { $gt: now } }),
      SupportMessage.countDocuments({ resolved: false }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name username email avatar accountType role banned suspendedUntil createdAt'),
      SupportFaq.countDocuments({ active: true })
    ]);
    res.json({
      totalUsers,
      bannedUsers,
      activeUsers: totalUsers - bannedUsers,
      supportUsers,
      suspendedUsers,
      pendingMessages,
      faqCount,
      recentSignups: recentUsers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/system-health', requireSupport, async (req, res) => {
  try {
    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();
    res.json({
      uptime: uptimeSeconds,
      formattedUptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`,
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      },
      dbState: 'Connected (MongoDB Active)',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system health metrics' });
  }
});

// ─── Users & Staff Notes ──────────────────────────────────────────────────────

router.get('/users', requireSupport, async (req, res) => {
  const { q, role, accountType, status, page = 1, limit = 20 } = req.query;
  try {
    const query = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: new RegExp(escaped, 'i') },
        { username: new RegExp(escaped, 'i') },
        { email: new RegExp(escaped, 'i') },
      ];
    }
    if (role) query.role = role;
    if (accountType) query.accountType = accountType;
    if (status === 'banned') query.banned = true;
    if (status === 'active') query.banned = false;
    if (status === 'suspended') query.suspendedUntil = { $gt: new Date() };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-password -otp -otpExpires'),
      User.countDocuments(query),
    ]);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', requireSupport, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpires').populate('bannedBy', 'name username');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Add Staff Internal Note to User Profile
router.post('/users/:id/notes', requireSupport, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Note content is required' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.internalNotes.push({
      authorId: req.userId,
      authorName: req.user.name || 'Support Agent',
      text: text.trim()
    });

    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'ADD_INTERNAL_NOTE',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Added note: "${text.trim().substring(0, 50)}..."`
    });

    res.json({ message: 'Internal staff note added', internalNotes: user.internalNotes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff note' });
  }
});

// Ban / Block user straight
router.put('/users/:id/ban', requireSupport, async (req, res) => {
  const reason = (req.body.reason || '').trim() || 'Blocked directly by Support Team';
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot ban an admin' });
    if (user.banned) return res.status(400).json({ error: 'User is already blocked' });
    user.banned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = req.userId;
    user.suspendedUntil = null;
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'BAN_USER',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Reason: ${reason}`
    });

    res.json({ message: 'User blocked straight by support', user: { _id: user._id, name: user.name, banned: true, banReason: reason } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unban
router.put('/users/:id/unban', requireSupport, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.banned) return res.status(400).json({ error: 'User is not banned' });
    user.banned = false;
    user.banReason = '';
    user.bannedAt = null;
    user.bannedBy = null;
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'UNBAN_USER',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: 'Unbanned user account'
    });

    res.json({ message: 'User unbanned', user: { _id: user._id, name: user.name, banned: false } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Suspend (temporary)
router.put('/users/:id/suspend', requireSupport, async (req, res) => {
  const { reason, until } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Suspend reason is required' });
  if (!until) return res.status(400).json({ error: 'Suspension end date is required' });
  const untilDate = new Date(until);
  if (isNaN(untilDate.getTime()) || untilDate <= new Date()) {
    return res.status(400).json({ error: 'Suspension end date must be in the future' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot suspend an admin' });
    if (user.banned) return res.status(400).json({ error: 'User is permanently banned. Unban first.' });
    user.suspendedUntil = untilDate;
    user.suspendReason = reason;
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'SUSPEND_USER',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Suspended until ${untilDate.toLocaleDateString()}. Reason: ${reason}`
    });

    res.json({ message: 'User suspended', user: { _id: user._id, name: user.name, suspendedUntil: untilDate, suspendReason: reason } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Lift suspension
router.put('/users/:id/unsuspend', requireSupport, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.suspendedUntil = null;
    user.suspendReason = '';
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'UNSUSPEND_USER',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: 'Lifted temporary suspension'
    });

    res.json({ message: 'Suspension lifted', user: { _id: user._id, name: user.name, suspendedUntil: null } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lift suspension' });
  }
});

// Change role (admin only)
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'support', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._id.toString() === req.userId) return res.status(400).json({ error: 'Cannot change your own role' });
    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'CHANGE_ROLE',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Role updated from ${oldRole} to ${role}`
    });

    res.json({ message: 'Role updated', user: { _id: user._id, name: user.name, role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Force reset user password (admin only)
router.put('/users/:id/reset-password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin' && user._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Cannot change password of another admin' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'RESET_PASSWORD',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: 'Force reset user account password'
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._id.toString() === req.userId) return res.status(400).json({ error: 'Cannot delete your own account' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete an admin' });
    
    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'DELETE_USER',
      targetType: 'User',
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Permanently deleted account ${user.email}`
    });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── Support Messages (Inbox) ─────────────────────────────────────────────────

// Get all tickets (support view)
router.get('/messages', requireSupport, async (req, res) => {
  try {
    const messages = await SupportMessage.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name username email avatar')
      .populate('replies.supportId', 'name username avatar role');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// AI Assistant helper for support tickets with website context knowledge & dynamic FAQs
async function generateAiSupportReply(ticket, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Aether AI Assistant is currently undergoing system maintenance. Our human support team will respond shortly.";

  // Fetch active knowledge base FAQs from database
  let dynamicFaqText = '';
  try {
    const activeFaqs = await SupportFaq.find({ active: true }).limit(20);
    if (activeFaqs.length > 0) {
      dynamicFaqText = `\n\nCUSTOM KNOWLEDGE BASE FAQS & VERIFIED SOLUTIONS:\n` + 
        activeFaqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    }
  } catch (faqErr) {
    console.error('[Support AI] FAQ fetch error:', faqErr);
  }

  const systemContext = `You are Aether AI Support Agent, an expert assistant built into AetherChat (a full-featured real-time desktop & web communication application).
You must assist users with concise, helpful, friendly, and accurate solutions regarding the application components and features:

AETHERCHAT APPLICATION COMPONENTS & FEATURES KNOWLEDGE BASE:
1. **My Profile & Settings (SettingsView)**:
   - Profile: Edit Display Name, Username, Bio, Website, Location, and Avatar photo.
   - Appearance: Toggle Dark/Light themes, primary accent colors (Emerald, Blue, Violet, Rose, Amber), font size, bubble styles, wallpaper grids.
   - Privacy & Security: Enable PIN Lock (4-digit security code), Face ID, 2FA, adjust Last Seen visibility & Read Receipts.
   - Account Upgrade: Convert Personal accounts into Business or Organization workspace accounts.
   - Help Center: Submit support tickets directly to the Aether Support Team.

2. **Messaging & Chats (ChatWindow / Sidebar)**:
   - Real-time 1-on-1 private messaging, voice notes, media file uploads (images, audio, video, documents up to 50MB via Cloudinary).
   - Message options: Pin messages, reply/quote, delete, react with emojis, search in conversation, disappearing messages.
   - Audio & Video Calling: Peer-to-peer webRTC call overlays.

3. **Communities & Channels**:
   - Create or join public/private channels & community hubs with categories, topic threads, and member management.

4. **Business & Organization Workspaces**:
   - Business Dashboard: Store catalog, booking schedules, staff roster, quick auto-replies, customer analytics.
   - Organization Workspace: Project Kanban boards, team assignments, department chats, organizational hierarchy.

5. **AI Co-Pilot (Aether AI)**:
   - Access via AI chat sidebar tab or smart replies. Can answer questions, translate text, summarize chats, and generate synthetic images via [IMAGE] prompt syntax.${dynamicFaqText}

INSTRUCTIONS FOR SUPPORT RESPONSE:
- Address the user's issue directly and politely.
- Provide step-by-step instructions on which menu or tab in AetherChat to click.
- Keep the response clear, structured with markdown bullet points if necessary.`;

  try {
    const contents = [
      {
        role: 'user',
        parts: [{ text: `User Ticket Category: ${ticket.subject || 'General'}\nUser Message: ${userPrompt}` }]
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemContext }] }
      })
    });

    if (!response.ok) {
      console.error('[Support AI] Gemini API Error status:', response.status);
      return "Thank you for reaching out to Aether Support! Our support team has logged your ticket and an agent will follow up with you shortly.";
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Thank you for contacting Aether Support. Your issue has been logged.";
  } catch (err) {
    console.error('[Support AI] Generation error:', err);
    return "Thank you for contacting Aether Support. An agent will review your inquiry shortly.";
  }
}

// Sandbox AI testing for Knowledge Base
router.post('/messages/test-ai-sandbox', requireSupport, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });
  try {
    const dummyTicket = { subject: 'Knowledge Base Sandbox Test', message: prompt };
    const reply = await generateAiSupportReply(dummyTicket, prompt);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Failed to test AI response' });
  }
});

// Reply to ticket (manual or trigger AI)
router.post('/messages/:id/reply', requireSupport, async (req, res) => {
  const { message, isAi } = req.body;
  try {
    const ticket = await SupportMessage.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Message not found' });

    let replyMessage = message;
    let senderName = req.user.name || 'Support Agent';
    let isAiReply = !!isAi;

    if (isAiReply) {
      replyMessage = await generateAiSupportReply(ticket, ticket.message);
      senderName = 'Aether AI Support';
    } else {
      if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    }

    ticket.replies.push({
      supportId: isAiReply ? null : req.userId,
      isAi: isAiReply,
      senderName,
      message: replyMessage
    });

    await ticket.save();
    const populated = await ticket.populate('replies.supportId', 'name username avatar');

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'REPLY_TICKET',
      targetType: 'SupportMessage',
      targetId: ticket._id.toString(),
      targetName: `Ticket #${ticket._id.toString().slice(-4)}`,
      details: isAiReply ? 'Generated AI response reply' : `Replied: "${replyMessage.substring(0, 40)}..."`
    });

    res.json({ message: 'Reply sent', ticket: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply' });
  }
});

// Toggle AI Mode on ticket
router.put('/messages/:id/ai-mode', requireSupport, async (req, res) => {
  try {
    const ticket = await SupportMessage.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Message not found' });

    ticket.aiMode = !ticket.aiMode;

    // If AI Mode turned on, generate auto-reply immediately
    if (ticket.aiMode) {
      const aiReply = await generateAiSupportReply(ticket, ticket.message);
      ticket.replies.push({
        supportId: null,
        isAi: true,
        senderName: 'Aether AI Support (Auto)',
        message: aiReply
      });
    }

    await ticket.save();
    const populated = await ticket.populate('replies.supportId', 'name username avatar');
    res.json({
      message: ticket.aiMode ? 'AI Auto-Reply Mode activated' : 'Manual Mode activated',
      aiMode: ticket.aiMode,
      ticket: populated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle AI mode' });
  }
});

// Mark ticket resolved / unresolved
router.put('/messages/:id/resolve', requireSupport, async (req, res) => {
  try {
    const ticket = await SupportMessage.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Message not found' });
    ticket.resolved = !ticket.resolved;
    await ticket.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: ticket.resolved ? 'RESOLVE_TICKET' : 'REOPEN_TICKET',
      targetType: 'SupportMessage',
      targetId: ticket._id.toString(),
      targetName: `Ticket #${ticket._id.toString().slice(-4)}`,
      details: ticket.resolved ? 'Marked ticket as resolved' : 'Reopened ticket'
    });

    res.json({ message: ticket.resolved ? 'Ticket resolved' : 'Ticket reopened', resolved: ticket.resolved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Delete ticket (admin only)
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'DELETE_TICKET',
      targetType: 'SupportMessage',
      targetId: req.params.id,
      targetName: `Ticket #${req.params.id.slice(-4)}`,
      details: 'Deleted support ticket'
    });

    await SupportMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// User sends a support ticket
router.post('/contact', requireAuth, async (req, res) => {
  try {
    const { message, subject, aiMode } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const ticket = new SupportMessage({
      userId: req.userId,
      message,
      subject: subject || 'General Issue',
      aiMode: !!aiMode
    });

    if (aiMode) {
      const aiReplyText = await generateAiSupportReply(ticket, message);
      ticket.replies.push({
        supportId: null,
        isAi: true,
        senderName: 'Aether AI Support (Auto)',
        message: aiReplyText
      });
    }

    await ticket.save();
    res.status(201).json({ message: 'Support ticket submitted', ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// User views their own tickets
router.get('/my-tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await SupportMessage.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('replies.supportId', 'name avatar');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── Knowledge Base / FAQs ─────────────────────────────────────────────────────

// Get FAQs (Support and Public)
router.get('/faqs', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { question: new RegExp(escaped, 'i') },
        { answer: new RegExp(escaped, 'i') },
        { tags: new RegExp(escaped, 'i') }
      ];
    }
    const faqs = await SupportFaq.find(query).sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge base FAQs' });
  }
});

// Create FAQ item
router.post('/faqs', requireSupport, async (req, res) => {
  const { question, answer, category, tags } = req.body;
  if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: 'Question and Answer are required' });

  try {
    const tagArray = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const faq = await SupportFaq.create({
      question: question.trim(),
      answer: answer.trim(),
      category: category || 'General',
      tags: tagArray,
      createdBy: req.userId
    });

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'CREATE_FAQ',
      targetType: 'SupportFaq',
      targetId: faq._id.toString(),
      targetName: faq.question,
      details: `Created knowledge base FAQ in category ${faq.category}`
    });

    res.status(201).json({ message: 'Knowledge base FAQ created', faq });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// Update FAQ item
router.put('/faqs/:id', requireSupport, async (req, res) => {
  const { question, answer, category, tags, active } = req.body;
  try {
    const faq = await SupportFaq.findById(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ item not found' });

    if (question) faq.question = question.trim();
    if (answer) faq.answer = answer.trim();
    if (category) faq.category = category;
    if (tags !== undefined) faq.tags = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    if (active !== undefined) faq.active = !!active;
    faq.updatedAt = new Date();

    await faq.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'UPDATE_FAQ',
      targetType: 'SupportFaq',
      targetId: faq._id.toString(),
      targetName: faq.question,
      details: `Updated FAQ item`
    });

    res.json({ message: 'FAQ updated', faq });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// Delete FAQ item
router.delete('/faqs/:id', requireSupport, async (req, res) => {
  try {
    const faq = await SupportFaq.findById(req.params.id);
    if (!faq) return res.status(404).json({ error: 'FAQ item not found' });

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'DELETE_FAQ',
      targetType: 'SupportFaq',
      targetId: faq._id.toString(),
      targetName: faq.question,
      details: 'Deleted knowledge base FAQ'
    });

    await SupportFaq.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

router.get('/audit-logs', requireSupport, async (req, res) => {
  const { page = 1, limit = 30, action, q } = req.query;
  try {
    const query = {};
    if (action) query.action = action;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { agentName: new RegExp(escaped, 'i') },
        { targetName: new RegExp(escaped, 'i') },
        { details: new RegExp(escaped, 'i') },
        { action: new RegExp(escaped, 'i') }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      SupportAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('agentId', 'name avatar role'),
      SupportAuditLog.countDocuments(query)
    ]);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─── Announcements ────────────────────────────────────────────────────────────

// Public: all users can fetch active announcements
router.get('/announcements/public', async (req, res) => {
  try {
    const now = new Date();
    const announcements = await SystemAnnouncement.find({
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ pinned: -1, createdAt: -1 })
      .populate('createdBy', 'name')
      .limit(10);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Support: get all announcements (including inactive)
router.get('/announcements', requireSupport, async (req, res) => {
  try {
    const announcements = await SystemAnnouncement.find()
      .sort({ pinned: -1, createdAt: -1 })
      .populate('createdBy', 'name username');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/announcements', requireSupport, async (req, res) => {
  const { title, message, type, expiresAt, pinned } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const ann = await SystemAnnouncement.create({
      title: title.trim(),
      message: message.trim(),
      type: type || 'info',
      createdBy: req.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      pinned: !!pinned,
    });
    await ann.populate('createdBy', 'name username');

    // Fetch all registered users with emails
    const allUsers = await User.find({ email: { $exists: true, $ne: '' } }).select('_id email');
    const userEmails = [...new Set(allUsers.map(u => u.email).filter(Boolean))];

    // 1. Send email broadcast
    sendAnnouncementEmail(userEmails, ann).catch(e => console.error('Error sending announcement emails:', e));

    // 2. Create in-app notifications
    const notifDocs = allUsers.map(u => ({
      userId: u._id,
      type: 'announcement',
      title: `📢 ${ann.title}`,
      content: ann.message,
      unread: true,
    }));
    Notification.insertMany(notifDocs).catch(e => console.error('Error creating announcement notifications:', e));

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'SystemAnnouncement',
      targetId: ann._id.toString(),
      targetName: ann.title,
      details: `Published system announcement to ${userEmails.length} user(s)`
    });

    res.status(201).json({
      message: `Announcement published & emailed to ${userEmails.length} user(s)`,
      announcement: ann,
      recipientCount: userEmails.length
    });
  } catch (error) {
    console.error('Announcement creation failed:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Toggle active
router.put('/announcements/:id/toggle', requireSupport, async (req, res) => {
  try {
    const ann = await SystemAnnouncement.findById(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    ann.active = !ann.active;
    await ann.save();

    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: ann.active ? 'ACTIVATE_ANNOUNCEMENT' : 'DEACTIVATE_ANNOUNCEMENT',
      targetType: 'SystemAnnouncement',
      targetId: ann._id.toString(),
      targetName: ann.title,
      details: ann.active ? 'Activated announcement' : 'Deactivated announcement'
    });

    res.json({ message: ann.active ? 'Announcement activated' : 'Announcement deactivated', active: ann.active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle announcement' });
  }
});

// Toggle pinned
router.put('/announcements/:id/pin', requireSupport, async (req, res) => {
  try {
    const ann = await SystemAnnouncement.findById(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    ann.pinned = !ann.pinned;
    await ann.save();
    res.json({ message: ann.pinned ? 'Pinned' : 'Unpinned', pinned: ann.pinned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement (admin only)
router.delete('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    await logAudit({
      agentId: req.userId,
      agentName: req.user.name,
      action: 'DELETE_ANNOUNCEMENT',
      targetType: 'SystemAnnouncement',
      targetId: req.params.id,
      details: 'Deleted announcement'
    });

    await SystemAnnouncement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get('/analytics', requireSupport, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      accountTypeDistribution,
      roleDistribution,
      statusCounts,
      userGrowthRaw,
      ticketGrowthRaw,
      ticketSubjectDistribution,
      totalTickets,
      resolvedTickets,
      aiTicketCount,
    ] = await Promise.all([
      User.countDocuments({}),

      User.aggregate([
        { $group: { _id: '$accountType', count: { $sum: 1 } } },
      ]),

      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      Promise.all([
        User.countDocuments({ banned: false, suspendedUntil: null }),
        User.countDocuments({ banned: true }),
        User.countDocuments({ suspendedUntil: { $gt: now }, banned: false }),
      ]),

      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      SupportMessage.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      SupportMessage.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      SupportMessage.countDocuments({}),
      SupportMessage.countDocuments({ resolved: true }),
      SupportMessage.countDocuments({ aiMode: true }),
    ]);

    // Build user growth for last 30 days
    const userGrowthMap = {};
    userGrowthRaw.forEach(d => { userGrowthMap[d._id] = d.count; });
    const userGrowth = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      userGrowth.push({ date: key, count: userGrowthMap[key] || 0 });
    }

    // Build ticket growth for last 30 days
    const ticketGrowthMap = {};
    ticketGrowthRaw.forEach(d => { ticketGrowthMap[d._id] = d.count; });
    const ticketGrowth = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      ticketGrowth.push({ date: key, count: ticketGrowthMap[key] || 0 });
    }

    res.json({
      totalUsers,
      accountTypeDistribution: accountTypeDistribution.reduce((acc, d) => { acc[d._id || 'unknown'] = d.count; return acc; }, {}),
      roleDistribution: roleDistribution.reduce((acc, d) => { acc[d._id || 'unknown'] = d.count; return acc; }, {}),
      activeUsers: statusCounts[0],
      bannedUsers: statusCounts[1],
      suspendedUsers: statusCounts[2],
      userGrowth,
      ticketGrowth,
      ticketSubjectDistribution: ticketSubjectDistribution.map(d => ({ subject: d._id || 'General', count: d.count })),
      totalTickets,
      resolvedTickets,
      unresolvedTickets: totalTickets - resolvedTickets,
      aiTicketCount,
      resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;
