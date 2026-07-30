const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');
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

// Register as business
router.post('/register', authenticateToken, async (req, res) => {
  const { businessName, category, description, phone, email, website, address, openingHours, closingHours, workingDays, timeZone, location } = req.body;
  if (!businessName) return res.status(400).json({ error: 'Business name is required' });

  try {
    const existing = await Business.findOne({ owner: req.userId });
    if (existing) return res.status(400).json({ error: 'You already have a business profile' });

    const business = new Business({
      owner: req.userId,
      businessName, category, description, phone, email, website, address,
      openingHours: openingHours || '09:00',
      closingHours: closingHours || '18:00',
      workingDays: workingDays || ['Monday','Tuesday','Wednesday','Thursday','Friday'],
      timeZone: timeZone || 'UTC',
      location: location || undefined
    });
    await business.save();

    await User.findByIdAndUpdate(req.userId, {
      accountType: 'business',
      businessProfile: business._id
    });

    res.status(201).json({ message: 'Business profile created', business });
  } catch (error) {
    console.error('Failed to create business:', error);
    res.status(500).json({ error: 'Failed to create business profile' });
  }
});

// Get business profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// Update business profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { businessName, category, description, phone, email, website, address, openingHours, closingHours, workingDays, timeZone, logo, coverImage, autoReplyEnabled, autoReplyMessage, location } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    if (businessName) business.businessName = businessName;
    if (category !== undefined) business.category = category;
    if (description !== undefined) business.description = description;
    if (phone !== undefined) business.phone = phone;
    if (email !== undefined) business.email = email;
    if (website !== undefined) business.website = website;
    if (address !== undefined) business.address = address;
    if (location !== undefined) business.location = location;
    if (openingHours) business.openingHours = openingHours;
    if (closingHours) business.closingHours = closingHours;
    if (workingDays) business.workingDays = workingDays;
    if (timeZone) business.timeZone = timeZone;
    if (logo !== undefined) business.logo = logo;
    if (coverImage !== undefined) business.coverImage = coverImage;
    if (autoReplyEnabled !== undefined) business.autoReplyEnabled = autoReplyEnabled;
    if (autoReplyMessage !== undefined) business.autoReplyMessage = autoReplyMessage;

    await business.save();
    res.json({ message: 'Business profile updated', business });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Set availability status
router.put('/availability', authenticateToken, async (req, res) => {
  const { status } = req.body;
  if (!['open','closed','busy','on_break','holiday'].includes(status)) {
    return res.status(400).json({ error: 'Invalid availability status' });
  }
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.availabilityStatus = status;
    await business.save();
    res.json({ message: 'Availability updated', status: business.availabilityStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Add product
router.post('/products', authenticateToken, async (req, res) => {
  const { name, description, price, currency, image, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.products.push({ name, description, price, currency, image, category });
    await business.save();
    res.status(201).json({ message: 'Product added', product: business.products[business.products.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// List products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Delete product
router.delete('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.products.pull({ _id: req.params.productId });
    await business.save();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update product
router.put('/products/:productId', authenticateToken, async (req, res) => {
  const { name, description, price, currency, image, category } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const product = business.products.id(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (currency) product.currency = currency;
    if (image !== undefined) product.image = image;
    if (category !== undefined) product.category = category;
    await business.save();
    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Update service
router.put('/services/:serviceId', authenticateToken, async (req, res) => {
  const { name, description, duration, price, currency } = req.body;
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const service = business.services.id(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (duration !== undefined) service.duration = duration;
    if (price !== undefined) service.price = price;
    if (currency) service.currency = currency;
    await business.save();
    res.json({ message: 'Service updated', service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Add service
router.post('/services', authenticateToken, async (req, res) => {
  const { name, description, duration, price, currency } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required' });
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.services.push({ name, description, duration, price, currency });
    await business.save();
    res.status(201).json({ message: 'Service added', service: business.services[business.services.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// List services
router.get('/services', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Delete service
router.delete('/services/:serviceId', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    business.services.pull({ _id: req.params.serviceId });
    await business.save();
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Book appointment
router.post('/appointments', authenticateToken, async (req, res) => {
  const { businessId, customerName, customerEmail, customerPhone, service, date, time, notes } = req.body;
  if (!businessId || !date || !time) return res.status(400).json({ error: 'Business ID, date, and time are required' });
  try {
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    business.appointments.push({ customerName, customerId: req.userId, customerEmail, customerPhone, service, date, time, notes, status: 'pending' });
    await business.save();

    const notification = new Notification({
      userId: business.owner,
      type: 'contact_request',
      title: 'New Appointment Booking',
      content: `${customerName || 'A customer'} booked an appointment for ${new Date(date).toLocaleDateString()} at ${time}`,
      fromUserId: req.userId
    });
    await notification.save();

    res.status(201).json({ message: 'Appointment booked', appointment: business.appointments[business.appointments.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// List appointments (for business owner)
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    res.json(business.appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Update appointment (accept/decline/reschedule)
router.put('/appointments/:appointmentId', authenticateToken, async (req, res) => {
  const { status, rescheduledDate, rescheduledTime } = req.body;
  if (!['confirmed','declined','rescheduled','completed','cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const business = await Business.findOne({ owner: req.userId });
    if (!business) return res.status(404).json({ error: 'Business profile not found' });
    const appointment = business.appointments.id(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    appointment.status = status;
    if (rescheduledDate) appointment.rescheduledDate = rescheduledDate;
    if (rescheduledTime) appointment.rescheduledTime = rescheduledTime;
    await business.save();
    res.json({ message: 'Appointment updated', appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Public: Get business by ID
router.get('/public/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).populate('owner', 'name username avatar');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json({
      _id: business._id,
      businessName: business.businessName,
      category: business.category,
      description: business.description,
      logo: business.logo,
      coverImage: business.coverImage,
      phone: business.phone,
      email: business.email,
      website: business.website,
      address: business.address,
      location: business.location,
      placeName: business.location?.placeName || '',
      openingHours: business.openingHours,
      closingHours: business.closingHours,
      workingDays: business.workingDays,
      availabilityStatus: business.availabilityStatus,
      averageRating: business.averageRating,
      services: business.services,
      products: business.products,
      workshops: business.workshops || [],
      events: business.events || [],
      owner: business.owner
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// Submit a review
router.post('/reviews/:businessId', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const existing = business.reviews.find(r => r.userId?.toString() === req.userId);
    if (existing) return res.status(400).json({ error: 'You have already reviewed this business' });
    business.reviews.push({ userId: req.userId, rating, comment });
    const total = business.reviews.reduce((sum, r) => sum + r.rating, 0);
    business.averageRating = Math.round((total / business.reviews.length) * 10) / 10;
    await business.save();
    res.status(201).json({ message: 'Review submitted', averageRating: business.averageRating });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for a business
router.get('/reviews/:businessId', async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId).select('reviews averageRating');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const populated = await Business.populate(business, { path: 'reviews.userId', select: 'name username avatar' });
    res.json({ reviews: populated.reviews, averageRating: populated.averageRating });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get auto-reply message based on business availability
router.get('/auto-reply/:businessId', async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId).select('availabilityStatus openingHours closingHours workingDays autoReplyEnabled autoReplyMessage businessName');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (!business.autoReplyEnabled) return res.json({ autoReply: null });
    if (business.autoReplyMessage) return res.json({ autoReply: business.autoReplyMessage });
    const now = new Date();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = dayNames[now.getDay()];
    const isWorkingDay = business.workingDays.includes(today);
    const currentHour = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const isOpen = isWorkingDay && currentHour >= business.openingHours && currentHour <= business.closingHours;
    if (!isOpen) {
      const msg = `Thank you for reaching out to ${business.businessName}!\n\nWe are currently ${business.availabilityStatus === 'holiday' ? 'on holiday' : business.availabilityStatus === 'closed' ? 'closed' : 'unavailable'}.\nBusiness Hours:\n${business.workingDays.join('-')}\n${business.openingHours} - ${business.closingHours}\n\nWe will get back to you during business hours.`;
      return res.json({ autoReply: msg });
    }
    if (business.availabilityStatus === 'busy' || business.availabilityStatus === 'on_break') {
      return res.json({ autoReply: `Thanks for contacting ${business.businessName}! We are currently ${business.availabilityStatus === 'busy' ? 'busy' : 'on a short break'}. We will respond as soon as possible.` });
    }
    res.json({ autoReply: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get auto-reply' });
  }
});

// Public: List businesses (search)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = q ? { businessName: new RegExp(escaped, 'i') } : {};
    const businesses = await Business.find(query)
      .select('businessName category logo description address location placeName availabilityStatus averageRating')
      .limit(20);
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search businesses' });
  }
});

module.exports = router;
