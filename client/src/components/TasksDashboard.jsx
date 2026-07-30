import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiCheckSquare, FiUser, FiCalendar, FiAlertCircle, FiArrowRight, 
  FiClock, FiActivity, FiInbox, FiTrendingUp, FiBookmark
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const TasksDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'created' | 'all'
  const navigate = useNavigate();

  // Load current user profile from local storage or context
  useEffect(() => {
    const cached = sessionStorage.getItem('aether_user');
    if (cached) {
      setMe(JSON.parse(cached));
    }
  }, []);

  // Fetch all tasks for dashboard
  const fetchDashboardTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tasks/dashboard');
      setTasks(response.data || []);
    } catch (err) {
      console.error('Failed to load dashboard tasks:', err);
      toast.error('Failed to retrieve global tasks database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardTasks();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    if (!me) return { assigned: 0, created: 0, completed: 0, pending: 0, overdue: 0, critical: 0, dueToday: 0 };
    const myId = me._id || me.id;

    const assigned = tasks.filter(t => (t.assignedTo?._id || t.assignedTo) === myId).length;
    const created = tasks.filter(t => (t.createdBy?._id || t.createdBy) === myId).length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.filter(t => t.status !== 'Completed').length;
    
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

    const critical = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length;

    return { assigned, created, completed, pending, overdue, critical, dueToday };
  }, [tasks, me]);

  // Filter tasks based on selected tab
  const tabFilteredTasks = useMemo(() => {
    if (!me) return [];
    const myId = me._id || me.id;

    if (activeTab === 'assigned') {
      return tasks.filter(t => (t.assignedTo?._id || t.assignedTo) === myId && t.status !== 'Completed');
    }
    if (activeTab === 'created') {
      return tasks.filter(t => (t.createdBy?._id || t.createdBy) === myId && t.status !== 'Completed');
    }
    return tasks.filter(t => t.status !== 'Completed'); // 'all' active
  }, [tasks, activeTab, me]);

  // Navigate to conversation containing task
  const handleTaskClick = (task) => {
    if (task.conversationId) {
      const convoId = task.conversationId._id || task.conversationId;
      navigate(`/chats/${convoId}`);
      toast.success(`Opening conversation track for "${task.title}"`);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4 select-none">
        <div>
          <h2 className="text-lg font-bold font-display text-white">Smart Task Dashboard</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Global monitor for deliverables, deadlines, and project sprints</p>
        </div>
      </div>

      {/* Main content scroll area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 z-10">
        
        {/* A. Stats Grid Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Assigned to me', value: stats.assigned, color: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' },
            { label: 'Created by me', value: stats.created, color: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' },
            { label: 'Completed', value: stats.completed, color: 'bg-slate-900 text-slate-400' },
            { label: 'Pending Active', value: stats.pending, color: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' },
            { label: 'Tasks Due Today', value: stats.dueToday, color: 'bg-yellow-500/5 border-yellow-500/10 text-yellow-400 font-bold' },
            { label: 'Overdue Tasks', value: stats.overdue, color: 'bg-rose-500/5 border-rose-500/10 text-rose-400 animate-pulse font-bold' },
            { label: 'Critical Tasks', value: stats.critical, color: 'bg-red-500/5 border-red-500/10 text-red-400 font-bold' }
          ].map((card, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border border-white/5 flex flex-col justify-between shadow-xl min-h-[85px] ${card.color}`}>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 leading-normal">{card.label}</span>
              <span className="text-2xl font-bold font-display leading-none mt-2">{card.value}</span>
            </div>
          ))}
        </div>

        {/* B. Sprints & Critical alerts summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. Critical Tasks list */}
          <div className="bg-[#131b2e]/60 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5"><FiAlertCircle size={13} /> Critical Tasks Alert</h3>
              <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">{tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length}</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length > 0 ? (
                tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').map(t => (
                  <div 
                    key={t._id}
                    onClick={() => handleTaskClick(t)}
                    className="p-3 bg-red-500/[0.02] border border-red-500/20 hover:border-red-500/40 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-red-400 transition-colors">{t.title}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Assigned to: {t.assignedTo?.name || 'Unassigned'}</p>
                    </div>
                    <FiArrowRight size={12} className="text-slate-600 group-hover:text-red-400 transition-colors shrink-0" />
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 italic block py-4 text-center">No critical tasks remaining. Clean desk!</span>
              )}
            </div>
          </div>

          {/* 2. Tasks Due Today list */}
          <div className="bg-[#131b2e]/60 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5"><FiClock size={13} /> Due Today</h3>
              <span className="text-[9px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded font-bold">{tasks.filter(t => {
                if (!t.dueDate || t.status === 'Completed') return false;
                const d = new Date(t.dueDate);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length}</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {tasks.filter(t => {
                if (!t.dueDate || t.status === 'Completed') return false;
                const d = new Date(t.dueDate);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length > 0 ? (
                tasks.filter(t => {
                  if (!t.dueDate || t.status === 'Completed') return false;
                  const d = new Date(t.dueDate);
                  const today = new Date();
                  return d.toDateString() === today.toDateString();
                }).map(t => (
                  <div 
                    key={t._id}
                    onClick={() => handleTaskClick(t)}
                    className="p-3 bg-yellow-500/[0.02] border border-yellow-500/20 hover:border-yellow-500/40 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-yellow-400 transition-colors">{t.title}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Assigned to: {t.assignedTo?.name || 'Unassigned'}</p>
                    </div>
                    <FiArrowRight size={12} className="text-slate-600 group-hover:text-yellow-400 transition-colors shrink-0" />
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 italic block py-4 text-center">No tasks due today. Excellent pacing!</span>
              )}
            </div>
          </div>

          {/* 3. Overdue Alert list */}
          <div className="bg-[#131b2e]/60 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={13} /> Overdue Tasks</h3>
              <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold">{tasks.filter(t => {
                if (!t.dueDate || t.status === 'Completed') return false;
                return new Date(t.dueDate) < new Date().setHours(0,0,0,0);
              }).length}</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {tasks.filter(t => {
                if (!t.dueDate || t.status === 'Completed') return false;
                return new Date(t.dueDate) < new Date().setHours(0,0,0,0);
              }).length > 0 ? (
                tasks.filter(t => {
                  if (!t.dueDate || t.status === 'Completed') return false;
                  return new Date(t.dueDate) < new Date().setHours(0,0,0,0);
                }).map(t => (
                  <div 
                    key={t._id}
                    onClick={() => handleTaskClick(t)}
                    className="p-3 bg-rose-500/[0.02] border border-rose-500/20 hover:border-rose-500/40 rounded-xl cursor-pointer transition-all flex justify-between items-center group animate-pulse"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-rose-400 transition-colors">{t.title}</h4>
                      <p className="text-[9px] text-rose-400/80 mt-0.5 font-bold">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                    </div>
                    <FiArrowRight size={12} className="text-slate-600 group-hover:text-rose-400 transition-colors shrink-0" />
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 italic block py-4 text-center">No overdue tasks. Perfect schedule alignment!</span>
              )}
            </div>
          </div>

        </div>

        {/* C. Interactive Tasks Workspace Table */}
        <div className="bg-[#131b2e]/60 border border-white/5 rounded-2xl p-6 space-y-4 flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4 select-none">
            <h3 className="text-sm font-bold font-display text-white">Active Sprint Backlog</h3>
            
            {/* Filter Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 text-[10px] font-bold">
              {[
                { id: 'assigned', label: 'ASSIGNED TO ME' },
                { id: 'created', label: 'CREATED BY ME' },
                { id: 'all', label: 'ALL ACTIVE TASKS' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-1.5 px-3.5 rounded-lg cursor-pointer transition-all ${
                    activeTab === t.id
                      ? 'bg-[#131b2e] border border-white/5 text-emerald-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* List content */}
          <div className="space-y-3">
            {loading ? (
              <span className="text-xs text-slate-500 block py-6 text-center select-none animate-pulse">Querying backlog...</span>
            ) : tabFilteredTasks.length > 0 ? (
              tabFilteredTasks.map((t) => (
                <div 
                  key={t._id}
                  onClick={() => handleTaskClick(t)}
                  className="p-4 bg-slate-950/40 hover:bg-slate-950/80 border border-white/5 hover:border-emerald-500/10 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      t.priority === 'Critical' ? 'bg-red-500 shadow-md shadow-red-500/50 animate-ping' :
                      t.priority === 'High' ? 'bg-orange-500' :
                      t.priority === 'Medium' ? 'bg-emerald-500' : 'bg-slate-500'
                    }`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{t.title}</h4>
                      {t.description && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Badges and assignee details */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px]">
                    {t.dueDate && (
                      <span className="flex items-center gap-1 text-slate-500 font-semibold"><FiCalendar size={10} /> {new Date(t.dueDate).toLocaleDateString()}</span>
                    )}

                    <span className={`py-0.5 px-2 rounded font-bold uppercase text-[9px] ${
                      t.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      t.status === 'Blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                      t.status === 'Cancelled' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {t.status}
                    </span>

                    <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 py-0.5 px-2 rounded font-bold uppercase">
                      {t.priority}
                    </span>

                    {t.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <img src={t.assignedTo.avatar} alt="" className="w-4 h-4 rounded-full border border-white/10" />
                        <span className="text-slate-400 font-medium">{t.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">Unassigned</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center select-none text-slate-600 flex flex-col items-center">
                <FiInbox size={24} className="mb-1 opacity-50" />
                <span className="text-xs">No active tasks in this tab classification</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TasksDashboard;
