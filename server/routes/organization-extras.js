const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const Team = require('../models/Team');
const Project = require('../models/Project');
const User = require('../models/User');

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

const checkMember = async (req, res, next) => {
  try {
    const member = await OrganizationMember.findOne({ organizationId: req.params.orgId, userId: req.userId });
    if (!member) return res.status(403).json({ error: 'Not a member' });
    req.member = member;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking membership' });
  }
};

const canManage = (role) => ['founder', 'super_admin', 'admin', 'manager'].includes(role);

// Teams
router.get('/:orgId/teams', authenticateToken, checkMember, async (req, res) => {
  try {
    const teams = await Team.find({ organizationId: req.params.orgId })
      .populate('lead', 'name username avatar')
      .populate('members', 'name username avatar')
      .sort({ createdAt: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.post('/:orgId/teams', authenticateToken, checkMember, async (req, res) => {
  const { name, description, departmentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name is required' });
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const team = new Team({
      organizationId: req.params.orgId,
      departmentId: departmentId || null,
      name, description,
      createdBy: req.userId,
      members: [req.userId]
    });
    await team.save();
    res.status(201).json({ message: 'Team created', team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.put('/:orgId/teams/:teamId', authenticateToken, checkMember, async (req, res) => {
  const { name, description, lead } = req.body;
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const team = await Team.findOne({ _id: req.params.teamId, organizationId: req.params.orgId });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (lead !== undefined) team.lead = lead;
    await team.save();
    res.json({ message: 'Team updated', team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/:orgId/teams/:teamId', authenticateToken, checkMember, async (req, res) => {
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    await Team.findOneAndDelete({ _id: req.params.teamId, organizationId: req.params.orgId });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.post('/:orgId/teams/:teamId/members', authenticateToken, checkMember, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const team = await Team.findOne({ _id: req.params.teamId, organizationId: req.params.orgId });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }
    res.json({ message: 'Member added', team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:orgId/teams/:teamId/members/:userId', authenticateToken, checkMember, async (req, res) => {
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const team = await Team.findOne({ _id: req.params.teamId, organizationId: req.params.orgId });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    team.members = team.members.filter(m => m.toString() !== req.params.userId);
    if (team.lead && team.lead.toString() === req.params.userId) team.lead = null;
    await team.save();
    res.json({ message: 'Member removed', team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Projects
router.get('/:orgId/projects', authenticateToken, checkMember, async (req, res) => {
  try {
    const projects = await Project.find({ organizationId: req.params.orgId })
      .populate('lead', 'name username avatar')
      .populate('members', 'name username avatar')
      .populate('tasks.assignedTo', 'name username avatar')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/:orgId/projects/:projectId', authenticateToken, checkMember, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId })
      .populate('lead', 'name username avatar')
      .populate('members', 'name username avatar')
      .populate('tasks.assignedTo', 'name username avatar');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.post('/:orgId/projects', authenticateToken, checkMember, async (req, res) => {
  const { name, description, departmentId, priority, startDate, endDate } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const project = new Project({
      organizationId: req.params.orgId,
      departmentId: departmentId || null,
      name, description,
      priority: priority || 'medium',
      startDate, endDate,
      lead: req.userId,
      members: [req.userId],
      createdBy: req.userId
    });
    await project.save();
    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/:orgId/projects/:projectId', authenticateToken, checkMember, async (req, res) => {
  const { name, description, status, progress, priority, endDate } = req.body;
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (progress !== undefined) project.progress = Math.min(100, Math.max(0, progress));
    if (priority) project.priority = priority;
    if (endDate !== undefined) project.endDate = endDate;
    await project.save();
    res.json({ message: 'Project updated', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:orgId/projects/:projectId', authenticateToken, checkMember, async (req, res) => {
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    await Project.findOneAndDelete({ _id: req.params.projectId, organizationId: req.params.orgId });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.post('/:orgId/projects/:projectId/members', authenticateToken, checkMember, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.members.includes(userId)) {
      project.members.push(userId);
      await project.save();
    }
    res.json({ message: 'Member added', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:orgId/projects/:projectId/members/:userId', authenticateToken, checkMember, async (req, res) => {
  if (!canManage(req.member.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    res.json({ message: 'Member removed', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Project Tasks
router.post('/:orgId/projects/:projectId/tasks', authenticateToken, checkMember, async (req, res) => {
  const { title, description, assignedTo, priority, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.tasks.push({ title, description, assignedTo, priority: priority || 'medium', dueDate });
    await project.save();
    const task = project.tasks[project.tasks.length - 1];
    res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:orgId/projects/:projectId/tasks/:taskId', authenticateToken, checkMember, async (req, res) => {
  const { title, description, status, priority, dueDate, assignedTo } = req.body;

  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const task = project.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    await project.save();

    const total = project.tasks.length;
    const done = project.tasks.filter(t => t.status === 'done').length;
    project.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    await project.save();

    res.json({ message: 'Task updated', task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:orgId/projects/:projectId/tasks/:taskId', authenticateToken, checkMember, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, organizationId: req.params.orgId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.tasks.pull({ _id: req.params.taskId });
    const total = project.tasks.length;
    const done = project.tasks.filter(t => t.status === 'done').length;
    project.progress = total > 0 ? Math.round((done / total) * 100) : 0;
    await project.save();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Organization Analytics
router.get('/:orgId/analytics', authenticateToken, checkMember, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const members = await OrganizationMember.find({ organizationId: req.params.orgId });
    const departments = await (require('../models/Department')).find({ organizationId: req.params.orgId });
    const teams = await Team.find({ organizationId: req.params.orgId });
    const projects = await Project.find({ organizationId: req.params.orgId });

    const roleCounts = {};
    members.forEach(m => { roleCounts[m.role] = (roleCounts[m.role] || 0) + 1; });

    const projectStats = {
      total: projects.length,
      planning: projects.filter(p => p.status === 'planning').length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      onHold: projects.filter(p => p.status === 'on_hold').length
    };

    const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const doneTasks = projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'done').length, 0);

    res.json({
      membersCount: members.length,
      departmentsCount: departments.length,
      teamsCount: teams.length,
      projectsCount: projects.length,
      totalTasks,
      doneTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      roleDistribution: roleCounts,
      projectStats,
      announcementsCount: org.announcements.length,
      eventsCount: org.events.length,
      filesCount: org.files.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
