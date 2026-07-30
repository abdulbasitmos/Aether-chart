import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiLayers, FiPlus, FiArrowRight, FiUsers, FiCompass, 
  FiCheck, FiGrid, FiEye, FiRadio, FiGlobe, FiAlertCircle,
  FiFileText, FiFolder, FiCalendar, FiPlay, FiTrash2, FiDownload,
  FiInfo, FiSliders, FiActivity, FiX, FiCheckSquare, FiAward, FiCpu, FiSearch
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CommunitiesView = () => {
  const { 
    communities, 
    selectedCommunityId, 
    setSelectedCommunityId, 
    joinCommunity, 
    createCommunity,
    addCommunityAnnouncement,
    selectChat, 
    chats 
  } = useChat();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview'); // 'overview' | 'announcements' | 'tasks' | 'calendar' | 'files' | 'notes' | 'ai' | 'analytics'
  const [commSearchQuery, setCommSearchQuery] = useState('');

  // Create Community Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [commName, setCommName] = useState('');
  const [commTagline, setCommTagline] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commGroups, setCommGroups] = useState('');

  // Announcements form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Local Kanban Tasks states (for workspace Kanban demonstration)
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Interface design specification', description: 'Align glassmorphism layout with Outfit typography guidelines.', status: 'todo', priority: 'high', date: 'Jul 15' },
    { id: '2', title: 'Database index configuration', description: 'Enable indexes for Category, CreatedAt, and followers arrays in Mongo.', status: 'progress', priority: 'medium', date: 'Jul 19' },
    { id: '3', title: 'Broadcaster socket testing', description: 'Synchronize like counters and typing statuses with WebSocket triggers.', status: 'done', priority: 'low', date: 'Jul 04' }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Local Files states
  const [files, setFiles] = useState([
    { id: 'f1', name: 'branding_spec_v2.pdf', type: 'PDF', size: '2.4 MB', date: 'Jul 05' },
    { id: 'f2', name: 'architecture_diagram.png', type: 'Image', size: '1.1 MB', date: 'Jul 08' }
  ]);
  const fileInputRef = useRef(null);

  // Local Calendar Events state
  const [events, setEvents] = useState([
    { id: 'e1', title: 'Aether Team Weekly Sync', desc: 'Weekly design alignment and roadmap check', date: 'Jul 12', time: '10:00 AM', rsvp: true },
    { id: 'e2', title: 'MongoDB Index Audit', desc: 'Database index performance evaluation', date: 'Jul 18', time: '02:30 PM', rsvp: false }
  ]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Local Project Notes state
  const [projectNote, setProjectNote] = useState('# Project Roadmap\n\n- Deploy secure broadcast channels.\n- Sync socket triggers globally.\n- Perform index optimization audits.');

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [selectedCommunityId]);

  const activeCommunity = communities.find(c => c.id === selectedCommunityId) || communities[0];

  const handleCreateCommunitySubmit = (e) => {
    e.preventDefault();
    if (!commName.trim()) {
      toast.error('Community name is required');
      return;
    }
    const groupsList = commGroups
      ? commGroups.split(',').map(g => g.trim()).filter(Boolean)
      : ['announcements', 'general'];

    createCommunity(commName, commTagline || 'A new workspace space', commDesc || 'Broadcasting active.', groupsList);
    
    setCommName('');
    setCommTagline('');
    setCommDesc('');
    setCommGroups('');
    setCreateModalOpen(false);
  };

  const handlePostAnnouncementSubmit = (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    addCommunityAnnouncement(activeCommunity.id, annTitle, annContent);
    setAnnTitle('');
    setAnnContent('');
  };

  const handleRouteToForum = (forumName) => {
    const matchedChat = chats.find(c => c.type === 'group' && c.group?.name?.toLowerCase().includes(forumName.toLowerCase()));
    if (matchedChat) {
      selectChat(matchedChat.id);
      toast.success(`Connected to #${forumName}`);
    } else {
      toast.success(`Announcements feed active for subgroup: #${forumName}`);
    }
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: 'task_' + Date.now(),
      title: newTaskTitle,
      description: newTaskDesc,
      status: 'todo',
      priority: newTaskPriority,
      date: 'Jul ' + new Date().getDate()
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsTaskModalOpen(false);
    toast.success('Kanban task added!');
  };

  const moveTask = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    toast.success(`Task status updated to ${newStatus}`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const newFile = {
      id: 'file_' + Date.now(),
      name: file.name,
      type: file.type.split('/')[1]?.toUpperCase() || 'Doc',
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      date: 'Jul ' + new Date().getDate()
    };
    setFiles(prev => [newFile, ...prev]);
    toast.success('File uploaded to manager!');
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEv = {
      id: 'event_' + Date.now(),
      title: newEventTitle,
      desc: newEventDesc,
      date: newEventDate || 'Jul 15',
      time: newEventTime || '11:00 AM',
      rsvp: true
    };
    setEvents(prev => [...prev, newEv]);
    setNewEventTitle('');
    setNewEventDesc('');
    setIsEventModalOpen(false);
    toast.success('Calendar event scheduled!');
  };

  const handleAiAction = (actionType) => {
    setAiLoading(true);
    setAiResponse('');
    setTimeout(() => {
      setAiLoading(false);
      if (actionType === 'summarize') {
        setAiResponse('### Discussion Summary (AI Generated)\n- **Theme**: Interface glassmorphism specifications and database query optimization.\n- **Roadmap**: Socket.io real-time synchronisation has completed testing.\n- **Action Items**: Create indexes on Category, verification, and CreatedAt fields to handle scalability.');
      } else if (actionType === 'notes') {
        setAiResponse('### Meeting Notes (AI Generated)\n- **Attendee**: Alex Mercer, .\n- **Decisions**: Standardized custom context menu layout inside chats.\n- **Task Sync**: Tasks added to project kanban dashboards.');
      }
    }, 1200);
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* 1. Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-15 flex flex-col gap-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h2 className="text-lg font-bold font-display text-white font-semibold">Communities Portal</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Coordinate decentralized team workspaces, collaborative documents, and schedules</p>
          </div>
          
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <FiPlus size={14} /> New Workspace
          </button>
        </div>
      </div>

      {/* 2. Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Communities List */}
        <div className="w-1/3 border-r border-white/5 overflow-y-auto no-scrollbar p-4 space-y-3 shrink-0 bg-slate-950/25">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={12} /></span>
            <input
              type="text"
              value={commSearchQuery}
              onChange={(e) => setCommSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-[11px] text-slate-200 focus:border-emerald-500/25 outline-none placeholder:text-slate-500"
            />
          </div>

          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">Your Workspaces</h3>
          
          <div className="space-y-1.5">
            {communities.filter(c => c.name.toLowerCase().includes(commSearchQuery.toLowerCase())).map((comm) => (
              <div
                key={comm.id}
                onClick={() => setSelectedCommunityId(comm.id)}
                className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer border transition-all ${
                  selectedCommunityId === comm.id 
                    ? 'bg-slate-900 border-white/5' 
                    : 'bg-transparent border-transparent hover:bg-white/[0.015]'
                }`}
              >
                <img src={comm.avatar} alt="" className="w-10 h-10 rounded-xl border border-white/5 object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-200 truncate font-display">{comm.name}</h4>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{comm.groups?.length || 0} sub-groups active</p>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Sandbox Card */}
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 mt-4">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none flex items-center gap-1"><FiCompass size={11} /> Featured Community</h4>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs select-none font-display">UX</div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-200">Creative Sandbox</h5>
                <p className="text-[9px] text-slate-500">14.2K collaborators</p>
              </div>
            </div>
            <button 
              onClick={() => toast.success('Joined Creative Sandbox Workspace')}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-lg text-[9px] font-bold text-slate-300 active:scale-95 transition-all cursor-pointer"
            >
              Join Workspace
            </button>
          </div>
        </div>

        {/* Right Side: Active Workspace Dashboard */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/5">
          {loading ? (
            <div className="flex-1 p-6 space-y-4 animate-pulse relative overflow-hidden shimmer-wrapper">
              <div className="h-6 bg-slate-900 w-1/3 rounded" />
              <div className="h-4 bg-slate-900 w-2/3 rounded" />
              <div className="h-44 bg-slate-900/30 border border-white/5 rounded-3xl" />
            </div>
          ) : activeCommunity ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Workspace Banner & Tabs selector */}
              <div className="p-6 border-b border-white/5 bg-slate-900/20 space-y-4 shrink-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <img src={activeCommunity.avatar} alt="" className="w-12 h-12 rounded-xl border border-white/10 object-cover" />
                    <div>
                      <h2 className="text-sm font-bold text-white font-display">{activeCommunity.name}</h2>
                      <p className="text-[10px] text-emerald-400 font-medium">{activeCommunity.tagline}</p>
                    </div>
                  </div>

                  {!activeCommunity.joined ? (
                    <button 
                      onClick={() => joinCommunity(activeCommunity.id)}
                      className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      Join Space
                    </button>
                  ) : (
                    <span className="py-1 px-2.5 bg-slate-900 border border-white/5 text-[9px] rounded-lg text-slate-400 font-semibold flex items-center gap-1 select-none"><FiCheck size={10} className="text-emerald-400" /> Member</span>
                  )}
                </div>

                {/* Workspace Sidebar Tabs represented as a Top Sub-navigation Row */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none shrink-0 text-xs">
                  {[
                    { id: 'overview', label: 'Overview', icon: <FiInfo size={11} /> },
                    { id: 'announcements', label: 'Announcements', icon: <FiRadio size={11} /> },
                    { id: 'tasks', label: 'Tasks Board', icon: <FiCheckSquare size={11} /> },
                    { id: 'calendar', label: 'Schedules', icon: <FiCalendar size={11} /> },
                    { id: 'files', label: 'Files', icon: <FiFolder size={11} /> },
                    { id: 'notes', label: 'Project Notes', icon: <FiFileText size={11} /> },
                    { id: 'ai', label: 'AI Assistant', icon: <FiCpu size={11} /> },
                    { id: 'analytics', label: 'Analytics', icon: <FiActivity size={11} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveWorkspaceTab(tab.id)}
                      className={`py-1.5 px-3 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        activeWorkspaceTab === tab.id
                          ? 'bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/25'
                          : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Display Panel */}
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                
                {/* TAB: OVERVIEW */}
                {activeWorkspaceTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-200">About this Workspace</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{activeCommunity.description}</p>
                    </div>

                    {/* Sub-groups discussion channels */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">General Discussion Forums</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeCommunity.groups?.map((g) => (
                          <div key={g.id} className="p-4 bg-slate-900/30 border border-white/5 rounded-xl flex flex-col justify-between h-28 hover:border-white/10 transition-colors">
                            <div>
                              <h4 className="text-xs font-bold text-slate-200 font-display"># {g.name}</h4>
                              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{g.description || 'Public discussion forum for workspace members.'}</p>
                            </div>
                            <button 
                              onClick={() => handleRouteToForum(g.name)}
                              className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold mt-2 text-left flex items-center gap-1 group cursor-pointer"
                            >
                              Enter Discussion <FiArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: ANNOUNCEMENTS */}
                {activeWorkspaceTab === 'announcements' && (
                  <div className="space-y-6">
                    {/* Broadcaster form (shown for mock admin/owner) */}
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                      <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiRadio size={12} /> Broadcast Announcements</h4>
                      <form onSubmit={handlePostAnnouncementSubmit} className="space-y-3">
                        <input
                          type="text"
                          required
                          value={annTitle}
                          onChange={(e) => setAnnTitle(e.target.value)}
                          placeholder="Announcement Title..."
                          className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                        />
                        <textarea
                          required
                          value={annContent}
                          onChange={(e) => setAnnContent(e.target.value)}
                          placeholder="Write bulletin announcement content..."
                          className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none font-sans"
                        />
                        <button
                          type="submit"
                          className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                        >
                          Publish Announcement
                        </button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      {activeCommunity.announcements && activeCommunity.announcements.length > 0 ? (
                        activeCommunity.announcements.map((ann) => (
                          <div key={ann.id || ann._id} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold select-none">
                              <span className="text-emerald-400 font-bold uppercase">Broadcast bulletin</span>
                              <span>{ann.date || 'Today'}</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-200 font-display">{ann.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">{ann.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">
                          No broadcast announcements posted in this workspace yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: TASKS BOARD */}
                {activeWorkspaceTab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center select-none">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kanban Task Coordination</h4>
                      <button 
                        onClick={() => setIsTaskModalOpen(true)}
                        className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <FiPlus size={11} /> Create Task
                      </button>
                    </div>

                    {/* Columns grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {['todo', 'progress', 'done'].map((colStatus) => {
                        const colTasks = tasks.filter(t => t.status === colStatus);
                        return (
                          <div key={colStatus} className="p-3 bg-slate-950/45 border border-white/5 rounded-2xl flex flex-col min-h-[300px]">
                            <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-3 select-none px-1 flex justify-between items-center">
                              <span className="capitalize">{colStatus.replace('progress', 'in progress')}</span>
                              <span className="w-4 h-4 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center font-bold text-slate-400">{colTasks.length}</span>
                            </h5>
                            
                            <div className="space-y-2 flex-1">
                              {colTasks.map(task => (
                                <div key={task.id} className="p-3 bg-slate-900/60 border border-white/5 rounded-xl space-y-2 hover:border-white/10 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <h6 className="text-[11px] font-bold text-slate-200">{task.title}</h6>
                                    <span className={`text-[7px] px-1 py-0.2 rounded uppercase font-bold border ${
                                      task.priority === 'high' 
                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                        : task.priority === 'medium'
                                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    }`}>{task.priority}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-3 font-sans">{task.description}</p>
                                  
                                  <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                                    <span className="text-[8.5px] text-slate-600 font-semibold">{task.date}</span>
                                    
                                    <div className="flex gap-1">
                                      {colStatus !== 'todo' && (
                                        <button 
                                          onClick={() => moveTask(task.id, colStatus === 'done' ? 'progress' : 'todo')}
                                          className="text-[9px] text-slate-500 hover:text-white px-1 py-0.5 bg-slate-950 rounded border border-white/5 cursor-pointer"
                                        >
                                          ←
                                        </button>
                                      )}
                                      {colStatus !== 'done' && (
                                        <button 
                                          onClick={() => moveTask(task.id, colStatus === 'todo' ? 'progress' : 'done')}
                                          className="text-[9px] text-slate-500 hover:text-white px-1 py-0.5 bg-slate-950 rounded border border-white/5 cursor-pointer"
                                        >
                                          →
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {colTasks.length === 0 && (
                                <div className="h-full flex items-center justify-center text-center text-slate-700 text-[10px] italic select-none py-12">
                                  No tasks in this stage
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB: SCHEDULES/CALENDAR */}
                {activeWorkspaceTab === 'calendar' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center select-none">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Upcoming Workspace Events</h4>
                      <button 
                        onClick={() => setIsEventModalOpen(true)}
                        className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <FiPlus size={11} /> Schedule Event
                      </button>
                    </div>

                    <div className="space-y-3">
                      {events.map((ev) => (
                        <div key={ev.id} className="p-4 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl flex flex-col items-center justify-center min-w-10 select-none">
                              <span className="text-[8px] font-bold uppercase">{ev.date.split(' ')[0]}</span>
                              <span className="text-xs font-bold font-display leading-none mt-0.5">{ev.date.split(' ')[1]}</span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-200">{ev.title}</h5>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{ev.time} • {ev.desc}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setEvents(prev => prev.map(item => item.id === ev.id ? { ...item, rsvp: !item.rsvp } : item));
                              toast(ev.rsvp ? 'RSVP Cancelled' : 'RSVP Confirmed!', { icon: '📅' });
                            }}
                            className={`py-1 px-3 rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer border ${
                              ev.rsvp 
                                ? 'bg-emerald-500 border-transparent text-slate-950' 
                                : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {ev.rsvp ? 'RSVP Confirmed' : 'Confirm RSVP'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB: FILES */}
                {activeWorkspaceTab === 'files' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center select-none">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Workspace Attachments</h4>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <FiPlus size={11} /> Upload File
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {files.map(f => (
                        <div key={f.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2.5 bg-slate-950 border border-white/5 text-[9px] text-[#2563EB] font-bold rounded-lg select-none">
                              {f.type}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-200 truncate">{f.name}</h5>
                              <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">{f.size} • Uploaded {f.date}</p>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => toast.success(`Downloading ${f.name}...`)}
                              className="p-2 bg-slate-950 hover:bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                              title="Download Attachment"
                            >
                              <FiDownload size={11} />
                            </button>
                            <button
                              onClick={() => {
                                setFiles(prev => prev.filter(item => item.id !== f.id));
                                toast.success('File deleted from workspace');
                              }}
                              className="p-2 bg-slate-950 hover:bg-rose-500/10 border border-white/5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                              title="Delete Attachment"
                            >
                              <FiTrash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB: NOTES */}
                {activeWorkspaceTab === 'notes' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center select-none">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Collaborative Project Notepad</h4>
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">● Live Syncing</span>
                    </div>

                    <textarea
                      value={projectNote}
                      onChange={(e) => setProjectNote(e.target.value)}
                      className="w-full p-4 h-64 bg-slate-950 border border-white/5 rounded-2xl text-xs text-slate-200 focus:border-emerald-500/25 outline-none resize-none font-mono leading-relaxed"
                    />
                  </div>
                )}

                {/* TAB: AI ASSISTANT */}
                {activeWorkspaceTab === 'ai' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiCpu size={12} /> Gemini Assistant</h4>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAiAction('summarize')}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-200 hover:text-emerald-400 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer flex-1"
                      >
                        Summarize Discussions
                      </button>
                      <button
                        onClick={() => handleAiAction('notes')}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-200 hover:text-emerald-400 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer flex-1"
                      >
                        Generate Meeting Notes
                      </button>
                    </div>

                    {aiLoading ? (
                      <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col justify-center items-center h-32">
                        <FiCpu className="text-emerald-400 animate-spin mb-2" size={20} />
                        <span className="text-[10px] text-slate-500 font-bold animate-pulse">AI Agent reasoning...</span>
                      </div>
                    ) : aiResponse ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl text-xs text-slate-300 font-mono leading-relaxed space-y-2 whitespace-pre-wrap"
                      >
                        {aiResponse}
                      </motion.div>
                    ) : (
                      <div className="p-8 text-center text-slate-600 text-xs italic border border-dashed border-white/5 rounded-2xl flex flex-col items-center">
                        <FiInfo size={16} className="opacity-40 mb-1" />
                        <span>Select an AI action above to query Gemini intelligence.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: ANALYTICS */}
                {activeWorkspaceTab === 'analytics' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiActivity size={12} /> Workspace Metrics</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { title: 'Growth Ratio', val: '+45%', desc: 'Follower joins daily', progress: 80, icon: <FiCompass size={14} className="text-emerald-400" /> },
                        { title: 'Tasks Finished', val: '86%', desc: 'Kanban tasks completed', progress: 86, icon: <FiCheckSquare size={14} className="text-[#2563EB]" /> },
                        { title: 'Participation', val: '92%', desc: 'Announcement RSVP engagement', progress: 92, icon: <FiAward size={14} className="text-amber-400" /> }
                      ].map((card, i) => (
                        <div key={i} className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{card.title}</span>
                            {card.icon}
                          </div>
                          <div>
                            <h5 className="text-lg font-bold text-slate-200 font-display leading-none">{card.val}</h5>
                            <p className="text-[9px] text-slate-500 mt-1 font-semibold">{card.desc}</p>
                          </div>
                          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${card.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 select-none text-slate-500">
              <FiLayers size={28} className="mb-2 opacity-40 animate-spin-slow" />
              <h4 className="text-sm font-semibold text-slate-400">No community workspace selected</h4>
              <p className="text-[10px] text-slate-600 mt-0.5">Select a workspace from the sidebar list to collaborate.</p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE WORKSPACE MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111827] border border-white/5 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <div className="flex justify-between items-center select-none mb-4">
                <h3 className="text-sm font-bold font-display text-white">Create Workspace Space</h3>
                <button 
                  onClick={() => setCreateModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer animate-duration-100"
                >
                  <FiX size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Workspace Name</label>
                  <input
                    type="text"
                    required
                    value={commName}
                    onChange={(e) => setCommName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tagline</label>
                  <input
                    type="text"
                    value={commTagline}
                    onChange={(e) => setCommTagline(e.target.value)}
                    placeholder="e.g. Collaborative Design Engineering Sync"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                  <textarea
                    value={commDesc}
                    onChange={(e) => setCommDesc(e.target.value)}
                    placeholder="Describe what team members will collaborate on..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Forums (Comma separated)</label>
                  <input
                    type="text"
                    value={commGroups}
                    onChange={(e) => setCommGroups(e.target.value)}
                    placeholder="e.g. general, development, assistance"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Initialize Workspace
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD KANBAN TASK MODAL */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111827] border border-white/5 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <div className="flex justify-between items-center select-none mb-4">
                <h3 className="text-sm font-bold font-display text-white">Create Kanban Task</h3>
                <button 
                  onClick={() => setIsTaskModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <FiX size={14} />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Design visual assets"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none select-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Provide details about the task action items..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Create Kanban Task
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHEDULE EVENT MODAL */}
      <AnimatePresence>
        {isEventModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111827] border border-white/5 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <div className="flex justify-between items-center select-none mb-4">
                <h3 className="text-sm font-bold font-display text-white">Schedule Event</h3>
                <button 
                  onClick={() => setIsEventModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <FiX size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Event Title</label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g. Sprint Review meeting"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Jul 15"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                  <textarea
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    placeholder="Describe event agendas or video meeting links..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Schedule Event
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600 shrink-0">
        Unified Aether community spaces are decentralized networks.
      </div>
    </div>
  );
};

export default CommunitiesView;
