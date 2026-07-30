const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Department = require('../models/Department');
const OrganizationMember = require('../models/OrganizationMember');
const Invitation = require('../models/Invitation');
const JoinRequest = require('../models/JoinRequest');
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

const checkRole = (...roles) => async (req, res, next) => {
  try {
    const member = await OrganizationMember.findOne({ organizationId: req.params.id, userId: req.userId });
    if (!member) return res.status(403).json({ error: 'Not a member of this organization' });
    if (!roles.includes(member.role) && member.role !== 'founder') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.member = member;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create organization
router.post('/create', authenticateToken, async (req, res) => {
  const { name, orgType, description, email, phone, website, address, verificationInfo } = req.body;
  if (!name) return res.status(400).json({ error: 'Organization name is required' });

  try {
    const organization = new Organization({
      name, orgType, description, email, phone, website, address, verificationInfo,
      founder: req.userId
    });
    await organization.save();

    const member = new OrganizationMember({
      organizationId: organization._id,
      userId: req.userId,
      role: 'founder'
    });
    await member.save();

    await User.findByIdAndUpdate(req.userId, {
      $push: { organizationMemberships: member._id }
    });

    // Create internal group conversation for the org
    const internalChat = new Conversation({
      type: 'group',
      name: organization.name + ' Chat',
      participants: [req.userId],
      creator: req.userId,
      admins: [req.userId],
      orgId: organization._id,
      isOrgInbox: false
    });
    await internalChat.save();
    organization.internalChatId = internalChat._id;
    await organization.save();

    res.status(201).json({ message: 'Organization created', organization, member });
  } catch (error) {
    console.error('Failed to create organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Search/list organizations (public)
router.get('/', async (req, res) => {
  const { q } = req.query;
  try {
    const query = q ? { name: new RegExp(q, 'i') } : {};
    const orgs = await Organization.find(query)
      .select('name orgType description logo coverImage address publicStatus')
      .limit(20);
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization public profile
router.get('/:id', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .select('name orgType description logo coverImage email phone website address publicStatus announcements verified');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const publicAnnouncements = org.announcements.filter(a => a.pinned).slice(-5);
    res.json({ ...org.toObject(), announcements: publicAnnouncements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization (admin+)
router.put('/:id', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  const { name, orgType, description, email, phone, website, address, logo, coverImage, verificationInfo, publicStatus } = req.body;
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    if (name) org.name = name;
    if (orgType) org.orgType = orgType;
    if (description !== undefined) org.description = description;
    if (email !== undefined) org.email = email;
    if (phone !== undefined) org.phone = phone;
    if (website !== undefined) org.website = website;
    if (address !== undefined) org.address = address;
    if (logo !== undefined) org.logo = logo;
    if (coverImage !== undefined) org.coverImage = coverImage;
    if (verificationInfo !== undefined) org.verificationInfo = verificationInfo;
    if (publicStatus !== undefined) org.publicStatus = publicStatus;
    await org.save();
    res.json({ message: 'Organization updated', organization: org });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete organization (founder only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    if (org.founder.toString() !== req.userId) return res.status(403).json({ error: 'Only the founder can delete the organization' });
    await OrganizationMember.deleteMany({ organizationId: org._id });
    await Department.deleteMany({ organizationId: org._id });
    await Invitation.deleteMany({ organizationId: org._id });
    await JoinRequest.deleteMany({ organizationId: org._id });
    await User.updateMany({}, { $pull: { organizationMemberships: { organizationId: org._id } } });
    await Organization.findByIdAndDelete(req.params.id);
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Get workspace (authenticated members)
router.get('/:id/workspace', authenticateToken, async (req, res) => {
  try {
    const member = await OrganizationMember.findOne({ organizationId: req.params.id, userId: req.userId });
    if (!member) return res.status(403).json({ error: 'Access denied. Not a member.' });
    const org = await Organization.findById(req.params.id);
    const departments = await Department.find({ organizationId: req.params.id });
    const members = await OrganizationMember.find({ organizationId: req.params.id })
      .populate('userId', 'name username avatar email')
      .sort({ role: 1 });
    res.json({ organization: org, departments, members, myRole: member.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Departments
router.post('/:id/departments', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    const dept = new Department({ organizationId: req.params.id, name, description, createdBy: req.userId });
    await dept.save();
    res.status(201).json({ message: 'Department created', department: dept });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.get('/:id/departments', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator', 'staff', 'member'), async (req, res) => {
  try {
    const departments = await Department.find({ organizationId: req.params.id });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.put('/:id/departments/:deptId', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  const { name, description } = req.body;
  try {
    const dept = await Department.findOne({ _id: req.params.deptId, organizationId: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    await dept.save();
    res.json({ message: 'Department updated', department: dept });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id/departments/:deptId', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  try {
    await Department.findOneAndDelete({ _id: req.params.deptId, organizationId: req.params.id });
    await OrganizationMember.updateMany(
      { organizationId: req.params.id },
      { $pull: { departments: req.params.deptId } }
    );
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const members = await OrganizationMember.find({ organizationId: req.params.id })
      .populate('userId', 'name username avatar email phone')
      .sort({ role: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.delete('/:id/members/:memberId', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  try {
    const target = await OrganizationMember.findOne({ _id: req.params.memberId, organizationId: req.params.id });
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'founder') return res.status(403).json({ error: 'Cannot remove the founder' });
    await OrganizationMember.findByIdAndDelete(target._id);
    await User.findByIdAndUpdate(target.userId, { $pull: { organizationMemberships: target._id } });
    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

router.put('/:id/members/:memberId/role', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  const { role } = req.body;
  const validRoles = ['super_admin', 'admin', 'manager', 'moderator', 'staff', 'member', 'guest'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const target = await OrganizationMember.findOne({ _id: req.params.memberId, organizationId: req.params.id });
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'founder') return res.status(403).json({ error: 'Cannot change founder role' });
    target.role = role;
    await target.save();
    res.json({ message: 'Role updated', member: target });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Invitations
router.post('/:id/invite', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager'), async (req, res) => {
  const { username, role } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const targetUser = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    const existingMember = await OrganizationMember.findOne({ organizationId: req.params.id, userId: targetUser._id });
    if (existingMember) return res.status(400).json({ error: 'User is already a member' });
    const existingInvite = await Invitation.findOne({ organizationId: req.params.id, receiverId: targetUser._id, status: 'pending' });
    if (existingInvite) return res.status(400).json({ error: 'Invitation already pending' });
    const invitation = new Invitation({
      organizationId: req.params.id,
      senderId: req.userId,
      receiverId: targetUser._id,
      role: role || 'member'
    });
    await invitation.save();
    const notification = new Notification({
      userId: targetUser._id,
      type: 'contact_request',
      title: 'Organization Invitation',
      content: `You've been invited to join ${(await Organization.findById(req.params.id)).name}`,
      fromUserId: req.userId
    });
    await notification.save();
    res.status(201).json({ message: 'Invitation sent', invitation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept invitation
router.post('/invitations/:invitationId/accept', authenticateToken, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.invitationId);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.receiverId.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: 'Invitation already processed' });
    const existingMember = await OrganizationMember.findOne({ organizationId: invitation.organizationId, userId: req.userId });
    if (existingMember) {
      invitation.status = 'accepted';
      await invitation.save();
      return res.json({ message: 'Already a member', member: existingMember });
    }
    const member = new OrganizationMember({
      organizationId: invitation.organizationId,
      userId: req.userId,
      role: invitation.role,
      invitedBy: invitation.senderId
    });
    await member.save();
    await User.findByIdAndUpdate(req.userId, { $push: { organizationMemberships: member._id } });
    // Add user to internal chat
    const invOrg = await Organization.findById(invitation.organizationId);
    if (invOrg?.internalChatId) {
      await Conversation.findByIdAndUpdate(invOrg.internalChatId, { $addToSet: { participants: req.userId } });
    }
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();
    res.json({ message: 'Invitation accepted', member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Decline invitation
router.post('/invitations/:invitationId/decline', authenticateToken, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.invitationId);
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.receiverId.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    invitation.status = 'declined';
    invitation.respondedAt = new Date();
    await invitation.save();
    res.json({ message: 'Invitation declined' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

// Get user's pending invitations
router.get('/invitations/pending', authenticateToken, async (req, res) => {
  try {
    const invitations = await Invitation.find({ receiverId: req.userId, status: 'pending' })
      .populate('organizationId', 'name logo orgType')
      .populate('senderId', 'name username avatar');
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Join request
router.post('/:id/join-request', authenticateToken, async (req, res) => {
  const { message } = req.body;
  try {
    const existing = await JoinRequest.findOne({ organizationId: req.params.id, applicantId: req.userId });
    if (existing && existing.status === 'pending') return res.status(400).json({ error: 'Join request already pending' });
    if (existing) {
      existing.status = 'pending';
      existing.message = message || '';
      existing.respondedAt = null;
      existing.respondedBy = null;
      await existing.save();
      return res.json({ message: 'Join request resent', request: existing });
    }
    const joinRequest = new JoinRequest({ organizationId: req.params.id, applicantId: req.userId, message });
    await joinRequest.save();
    const admins = await OrganizationMember.find({ organizationId: req.params.id, role: { $in: ['founder', 'super_admin', 'admin'] } });
    const applicant = await User.findById(req.userId);
    for (const admin of admins) {
      const notification = new Notification({
        userId: admin.userId,
        type: 'contact_request',
        title: 'New Join Request',
        content: `${applicant.name} wants to join ${(await Organization.findById(req.params.id)).name}`,
        fromUserId: req.userId
      });
      await notification.save();
    }
    res.status(201).json({ message: 'Join request submitted', request: joinRequest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit join request' });
  }
});

// Approve join request
router.post('/:id/join-request/:requestId/approve', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager'), async (req, res) => {
  try {
    const joinRequest = await JoinRequest.findOne({ _id: req.params.requestId, organizationId: req.params.id });
    if (!joinRequest) return res.status(404).json({ error: 'Join request not found' });
    if (joinRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });
    joinRequest.status = 'approved';
    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = req.userId;
    await joinRequest.save();
    const member = new OrganizationMember({
      organizationId: req.params.id,
      userId: joinRequest.applicantId,
      role: 'member',
      invitedBy: req.userId
    });
    await member.save();
    await User.findByIdAndUpdate(joinRequest.applicantId, { $push: { organizationMemberships: member._id } });
    // Add user to internal chat
    const jrOrg = await Organization.findById(req.params.id);
    if (jrOrg?.internalChatId) {
      await Conversation.findByIdAndUpdate(jrOrg.internalChatId, { $addToSet: { participants: joinRequest.applicantId } });
    }
    res.json({ message: 'Join request approved', member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve join request' });
  }
});

// Reject join request
router.post('/:id/join-request/:requestId/reject', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager'), async (req, res) => {
  try {
    const joinRequest = await JoinRequest.findOne({ _id: req.params.requestId, organizationId: req.params.id });
    if (!joinRequest) return res.status(404).json({ error: 'Join request not found' });
    joinRequest.status = 'rejected';
    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = req.userId;
    await joinRequest.save();
    res.json({ message: 'Join request rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject join request' });
  }
});

// Get join requests for organization
router.get('/:id/join-requests', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager'), async (req, res) => {
  try {
    const requests = await JoinRequest.find({ organizationId: req.params.id, status: 'pending' })
      .populate('applicantId', 'name username avatar email');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// Generate join code
router.post('/:id/generate-code', authenticateToken, checkRole('super_admin', 'admin', 'founder'), async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    org.joinCode = generateCode();
    await org.save();
    res.json({ joinCode: org.joinCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// Join via code
router.post('/join-code', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Join code is required' });
  try {
    const org = await Organization.findOne({ joinCode: code.toUpperCase() });
    if (!org) return res.status(404).json({ error: 'Invalid join code' });
    const existing = await OrganizationMember.findOne({ organizationId: org._id, userId: req.userId });
    if (existing) return res.status(400).json({ error: 'Already a member' });
    const member = new OrganizationMember({ organizationId: org._id, userId: req.userId, role: 'member' });
    await member.save();
    await User.findByIdAndUpdate(req.userId, { $push: { organizationMemberships: member._id } });
    // Add user to internal chat
    if (org.internalChatId) {
      await Conversation.findByIdAndUpdate(org.internalChatId, { $addToSet: { participants: req.userId } });
    }
    res.status(201).json({ message: 'Joined organization', organization: { _id: org._id, name: org.name, logo: org.logo, orgType: org.orgType }, member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join organization' });
  }
});

// Announcements
router.post('/:id/announcements', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator'), async (req, res) => {
  const { title, content, pinned } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    org.announcements.push({ title, content, createdBy: req.userId, pinned: pinned || false });
    await org.save();
    res.status(201).json({ message: 'Announcement created', announcement: org.announcements[org.announcements.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.get('/:id/announcements', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('announcements');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const announcements = org.announcements.sort((a, b) => b.createdAt - a.createdAt);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Events
router.post('/:id/events', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator'), async (req, res) => {
  const { title, description, date, location } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    org.events.push({ title, description, date, location, createdBy: req.userId });
    await org.save();
    res.status(201).json({ message: 'Event created', event: org.events[org.events.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.get('/:id/events', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('events');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const events = org.events.sort((a, b) => a.date - b.date);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// User's organizations
router.get('/user/mine', authenticateToken, async (req, res) => {
  try {
    const memberships = await OrganizationMember.find({ userId: req.userId })
      .populate('organizationId', 'name logo orgType description publicStatus');
    const orgs = memberships.map(m => ({
      membership: m,
      organization: m.organizationId,
      role: m.role
    }));
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Department announcements
router.post('/:id/departments/:deptId/announcements', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator'), async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const dept = await Department.findOne({ _id: req.params.deptId, organizationId: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    dept.announcements.push({ title, content, createdBy: req.userId });
    await dept.save();
    res.status(201).json({ message: 'Department announcement created', announcement: dept.announcements[dept.announcements.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department announcement' });
  }
});

router.get('/:id/departments/:deptId/announcements', authenticateToken, async (req, res) => {
  try {
    const dept = await Department.findOne({ _id: req.params.deptId, organizationId: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    res.json(dept.announcements.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department announcements' });
  }
});

// Department events
router.post('/:id/departments/:deptId/events', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator'), async (req, res) => {
  const { title, description, date, location } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const dept = await Department.findOne({ _id: req.params.deptId, organizationId: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    dept.events.push({ title, description, date, location, createdBy: req.userId });
    await dept.save();
    res.status(201).json({ message: 'Department event created', event: dept.events[dept.events.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department event' });
  }
});

router.get('/:id/departments/:deptId/events', authenticateToken, async (req, res) => {
  try {
    const dept = await Department.findOne({ _id: req.params.deptId, organizationId: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    res.json(dept.events.sort((a, b) => a.date - b.date));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department events' });
  }
});

// Organization Files
router.post('/:id/files', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator', 'staff'), async (req, res) => {
  const { name, url, type, size, departmentId } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    org.files.push({ name, url, type, size, uploadedBy: req.userId, departmentId: departmentId || null });
    await org.save();
    res.status(201).json({ message: 'File uploaded', file: org.files[org.files.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.get('/:id/files', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('files');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const files = org.files.sort((a, b) => b.createdAt - a.createdAt);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Organization Polls
router.post('/:id/polls', authenticateToken, checkRole('super_admin', 'admin', 'founder', 'manager', 'moderator'), async (req, res) => {
  const { question, options, expiresAt } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Question and at least 2 options required' });
  }
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const formattedOptions = options.map(o => ({ text: o, votes: [] }));
    org.polls.push({ question, options: formattedOptions, createdBy: req.userId, expiresAt });
    await org.save();
    res.status(201).json({ message: 'Poll created', poll: org.polls[org.polls.length - 1] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

router.get('/:id/polls', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('polls');
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const polls = org.polls.sort((a, b) => b.createdAt - a.createdAt);
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

router.post('/:id/polls/:pollId/vote', authenticateToken, async (req, res) => {
  const { optionIndex } = req.body;
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const poll = org.polls.id(req.params.pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }
    poll.options[optionIndex].votes.addToSet(req.userId);
    await org.save();
    res.json({ message: 'Vote recorded', poll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Organization Workspace Inbox / Channels
router.get('/:id/inbox', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    res.json(org.channels || [
      { id: `org_gen_${org._id}`, name: 'general', description: 'General organization announcements & discussions', unread: 0 },
      { id: `org_ann_${org._id}`, name: 'announcements', description: 'Official broadcast channel', unread: 0 }
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization inbox' });
  }
});

module.exports = router;
