const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Business = require('../models/Business');
const BusinessQuickReply = require('../models/BusinessQuickReply');
const BusinessStaff = require('../models/BusinessStaff');
const BusinessAnalytics = require('../models/BusinessAnalytics');
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

// Quick Replies
router.post('/quick-replies', authenticateToken, async (req, res) => {
  const { title, message, shortcut, category } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const qr = new BusinessQuickReply({ businessId: business._id, title, message, shortcut, category });
    await qr.save();
    res.status(201).json({ message: 'Quick reply created', quickReply: qr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quick reply' });
  }
});

router.get('/quick-replies', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const replies = await BusinessQuickReply.find({ businessId: business._id }).sort({ createdAt: -1 });
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quick replies' });
  }
});

router.put('/quick-replies/:id', authenticateToken, async (req, res) => {
  const { title, message, shortcut, category } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const qr = await BusinessQuickReply.findOne({ _id: req.params.id, businessId: business._id });
    if (!qr) return res.status(404).json({ error: 'Quick reply not found' });
    if (title) qr.title = title;
    if (message !== undefined) qr.message = message;
    if (shortcut !== undefined) qr.shortcut = shortcut;
    if (category !== undefined) qr.category = category;
    await qr.save();
    res.json({ message: 'Quick reply updated', quickReply: qr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quick reply' });
  }
});

router.delete('/quick-replies/:id', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    await BusinessQuickReply.findOneAndDelete({ _id: req.params.id, businessId: business._id });
    res.json({ message: 'Quick reply deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quick reply' });
  }
});

// Staff Management
router.get('/staff', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const staff = await BusinessStaff.find({ businessId: business._id }).populate('userId', 'name username avatar email');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/staff', authenticateToken, async (req, res) => {
  const { username, role, permissions } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    const targetUser = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existing = await BusinessStaff.findOne({ businessId: business._id, userId: targetUser._id });
    if (existing) return res.status(400).json({ error: 'User is already staff' });

    if (targetUser._id.toString() === req.userId) return res.status(400).json({ error: 'You cannot add yourself as staff' });

    const staff = new BusinessStaff({
      businessId: business._id,
      userId: targetUser._id,
      role: role || 'support',
      permissions: permissions || {},
      addedBy: req.userId
    });
    await staff.save();

    const notification = new Notification({
      userId: targetUser._id,
      type: 'contact_request',
      title: 'Business Staff Invitation',
      content: `You've been added as ${role || 'staff'} to ${business.businessName}`,
      fromUserId: req.userId
    });
    await notification.save();

    res.status(201).json({ message: 'Staff added', staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff' });
  }
});

router.put('/staff/:id', authenticateToken, async (req, res) => {
  const { role, permissions } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const staff = await BusinessStaff.findOne({ _id: req.params.id, businessId: business._id });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    if (staff.role === 'owner') return res.status(403).json({ error: 'Cannot modify owner' });
    if (role && ['admin', 'manager', 'sales_agent', 'support'].includes(role)) staff.role = role;
    if (permissions) staff.permissions = { ...staff.permissions, ...permissions };
    await staff.save();
    res.json({ message: 'Staff updated', staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

router.delete('/staff/:id', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const staff = await BusinessStaff.findOne({ _id: req.params.id, businessId: business._id });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    if (staff.role === 'owner') return res.status(403).json({ error: 'Cannot remove owner' });
    await BusinessStaff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
});

// Analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    let analytics = await BusinessAnalytics.findOne({ businessId: business._id });
    if (!analytics) {
      analytics = new BusinessAnalytics({ businessId: business._id });
      await analytics.save();
    }

    const totalProducts = business.products.length;
    const totalServices = business.services.length;
    const totalAppointments = business.appointments.length;
    const pendingAppointments = business.appointments.filter(a => a.status === 'pending').length;
    const reviewsCount = business.reviews.length;
    const avgRating = business.averageRating || 0;

    res.json({
      analytics,
      overview: {
        totalProducts,
        totalServices,
        totalAppointments,
        pendingAppointments,
        reviewsCount,
        avgRating,
        totalCustomers: analytics.totalCustomers,
        totalMessages: analytics.totalMessages,
        profileViews: analytics.profileViews,
        productViews: analytics.productViews,
        salesInquiries: analytics.salesInquiries,
        avgResponseTime: analytics.avgResponseTime
      },
      weeklyData: analytics.weeklyData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.post('/analytics/track', authenticateToken, async (req, res) => {
  const { type } = req.body;
  const validTypes = ['profile_view', 'product_view', 'message', 'inquiry'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid tracking type' });

  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    let analytics = await BusinessAnalytics.findOne({ businessId: business._id });
    if (!analytics) {
      analytics = new BusinessAnalytics({ businessId: business._id });
    }

    switch (type) {
      case 'profile_view': analytics.profileViews += 1; break;
      case 'product_view': analytics.productViews += 1; break;
      case 'message': analytics.totalMessages += 1; break;
      case 'inquiry': analytics.salesInquiries += 1; break;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let weekEntry = analytics.weeklyData.find(w => {
      const wd = new Date(w.date);
      wd.setHours(0, 0, 0, 0);
      return wd.getTime() === today.getTime();
    });
    if (!weekEntry) {
      weekEntry = { date: today, customers: 0, messages: 0, views: 0 };
      analytics.weeklyData.push(weekEntry);
    }
    weekEntry.views += (type === 'profile_view' || type === 'product_view') ? 1 : 0;
    weekEntry.messages += (type === 'message') ? 1 : 0;

    await analytics.save();
    res.json({ message: 'Tracked', analytics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track' });
  }
});

// Broadcast / Promotions
router.post('/broadcast', authenticateToken, async (req, res) => {
  const { message, title } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    const conversations = await (require('../models/Conversation')).find({
      participants: req.userId
    }).select('participants');

    const customerIds = new Set();
    conversations.forEach(c => {
      c.participants.forEach(p => {
        if (p.toString() !== req.userId) customerIds.add(p.toString());
      });
    });

    let sentCount = 0;
    for (const customerId of customerIds) {
      const notification = new Notification({
        userId: customerId,
        type: 'contact_request',
        title: title || `Promotion from ${business.businessName}`,
        content: message,
        fromUserId: req.userId
      });
      await notification.save();
      sentCount++;
    }

    if (sentCount > 0) {
      let analytics = await BusinessAnalytics.findOne({ businessId: business._id });
      if (!analytics) {
        analytics = new BusinessAnalytics({ businessId: business._id });
        await analytics.save();
      }
      analytics.totalMessages += sentCount;
      await analytics.save();
    }

    res.json({ message: 'Broadcast sent', recipients: sentCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Verification Request
router.post('/request-verification', authenticateToken, async (req, res) => {
  const { documentUrl, notes } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    if (business.verified) return res.status(400).json({ error: 'Already verified' });

    business.verificationInfo = JSON.stringify({ documentUrl, notes, requestedAt: new Date() });
    await business.save();

    res.json({ message: 'Verification request submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// Batch update products status
router.put('/products/batch-status', authenticateToken, async (req, res) => {
  const { productIds, status } = req.body;
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'productIds array is required' });
  }
  if (!['draft','published','archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    let count = 0;
    business.products.forEach(p => {
      if (productIds.includes(p._id.toString())) {
        p.status = status;
        count++;
      }
    });
    await business.save();
    res.json({ message: `${count} products updated`, count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch update products' });
  }
});

// Batch delete products
router.delete('/products/batch', authenticateToken, async (req, res) => {
  const { productIds } = req.body;
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'productIds array is required' });
  }
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const before = business.products.length;
    productIds.forEach(id => {
      business.products.pull({ _id: id });
    });
    await business.save();
    res.json({ message: `${before - business.products.length} products deleted`, count: before - business.products.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch delete products' });
  }
});

// Update product stock
router.put('/products/:productId/stock', authenticateToken, async (req, res) => {
  const { stock } = req.body;
  if (stock === undefined || stock < 0) return res.status(400).json({ error: 'Valid stock value is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.stock = stock;
    await business.save();
    res.json({ message: 'Stock updated', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Add product variant
router.post('/products/:productId/variants', authenticateToken, async (req, res) => {
  const { name, value, price, stock } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'Variant name and value are required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.variants.push({ name, value, price, stock: stock || 0 });
    await business.save();
    res.status(201).json({ message: 'Variant added', variant: product.variants[product.variants.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add variant' });
  }
});

// Delete product variant
router.delete('/products/:productId/variants/:variantId', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.variants.pull({ _id: req.params.variantId });
    await business.save();
    res.json({ message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Upload product images
router.put('/products/:productId/images', authenticateToken, async (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images)) return res.status(400).json({ error: 'images array is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.images = images;
    await business.save();
    res.json({ message: 'Images updated', images: product.images });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update images' });
  }
});

// Generate QR code for product
router.post('/products/:productId/qr', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const productUrl = `${baseUrl}/business/${business._id}?product=${product._id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(productUrl)}`;
    product.qrCode = qrUrl;
    await business.save();
    res.json({ qrCode: qrUrl, productUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Log a sales inquiry
router.post('/sales-inquiry', authenticateToken, async (req, res) => {
  const { productId, message } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    business.salesInquiries.push({
      customerName: req.body.customerName || 'Walk-in',
      customerId: req.userId,
      customerEmail: req.body.customerEmail || '',
      customerPhone: req.body.customerPhone || '',
      productId: product._id,
      productName: product.name,
      message: message || '',
      status: 'new'
    });
    await business.save();
    res.status(201).json({ message: 'Inquiry logged', inquiry: business.salesInquiries[business.salesInquiries.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log inquiry' });
  }
});

// Get sales inquiries
router.get('/sales-inquiries', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.salesInquiries || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// Update sales inquiry status
router.put('/sales-inquiries/:inquiryId', authenticateToken, async (req, res) => {
  const { status } = req.body;
  if (!['new','contacted','closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const inquiry = business.salesInquiries.id(req.params.inquiryId);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    inquiry.status = status;
    await business.save();
    res.json({ message: 'Inquiry updated', inquiry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// --- Workshops Management (For Business Owner) ---
// List workshops
router.get('/workshops', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.workshops || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
});

// Add workshop
router.post('/workshops', authenticateToken, async (req, res) => {
  const { title, description, instructor, date, time, duration, price, capacity, imageUrl } = req.body;
  if (!title || !date || !time) return res.status(400).json({ error: 'Title, date, and time are required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.workshops.push({ title, description, instructor, date, time, duration, price, capacity, imageUrl });
    await business.save();
    res.status(201).json({ message: 'Workshop created', workshop: business.workshops[business.workshops.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workshop' });
  }
});

// Update workshop
router.put('/workshops/:workshopId', authenticateToken, async (req, res) => {
  const { title, description, instructor, date, time, duration, price, capacity, imageUrl, status } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const workshop = business.workshops.id(req.params.workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    
    if (title) workshop.title = title;
    if (description !== undefined) workshop.description = description;
    if (instructor !== undefined) workshop.instructor = instructor;
    if (date) workshop.date = date;
    if (time) workshop.time = time;
    if (duration !== undefined) workshop.duration = duration;
    if (price !== undefined) workshop.price = price;
    if (capacity !== undefined) workshop.capacity = capacity;
    if (imageUrl !== undefined) workshop.imageUrl = imageUrl;
    if (status) workshop.status = status;

    await business.save();
    res.json({ message: 'Workshop updated', workshop });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workshop' });
  }
});

// Delete workshop
router.delete('/workshops/:workshopId', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.workshops.pull({ _id: req.params.workshopId });
    await business.save();
    res.json({ message: 'Workshop deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workshop' });
  }
});

// --- Events Management (For Business Owner) ---
// List events
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.events || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Add event
router.post('/events', authenticateToken, async (req, res) => {
  const { title, description, date, time, location, price, capacity, imageUrl } = req.body;
  if (!title || !date || !time) return res.status(400).json({ error: 'Title, date, and time are required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.events.push({ title, description, date, time, location, price, capacity, imageUrl });
    await business.save();
    res.status(201).json({ message: 'Event created', event: business.events[business.events.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/events/:eventId', authenticateToken, async (req, res) => {
  const { title, description, date, time, location, price, capacity, imageUrl } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const event = business.events.id(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (date) event.date = date;
    if (time) event.time = time;
    if (location !== undefined) event.location = location;
    if (price !== undefined) event.price = price;
    if (capacity !== undefined) event.capacity = capacity;
    if (imageUrl !== undefined) event.imageUrl = imageUrl;

    await business.save();
    res.json({ message: 'Event updated', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.events.pull({ _id: req.params.eventId });
    await business.save();
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// --- Customer Interactions (For Visitors) ---
// Enroll in workshop
router.post('/:businessId/workshops/:workshopId/enroll', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const workshop = business.workshops.id(req.params.workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    
    if (workshop.attendees.includes(req.userId)) {
      return res.status(400).json({ error: 'You are already enrolled in this workshop' });
    }
    if (workshop.attendees.length >= workshop.capacity) {
      return res.status(400).json({ error: 'Workshop is fully booked' });
    }
    
    workshop.attendees.push(req.userId);
    await business.save();

    // Create notification for owner
    const customer = await User.findById(req.userId).select('name');
    const notification = new Notification({
      userId: business.owner,
      type: 'contact_request',
      title: 'Workshop Registration',
      content: `${customer?.name || 'A customer'} registered for the workshop "${workshop.title}"`,
      fromUserId: req.userId
    });
    await notification.save();

    res.json({ message: 'Enrolled successfully', workshop });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enroll in workshop' });
  }
});

// RSVP to event
router.post('/:businessId/events/:eventId/rsvp', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const event = business.events.id(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.rsvps.includes(req.userId)) {
      return res.status(400).json({ error: 'You have already RSVPed to this event' });
    }
    if (event.rsvps.length >= event.capacity) {
      return res.status(400).json({ error: 'Event capacity reached' });
    }

    event.rsvps.push(req.userId);
    await business.save();

    // Create notification for owner
    const customer = await User.findById(req.userId).select('name');
    const notification = new Notification({
      userId: business.owner,
      type: 'contact_request',
      title: 'Event RSVP Received',
      content: `${customer?.name || 'A customer'} RSVPed to the event "${event.title}"`,
      fromUserId: req.userId
    });
    await notification.save();

    res.json({ message: 'RSVP confirmed successfully', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to RSVP to event' });
  }
});

// Purchase Product
router.post('/:businessId/products/:productId/purchase', authenticateToken, async (req, res) => {
  const { quantity, notes, variantName, variantValue } = req.body;
  const qty = parseInt(quantity) || 1;
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.stock > 0 && product.stock < qty) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    // Decrement stock + increment purchase count
    if (product.stock > 0) {
      product.stock -= qty;
    }
    product.purchaseCount = (product.purchaseCount || 0) + 1;

    const customer = await User.findById(req.userId).select('name email phone');
    
    // Log sales inquiry as purchase order
    business.salesInquiries.push({
      customerName: customer?.name || 'Customer',
      customerId: req.userId,
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || '',
      productId: product._id,
      productName: product.name,
      message: `[PURCHASE ORDER] Quantity: ${qty}${variantName ? ` (${variantName}: ${variantValue})` : ''}. Notes: ${notes || 'None'}. Price: $${(product.price * qty).toFixed(2)}`,
      status: 'new'
    });

    await business.save();

    // Create notification for owner
    const notification = new Notification({
      userId: business.owner,
      type: 'contact_request',
      title: '🛒 New Purchase Order',
      content: `${customer?.name || 'A customer'} ordered ${qty}x ${product.name} (Total: $${(product.price * qty).toFixed(2)})`,
      fromUserId: req.userId
    });
    await notification.save();

    res.json({ message: 'Purchase request logged successfully', product, notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// --- Track product view ---
router.post('/:businessId/products/:productId/view', async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.viewCount = (product.viewCount || 0) + 1;
    await business.save();
    res.json({ viewCount: product.viewCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// --- Generate workshop invite link ---
router.post('/workshops/:workshopId/invite-link', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const workshop = business.workshops.id(req.params.workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });

    const token = crypto.randomBytes(12).toString('hex');
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    workshop.inviteToken = token;
    workshop.inviteLink = `${baseUrl}/workshops/join/${token}`;
    await business.save();

    res.json({
      inviteLink: workshop.inviteLink,
      inviteToken: token,
      workshopId: workshop._id,
      workshopTitle: workshop.title
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// --- Join workshop by invite token ---
router.post('/workshops/join/:token', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ 'workshops.inviteToken': req.params.token });
    if (!business) return res.status(404).json({ error: 'Invalid or expired invite link' });

    const workshop = business.workshops.find(w => w.inviteToken === req.params.token);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    if (workshop.status === 'cancelled') return res.status(400).json({ error: 'This workshop has been cancelled' });

    if (workshop.attendees.map(a => a.toString()).includes(req.userId)) {
      return res.json({ message: 'You are already enrolled in this workshop', workshop, business: { _id: business._id, businessName: business.businessName } });
    }
    if (workshop.attendees.length >= workshop.capacity) {
      return res.status(400).json({ error: 'Workshop is fully booked' });
    }

    workshop.attendees.push(req.userId);
    await business.save();

    const customer = await User.findById(req.userId).select('name');
    await new Notification({
      userId: business.owner,
      type: 'contact_request',
      title: '🎓 Workshop Registration',
      content: `${customer?.name || 'A user'} joined your workshop "${workshop.title}" via invite link`,
      fromUserId: req.userId
    }).save();

    res.json({
      message: `Successfully enrolled in "${workshop.title}"!`,
      workshop,
      business: { _id: business._id, businessName: business.businessName }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join workshop' });
  }
});

// --- Get workshop by invite token (preview) ---
router.get('/workshops/preview/:token', async (req, res) => {
  try {
    const business = await Business.findOne({ 'workshops.inviteToken': req.params.token })
      .select('businessName logo workshops');
    if (!business) return res.status(404).json({ error: 'Invalid invite link' });
    const workshop = business.workshops.find(w => w.inviteToken === req.params.token);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json({ workshop, business: { _id: business._id, businessName: business.businessName, logo: business.logo } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workshop preview' });
  }
});

// --- Update workshop sections (multi-part text) ---
router.put('/workshops/:workshopId/sections', authenticateToken, async (req, res) => {
  const { sections } = req.body;
  if (!Array.isArray(sections)) return res.status(400).json({ error: 'sections must be an array' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const workshop = business.workshops.id(req.params.workshopId);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    workshop.multipartText = sections;
    await business.save();
    res.json({ message: 'Workshop sections updated', sections: workshop.multipartText });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workshop sections' });
  }
});

// --- Update event sections (multi-part text) ---
router.put('/events/:eventId/sections', authenticateToken, async (req, res) => {
  const { sections } = req.body;
  if (!Array.isArray(sections)) return res.status(400).json({ error: 'sections must be an array' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const event = business.events.id(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    event.multipartText = sections;
    await business.save();
    res.json({ message: 'Event sections updated', sections: event.multipartText });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event sections' });
  }
});

// --- Update product sections (multi-part text) ---
router.put('/products/:productId/sections', authenticateToken, async (req, res) => {
  const { sections } = req.body;
  if (!Array.isArray(sections)) return res.status(400).json({ error: 'sections must be an array' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.multipartText = sections;
    await business.save();
    res.json({ message: 'Product sections updated', sections: product.multipartText });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product sections' });
  }
});

// --- Workshop & Store Analytics Stats ---
router.get('/workshop-stats', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) {
      return res.json({
        totalProducts: 0,
        activeWorkshops: 0,
        totalRevenue: 0,
        totalEnrollments: 0,
        lowStockCount: 0
      });
    }

    const totalProducts = (business.products || []).length;
    const activeWorkshops = (business.workshops || []).filter(w => w.status === 'upcoming' || w.status === 'ongoing').length;
    const totalEnrollments = (business.workshops || []).reduce((acc, w) => acc + (w.enrolledUsers ? w.enrolledUsers.length : 0), 0);
    const totalRevenue = (business.workshops || []).reduce((acc, w) => acc + ((w.enrolledUsers ? w.enrolledUsers.length : 0) * (w.price || 0)), 0);
    const lowStockCount = (business.products || []).filter(p => (p.stock || 0) < 5).length;

    res.json({
      totalProducts,
      activeWorkshops,
      totalRevenue,
      totalEnrollments,
      lowStockCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workshop stats' });
  }
});

module.exports = router;
