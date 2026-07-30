require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const webPush = require('web-push');

// Models
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Status = require('./models/Status');
const Channel = require('./models/Channel');
const Community = require('./models/Community');
const Task = require('./models/Task');
const Notification = require('./models/Notification');
const ContactRequest = require('./models/ContactRequest');
const Business = require('./models/Business');
const Organization = require('./models/Organization');
const Department = require('./models/Department');
const OrganizationMember = require('./models/OrganizationMember');
const Invitation = require('./models/Invitation');
const JoinRequest = require('./models/JoinRequest');
const PushSubscription = require('./models/PushSubscription');
const SystemAnnouncement = require('./models/SystemAnnouncement');

// Services
const { sendOtpSms, sendOtpEmail } = require('./services/otpService');
const { uploadFile, deleteFile, parseCloudinaryUrl } = require('./services/cloudinaryService');

// Global variables
const activeSockets = new Map();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Enable CORS and JSON parsing
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads

// Serve static uploaded files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Path to production client build
const distPath = path.join(__dirname, '..', 'client', 'dist');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aetherchat';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    
    // Auto-seed support admin account
    await seedSupportAccount();
    
    // Start task reminder checker only after DB is connected
    setInterval(async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const endOfToday = new Date();
        endOfToday.setHours(23,59,59,999);

        // 1. Tasks Due Today
        const dueTodayTasks = await Task.find({
          dueDate: { $gte: startOfToday, $lte: endOfToday },
          status: { $ne: 'Completed' }
        });

        for (const task of dueTodayTasks) {
          if (task.assignedTo) {
            const exists = await Notification.findOne({
              userId: task.assignedTo,
              type: 'task_due_today',
              taskId: task._id,
              createdAt: { $gte: startOfToday }
            });
            if (!exists) {
              const notif = new Notification({
                userId: task.assignedTo,
                type: 'task_due_today',
                title: 'Task Due Today',
                content: `Reminder: Your assigned task "${task.title}" is due today.`,
                taskId: task._id
              });
              await notif.save();
              
              const socketId = activeSockets.get(task.assignedTo.toString());
              if (socketId) {
                io.to(socketId).emit('taskReminder', { task, type: 'due_today', notification: notif });
              }
            }
          }
        }

        // 2. Overdue Tasks
        const overdueTasks = await Task.find({
          dueDate: { $lt: startOfToday },
          status: { $ne: 'Completed' }
        });

        for (const task of overdueTasks) {
          if (task.assignedTo) {
            const exists = await Notification.findOne({
              userId: task.assignedTo,
              type: 'task_overdue',
              taskId: task._id
            });
            if (!exists) {
              const notif = new Notification({
                userId: task.assignedTo,
                type: 'task_overdue',
                title: 'Task Overdue âš ï¸',
                content: `Alert: Your assigned task "${task.title}" is overdue.`,
                taskId: task._id
              });
              await notif.save();

              const socketId = activeSockets.get(task.assignedTo.toString());
              if (socketId) {
                io.to(socketId).emit('taskReminder', { task, type: 'overdue', notification: notif });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking due/overdue tasks:', err);
      }
    }, 6 * 60 * 60 * 1000); // Check every 6 hours
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Troubleshooting Tips:');
      console.error('1. Whitelist your current IP address in your MongoDB Atlas Dashboard (under "Network Access").');
      console.error('   If you are testing locally, adding "0.0.0.0/0" will allow connections from any IP.');
      console.error('2. Make sure you are connected to the internet.');
      console.error('3. If you want to use a local database, change MONGODB_URI in server/.env to:\n   MONGODB_URI=mongodb://127.0.0.1:27017/aetherchat\n');
    }
  });

// JWT Verification Middleware
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

// Conversation Membership Validation Middleware
const verifyConversationMember = async (req, res, next) => {
  const { conversationId } = req.body;
  const cId = conversationId || req.query.conversationId || req.params.conversationId;
  if (!cId) return res.status(400).json({ error: 'Conversation ID is required' });

  try {
    const convo = await Conversation.findById(cId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });
    }
    req.conversation = convo;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error validating conversation membership' });
  }
};

// Task Membership Validation Middleware
const verifyTaskMember = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const convo = await Conversation.findById(task.conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation associated with this task not found' });

    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });
    }
    req.task = task;
    req.conversation = convo;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error validating task membership' });
  }
};

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    
    // Auto-seed support admin account
    await seedSupportAccount();
    
    // Start task reminder checker only after DB is connected
    setInterval(async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const endOfToday = new Date();
        endOfToday.setHours(23,59,59,999);

        // 1. Tasks Due Today
        const dueTodayTasks = await Task.find({
          dueDate: { $gte: startOfToday, $lte: endOfToday },
          status: { $ne: 'Completed' }
        });

        for (const task of dueTodayTasks) {
          if (task.assignedTo) {
            const exists = await Notification.findOne({
              userId: task.assignedTo,
              type: 'task_due_today',
              taskId: task._id,
              createdAt: { $gte: startOfToday }
            });
            if (!exists) {
              const notif = new Notification({
                userId: task.assignedTo,
                type: 'task_due_today',
                title: 'Task Due Today',
                content: `Reminder: Your assigned task "${task.title}" is due today.`,
                taskId: task._id
              });
              await notif.save();
              
              const socketId = activeSockets.get(task.assignedTo.toString());
              if (socketId) {
                io.to(socketId).emit('taskReminder', { task, type: 'due_today', notification: notif });
              }
            }
          }
        }

        // 2. Overdue Tasks
        const overdueTasks = await Task.find({
          dueDate: { $lt: startOfToday },
          status: { $ne: 'Completed' }
        });

        for (const task of overdueTasks) {
          if (task.assignedTo) {
            const exists = await Notification.findOne({
              userId: task.assignedTo,
              type: 'task_overdue',
              taskId: task._id
            });
            if (!exists) {
              const notif = new Notification({
                userId: task.assignedTo,
                type: 'task_overdue',
                title: 'Task Overdue âš ï¸',
                content: `Alert: Your assigned task "${task.title}" is overdue.`,
                taskId: task._id
              });
              await notif.save();

              const socketId = activeSockets.get(task.assignedTo.toString());
              if (socketId) {
                io.to(socketId).emit('taskReminder', { task, type: 'overdue', notification: notif });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking due/overdue tasks:', err);
      }
    }, 6 * 60 * 60 * 1000); // Check every 6 hours
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Troubleshooting Tips:');
      console.error('1. Whitelist your current IP address in your MongoDB Atlas Dashboard (under "Network Access").');
      console.error('   If you are testing locally, adding "0.0.0.0/0" will allow connections from any IP.');
      console.error('2. Make sure you are connected to the internet.');
      console.error('3. If you want to use a local database, change MONGODB_URI in server/.env to:\n   MONGODB_URI=mongodb://127.0.0.1:27017/aetherchat\n');
    }
  });



// Conversation Membership Validation Middleware
const verifyConversationMember = async (req, res, next) => {
  const { conversationId } = req.body;
  const cId = conversationId || req.query.conversationId || req.params.conversationId;
  if (!cId) return res.status(400).json({ error: 'Conversation ID is required' });

  try {
    const convo = await Conversation.findById(cId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });
    }
    req.conversation = convo;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error validating conversation membership' });
  }
};

// Task Membership Validation Middleware
const verifyTaskMember = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const convo = await Conversation.findById(task.conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation associated with this task not found' });

    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });
    }
    req.task = task;
    req.conversation = convo;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error validating task membership' });
  }
};

// Business & Organization Routes (modular)
const businessRoutes = require('./routes/business');
const organizationRoutes = require('./routes/organizations');
const businessExtrasRoutes = require('./routes/business-extras');
const organizationExtrasRoutes = require('./routes/organization-extras');
const organizationChatRoutes = require('./routes/organization-chat');
app.use('/api/business', businessRoutes);
app.use('/api/business', businessExtrasRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/organizations', organizationExtrasRoutes);
app.use('/api/organizations', organizationChatRoutes);

// ── Web Push: configure VAPID keys ──────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:support@aetherchat.io',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[Push] VAPID keys configured ✓');
} else {
  console.warn('[Push] VAPID keys not set — push notifications disabled.');
}

// Helper: send a push notification to all subscriptions for a user
async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const subs = await PushSubscription.find({ userId });
    const jsonPayload = JSON.stringify(payload);
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            jsonPayload
          );
        } catch (err) {
          // 410 Gone = subscription expired, remove it
          if (err.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: sub._id });
          }
        }
      })
    );
  } catch (err) {
    console.warn('[Push] sendPushToUser error:', err.message);
  }
}

// POST /api/push/subscribe — save a push subscription for the authed user
app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }
  try {
    // Upsert: replace existing sub for this endpoint
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.userId, endpoint, keys, userAgent: req.headers['user-agent'] || '', updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

// DELETE /api/push/unsubscribe — remove push subscription
app.delete('/api/push/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  try {
    await PushSubscription.deleteMany({ userId: req.userId, ...(endpoint ? { endpoint } : {}) });
    res.json({ message: 'Push subscription removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
});

// GET /api/push/vapid-public-key — expose VAPID public key to the client
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Auto-seed support admin account on startup
async function seedSupportAccount() {
  const supportEmail = process.env.SUPPORT_EMAIL;
  const supportPassword = process.env.SUPPORT_PASSWORD;
  const supportName = process.env.SUPPORT_NAME || 'Aether Support';
  if (!supportEmail || !supportPassword) return;
  try {
    const existing = await User.findOne({ email: supportEmail.toLowerCase() });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`Support account upgraded to admin: ${supportEmail}`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(supportPassword, 10);
      const user = new User({
        name: supportName,
        username: 'aether_support',
        email: supportEmail.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        verified: true,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=aether_support`
      });
    await user.save();
      console.log(`Support admin account created: ${supportEmail}`);
    }
    
    // Auto-seed initial real user accounts if database is empty or low
    const userCount = await User.countDocuments({});
    if (userCount <= 1) {
      const defaultUsers = [
        { name: 'Sarah Jenkins', username: 'sarah_j', email: 'sarah.jenkins@example.com', role: 'user', accountType: 'personal', bio: 'Product designer & Tech enthusiast', verified: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
        { name: 'Marcus Chen', username: 'marcus_c', email: 'marcus.chen@example.com', role: 'user', accountType: 'business', bio: 'Software engineer building web apps', verified: true, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
        { name: 'Elena Rostova', username: 'elena_r', email: 'elena.rostova@example.com', role: 'support', accountType: 'personal', bio: 'Aether Support Specialist', verified: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
        { name: 'David Kim', username: 'david_k', email: 'david.kim@example.com', role: 'user', accountType: 'organization', bio: 'Team lead at Apex Solutions', verified: true, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
        { name: 'Alex Morgan', username: 'alex_m', email: 'alex.morgan@example.com', role: 'user', accountType: 'personal', bio: 'Digital nomad & Writer', verified: false, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' }
      ];
      const passHash = await bcrypt.hash('User1234!', 10);
      for (const u of defaultUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
          await User.create({ ...u, password: passHash });
        }
      }
      console.log('Seeded initial real user accounts for support dashboard.');
    }
  } catch (err) {
    console.error('Failed to seed support account:', err);
  }
}}; }} // Remove duplicate code blocks

// Mount support routes after seeding
const supportRoutes = require('./routes/support');
app.use('/api/support', supportRoutes);

// ----------------------------------------------------
// REST ROUTES
// ----------------------------------------------------

// 1. Request OTP Code via Email
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, phone } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });

  try {
    // Generate a secure 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validation window

    // Find or create user by email
    let user = await User.findOne({ email });
    if (!user) {
      const username = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      user = new User({
        name: `Aether User ${username.split('_')[1]}`,
        username,
        email,
        phone: phone || '',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
      });
    } else {
      if (!user.username) {
        user.username = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!user.name) {
        user.name = `Aether User ${user.username.split('_')[1] || Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (phone) {
        user.phone = phone;
      }
    }

    user.otp = otp;
    user.otpExpires = expiry;
    await user.save();
    console.log(`[DEVELOPMENT] Generated OTP verification code for ${email}: ${otp}`);

    // Dispatch OTP code directly to user's registered email
    try {
      await sendOtpEmail(email, otp);
      console.log(`OTP verification email dispatched to ${email}`);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr);
    }

    // Optionally dispatch OTP code via SMS as fallback if phone is present
    if (user.phone) {
      try {
        await sendOtpSms(user.phone, otp);
      } catch (smsErr) {
        console.error('Failed to send OTP SMS:', smsErr);
      }
    }

    res.json({ message: 'Verification OTP code dispatched successfully', email });
  } catch (error) {
    console.error('OTP send failed:', error);
    res.status(500).json({ error: 'Failed to send OTP verification code' });
  }
});

// 2. Verify OTP & Authenticate/Register
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  console.log(`[VERIFY OTP REQUEST] Email: "${email}", Code: "${code}"`);
  if (!email || !code) return res.status(400).json({ error: 'Email and OTP code are required' });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[VERIFY OTP FAILED] User not found for email: "${email}"`);
      return res.status(404).json({ error: 'User registration index not found' });
    }

    console.log(`[VERIFY OTP COMPARISON] Entered code: "${code}" (type: ${typeof code}), DB saved OTP: "${user.otp}" (type: ${typeof user.otp})`);
    if (user.otp !== code) {
      console.log(`[VERIFY OTP FAILED] Code mismatch. Entered: "${code}", Expected: "${user.otp}"`);
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    if (user.otpExpires < new Date()) {
      console.log(`[VERIFY OTP FAILED] Code expired. Expiry: ${user.otpExpires}, Current: ${new Date()}`);
      return res.status(400).json({ error: 'Expired verification code' });
    }

    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;
    user.verified = true;
    await user.save();

    // Generate login token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'super_secret_aether_key_12948194', { expiresIn: '7d' });

    res.json({ token, user });
  } catch (error) {
    console.error('OTP verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// 2.5. Request Password Reset Code
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const searchEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: searchEmail });
    if (!user) return res.status(404).json({ error: 'User not found with this email' });

    // Generate a secure 6-digit numeric OTP reset code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validation window

    user.otp = otp;
    user.otpExpires = expiry;
    await user.save();

    console.log(`[DEVELOPMENT] Password reset code for ${searchEmail}: ${otp}`);

    try {
      await sendOtpEmail(searchEmail, otp);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
    }

    res.json({ message: 'Reset code sent to email' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// 2.6. Reset Password with Code
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and newPassword are required' });
  }
  try {
    const searchEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: searchEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.otp !== code) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'Expired reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// 3. Register user directly
app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password, phone, accountType } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields (name, username, email, password) are required' });
  }
  try {
    const emailLower = email.trim().toLowerCase();
    const usernameLower = username.trim().toLowerCase();

    // Block registering with support email
    const supportEmail = (process.env.SUPPORT_EMAIL || '').toLowerCase();
    if (emailLower === supportEmail) {
      return res.status(400).json({ error: 'This email is reserved' });
    }

    let existing = await User.findOne({ $or: [{ email: emailLower }, { username: usernameLower }] });
    if (existing) return res.status(400).json({ error: 'Username or email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const type = accountType || 'personal';
    const user = new User({
      name,
      username: usernameLower,
      email: emailLower,
      password: hashedPassword,
      phone: phone || '',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameLower}`,
      verified: true,
      accountType: type
    });

    // If business account, auto-create a Business document
    if (type === 'business') {
      const business = new Business({
        owner: user._id,
        businessName: req.body.businessName || name + "'s Business",
        category: req.body.category || '',
        description: req.body.description || '',
        phone: phone || '',
        email: emailLower,
        address: req.body.address || ''
      });
      await business.save();
      user.businessProfile = business._id;
    }

    // If organization account, auto-create Organization + internal chat
    let org;
    if (type === 'organization') {
      org = new Organization({
        name: req.body.orgName || name + "'s Organization",
        orgType: req.body.orgType || 'other',
        description: req.body.orgDescription || '',
        email: emailLower,
        phone: phone || '',
        founder: user._id,
        publicStatus: 'Active'
      });
      await org.save();

      // Create founder membership
      const member = new OrganizationMember({
        organizationId: org._id,
        userId: user._id,
        role: 'founder'
      });
      await member.save();

      // Create internal group conversation for the org
      const internalChat = new Conversation({
        type: 'group',
        name: org.name + ' Chat',
        participants: [user._id],
        creator: user._id,
        admins: [user._id],
        orgId: org._id,
        isOrgInbox: false
      });
      await internalChat.save();

      org.internalChatId = internalChat._id;
      await org.save();

      user.organizationMemberships = [member._id];
    }

    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'super_secret_aether_key_12948194', { expiresIn: '7d' });
    
    const userData = user.toObject();
    if (type === 'business') {
      const biz = await Business.findById(user.businessProfile);
      userData.businessData = biz;
    }
    if (type === 'organization' && org) {
      userData.organization = org;
      userData.internalChatId = org.internalChatId;
    }
    
    res.json({ token, user: userData });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// 3.1. Login user with password
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const searchVal = email.trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: searchVal },
        { username: searchVal }
      ]
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.banned) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'super_secret_aether_key_12948194', { expiresIn: '7d' });
    const userData = user.toObject();
    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// 3.2. Get user contacts list
app.get('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('contacts').populate('contacts', 'name username avatar email online');
    res.json(user.contacts || []);
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts list' });
  }
});

// 3.3. Add contact by username
app.post('/api/contacts/add', authenticateToken, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetUser = await User.findOne({ username: new RegExp(`^${escapedUsername}$`, 'i') });
    if (!targetUser) return res.status(404).json({ error: 'User not found with this username' });

    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot add yourself to contacts' });
    }

    const currentUser = await User.findById(req.userId);
    if (currentUser.contacts.includes(targetUser._id)) {
      return res.status(400).json({ error: 'User is already in your contacts list' });
    }

    currentUser.contacts.push(targetUser._id);
    await currentUser.save();
    res.json({ message: 'Contact added successfully', contact: targetUser });
  } catch (error) {
    console.error('Failed to add contact:', error);
  }
});
// 3.4. Send Contact Request
app.post('/api/contacts/request', authenticateToken, async (req, res) => {
  const { username, message } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetUser = await User.findOne({ username: new RegExp(`^${escapedUsername}$`, 'i') });
    
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser._id.toString() === req.userId) return res.status(400).json({ error: 'You cannot send a request to yourself' });

    // Check if already contacts
    const currentUser = await User.findById(req.userId);
    if (currentUser.contacts.includes(targetUser._id)) {
      return res.status(400).json({ error: 'User is already in your contacts' });
    }

    // Check if request already exists
    const existingRequest = await ContactRequest.findOne({
      $or: [
        { sender: req.userId, receiver: targetUser._id },
        { sender: targetUser._id, receiver: req.userId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending' && existingRequest.sender.toString() === req.userId) {
        return res.status(400).json({ error: 'Request already pending' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ error: 'You are already connected with this user' });
      }
      if (existingRequest.status === 'rejected' || existingRequest.status === 'blocked') {
        existingRequest.status = 'pending';
        existingRequest.message = message || '';
        existingRequest.respondedAt = null;
        await existingRequest.save();
        
        const notification = new Notification({
          userId: targetUser._id,
          type: 'contact_request',
          title: 'New Contact Request',
          content: `${currentUser.name} wants to connect with you`,
          contactRequestId: existingRequest._id,
          fromUserId: req.userId
        });
        await notification.save();

        const receiverSocket = activeSockets.get(targetUser._id.toString());
        if (receiverSocket) {
          io.to(receiverSocket).emit('new_notification', notification);
          io.to(receiverSocket).emit('contact_request_updated', { request: existingRequest, action: 'resent' });
        }

        return res.json({ message: 'Contact request resent', request: existingRequest, notification });
      }
    }

    const contactRequest = new ContactRequest({
      sender: req.userId,
      receiver: targetUser._id,
      message: message || '',
      status: 'pending'
    });
    await contactRequest.save();

    const notification = new Notification({
      userId: targetUser._id,
      type: 'contact_request',
      title: 'New Contact Request',
      content: `${currentUser.name} wants to connect with you`,
      contactRequestId: contactRequest._id,
      fromUserId: req.userId
    });
    await notification.save();

    const receiverSocket = activeSockets.get(targetUser._id.toString());
    if (receiverSocket) {
      io.to(receiverSocket).emit('new_notification', notification);
      io.to(receiverSocket).emit('contact_request_updated', { request: contactRequest, action: 'created' });
    }

    res.status(201).json({ message: 'Contact request sent', request: contactRequest, notification });
  } catch (error) {
    console.error('Failed to send contact request:', error);
    res.status(500).json({ error: 'Failed to send contact request' });
  }
});
// 3.5. Get Contact Requests (received)
app.get('/api/contacts/requests/received', authenticateToken, async (req, res) => {
  try {
    const requests = await ContactRequest.find({
      receiver: req.userId,
      status: 'pending'
    })
    .populate('sender', 'name username avatar email online')
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch contact requests:', error);
    res.status(500).json({ error: 'Failed to fetch contact requests' });
  }
});

// 3.6. Accept Contact Request
app.post('/api/contacts/requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const contactRequest = await ContactRequest.findById(req.params.requestId);
    if (!contactRequest) return res.status(404).json({ error: 'Request not found' });
    if (contactRequest.receiver.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    if (contactRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    contactRequest.status = 'accepted';
    contactRequest.respondedAt = new Date();
    await contactRequest.save();

    const sender = await User.findById(contactRequest.sender);
    const receiver = await User.findById(contactRequest.receiver);

    if (!sender.contacts.includes(receiver._id)) {
      sender.contacts.push(receiver._id);
      await sender.save();
    }
    if (!receiver.contacts.includes(sender._id)) {
      receiver.contacts.push(sender._id);
      await receiver.save();
    }

    const notification = new Notification({
      userId: contactRequest.sender,
      type: 'contact_accepted',
      title: 'Contact Request Accepted',
      content: `${receiver.name} accepted your contact request`,
      contactRequestId: contactRequest._id,
      fromUserId: req.userId
    });
    await notification.save();

    const senderSocket = activeSockets.get(contactRequest.sender.toString());
    if (senderSocket) {
      io.to(senderSocket).emit('new_notification', notification);
      io.to(senderSocket).emit('contact_request_updated', { request: contactRequest, action: 'accepted' });
    }

    res.json({ message: 'Contact request accepted', request: contactRequest, notification });
  } catch (error) {
    console.error('Failed to accept contact request:', error);
    res.status(500).json({ error: 'Failed to accept contact request' });
  }
});

// 3.7. Reject Contact Request
app.post('/api/contacts/requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const contactRequest = await ContactRequest.findById(req.params.requestId);
    if (!contactRequest) return res.status(404).json({ error: 'Request not found' });
    if (contactRequest.receiver.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    if (contactRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    contactRequest.status = 'rejected';
    contactRequest.respondedAt = new Date();
    await contactRequest.save();

    const senderSocket = activeSockets.get(contactRequest.sender.toString());
    if (senderSocket) {
      io.to(senderSocket).emit('contact_request_updated', { request: contactRequest, action: 'rejected' });
    }

    res.json({ message: 'Contact request rejected', request: contactRequest });
  } catch (error) {
    console.error('Failed to reject contact request:', error);
    res.status(500).json({ error: 'Failed to reject contact request' });
  }
});

// 3.8. Get Contact Requests (sent)
app.get('/api/contacts/requests/sent', authenticateToken, async (req, res) => {
  try {
    const requests = await ContactRequest.find({
      sender: req.userId,
      status: 'pending'
    })
    .populate('receiver', 'name username avatar email online')
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch sent requests:', error);
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

// 3.9. Block Contact Request
app.post('/api/contacts/requests/:requestId/block', authenticateToken, async (req, res) => {
  try {
    const contactRequest = await ContactRequest.findById(req.params.requestId);
    if (!contactRequest) return res.status(404).json({ error: 'Request not found' });
    if (contactRequest.receiver.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    contactRequest.status = 'blocked';
    contactRequest.respondedAt = new Date();
    await contactRequest.save();

    res.json({ message: 'Contact request blocked', request: contactRequest });
  } catch (error) {
    console.error('Failed to block contact request:', error);
    res.status(500).json({ error: 'Failed to block contact request' });
  }
});

// Add contact and start conversation
app.post('/api/contacts/create-and-chat', authenticateToken, async (req, res) => {
  const { name, username, email, phone } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let targetUser = await User.findOne({ username: new RegExp(`^${escapedUsername}$`, 'i') });
    if (!targetUser) {
      // Create new user (inactive/placeholder)
      targetUser = new User({
        name: name || username,
        username: username.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        email: email || `${username}@aether.io`,
        phone: phone || '',
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2310b981"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">${(name || username).substring(0,2).toUpperCase()}</text></svg>`,
        verified: false,
        password: await bcrypt.hash('temporary_password_123', 10)
      });
      await targetUser.save();
    }

    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot add yourself to contacts' });
    }

    const currentUser = await User.findById(req.userId);
    if (!currentUser.contacts.includes(targetUser._id)) {
      currentUser.contacts.push(targetUser._id);
      await currentUser.save();
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.userId, targetUser._id], $size: 2 }
    }).populate('participants');

    if (!conversation) {
      conversation = new Conversation({
        type: 'direct',
        participants: [req.userId, targetUser._id]
      });
      await conversation.save();
      conversation = await Conversation.findById(conversation._id).populate('participants');
    }

    res.json({
      message: 'Contact and chat created successfully',
      contact: targetUser,
      conversation
    });
  } catch (error) {
    console.error('Failed to create contact and chat:', error);
    res.status(500).json({ error: 'Failed to create contact and chat' });
  }
});

// 4. Get / Update Profile & Settings
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    delete user.password;
    delete user.otp;
    delete user.otpExpires;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profiles' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, username, bio, avatar, coverImage, website, location, pin,
          themePreference, securitySettings, notifications, privacySettings,
          chatPrefs, aiPrefs, accessibilityPrefs } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (name) user.name = name;
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (coverImage) user.coverImage = coverImage;
    if (website !== undefined) user.website = website;
    if (location !== undefined) user.location = location;
    if (pin !== undefined) user.pin = pin;
    if (themePreference) user.themePreference = { ...user.themePreference, ...themePreference };
    if (securitySettings) user.securitySettings = { ...user.securitySettings, ...securitySettings };
    if (notifications) user.notifications = { ...user.notifications, ...notifications };
    if (privacySettings) user.privacySettings = { ...user.privacySettings, ...privacySettings };
    if (chatPrefs) user.chatPrefs = { ...user.chatPrefs, ...chatPrefs };
    if (aiPrefs) user.aiPrefs = { ...user.aiPrefs, ...aiPrefs };
    if (accessibilityPrefs) user.accessibilityPrefs = { ...user.accessibilityPrefs, ...accessibilityPrefs };

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// 5. Delete Account
app.delete('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// 5.1. Verify PIN
app.post('/api/auth/verify-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.pin !== pin) {
      return res.status(400).json({ error: 'Invalid PIN code', valid: false });
    }
    res.json({ success: true, valid: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// 6. Media upload (Base64 data handler)
app.post('/api/media/upload', authenticateToken, async (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Filename and base64 fileData required' });
  }

  // Basic Base64 schema verification
  if (typeof fileData !== 'string' || !fileData.startsWith('data:')) {
    return res.status(400).json({ error: 'Invalid fileData format. Expected data URI base64 string.' });
  }

  try {
    const mimeType = fileData.match(/^data:([a-zA-Z0-9-\/]+);base64,/)?.[1];
    if (!mimeType) {
      return res.status(400).json({ error: 'Invalid fileData payload. Missing MIME type.' });
    }

    const cleanBase64 = fileData.replace(/^data:[a-zA-Z0-9-\/]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Perform Cloudinary file upload (falls back to local filesystem automatically)
    const uploadResult = await uploadFile(buffer, fileName, mimeType);
    
    const fileUrl = uploadResult.secure_url;
    
    res.json({ fileUrl });
  } catch (err) {
    console.error('File upload failure:', err);
    const statusCode = err.message === 'File size limit exceeded' ? 400 : 500;
    res.status(statusCode).json({ error: err.message || 'Failed to upload media file' });
  }
});

// 7. Get all searchable users
app.get('/api/users/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    const escapedQ = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const query = q ? {
      $and: [
        { _id: { $ne: req.userId } },
        { $or: [
          { name: new RegExp(escapedQ, 'i') },
          { username: new RegExp(escapedQ, 'i') },
          { email: new RegExp(escapedQ, 'i') }
        ] }
      ]
    } : { _id: { $ne: req.userId } };

    const users = await User.find(query).select('name username avatar email online accountType').limit(10).lean();

    const businesses = q ? await Business.find({ businessName: new RegExp(escapedQ, 'i') })
      .select('businessName category logo description availabilityStatus')
      .limit(5).lean() : [];

    const organizations = q ? await Organization.find({ name: new RegExp(escapedQ, 'i') })
      .select('name orgType logo description publicStatus')
      .limit(5).lean() : [];

    res.json({ users, businesses, organizations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search' });
  }
});

// 8. Create Conversation (Direct or Group)
app.post('/api/chats/create', authenticateToken, async (req, res) => {
  const { type, name, avatar, participantIds } = req.body;
  try {
    const participants = [req.userId, ...(participantIds || [])];
    
    if (type === 'direct' && participantIds.length === 1) {
      const existing = await Conversation.findOne({
        type: 'direct',
        participants: { $all: participants, $size: 2 }
      }).populate('participants');

      if (existing) return res.json(existing);
    }

    const conversation = new Conversation({
      type,
      name: type === 'group' ? name : '',
      avatar: type === 'group' ? avatar : '',
      participants,
      creator: type === 'group' ? req.userId : null,
      admins: type === 'group' ? [req.userId] : []
    });

    await conversation.save();
    const populated = await Conversation.findById(conversation._id).populate('participants');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize conversation' });
  }
});

// 9. Get User Conversations list
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .populate('participants', 'name username avatar')
      .lean();

    const chatIds = conversations.map(c => c._id);

    // Aggregate latest message per conversation in ONE query (eliminates N+1)
    const latestMessages = await Message.aggregate([
      { $match: { conversationId: { $in: chatIds }, deletedBy: { $ne: req.userId } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', latestMessage: { $first: '$$ROOT' } } }
    ]);

    const latestMsgMap = {};
    latestMessages.forEach(m => {
      latestMsgMap[m._id.toString()] = m.latestMessage;
    });

    const populatedChats = conversations.map(chat => ({
      ...chat,
      messages: latestMsgMap[chat._id.toString()] ? [latestMsgMap[chat._id.toString()]] : [],
      unreadCount: 0
    }));

    res.json(populatedChats);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations list' });
  }
});

// 9.1. Toggle Pin Conversation
app.post('/api/chats/:chatId/pin', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    const index = convo.pinnedBy.indexOf(req.userId);
    if (index > -1) {
      convo.pinnedBy.splice(index, 1);
    } else {
      convo.pinnedBy.push(req.userId);
    }
    await convo.save();
    
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).limit(1);
    res.json({
      ...convo.toObject(),
      messages: messages,
      unreadCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle pin state' });
  }
});

// 9.2. Toggle Favorite Conversation
app.post('/api/chats/:chatId/favorite', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    const index = convo.favoritedBy.indexOf(req.userId);
    if (index > -1) {
      convo.favoritedBy.splice(index, 1);
    } else {
      convo.favoritedBy.push(req.userId);
    }
    await convo.save();
    
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).limit(1);
    res.json({
      ...convo.toObject(),
      messages: messages,
      unreadCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite state' });
  }
});

// 9.3. Toggle Archive Conversation
app.post('/api/chats/:chatId/archive', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    const index = convo.archivedBy.indexOf(req.userId);
    if (index > -1) {
      convo.archivedBy.splice(index, 1);
    } else {
      convo.archivedBy.push(req.userId);
    }
    await convo.save();
    
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).limit(1);
    res.json({
      ...convo.toObject(),
      messages: messages,
      unreadCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle archive state' });
  }
});

// 9.4. Toggle Mute Conversation
app.post('/api/chats/:chatId/mute', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    const index = convo.mutedBy.indexOf(req.userId);
    if (index > -1) {
      convo.mutedBy.splice(index, 1);
    } else {
      convo.mutedBy.push(req.userId);
    }
    await convo.save();
    
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).limit(1);
    res.json({
      ...convo.toObject(),
      messages: messages,
      unreadCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle mute state' });
  }
});

// 9.5. Toggle Lock Conversation
app.post('/api/chats/:chatId/lock', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    const index = convo.lockedBy.indexOf(req.userId);
    if (index > -1) {
      convo.lockedBy.splice(index, 1);
    } else {
      convo.lockedBy.push(req.userId);
    }
    await convo.save();
    
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: -1 }).limit(1);
    res.json({
      ...convo.toObject(),
      messages: messages,
      unreadCount: 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle lock state' });
  }
});

// 9.6. Delete Conversation history
app.delete('/api/chats/:chatId', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    
    await Message.deleteMany({ conversationId: convo._id });
    await Conversation.findByIdAndDelete(convo._id);
    
    if (convo.participants && convo.participants.length > 0) {
      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('conversation_deleted', { chatId: convo._id });
        }
      });
    }
    io.to(req.params.chatId).emit('conversation_deleted', { chatId: convo._id });
    
    res.json({ success: true, chatId: convo._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 9.7. Update Group Settings / Details (Name, Avatar, Description)
app.put('/api/chats/:chatId/settings', authenticateToken, async (req, res) => {
  const { name, avatar, description, onlyAdminsCanMessage } = req.body;
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    // Validate membership
    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'You are not a participant in this group' });
    }

    // Only group admins can modify group settings
    if (convo.admins && convo.admins.length > 0 && !convo.admins.includes(req.userId)) {
      return res.status(403).json({ error: 'Only group admins can modify group settings' });
    }

    if (name) convo.name = name;
    if (avatar) convo.avatar = avatar;
    if (description !== undefined) convo.description = description;
    if (onlyAdminsCanMessage !== undefined) convo.onlyAdminsCanMessage = onlyAdminsCanMessage;

    await convo.save();
    const populated = await Conversation.findById(convo._id).populate('participants');
    
    // Broadcast setting change event to all participants
    convo.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_settings_updated', {
          chatId: convo._id,
          name: convo.name,
          avatar: convo.avatar,
          description: convo.description,
          onlyAdminsCanMessage: convo.onlyAdminsCanMessage
        });
      }
    });

    res.json(populated);
  } catch (err) {
    console.error('Failed to update group settings:', err);
    res.status(500).json({ error: 'Failed to update group settings' });
  }
});

// 9.8. Add Members to Group Conversation
app.post('/api/chats/:chatId/members/add', authenticateToken, async (req, res) => {
  const { memberIds } = req.body;
  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'memberIds array is required' });
  }

  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    // Validate membership
    if (!convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'You are not a participant in this group' });
    }

    // Only group admins can add members
    if (convo.admins && convo.admins.length > 0 && !convo.admins.includes(req.userId)) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    let addedCount = 0;
    memberIds.forEach(id => {
      if (!convo.participants.includes(id)) {
        convo.participants.push(id);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await convo.save();
    }

    const populated = await Conversation.findById(convo._id).populate('participants');

    populated.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_members_updated', {
          chatId: convo._id,
          participants: populated.participants
        });
      }
    });

    res.json(populated);
  } catch (err) {
    console.error('Failed to add members to group:', err);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// 9.9. Leave Group / Remove Member
app.post('/api/chats/:chatId/members/leave', authenticateToken, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    if (!convo.participants.includes(req.userId)) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    convo.participants = convo.participants.filter(p => p.toString() !== req.userId);
    convo.admins = convo.admins.filter(a => a.toString() !== req.userId);
    
    if (convo.participants.length === 0) {
      await Message.deleteMany({ conversationId: convo._id });
      await Conversation.findByIdAndDelete(convo._id);
      return res.json({ success: true, left: true, deleted: true });
    }

    if (convo.creator && convo.creator.toString() === req.userId) {
      convo.creator = convo.participants[0];
      if (!convo.admins.includes(convo.participants[0])) {
        convo.admins.push(convo.participants[0]);
      }
    }

    await convo.save();
    const populated = await Conversation.findById(convo._id).populate('participants');

    populated.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_members_updated', {
          chatId: convo._id,
          participants: populated.participants
        });
      }
    });

    const leaverSocket = activeSockets.get(req.userId);
    if (leaverSocket) {
      io.to(leaverSocket).emit('conversation_deleted', { chatId: convo._id });
    }

    res.json(populated);
  } catch (err) {
    console.error('Failed to leave group:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// 9.10. Remove / Kick Member from Group
app.post('/api/chats/:chatId/members/remove', authenticateToken, async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    // Cannot kick the creator
    if (convo.creator && convo.creator.toString() === memberId) {
      return res.status(400).json({ error: 'Cannot remove the group creator/owner' });
    }

    // Check if requester is admin
    if (convo.admins && convo.admins.length > 0 && !convo.admins.includes(req.userId)) {
      return res.status(403).json({ error: 'Only group admins can remove members' });
    }

    // If target is co-admin, only the original creator/owner can kick them
    const targetIsAdmin = convo.admins && convo.admins.includes(memberId);
    if (targetIsAdmin && convo.creator && convo.creator.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the group creator can remove other group admins' });
    }

    // Remove user from participants and admins
    convo.participants = convo.participants.filter(p => p.toString() !== memberId);
    convo.admins = convo.admins.filter(a => a.toString() !== memberId);

    await convo.save();
    const populated = await Conversation.findById(convo._id).populate('participants');

    // Notify remaining members
    populated.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_members_updated', {
          chatId: convo._id,
          participants: populated.participants
        });
      }
    });

    // Notify the socket client that was removed
    const removedSocket = activeSockets.get(memberId);
    if (removedSocket) {
      io.to(removedSocket).emit('conversation_deleted', { chatId: convo._id });
    }

    res.json(populated);
  } catch (err) {
    console.error('Failed to remove member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// 9.11. Promote Member to Admin
app.post('/api/chats/:chatId/members/promote', authenticateToken, async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    if (!convo.participants.includes(req.userId) || !convo.participants.includes(memberId)) {
      return res.status(400).json({ error: 'Requester and target must be group members' });
    }

    // Only active group admins can promote other members
    if (convo.admins && convo.admins.length > 0 && !convo.admins.includes(req.userId)) {
      return res.status(403).json({ error: 'Only group admins can promote other members' });
    }

    if (!convo.admins.includes(memberId)) {
      convo.admins.push(memberId);
      await convo.save();
    }

    const populated = await Conversation.findById(convo._id).populate('participants');

    populated.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_admins_updated', {
          chatId: convo._id,
          admins: populated.admins
        });
      }
    });

    res.json(populated);
  } catch (err) {
    console.error('Failed to promote member to admin:', err);
    res.status(500).json({ error: 'Failed to promote member' });
  }
});

// 9.12. Demote Admin to Member
app.post('/api/chats/:chatId/members/demote', authenticateToken, async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  try {
    const convo = await Conversation.findById(req.params.chatId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.type !== 'group') return res.status(400).json({ error: 'Not a group conversation' });

    // Only the group creator can demote co-admins
    if (convo.creator && convo.creator.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the group creator can demote admins' });
    }

    if (convo.creator && convo.creator.toString() === memberId) {
      return res.status(400).json({ error: 'Cannot demote the group creator' });
    }

    convo.admins = convo.admins.filter(a => a.toString() !== memberId);
    await convo.save();

    const populated = await Conversation.findById(convo._id).populate('participants');

    populated.participants.forEach(pId => {
      const targetSocket = activeSockets.get(pId.toString());
      if (targetSocket) {
        io.to(targetSocket).emit('group_admins_updated', {
          chatId: convo._id,
          admins: populated.admins
        });
      }
    });

    res.json(populated);
  } catch (err) {
    console.error('Failed to demote admin:', err);
    res.status(500).json({ error: 'Failed to demote admin' });
  }
});

// 10. Get Message logs for conversation
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before; // message ID to paginate before
  // Validate ObjectId format to avoid 500 CastError
  if (!chatId.match(/^[a-f\d]{24}$/i)) {
    return res.json([]);
  }
  try {
    const query = { conversationId: chatId, deletedBy: { $ne: req.userId } };
    if (before) {
      const beforeMsg = await Message.findById(before).select('createdAt').lean();
      if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const processedMessages = messages.reverse().map(msg => {
      if (msg.viewOnce) {
        const isOpened = msg.viewOnceOpenedBy && msg.viewOnceOpenedBy.map(id => id.toString()).includes(req.userId.toString());
        const isSender = msg.senderId?._id?.toString() === req.userId.toString() || msg.senderId?.toString() === req.userId.toString();
        if (isOpened || (isSender && msg.viewOnceOpenedBy && msg.viewOnceOpenedBy.length > 0)) {
          msg.mediaUrl = '';
        }
      }
      return msg;
    });

    res.json(processedMessages);
  } catch (error) {
    console.error('Failed to load messages:', error);
    res.status(500).json({ error: 'Failed to load conversation logs' });
  }
});

// 10.5. Delete specific message
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { forEveryone } = req.query;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // "Delete for me" — just mark it as deleted for this user
    if (forEveryone !== 'true') {
      if (!message.deletedBy) message.deletedBy = [];
      if (!message.deletedBy.includes(req.userId)) {
        message.deletedBy.push(req.userId);
        await message.save();
      }
      return res.json({ success: true, message: 'Message deleted for you' });
    }

    // "Delete for everyone" — only sender can do this
    if (message.senderId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    // Delete associated media if present
    if (message.mediaUrl) {
      const parsed = parseCloudinaryUrl(message.mediaUrl);
      if (parsed) {
        try {
          await deleteFile(parsed.publicId, parsed.resourceType);
        } catch (delErr) {
          console.error('Failed to delete media during message deletion:', delErr.message);
        }
      }
    }

    await Message.findByIdAndDelete(messageId);

    // Notify other participants via Socket
    const convo = await Conversation.findById(message.conversationId);
    if (convo) {
      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('message_deleted', {
            chatId: message.conversationId.toString(),
            messageId: messageId
          });
        }
      });
      io.to(message.conversationId.toString()).emit('message_deleted', {
        chatId: message.conversationId.toString(),
        messageId: messageId
      });
    }

    res.json({ success: true, message: 'Message deleted for everyone' });
  } catch (error) {
    console.error('Failed to delete message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// 10.6. React to specific message
app.post('/api/messages/:messageId/react', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === req.userId
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId: req.userId, emoji });
    }

    await message.save();

    // Broadcast update via Socket
    const convo = await Conversation.findById(message.conversationId);
    if (convo) {
      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('message_reaction_updated', {
            chatId: message.conversationId.toString(),
            messageId,
            reactions: message.reactions
          });
        }
      });
      io.to(message.conversationId.toString()).emit('message_reaction_updated', {
        chatId: message.conversationId.toString(),
        messageId,
        reactions: message.reactions
      });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.error('Failed to update reaction:', error);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// 10.7. Open view-once message
app.post('/api/messages/:messageId/open', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.viewOnce) {
      return res.status(400).json({ error: 'Message is not a view-once message' });
    }

    const convo = await Conversation.findById(message.conversationId);
    if (!convo || !convo.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation' });
    }

    if (!message.viewOnceOpenedBy.includes(req.userId)) {
      message.viewOnceOpenedBy.push(req.userId);
      await message.save();

      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('message_opened', {
            chatId: message.conversationId.toString(),
            messageId: messageId,
            openedBy: message.viewOnceOpenedBy
          });
        }
      });
      io.to(message.conversationId.toString()).emit('message_opened', {
        chatId: message.conversationId.toString(),
        messageId: messageId,
        openedBy: message.viewOnceOpenedBy
      });
    }

    res.json({ success: true, openedBy: message.viewOnceOpenedBy });
  } catch (error) {
    console.error('Failed to open view-once message:', error);
    res.status(500).json({ error: 'Failed to open view-once message' });
  }
});

// 10.8. Edit message
app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (message.senderId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the sender can edit this message' });
    }
    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id).populate('senderId');

    const convo = await Conversation.findById(message.conversationId);
    if (convo) {
      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('message_edited', {
            chatId: message.conversationId.toString(),
            message: populated
          });
        }
      });
      io.to(message.conversationId.toString()).emit('message_edited', {
        chatId: message.conversationId.toString(),
        message: populated
      });
    }

    res.json(populated);
  } catch (error) {
    console.error('Failed to edit message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// 10.9. Star/Unstar message
app.post('/api/messages/:messageId/star', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const userId = req.userId;
    const idx = message.starredBy.findIndex(id => id.toString() === userId);
    if (idx > -1) {
      message.starredBy.splice(idx, 1);
    } else {
      message.starredBy.push(userId);
    }
    await message.save();

    res.json({ success: true, starred: idx === -1, starredBy: message.starredBy });
  } catch (error) {
    console.error('Failed to toggle star:', error);
    res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// 10.10. Vote on poll
app.post('/api/messages/:messageId/vote', authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { optionId } = req.body;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (message.type !== 'poll') {
      return res.status(400).json({ error: 'Message is not a poll' });
    }

    const userId = req.userId;
    let votedOption = null;

    message.pollOptions.forEach(opt => {
      const idx = opt.votedBy.findIndex(id => id.toString() === userId);
      if (opt.optionId === optionId) {
        if (idx > -1) {
          opt.votedBy.splice(idx, 1);
          opt.votes = Math.max(0, opt.votes - 1);
        } else {
          opt.votedBy.push(userId);
          opt.votes += 1;
          votedOption = optionId;
        }
      } else {
        if (idx > -1) {
          opt.votedBy.splice(idx, 1);
          opt.votes = Math.max(0, opt.votes - 1);
        }
      }
    });

    await message.save();

    const convo = await Conversation.findById(message.conversationId);
    if (convo) {
      convo.participants.forEach(pId => {
        const targetSocket = activeSockets.get(pId.toString());
        if (targetSocket) {
          io.to(targetSocket).emit('poll_updated', {
            chatId: message.conversationId.toString(),
            messageId,
            pollOptions: message.pollOptions
          });
        }
      });
      io.to(message.conversationId.toString()).emit('poll_updated', {
        chatId: message.conversationId.toString(),
        messageId,
        pollOptions: message.pollOptions
      });
    }

    res.json({ success: true, pollOptions: message.pollOptions });
  } catch (error) {
    console.error('Failed to vote on poll:', error);
    res.status(500).json({ error: 'Failed to vote on poll' });
  }
});

// 10.11. Get media for a conversation (gallery)
app.get('/api/chats/:chatId/media', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({
      conversationId: chatId,
      mediaUrl: { $ne: '' }
    }).select('type mediaUrl createdAt text fileName fileSize duration').sort({ createdAt: -1 }).lean();

    const media = {
      images: messages.filter(m => m.type === 'image').map(m => ({ url: m.mediaUrl, messageId: m._id, createdAt: m.createdAt, text: m.text })),
      videos: messages.filter(m => m.type === 'document' && m.fileName?.match(/\.(mp4|webm|mov)$/i)).map(m => ({ url: m.mediaUrl, messageId: m._id, createdAt: m.createdAt, fileName: m.fileName })),
      audio: messages.filter(m => m.type === 'audio').map(m => ({ url: m.mediaUrl, messageId: m._id, createdAt: m.createdAt, duration: m.duration })),
      documents: messages.filter(m => m.type === 'document' && !m.fileName?.match(/\.(mp4|webm|mov)$/i)).map(m => ({ url: m.mediaUrl, messageId: m._id, createdAt: m.createdAt, fileName: m.fileName, fileSize: m.fileSize }))
    };

    res.json(media);
  } catch (error) {
    console.error('Failed to fetch media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// 10.12. Search messages across user's conversations
app.get('/api/messages/search', authenticateToken, async (req, res) => {
  const { q, chatId, limit: limitStr, before } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Search query is required' });

  try {
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const msgLimit = Math.min(parseInt(limitStr) || 50, 100);

    const baseQuery = {
      text: searchRegex,
      deletedBy: { $ne: req.userId }
    };

    if (chatId) {
      baseQuery.conversationId = chatId;
    } else {
      const userChats = await Conversation.find({ participants: req.userId }).select('_id').lean();
      baseQuery.conversationId = { $in: userChats.map(c => c._id) };
    }

    if (before) {
      baseQuery._id = { $lt: before };
    }

    const messages = await Message.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(msgLimit)
      .populate('senderId', 'name username avatar')
      .populate('conversationId', 'name type participants')
      .lean();

    res.json({
      messages: messages.map(m => ({
        _id: m._id,
        text: m.text,
        type: m.type,
        mediaUrl: m.mediaUrl,
        fileName: m.fileName,
        createdAt: m.createdAt,
        senderId: m.senderId,
        conversationId: m.conversationId ? {
          _id: m.conversationId._id,
          name: m.conversationId.name,
          type: m.conversationId.type,
          participants: m.conversationId.participants
        } : null
      })),
      hasMore: messages.length === msgLimit
    });
  } catch (error) {
    console.error('Message search failed:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// 11. Status / Story uploads and fetches
app.post('/api/status', authenticateToken, async (req, res) => {
  const { type, content, background, mediaUrl, caption } = req.body;
  try {
    const user = await User.findById(req.userId);
    let userStatus = await Status.findOne({ userId: req.userId });

    if (!userStatus) {
      userStatus = new Status({
        userId: req.userId,
        userName: user.name,
        userAvatar: user.avatar,
        items: []
      });
    }

    // Prune existing items older than 24 hours
    const now = new Date();
    userStatus.items = userStatus.items.filter(item => {
      const itemDate = new Date(item.createdAt);
      const ageHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
      return ageHours < 24;
    });

    userStatus.items.unshift({
      type,
      content,
      background,
      mediaUrl,
      caption,
      timestamp: 'Just now',
      views: [],
      createdAt: new Date()
    });

    await userStatus.save();
    
    // Return populated userStatus
    const populated = await Status.findById(userStatus._id)
      .populate('userId')
      .populate('items.views', 'name username avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload status story' });
  }
});

app.get('/api/status', authenticateToken, async (req, res) => {
  try {
    // Return all status stories, populate user and views
    const statuses = await Status.find()
      .populate('userId')
      .populate('items.views', 'name username avatar');
    
    const now = new Date();
    const activeStatuses = [];

    for (const statusDoc of statuses) {
      const originalLength = statusDoc.items.length;
      statusDoc.items = statusDoc.items.filter(item => {
        const itemDate = new Date(item.createdAt);
        const ageHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
        return ageHours < 24;
      });

      if (statusDoc.items.length !== originalLength) {
        if (statusDoc.items.length === 0) {
          await Status.findByIdAndDelete(statusDoc._id);
          continue; // Do not include in response
        } else {
          await statusDoc.save();
        }
      }
      activeStatuses.push(statusDoc);
    }
    
    res.json(activeStatuses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// Record a view on a status segment
app.post('/api/status/:itemId/view', authenticateToken, async (req, res) => {
  try {
    let statusDoc = await Status.findOne({ 'items._id': req.params.itemId });
    if (!statusDoc) {
      // Fallback: search manually in all status items
      const allStatus = await Status.find();
      for (const doc of allStatus) {
        if (doc.items.some(item => item.id === req.params.itemId || item._id.toString() === req.params.itemId)) {
          statusDoc = doc;
          break;
        }
      }
      if (!statusDoc) return res.status(404).json({ error: 'Status item not found' });
    }

    const item = statusDoc.items.find(item => item._id.toString() === req.params.itemId || item.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Status item not found' });

    // Don't add view if it's the owner themselves
    if (statusDoc.userId.toString() === req.userId) {
      const populatedDoc = await Status.findById(statusDoc._id).populate('items.views', 'name username avatar');
      const populatedItem = populatedDoc.items.find(it => it._id.toString() === req.params.itemId || it.id === req.params.itemId);
      return res.json(populatedItem);
    }

    // Add req.userId to item.views if not already present
    const alreadyViewed = item.views.some(v => v.toString() === req.userId);
    if (!alreadyViewed) {
      item.views.push(req.userId);
      await statusDoc.save();
    }

    // Return the populated item
    const populatedDoc = await Status.findById(statusDoc._id).populate('items.views', 'name username avatar');
    const populatedItem = populatedDoc.items.find(it => it._id.toString() === req.params.itemId || it.id === req.params.itemId);
    
    res.json(populatedItem);
  } catch (error) {
    console.error('Failed to view status item:', error);
    res.status(500).json({ error: 'Failed to record view on status' });
  }
});

// Delete status story segment
app.delete('/api/status/:itemId', authenticateToken, async (req, res) => {
  try {
    const userStatus = await Status.findOne({ userId: req.userId });
    if (!userStatus) return res.status(404).json({ error: 'Status document not found' });
    
    // Find item to get its mediaUrl for Cloudinary deletion
    const targetItem = userStatus.items.find(item => item._id.toString() === req.params.itemId || item.id === req.params.itemId);
    if (targetItem && targetItem.mediaUrl) {
      const parsed = parseCloudinaryUrl(targetItem.mediaUrl);
      if (parsed) {
        try {
          await deleteFile(parsed.publicId, parsed.resourceType);
        } catch (delErr) {
          console.error('Failed to delete media from Cloudinary during status segment deletion:', delErr.message);
        }
      }
    }

    userStatus.items = userStatus.items.filter(item => item._id.toString() !== req.params.itemId && item.id !== req.params.itemId);
    
    // If no status items remain, delete the entire document
    if (userStatus.items.length === 0) {
      await Status.findByIdAndDelete(userStatus._id);
    } else {
      await userStatus.save();
    }
    
    res.json({ success: true, itemId: req.params.itemId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete status segment' });
  }
});

// 12. Channels REST Router endpoints
app.get('/api/channels', authenticateToken, async (req, res) => {
  try {
    const channels = await Channel.find()
      .populate('createdBy', 'name username avatar')
      .populate('followers', 'name username avatar')
      .lean();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get followers of a specific channel (populated with user details)
app.get('/api/channels/:id/followers', authenticateToken, async (req, res) => {
  try {
    const ch = await Channel.findById(req.params.id)
      .populate('followers', 'name username avatar');
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    res.json(ch.followers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel followers' });
  }
});

app.post('/api/channels/create', authenticateToken, async (req, res) => {
  const { name, avatar, description } = req.body;
  try {
    const channel = new Channel({
      name,
      avatar,
      description,
      createdBy: req.userId,
      followers: [req.userId],
      subscribersCount: 1
    });
    await channel.save();
    
    // Populate before returning
    const populated = await Channel.findById(channel._id)
      .populate('createdBy', 'name username avatar')
      .populate('followers', 'name username avatar');
    
    io.emit('channel_created', populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

app.post('/api/channels/:id/follow', authenticateToken, async (req, res) => {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (!ch.followers.includes(req.userId)) {
      ch.followers.push(req.userId);
      ch.subscribersCount = ch.followers.length;
      await ch.save();
    }
    
    // Get the follower user details to broadcast live
    const followerUser = await User.findById(req.userId).select('name username avatar');
    io.emit('channel_follower_added', { 
      channelId: ch._id.toString(), 
      follower: followerUser,
      subscribersCount: ch.subscribersCount
    });
    
    const populated = await Channel.findById(ch._id)
      .populate('followers', 'name username avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow channel' });
  }
});

app.post('/api/channels/:id/unfollow', authenticateToken, async (req, res) => {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    const index = ch.followers.indexOf(req.userId);
    if (index > -1) {
      ch.followers.splice(index, 1);
      ch.subscribersCount = ch.followers.length;
      await ch.save();
    }
    
    io.emit('channel_follower_removed', { 
      channelId: ch._id.toString(), 
      userId: req.userId,
      subscribersCount: ch.subscribersCount
    });
    
    const populated = await Channel.findById(ch._id)
      .populate('followers', 'name username avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow channel' });
  }
});

// Post update to a channel
app.post('/api/channels/:id/post', authenticateToken, async (req, res) => {
  const { content, image } = req.body;
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    const newPost = {
      content,
      image: image || '',
      likes: [],
      comments: [],
      createdAt: new Date()
    };
    
    ch.posts.unshift(newPost);
    await ch.save();
    
    io.emit('channel_post_added', { channelId: ch._id, post: ch.posts[0] });
    
    res.json(ch.posts[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add post to channel' });
  }
});

// Like a post in a channel
app.post('/api/channels/:id/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    const post = ch.posts.find(p => p._id.toString() === req.params.postId || p.id === req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const index = post.likes.indexOf(req.userId);
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.userId);
    }
    
    await ch.save();
    io.emit('channel_post_liked', { channelId: ch._id, postId: post._id, likes: post.likes });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add comment to channel post
app.post('/api/channels/:id/posts/:postId/comment', authenticateToken, async (req, res) => {
  const { text } = req.body;
  try {
    const user = await User.findById(req.userId);
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    const post = ch.posts.find(p => p._id.toString() === req.params.postId || p.id === req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const newComment = {
      name: user.name,
      text,
      createdAt: new Date()
    };
    
    post.comments.push(newComment);
    await ch.save();
    
    io.emit('channel_post_commented', { channelId: ch._id, postId: post._id, comment: post.comments[post.comments.length - 1] });
    res.json(post.comments[post.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// 13. Communities REST Router endpoints
app.get('/api/communities', authenticateToken, async (req, res) => {
  try {
    const comms = await Community.find().populate('groups').lean();
    res.json(comms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

app.post('/api/communities/create', authenticateToken, async (req, res) => {
  const { name, tagline, description } = req.body;
  try {
    const comm = new Community({
      name,
      tagline,
      description,
      joined: [req.userId]
    });
    await comm.save();
    res.json(comm);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create community' });
  }
});

app.post('/api/communities/:id/join', authenticateToken, async (req, res) => {
  try {
    const comm = await Community.findByIdAndUpdate(req.params.id, {
      $addToSet: { joined: req.userId }
    }, { new: true });
    res.json(comm);
  } catch (error) {
    res.status(500).json({ error: 'Failed to join community' });
  }
});

// Post announcement to a community
app.post('/api/communities/:id/announcement', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  try {
    const comm = await Community.findById(req.params.id);
    if (!comm) return res.status(404).json({ error: 'Community not found' });
    
    const newAnn = { title, content, createdAt: new Date() };
    comm.announcements.unshift(newAnn);
    await comm.save();
    
    io.emit('community_announcement_added', { communityId: comm._id, announcement: comm.announcements[0] });
    res.json(comm.announcements[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add announcement' });
  }
});

// 14. Meta-Style Smart AI Assistant Chat Route (Gemini API Integration)
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { prompt, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ 
      error: 'Gemini API Key is not configured on the server. Please define GEMINI_API_KEY in your server/.env file or use a client-side API Key in Settings.' 
    });
  }

  try {
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = msg.senderId === 'user_me' ? 'user' : 'model';
        if (msg.type === 'text' && msg.text) {
          contents.push({
            role: role,
            parts: [{ text: msg.text }]
          });
        }
      });
    }

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    }

    console.log('[AI Route] Calling Gemini API with prompt:', prompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{
            text: "You are Aether AI, a highly intelligent personal AI assistant integrated into the AetherChat messaging terminal. Your personality is sleek, tech-forward, professional yet friendly. Use markdown, short paragraphs, bold terms, bullet points, and appropriate emojis to format your responses beautifully. Keep it highly interactive, clear, and extremely smart.\n\nCRITICAL: If the user asks you to generate, draw, or create an image/illustration, you must start your response with `[IMAGE]` followed on the same line by a detailed, descriptive prompt for an image generation model (like Imagen or Stable Diffusion) describing the requested visual in vivid detail, and then on the next line write `[CAPTION]` followed by a friendly user-facing caption message. Otherwise, just reply with your text response as usual."
          }]
        }
      })
    });

    console.log('[AI Route] Gemini response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Route] Gemini API communication failure:', errText);
      return res.status(response.status).json({ error: 'Failed to communicate with Gemini API' });
    }

    const data = await response.json();
    console.log('[AI Route] Gemini response data:', JSON.stringify(data).substring(0, 200));
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to retrieve a response from my neural core.";
    
    // Check if Gemini determined it's an image generation command
    if (responseText.trim().startsWith('[IMAGE]')) {
      const imgMatch = responseText.match(/\[IMAGE\]\s*(.+)/i);
      const capMatch = responseText.match(/\[CAPTION\]\s*(.+)/i);
      
      const imagePrompt = imgMatch ? imgMatch[1].split('\n')[0].trim() : prompt;
      const caption = capMatch ? capMatch[1].trim() : `Here is your generated image of "${prompt}"!`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
      
      res.json({ 
        type: 'image',
        mediaUrl: imageUrl,
        caption: caption,
        response: caption
      });
    } else {
      res.json({ 
        type: 'text',
        response: responseText 
      });
    }
  } catch (error) {
    console.error('AI route processing failed:', error);
    res.status(500).json({ error: 'Internal server error during AI session processing' });
  }
});


// ----------------------------------------------------
// SOCKET.IO REAL-TIME COMMUNICATION HUB
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  // Authenticate socket connection with JWT token
  socket.on('auth', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_aether_key_12948194');
      socket.userId = decoded.id;
      activeSockets.set(decoded.id, socket.id);
      console.log(`Socket authenticated for user: ${decoded.id}`);
      
      // Join conversation rooms
      const userConvos = await Conversation.find({ participants: decoded.id });
      userConvos.forEach(c => {
        socket.join(c._id.toString());
      });

      socket.broadcast.emit('user_online', { userId: decoded.id });
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
    }
  });

  // Handle typing status indications
  socket.on('typing_status', (data) => {
    if (!socket.userId) return;
    const { chatId, status } = data;
    socket.to(chatId).emit('typing_status', {
      chatId,
      senderId: socket.userId,
      status
    });
  });

  // Handle message read receipts updates
  socket.on('read_receipt', async (data) => {
    if (!socket.userId) return;
    try {
      const { chatId, messageId } = data;
      const msg = await Message.findById(messageId);
      if (msg && msg.status !== 'read') {
        msg.status = 'read';
        await msg.save();
        io.to(chatId).emit('message_status_update', {
          chatId,
          messageId,
          status: 'read'
        });
      }
    } catch (err) {
      console.error('Socket read receipt failed:', err);
    }
  });

  // Handle real-time messaging
  socket.on('send_message', async (data) => {
    if (!socket.userId) return;
    try {
      const { conversationId, type, text, mediaUrl, fileName, fileSize, duration, waveform, locationName, coordinates, pollQuestion, pollOptions, replyTo, forwardedFrom, viewOnce } = data;
      
      const convo = await Conversation.findById(conversationId);
      if (!convo || !convo.participants.includes(socket.userId)) {
        return;
      }

      // Ensure all online participants are in the room dynamically
      convo.participants.forEach(pId => {
        const pSocketId = activeSockets.get(pId.toString());
        if (pSocketId) {
          const pSocket = io.sockets.sockets.get(pSocketId);
          if (pSocket) {
            pSocket.join(conversationId);
          }
        }
      });

      const msg = new Message({
        conversationId,
        senderId: socket.userId,
        type,
        text,
        mediaUrl,
        fileName,
        fileSize,
        duration,
        waveform,
        locationName,
        coordinates,
        pollQuestion,
        pollOptions: pollOptions ? pollOptions.map(opt => ({ optionId: opt.optionId, text: opt.text, votes: 0, votedBy: [] })) : [],
        replyTo,
        forwardedFrom,
        viewOnce,
        status: 'sent'
      });

      await msg.save();

      const populatedMsg = await Message.findById(msg._id)
        .populate('senderId', 'name username avatar')
        .populate('replyTo')
        .lean();

      io.to(conversationId).emit('message_received', {
        chatId: conversationId,
        message: populatedMsg
      });

      convo.updatedAt = new Date();
      await convo.save();
    } catch (err) {
      console.error('Socket messaging failed:', err);
    }
  });

  // Handle call invitations
  socket.on('call_invite', (data) => {
    const { targetUserId, callType, callId, callerName, callerAvatar } = data;
    const targetSocketId = activeSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming_call', {
        callId,
        callerId: socket.userId,
        callerName,
        callerAvatar,
        type: callType
      });
    }
  });

  socket.on('call_accept', (data) => {
    const { callerId } = data;
    const targetSocketId = activeSockets.get(callerId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_accepted', { calleeId: socket.userId });
    }
  });

  socket.on('call_decline', (data) => {
    const { callerId } = data;
    const targetSocketId = activeSockets.get(callerId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_declined', { calleeId: socket.userId });
    }
  });

  socket.on('call_end', (data) => {
    const { targetUserId } = data;
    const targetSocketId = activeSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended', { userId: socket.userId });
    }
  });

  socket.on('webrtc_signal', (data) => {
    const { targetUserId, signal } = data;
    const targetSocketId = activeSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_signal', {
        senderId: socket.userId,
        signal
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log('Socket client disconnected:', socket.id);
    if (socket.userId) {
      activeSockets.delete(socket.userId);
      socket.broadcast.emit('user_offline', { userId: socket.userId });
    }
  });
});

// ----------------------------------------------------
// DATABASE AUTO-SEED FUNCTION
// ----------------------------------------------------
async function seedDatabase() {
  const alexExists = await User.findOne({ username: 'alex_aether' });
  if (alexExists) {
    console.log('Aether mock data already exists in database, checking for missing passwords...');
    const usersWithoutPassword = await User.find({ password: { $exists: false } });
    if (usersWithoutPassword.length > 0) {
      console.log(`Found ${usersWithoutPassword.length} users without passwords. Migrating...`);
      const hashedPassword = bcrypt.hashSync('password123', 10);
      for (const u of usersWithoutPassword) {
        u.password = hashedPassword;
        await u.save();
      }
      console.log('Migration completed successfully.');
    } else {
      console.log('All existing users have passwords. Skipping migration.');
    }
    return;
  }
  console.log('Seeding initial mock data...');

  const hashedPassword = bcrypt.hashSync('password123', 10);

  // 1. Create mock users
  const alex = new User({
    name: 'Alex Mercer',
    username: 'alex_aether',
    phone: '+15550192834',
    email: 'alex.mercer@aether.io',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2310b981"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">AM</text></svg>`,
    verified: true
  });
  await alex.save();

  const eve = new User({
    name: 'Evelyn Vane',
    username: 'eve_vane',
    phone: '+15550123456',
    email: 'eve@vane.com',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23ec4899"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">EV</text></svg>`,
    verified: true
  });
  await eve.save();

  const daniel = new User({
    name: 'Daniel Park',
    username: 'dan_p',
    phone: '+15550135791',
    email: 'daniel@park.co',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%233b82f6"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">DP</text></svg>`,
    verified: true
  });
  await daniel.save();

  const sarah = new User({
    name: 'Sarah Connor',
    username: 's_connor',
    phone: '+15550146820',
    email: 'sarah@resistance.org',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23f59e0b"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">SC</text></svg>`,
    verified: true
  });
  await sarah.save();

  const marcus = new User({
    name: 'Marcus Aurelius',
    username: 'marcus_philosophy',
    phone: '+15550158943',
    email: 'marcus@stoic.org',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%238b5cf6"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">MA</text></svg>`,
    verified: true
  });
  await marcus.save();

  const lina = new User({
    name: 'Lina Inverse',
    username: 'lina_sorceress',
    phone: '+15550161111',
    email: 'lina@dragonslave.net',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23ef4444"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">LI</text></svg>`,
    verified: true
  });
  await lina.save();

  const ai = new User({
    name: 'Aether AI',
    username: 'aether_ai',
    phone: 'System Protocol',
    email: 'ai@aether.io',
    password: hashedPassword,
    avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="metaAiGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4" /><stop offset="50%" stop-color="%233b82f6" /><stop offset="100%" stop-color="%238b5cf6" /></linearGradient></defs><rect width="100" height="100" fill="%23090d16"/><circle cx="50" cy="50" r="32" fill="none" stroke="url(%23metaAiGrad)" stroke-width="6"/><circle cx="50" cy="50" r="18" fill="none" stroke="url(%23metaAiGrad)" stroke-width="3" opacity="0.6"/></svg>`,
    verified: true
  });
  await ai.save();

  // 2. Create Conversations & Messages
  const chatsToCreate = [
    { type: 'direct', participants: [alex._id, eve._id], messages: [
      { senderId: eve._id, text: 'Hey Alex! Have you reviewed the prototype designs for the new dark mode layout?', type: 'text' },
      { senderId: alex._id, text: 'Hey Evelyn! Yes, I just went through them. The glassmorphic cards look outstanding, but I think we should increase the blur factor to at least 16px to make the text pop against vibrant wallpapers.', type: 'text' },
      { senderId: eve._id, text: 'That makes perfect sense! Let me adjust that in Figma.', type: 'text' }
    ]},
    { type: 'direct', participants: [alex._id, daniel._id], messages: [
      { senderId: alex._id, text: 'Daniel, did you fix the scroll glitch on iOS devices?', type: 'text' },
      { senderId: daniel._id, text: 'Yes, added `-webkit-overflow-scrolling: touch` and isolated the nested heights. Runs buttery smooth now! Pushed to main.', type: 'text' }
    ]},
    { type: 'direct', participants: [alex._id, sarah._id], messages: [
      { senderId: sarah._id, text: 'Alex, ensure we do not leave raw credentials in the environment config.', type: 'text' },
      { senderId: alex._id, text: 'Understood. Everything is pulled from process.env securely.', type: 'text' }
    ]},
    { type: 'direct', participants: [alex._id, ai._id], messages: [
      { senderId: ai._id, text: 'Welcome to Aether AI! I can help you draft responses, translate logs, or audit code files. Ask me anything!', type: 'text' }
    ]},
    { type: 'group', name: 'Design Syndicate', participants: [alex._id, eve._id, daniel._id, sarah._id], messages: [
      { senderId: eve._id, text: 'Welcome to the Design Syndicate! Let\'s use this space to critique layout iterations.', type: 'text' },
      { senderId: daniel._id, text: 'Awesome. I\'ll drop the new guidelines PDF here.', type: 'text' }
    ]}
  ];

  for (const cData of chatsToCreate) {
    const convo = new Conversation({
      type: cData.type,
      name: cData.name || '',
      participants: cData.participants
    });
    await convo.save();

    for (const mData of cData.messages) {
      const msg = new Message({
        conversationId: convo._id,
        senderId: mData.senderId,
        type: mData.type,
        text: mData.text,
        status: 'read'
      });
      await msg.save();
    }
  }

  // 3. Create Channels
  const ch1 = new Channel({
    name: 'Modern Web Daily',
    avatar: eve.avatar,
    description: 'Curated articles, tips, and tutorials about frontend engineering, web aesthetics, and CSS tricks.',
    subscribersCount: 142500,
    posts: [
      {
        content: 'CSS Anchor Positioning is now supported across major browsers! This is going to revolutionize how we build tooltips, dropdowns, and context menus.',
        image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        likes: [alex._id],
        comments: [
          { name: 'Developer_X', text: 'Finally! Less JS in my bundles.' }
        ]
      }
    ]
  });
  await ch1.save();

  const ch2 = new Channel({
    name: 'Stoic Reflections',
    avatar: marcus.avatar,
    description: 'Daily quotes, mental models, and writing from Seneca, Marcus Aurelius, and Epictetus.',
    subscribersCount: 88000,
    posts: [
      {
        content: '"The happiness of your life depends upon the quality of your thoughts." â€” Marcus Aurelius.',
        likes: []
      }
    ]
  });
  await ch2.save();

  // 4. Create Communities
  const comm = new Community({
    name: 'Tech Frontier',
    tagline: 'The ultimate space for engineers and designers.',
    avatar: eve.avatar,
    description: 'Tech Frontier is a global network of creative minds mapping out the next wave of web development, AI integration, and design principles.',
    joined: [alex._id],
    announcements: [
      { title: 'Community Hackathon 2026', content: 'Our annual hackathon kicks off this Friday. Team sizes are limited to 4.' }
    ]
  });
  await comm.save();

  // 5. Create Status stories
  const status1 = new Status({
    userId: eve._id,
    userName: eve.name,
    userAvatar: eve.avatar,
    items: [
      { type: 'text', content: 'Sipping coffee and review designs â˜•âœ¨', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', timestamp: '10:00 AM' }
    ]
  });
  await status1.save();

  console.log('Seeding successfully completed.');
}

// Overdue and Due Today Tasks Checker (runs every 6 hours)
setInterval(async () => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    // 1. Tasks Due Today
    const dueTodayTasks = await Task.find({
      dueDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'Completed' }
    });

    for (const task of dueTodayTasks) {
      if (task.assignedTo) {
        const exists = await Notification.findOne({
          userId: task.assignedTo,
          type: 'task_due_today',
          taskId: task._id,
          createdAt: { $gte: startOfToday }
        });
        if (!exists) {
          const notif = new Notification({
            userId: task.assignedTo,
            type: 'task_due_today',
            title: 'Task Due Today',
            content: `Reminder: Your assigned task "${task.title}" is due today.`,
            taskId: task._id
          });
          await notif.save();
          
          const socketId = activeSockets.get(task.assignedTo.toString());
          if (socketId) {
            io.to(socketId).emit('taskReminder', { task, type: 'due_today', notification: notif });
          }
        }
      }
    }

    // 2. Overdue Tasks
    const overdueTasks = await Task.find({
      dueDate: { $lt: startOfToday },
      status: { $ne: 'Completed' }
    });

    for (const task of overdueTasks) {
      if (task.assignedTo) {
        const exists = await Notification.findOne({
          userId: task.assignedTo,
          type: 'task_overdue',
          taskId: task._id
        });
        if (!exists) {
          const notif = new Notification({
            userId: task.assignedTo,
            type: 'task_overdue',
            title: 'Task Overdue âš ï¸',
            content: `Alert: Your assigned task "${task.title}" is overdue.`,
            taskId: task._id
          });
          await notif.save();

          const socketId = activeSockets.get(task.assignedTo.toString());
          if (socketId) {
            io.to(socketId).emit('taskReminder', { task, type: 'overdue', notification: notif });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking due/overdue tasks:', err);
  }
}, 6 * 60 * 60 * 1000); // Check every 6 hours

// Serve static client assets in production
app.use(express.static(distPath));

// Fallback to React app router
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Launch server listener
let PORT = process.env.PORT || 5000;
const startServer = (portToTry) => {
  server.listen(portToTry, '0.0.0.0');
};

server.on('listening', () => {
  console.log(`Aether Server listening on port: ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} is already in use.`);
    PORT = Number(PORT) + 1;
    console.log(`🔄 Retrying server on port ${PORT}...`);
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
