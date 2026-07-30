const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserEvent = require('../models/UserEvent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');

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

// --- Create personal event ---
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, date, time, endTime, location, locationUrl, imageUrl, isPublic, capacity, price, currency, tags, sections } = req.body;
  if (!title || !date || !time) return res.status(400).json({ error: 'Title, date, and time are required' });
  try {
    const inviteToken = crypto.randomBytes(12).toString('hex');
    const event = new UserEvent({
      creator: req.userId,
      title, description, date, time, endTime, location, locationUrl, imageUrl,
      isPublic: isPublic || false,
      capacity: capacity || 0,
      price: price || 0,
      currency: currency || 'USD',
      tags: tags || [],
      sections: sections || [],
      inviteToken
    });
    await event.save();

    // Create internal group conversation for the event
    const conversation = new Conversation({
      type: 'group',
      name: `${event.title} Chat`,
      description: `Group chat for event: ${event.title}`,
      participants: [req.userId],
      creator: req.userId,
      admins: [req.userId],
      userEventId: event._id
    });
    await conversation.save();

    event.conversationId = conversation._id;
    await event.save();

    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    res.status(201).json({ message: 'Event created', event, inviteLink: `${baseUrl}/events/join/${inviteToken}` });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// --- List my events (created by me) ---
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const events = await UserEvent.find({ creator: req.userId })
      .populate('rsvps.userId', 'name username avatar')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// --- List events I'm attending ---
router.get('/attending', authenticateToken, async (req, res) => {
  try {
    const events = await UserEvent.find({ 'rsvps.userId': req.userId })
      .populate('creator', 'name username avatar')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attending events' });
  }
});

// --- Get single event (public or mine) ---
router.get('/:eventId', authenticateToken, async (req, res) => {
  try {
    const event = await UserEvent.findById(req.params.eventId)
      .populate('creator', 'name username avatar')
      .populate('rsvps.userId', 'name username avatar');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.isPublic && event.creator._id.toString() !== req.userId &&
        !event.rsvps.find(r => r.userId?._id?.toString() === req.userId)) {
      return res.status(403).json({ error: 'This event is private' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// --- Update event ---
router.put('/:eventId', authenticateToken, async (req, res) => {
  const { title, description, date, time, endTime, location, locationUrl, imageUrl, isPublic, capacity, price, currency, tags, sections, status } = req.body;
  try {
    const event = await UserEvent.findOne({ _id: req.params.eventId, creator: req.userId });
    if (!event) return res.status(404).json({ error: 'Event not found or unauthorized' });
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (date) event.date = date;
    if (time) event.time = time;
    if (endTime !== undefined) event.endTime = endTime;
    if (location !== undefined) event.location = location;
    if (locationUrl !== undefined) event.locationUrl = locationUrl;
    if (imageUrl !== undefined) event.imageUrl = imageUrl;
    if (isPublic !== undefined) event.isPublic = isPublic;
    if (capacity !== undefined) event.capacity = capacity;
    if (price !== undefined) event.price = price;
    if (currency) event.currency = currency;
    if (tags) event.tags = tags;
    if (sections) event.sections = sections;
    if (status) event.status = status;
    await event.save();
    res.json({ message: 'Event updated', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// --- Delete event ---
router.delete('/:eventId', authenticateToken, async (req, res) => {
  try {
    const event = await UserEvent.findOneAndDelete({ _id: req.params.eventId, creator: req.userId });
    if (!event) return res.status(404).json({ error: 'Event not found or unauthorized' });
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// --- Generate / regenerate invite link ---
router.post('/:eventId/invite-link', authenticateToken, async (req, res) => {
  try {
    const event = await UserEvent.findOne({ _id: req.params.eventId, creator: req.userId });
    if (!event) return res.status(404).json({ error: 'Event not found or unauthorized' });
    event.inviteToken = crypto.randomBytes(12).toString('hex');
    await event.save();
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    res.json({ inviteLink: `${baseUrl}/events/join/${event.inviteToken}`, inviteToken: event.inviteToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// --- Join event by invite token ---
router.post('/join/:token', authenticateToken, async (req, res) => {
  try {
    const event = await UserEvent.findOne({ inviteToken: req.params.token });
    if (!event) return res.status(404).json({ error: 'Invalid or expired invite link' });
    if (event.status === 'cancelled') return res.status(400).json({ error: 'This event has been cancelled' });
    
    const alreadyIn = event.rsvps.find(r => r.userId?.toString() === req.userId);
    if (alreadyIn) return res.json({ message: 'You are already attending this event', event });
    
    if (event.capacity > 0 && event.rsvps.length >= event.capacity) {
      return res.status(400).json({ error: 'Event is at full capacity' });
    }
    
    event.rsvps.push({ userId: req.userId, status: req.body.rsvpStatus || 'going' });
    await event.save();

    // Sync group chat participation
    const convoId = event.conversationId;
    const convo = convoId ? await Conversation.findById(convoId) : await Conversation.findOne({ userEventId: event._id });
    if (convo && !convo.participants.includes(req.userId)) {
      convo.participants.push(req.userId);
      await convo.save();
    }
    
    // Notify creator
    if (event.creator.toString() !== req.userId) {
      const attendee = await User.findById(req.userId).select('name');
      await new Notification({
        userId: event.creator,
        type: 'contact_request',
        title: 'New Event RSVP',
        content: `${attendee?.name || 'Someone'} joined your event "${event.title}"`,
        fromUserId: req.userId
      }).save();
    }
    
    res.json({ message: 'Successfully joined the event!', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// --- RSVP to an event ---
router.post('/:eventId/rsvp', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const rsvpStatus = ['going', 'maybe', 'not_going'].includes(status) ? status : 'going';
  try {
    const event = await UserEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.isPublic && event.creator.toString() !== req.userId &&
        !event.rsvps.find(r => r.userId?.toString() === req.userId)) {
      return res.status(403).json({ error: 'This event is private' });
    }

    const existing = event.rsvps.find(r => r.userId?.toString() === req.userId);
    if (existing) {
      existing.status = rsvpStatus;
      existing.respondedAt = new Date();
    } else {
      if (event.capacity > 0 && event.rsvps.filter(r => r.status !== 'not_going').length >= event.capacity) {
        return res.status(400).json({ error: 'Event is at full capacity' });
      }
      event.rsvps.push({ userId: req.userId, status: rsvpStatus });
    }
    await event.save();

    // Sync group chat participation based on RSVP status
    const convoId = event.conversationId;
    const convo = convoId ? await Conversation.findById(convoId) : await Conversation.findOne({ userEventId: event._id });
    if (convo) {
      if (rsvpStatus === 'going' || rsvpStatus === 'maybe') {
        if (!convo.participants.includes(req.userId)) {
          convo.participants.push(req.userId);
          await convo.save();
        }
      } else if (rsvpStatus === 'not_going') {
        convo.participants = convo.participants.filter(p => p.toString() !== req.userId);
        await convo.save();
      }
    }
    
    // Notify creator
    if (event.creator.toString() !== req.userId) {
      const attendee = await User.findById(req.userId).select('name');
      await new Notification({
        userId: event.creator,
        type: 'contact_request',
        title: 'Event RSVP Update',
        content: `${attendee?.name || 'Someone'} responded "${rsvpStatus}" to your event "${event.title}"`,
        fromUserId: req.userId
      }).save();
    }
    
    res.json({ message: `RSVP status set to ${rsvpStatus}`, event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to RSVP to event' });
  }
});

// --- Get event by invite token (preview before joining) ---
router.get('/preview/:token', async (req, res) => {
  try {
    const event = await UserEvent.findOne({ inviteToken: req.params.token })
      .populate('creator', 'name username avatar')
      .select('-rsvps');
    if (!event) return res.status(404).json({ error: 'Invalid or expired invite link' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// --- Public: list upcoming public events ---
router.get('/public/upcoming', async (req, res) => {
  try {
    const events = await UserEvent.find({
      isPublic: true,
      status: { $in: ['upcoming', 'ongoing'] },
      date: { $gte: new Date() }
    })
      .populate('creator', 'name username avatar')
      .sort({ date: 1 })
      .limit(30);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public events' });
  }
});

module.exports = router;
