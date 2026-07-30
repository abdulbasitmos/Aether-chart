import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiCheckSquare, FiPlus, FiFilter, FiSearch, FiSliders, 
  FiClock, FiAlertCircle, FiUser, FiCalendar, FiTag, 
  FiEdit3, FiTrash2, FiMessageSquare, FiSend, FiArrowLeft,
  FiActivity, FiCheck, FiFolderPlus, FiPaperclip, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { mockSocket } from '../services/mockSocket';

const TasksView = ({ conversationId, participants, me, convertTaskData, onClearConvertData }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All'); // 'All' | 'Me' | 'Unassigned' | userId
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'dueDate' | 'priority' | 'status'

  // Task Details Drawer
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [taskHistory, setTaskHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal State for Create/Edit Task
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Todo');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskLabels, setTaskLabels] = useState('');
  const [linkedMessageId, setLinkedMessageId] = useState(null);
  const [taskEditId, setTaskEditId] = useState(null);

  // Intercept convertTaskData from message context menu
  useEffect(() => {
    if (convertTaskData) {
      setModalMode('create');
      setTaskTitle('Task from Message');
      setTaskDesc(convertTaskData.text);
      setLinkedMessageId(convertTaskData.messageId);
      setTaskAssignee('');
      setTaskPriority('Medium');
      setTaskStatus('Todo');
      setTaskDueDate('');
      setTaskLabels('');
      setModalOpen(true);
      if (onClearConvertData) onClearConvertData();
    }
  }, [convertTaskData]);

  // Fetch Tasks on Load
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/tasks?conversationId=${conversationId}`);
      setTasks(response.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      toast.error('Failed to retrieve tasks log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [conversationId]);

  // Real-Time Socket Events Binding
  useEffect(() => {
    const handleTaskCreated = (newTask) => {
      if (newTask.conversationId === conversationId) {
        setTasks(prev => {
          if (prev.some(t => t._id === newTask._id)) return prev;
          return [newTask, ...prev];
        });
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask.conversationId === conversationId) {
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        setSelectedTask(prev => prev?._id === updatedTask._id ? updatedTask : prev);
      }
    };

    const handleTaskDeleted = ({ taskId }) => {
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setSelectedTask(prev => prev?._id === taskId ? null : prev);
    };

    const handleTaskCommentAdded = ({ taskId, comment }) => {
      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          const comments = t.comments || [];
          if (comments.some(c => c._id === comment._id)) return t;
          return { ...t, comments: [...comments, comment] };
        }
        return t;
      }));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => {
          const comments = prev.comments || [];
          if (comments.some(c => c._id === comment._id)) return prev;
          return { ...prev, comments: [...comments, comment] };
        });
      }
    };

    const unsubCreated = mockSocket.on('taskCreated', handleTaskCreated);
    const unsubUpdated = mockSocket.on('taskUpdated', handleTaskUpdated);
    const unsubDeleted = mockSocket.on('taskDeleted', handleTaskDeleted);
    const unsubComment = mockSocket.on('taskCommentAdded', handleTaskCommentAdded);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubComment();
    };
  }, [conversationId, selectedTask]);

  // Fetch Task History Log when selecting a task
  useEffect(() => {
    if (selectedTask) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const response = await axios.get(`/api/tasks/${selectedTask._id}/history`);
          setTaskHistory(response.data || []);
        } catch (err) {
          console.error('Failed to load history:', err);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [selectedTask]);

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    const labelsArray = taskLabels
      ? taskLabels.split(',').map(l => l.trim()).filter(Boolean)
      : [];

    const payload = {
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      status: taskStatus,
      assignedTo: taskAssignee || null,
      dueDate: taskDueDate || null,
      labels: labelsArray,
      conversationId,
      messageId: linkedMessageId
    };

    try {
      if (modalMode === 'create') {
        const res = await axios.post('/api/tasks', payload);
        toast.success('Task created successfully');
      } else {
        const res = await axios.put(`/api/tasks/${taskEditId}`, payload);
        toast.success('Task updated successfully');
      }
      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
      toast.error(err.response?.data?.error || 'Failed to complete task submission');
    }
  };

  // Quick complete / reopen status toggler
  const toggleComplete = async (task) => {
    const isCompleted = task.status === 'Completed';
    const nextStatus = isCompleted ? 'Todo' : 'Completed';
    try {
      await axios.put(`/api/tasks/${task._id}`, { status: nextStatus });
      toast.success(isCompleted ? 'Task reopened' : 'Task marked completed');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  // Add a comment to task
  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      const res = await axios.post(`/api/tasks/${selectedTask._id}/comments`, {
        text: commentText
      });
      setCommentText('');
      toast.success('Comment posted');
      
      // Update selected task state
      setSelectedTask(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.data]
      }));

      // Refresh history
      const histRes = await axios.get(`/api/tasks/${selectedTask._id}/history`);
      setTaskHistory(histRes.data || []);
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      toast.success('Task deleted');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // Open Edit Modal
  const openEditModal = (task) => {
    setModalMode('edit');
    setTaskEditId(task._id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskAssignee(task.assignedTo?._id || task.assignedTo || '');
    setTaskPriority(task.priority || 'Medium');
    setTaskStatus(task.status || 'Todo');
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : '');
    setTaskLabels(task.labels?.join(', ') || '');
    setLinkedMessageId(task.messageId || null);
    setModalOpen(true);
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = total - completed;
    const critical = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length;
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const dueToday = tasks.filter(t => {
      if (!t.dueDate || t.status === 'Completed') return false;
      const d = new Date(t.dueDate);
      return d >= startOfToday && d <= endOfToday;
    }).length;

    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === 'Completed') return false;
      return new Date(t.dueDate) < startOfToday;
    }).length;

    return { total, completed, pending, critical, dueToday, overdue };
  }, [tasks]);

  // Filters calculation
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Search Query
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.labels?.some(l => l.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Status Filter
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;

      // 3. Priority Filter
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;

      // 4. Assignee Filter
      if (assigneeFilter !== 'All') {
        if (assigneeFilter === 'Me') {
          const assigneeId = t.assignedTo?._id || t.assignedTo;
          if (assigneeId !== me._id && assigneeId !== me.id) return false;
        } else if (assigneeFilter === 'Unassigned') {
          if (t.assignedTo) return false;
        } else {
          const assigneeId = t.assignedTo?._id || t.assignedTo;
          if (assigneeId !== assigneeFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'priority') {
        const weight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return weight[b.priority] - weight[a.priority];
      }
      if (sortBy === 'status') {
        const weight = { 'Todo': 1, 'In Progress': 2, 'Blocked': 3, 'Cancelled': 4, 'Completed': 5 };
        return weight[a.status] - weight[b.status];
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // 'recent'
    });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, searchQuery, sortBy, me]);

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-row overflow-hidden relative">
      
      {/* A. Task dashboard content column */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-6 space-y-6">
        
        {/* 1. Header with Stats widgets */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-white font-display">Task Center</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage deliverables and workflows inside this conversation</p>
          </div>
          
          <button 
            onClick={() => {
              setModalMode('create');
              setTaskTitle('');
              setTaskDesc('');
              setTaskAssignee('');
              setTaskPriority('Medium');
              setTaskStatus('Todo');
              setTaskDueDate('');
              setTaskLabels('');
              setLinkedMessageId(null);
              setModalOpen(true);
            }}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
          >
            <FiPlus size={14} /> Add Task
          </button>
        </div>

        {/* Stats Board Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-400 bg-slate-900/50' },
            { label: 'Pending', value: stats.pending, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
            { label: 'Due Today', value: stats.dueToday, color: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10' },
            { label: 'Overdue', value: stats.overdue, color: 'text-rose-400 bg-rose-500/5 border-rose-500/10 animate-pulse' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400 bg-red-500/5 border-red-500/10' }
          ].map((card, i) => (
            <div key={i} className={`p-3 rounded-xl border border-white/5 flex flex-col justify-between min-h-[65px] ${card.color}`}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
              <span className="text-lg font-bold font-display leading-none mt-1.5">{card.value}</span>
            </div>
          ))}
        </div>

        {/* 2. Filters Console */}
        <div className="bg-[#131b2e]/60 border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={13} /></span>
            <input 
              type="text"
              placeholder="Search title, desc, labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[11px] rounded-lg px-2 py-1.5 text-slate-300 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[11px] rounded-lg px-2 py-1.5 text-slate-300 outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[11px] rounded-lg px-2 py-1.5 text-slate-300 outline-none cursor-pointer"
            >
              <option value="All">All Members</option>
              <option value="Me">Assigned to Me</option>
              <option value="Unassigned">Unassigned</option>
              {participants.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[11px] rounded-lg px-2 py-1.5 text-slate-300 outline-none cursor-pointer"
            >
              <option value="recent">Recent</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* 3. Task cards list viewport */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <span className="animate-spin mr-2">&#9696;</span> Loading tasks sandbox...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border border-dashed border-white/5 rounded-2xl bg-[#131b2e]/10">
            <FiCheckSquare size={30} className="text-slate-600 mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-slate-400">No tasks match criteria</h4>
            <p className="text-[10px] text-slate-600 max-w-[200px] mt-1">Clear search parameters or filters to review history.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
              return (
                <motion.div
                  key={task._id}
                  layoutId={task._id}
                  className="bg-[#131b2e]/60 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative group transition-all"
                >
                  <div>
                    {/* Header: Checkbox & Title & Badges */}
                    <div className="flex items-start gap-2.5">
                      <button 
                        onClick={() => toggleComplete(task)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                          task.status === 'Completed'
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'bg-slate-950 border-white/10 hover:border-emerald-500/40 text-transparent'
                        }`}
                      >
                        <FiCheck size={11} strokeWidth={4} />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h4 
                          onClick={() => setSelectedTask(task)}
                          className={`text-xs font-bold font-display cursor-pointer hover:text-emerald-400 truncate transition-colors ${
                            task.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Labels row */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {task.labels.map((lbl, idx) => (
                          <span key={idx} className="flex items-center gap-0.5 text-[8px] bg-slate-900 border border-white/5 text-slate-400 py-0.5 px-1.5 rounded">
                            <FiTag size={6} /> {lbl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer status row */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 select-none text-[9px]">
                    <div className="flex gap-2">
                      {/* Priority badge */}
                      <span className={`py-0.5 px-1.5 rounded font-bold uppercase ${
                        task.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        task.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        task.priority === 'Medium' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {task.priority}
                      </span>
                      {/* Status badge */}
                      <span className={`py-0.5 px-1.5 rounded font-bold uppercase ${
                        task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        task.status === 'Blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        task.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    {/* Due Date Indicator */}
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 font-semibold ${overdue ? 'text-rose-400 animate-pulse font-bold' : 'text-slate-500'}`}>
                        <FiCalendar size={9} />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Assignees & Created details row */}
                  <div className="flex justify-between items-center mt-3 pt-2">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[8px]">
                      <span>By {task.createdBy?.name || 'Aether'}</span>
                      {task.comments?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-slate-400"><FiMessageSquare size={8} />{task.comments.length}</span>
                      )}
                    </div>

                    {/* Assignee Avatar */}
                    {task.assignedTo ? (
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <img 
                          src={task.assignedTo.avatar} 
                          alt={task.assignedTo.name} 
                          className="w-4 h-4 rounded-full border border-white/10" 
                          title={`Assigned to ${task.assignedTo.name}`}
                        />
                        <span className="max-w-[50px] truncate">{task.assignedTo.name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-[8px] text-slate-600 font-semibold italic flex items-center gap-0.5"><FiUser size={8} /> Unassigned</span>
                    )}
                  </div>

                  {/* Floating Action Menu on card hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 select-none">
                    <button 
                      onClick={() => openEditModal(task)}
                      className="p-1 text-slate-400 hover:text-emerald-400 bg-slate-950 border border-white/5 hover:border-emerald-500/20 rounded-lg cursor-pointer"
                      title="Edit Task"
                    >
                      <FiEdit3 size={11} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task._id)}
                      className="p-1 text-slate-400 hover:text-rose-400 bg-slate-950 border border-white/5 hover:border-rose-500/25 rounded-lg cursor-pointer"
                      title="Delete Task"
                    >
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* B. Task Detail Side-Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, x: 280 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 280 }}
            className="w-80 border-l border-white/5 bg-slate-950/90 backdrop-blur-xl flex flex-col justify-between h-full z-30 shrink-0"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950 select-none">
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <FiArrowLeft size={12} /> Back
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(selectedTask)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer border border-transparent hover:border-white/5"
                >
                  <FiEdit3 size={12} />
                </button>
                <button 
                  onClick={() => handleDeleteTask(selectedTask._id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg cursor-pointer border border-transparent hover:border-rose-500/20"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>

            {/* Task Details Info Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
              <div>
                <span className="text-[8px] bg-slate-900 text-slate-500 border border-white/5 py-0.5 px-1.5 rounded uppercase font-bold tracking-wider">
                  Task Specification
                </span>
                <h3 className="text-sm font-bold text-white font-display mt-2">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5 whitespace-pre-wrap">{selectedTask.description}</p>
                )}
              </div>

              {/* Task properties deck */}
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 space-y-2.5 text-[10px] select-none">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-300">{selectedTask.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Priority</span>
                  <span className="font-bold text-slate-300">{selectedTask.priority}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Assigned To</span>
                  <span className="font-bold text-slate-300">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-bold text-slate-300">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None'}</span>
                </div>
                {selectedTask.labels && selectedTask.labels.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Labels</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTask.labels.map((l, i) => (
                        <span key={i} className="text-[8px] bg-slate-950 border border-white/5 text-slate-400 py-0.5 px-1.5 rounded">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Stream */}
              <div className="space-y-3.5">
                <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Comments Feed ({selectedTask.comments?.length || 0})</h4>
                
                {/* List Comments */}
                <div className="space-y-2.5 max-h-44 overflow-y-auto no-scrollbar">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment, i) => (
                      <div key={i} className="p-2.5 bg-slate-900/50 border border-white/5 rounded-xl text-[10px] space-y-1">
                        <div className="flex justify-between items-center select-none">
                          <span className="font-bold text-slate-200">{comment.userId?.name || me.name}</span>
                          <span className="text-[8px] text-slate-500">{comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                        </div>
                        <p className="text-slate-400 leading-normal">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <span className="text-[9px] text-slate-600 block italic">No comments posted yet. Type below to reply.</span>
                  )}
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={submitComment} className="flex gap-2 bg-slate-900 border border-white/5 rounded-xl p-1.5 items-center">
                  <input 
                    type="text"
                    placeholder="Write a reply... (@mention)"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-transparent text-[11px] outline-none text-slate-200 pl-2 placeholder:text-slate-600"
                  />
                  <button 
                    type="submit" 
                    className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 cursor-pointer active:scale-95 transition-transform shrink-0"
                  >
                    <FiSend size={10} />
                  </button>
                </form>
              </div>

              {/* Action Log History */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><FiActivity size={10} /> Action History Logs</h4>
                
                <div className="space-y-2 text-[9px] font-medium max-h-36 overflow-y-auto no-scrollbar">
                  {loadingHistory ? (
                    <span className="text-slate-600 animate-pulse italic block select-none">Retrieving log audits...</span>
                  ) : taskHistory.length > 0 ? (
                    taskHistory.map((hist, i) => (
                      <div key={i} className="flex justify-between items-start gap-2 border-b border-white/5 pb-1">
                        <div className="text-slate-400">
                          <span className="font-bold text-slate-300">{hist.performedBy?.name || 'Aether'}</span>: {hist.details || hist.action}
                        </div>
                        <span className="text-slate-600 text-[8px] shrink-0 select-none">{new Date(hist.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600 italic select-none">No history logged</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="p-4 border-t border-white/5 bg-slate-950/80 flex gap-2">
              <button
                onClick={() => toggleComplete(selectedTask)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer active:scale-95 transition-all ${
                  selectedTask.status === 'Completed'
                    ? 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-600'
                }`}
              >
                {selectedTask.status === 'Completed' ? 'REOPEN TASK' : 'MARK COMPLETED'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* C. Create / Edit Task Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-[#131b2e] border border-white/5 rounded-2xl shadow-2xl p-6 relative"
            >
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
              >
                <FiX size={16} />
              </button>

              <h3 className="text-sm font-bold text-white font-display mb-4">
                {modalMode === 'create' ? 'Create New Task' : 'Edit Task Specification'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Task Title</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter task name..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-200 focus:border-emerald-500/20"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Description</label>
                  <textarea 
                    placeholder="Task details and instructions..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-200 focus:border-emerald-500/20 resize-none"
                  />
                </div>

                {/* Grid for Assignee & Priority */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Assign User</label>
                    <select
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-300 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {participants.map(p => (
                        <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-300 cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Labels */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Due Date</label>
                    <input 
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Labels (comma split)</label>
                    <input 
                      type="text"
                      placeholder="design, dev, audit"
                      value={taskLabels}
                      onChange={(e) => setTaskLabels(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 outline-none text-slate-200 focus:border-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-98 transition-all"
                >
                  {modalMode === 'create' ? 'SAVE TASK' : 'UPDATE TASK SPECIFICATION'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TasksView;
