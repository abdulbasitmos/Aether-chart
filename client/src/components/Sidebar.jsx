import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import mockSocket from '../services/mockSocket';
import appLogo from '../assets/logo.svg';
import {
  FiSearch, FiUserPlus, FiSliders, FiCheck, FiBookmark, FiStar,
  FiVolumeX, FiLock, FiMessageSquare, FiTrash2, FiPlus,
  FiClock, FiPhone, FiImage, FiCpu, FiEye, FiX,
  FiPause, FiPlay, FiArrowRight, FiCamera, FiRadio
} from 'react-icons/fi';

const STATUS_BG_COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#1D4ED8", "#1E40AF", "#1f2937"];
// Fallback mock directory; replace with real import if available
const mockDirectory = [];

const Sidebar = ({ onSelectStatus: onSelectStatusProp, onSelectChat: onSelectChatProp }) => {
  const {
    user,
    logout,
    updateTheme,
    updatePrivacy,
    updateSecurity,
    lockAppManual,
    updateProfile,
    t: translate,
    activeIdentity,
    setActiveIdentity,
    currentProfileName,
    currentProfileAvatar,
    currentProfileUsername
  } = useAuth();

  const {
    chats,
    selectedChatId,
    selectChat,
    chatFilter,
    setChatFilter,
    statuses,
    uploadStatus,
    callHistory,
    initiateCall,
    projects,
    createProject,
    toggleProjectTask,
    addProjectTask,
    channels,
    followChannel,
    createChannel,
    communities,
    joinCommunity,
    createCommunity,
    activeTab,
    setActiveTab,
    selectedChannelId,
    setSelectedChannelId,
    selectedCommunityId,
    setSelectedCommunityId,
    typingStatus,
    startDirectChat,
    startGroupChat,
    createContactAndChat,
    togglePinChat,
    toggleFavoriteChat,
    toggleArchiveChat,
    toggleMuteChat,
    toggleLockChat,
    markChatAsRead,
    markChatAsUnread,
    deleteChat,
  } = useChat();

  const navigate = useNavigate();

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);
  const [sortOrder, setSortOrder] = useState('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Context menu
  const [convoContextMenu, setConvoContextMenu] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Click-outside to close dropdowns / context menus
  const convoContextMenuRef = useRef(convoContextMenu);
  const showSortDropdownRef = useRef(showSortDropdown);

  useEffect(() => {
    convoContextMenuRef.current = convoContextMenu;
    showSortDropdownRef.current = showSortDropdown;
  }, [convoContextMenu, showSortDropdown]);

  useEffect(() => {
    const handler = () => {
      if (convoContextMenuRef.current) setConvoContextMenu(null);
      if (showSortDropdownRef.current) setShowSortDropdown(false);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Pending contact requests
  const [pendingRequests, setPendingRequests] = useState([]);
  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get('/api/contacts/requests/received', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` },
      });
      setPendingRequests(res.data || []);
    } catch (err) {
      if (err.response?.status !== 401) console.warn('Failed to fetch pending requests:', err);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    const unsub1 = mockSocket.on('new_notification', (data) => {
      if (data.type === 'contact_request') fetchPendingRequests();
    });
    const unsub2 = mockSocket.on('contact_request_updated', () => fetchPendingRequests());
    return () => { unsub1(); unsub2(); };
  }, []);

  const acceptRequest = async (id) => {
    try {
      const res = await axios.post(
        `/api/contacts/requests/${id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } }
      );
      setPendingRequests((prev) => prev.filter((r) => r._id !== id));
      if (res.data.notification) {
        const profile = await axios.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` },
        });
        if (profile.data) sessionStorage.setItem('aether_user', JSON.stringify(profile.data));
      }
      toast.success('Contact request accepted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const declineRequest = async (id) => {
    try {
      await axios.post(
        `/api/contacts/requests/${id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } }
      );
      setPendingRequests((prev) => prev.filter((r) => r._id !== id));
      toast.success('Contact request rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directorySearchResults, setDirectorySearchResults] = useState([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);

  // AI Chat state
  const [aiInputValue, setAiInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'model', text: 'Welcome to Aether AI! I can help you draft responses, translate logs, or audit code. Ask me anything!' },
  ]);
  const aiScrollRef = useRef(null);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiThinking]);

  // New Chat tabs
  const [activeNewChatTab, setActiveNewChatTab] = useState('search');

  // Manual add contact form
  const [manualName, setManualName] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Group creation wizard
  const [groupCreationStep, setGroupCreationStep] = useState(1);
  const [groupSelectedParticipants, setGroupSelectedParticipants] = useState([]);
  const [groupSubject, setGroupSubject] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupParticipantSearchQuery, setGroupParticipantSearchQuery] = useState('');
  const [groupParticipantSearchResults, setGroupParticipantSearchResults] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isSearchingGroupParticipants, setIsSearchingGroupParticipants] = useState(false);

  // Load contacts when new chat modal opens
  useEffect(() => {
    if (showNewChatModal) {
      (async () => {
        try {
          const res = await axios.get('/api/contacts');
          setContacts(res.data);
        } catch (err) {
          console.warn('Failed to load contacts for group creation', err);
        }
      })();
    }
  }, [showNewChatModal]);

  // Group participant search
  useEffect(() => {
    if (!groupParticipantSearchQuery.trim()) {
      setGroupParticipantSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGroupParticipants(true);
      const q = groupParticipantSearchQuery.toLowerCase();
      const local = contacts.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
      try {
        const res = await axios.get(`/api/users/search?q=${groupParticipantSearchQuery}`);
        const merged = [...res.data];
        local.forEach((c) => { if (!merged.some((u) => u.username === c.username)) merged.push(c); });
        setGroupParticipantSearchResults(merged);
      } catch (err) {
        console.error('Failed to search group users:', err);
        setGroupParticipantSearchResults(local);
      } finally {
        setIsSearchingGroupParticipants(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [groupParticipantSearchQuery, contacts]);

  // Directory search (new chat / search tab)
  useEffect(() => {
    if (!directorySearchQuery.trim()) {
      setDirectorySearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDirectory(true);
      const q = directorySearchQuery.toLowerCase();
      const localMock = mockDirectory.filter((u) =>
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
      const fromChats = chats
        .filter((c) => c.type === 'direct' && c.user)
        .map((c) => c.user)
        .filter((u) =>
          u.name?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        )
        .map((u) => ({ _id: u.id, id: u.id, name: u.name, username: u.username, email: u.email || '', phone: u.phone || '', avatar: u.avatar }));
      try {
        const res = await axios.get(`/api/users/search?q=${directorySearchQuery}`);
        const merged = [...res.data];
        fromChats.forEach((u) => { if (!merged.some((r) => r.username === u.username)) merged.push(u); });
        localMock.forEach((u) => { if (!merged.some((r) => r.username === u.username)) merged.push(u); });
        setDirectorySearchResults(merged);
      } catch (err) {
        console.warn('Backend search failed, using local data:', err.message);
        const fallback = [...fromChats];
        localMock.forEach((u) => { if (!fallback.some((r) => r.username === u.username)) fallback.push(u); });
        setDirectorySearchResults(fallback);
      } finally {
        setIsSearchingDirectory(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [directorySearchQuery, chats]);

  // Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState(() => sessionStorage.getItem('aether_gemini_api_key') || '');

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusBgColor, setStatusBgColor] = useState('#2563EB');
  const [statusImage, setStatusImage] = useState(null);
  const statusFileRef = useRef(null);

  const handleStatusFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setStatusImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectChatId, setProjectChatId] = useState('chat_group_1');
  const [projectTasks, setProjectTasks] = useState('');
  const [newSubTasks, setNewSubTasks] = useState({});

  // Community modal
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [communityTagline, setCommunityTagline] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [communityGroups, setCommunityGroups] = useState('');

  // Channel modal
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');

  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const avatarFileRef = useRef(null);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!editName.trim() || !editUsername.trim()) {
      toast.error('Name and Username are required');
      return;
    }
    updateProfile({ name: editName, username: editUsername, status: editStatus, avatar: editAvatar });
    setIsEditingProfile(false);
  };

  // Filtered & sorted chat list
  const filteredChats = useMemo(() => chats.filter((c) => {
    const entity = c.type === 'group' ? c.group : c.user;
    const q = searchQuery.toLowerCase();
    const nameMatch = entity?.name?.toLowerCase().includes(q);
    const usernameMatch = entity?.username?.toLowerCase().includes(q);
    const msgMatch = !!q && (c.messages || []).some((m) => m.text && m.text.toLowerCase().includes(q));
    if (searchQuery && !nameMatch && !usernameMatch && !msgMatch) return false;
    if (chatFilter === 'pinned') return c.pinned;
    if (chatFilter === 'favorites') return c.favorite;
    if (chatFilter === 'archived') return c.archived;
    if (chatFilter === 'unread') return c.unreadCount > 0;
    if (chatFilter === 'groups') return c.type === 'group';
    if (chatFilter === 'online') return c.type !== 'group' && entity?.online;
    return !c.archived;
  }), [chats, searchQuery, chatFilter]);

  const sortedChats = useMemo(() => [...filteredChats].sort((a, b) => {
    const aEntity = a.type === 'group' ? a.group : a.user;
    const bEntity = b.type === 'group' ? b.group : b.user;
    const aMsg = a.messages[a.messages.length - 1];
    const bMsg = b.messages[b.messages.length - 1];
    const aTime = aMsg ? new Date(aMsg.createdAt || Date.now()).getTime() : 0;
    const bTime = bMsg ? new Date(bMsg.createdAt || Date.now()).getTime() : 0;
    if (sortOrder === 'oldest') return aTime - bTime;
    if (sortOrder === 'alphabetical') return (aEntity?.name || '').localeCompare(bEntity?.name || '');
    if (sortOrder === 'unread') return (b.unreadCount || 0) - (a.unreadCount || 0);
    if (sortOrder === 'pinned') return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (sortOrder === 'online') return (bEntity?.online ? 1 : 0) - (aEntity?.online ? 1 : 0);
    return bTime - aTime;
  }), [filteredChats, sortOrder]);

  const getFilterCount = (filter) => chats.filter((c) => {
    const entity = c.type === 'group' ? c.group : c.user;
    if (filter === 'pinned') return c.pinned;
    if (filter === 'favorites') return c.favorite;
    if (filter === 'archived') return c.archived;
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'groups') return c.type === 'group';
    if (filter === 'online') return c.type !== 'group' && entity?.online;
    return !c.archived;
  }).length;

  // Status submit
  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!statusText.trim() && !statusImage) return;
    if (statusImage) {
      uploadStatus('image', `url('${statusImage}')`, { caption: statusText });
    } else {
      uploadStatus('text', statusText, { background: statusBgColor });
    }
    setStatusText('');
    setStatusImage(null);
    setShowStatusModal(false);
  };

  // Project submit
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) { toast.error('Project name is required'); return; }
    const tasks = projectTasks ? projectTasks.split(',').map((t) => t.trim()).filter(Boolean) : ['Milestone kickoff', 'Setup environment board'];
    createProject(projectName, projectDescription || 'No description provided.', projectChatId, tasks);
    setProjectName(''); setProjectDescription(''); setProjectChatId('chat_group_1'); setProjectTasks('');
    setShowProjectModal(false);
  };

  // Community submit
  const handleCommunitySubmit = (e) => {
    e.preventDefault();
    if (!communityName.trim()) { toast.error('Community name is required'); return; }
    const groups = communityGroups ? communityGroups.split(',').map((g) => g.trim()).filter(Boolean) : ['announcements', 'general'];
    createCommunity(communityName, communityTagline || 'A new space for connection', communityDescription || 'No description provided.', groups);
    setCommunityName(''); setCommunityTagline(''); setCommunityDescription(''); setCommunityGroups('');
    setShowCommunityModal(false);
  };

  // Channel submit
  const handleChannelSubmit = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    try {
      const newId = await createChannel(channelName, channelDescription || 'No description provided.', '');
      if (newId) {
        setChannelName('');
        setChannelDescription('');
        setShowChannelModal(false);
        toast.success(`Channel #${channelName} created!`);
      }
    } catch (err) {
      toast.error('Failed to create channel');
    }
  };

  // Join community forum
  const joinCommunityForum = (groupName) => {
    const match = chats.find((c) => c.type === 'group' && c.group?.name?.toLowerCase().includes(groupName.toLowerCase()));
    if (match) {
      selectChat(match.id);
      setActiveTab('chats');
      toast.success(`Welcome to #${groupName}`);
    } else {
      toast.success(`Connected to announcements for: #${groupName}`);
    }
  };

  // Send contact request
  const sendContactRequest = async (targetUser) => {
    try {
      await axios.post('/api/contacts/request', { username: targetUser.username, message: '' });
      setSentRequests((prev) => [...prev, targetUser.username]);
      toast.success(`Contact request sent to ${targetUser.name}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || '';
      if (errMsg.includes('already in your contacts') || errMsg.includes('already connected')) {
        toast.error(`${targetUser.name} is already in your contacts`);
      } else if (errMsg.includes('Request already pending')) {
        toast('Request already sent to ' + targetUser.name, { icon: '⏳' });
      } else if (err.response) {
        toast.error(errMsg || 'Failed to send request');
      } else {
        setSentRequests((prev) => [...prev, targetUser.username]);
        toast.success(`Contact request sent to ${targetUser.name} (offline mode)`);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]">

      {/* ===================== CHATS TAB ===================== */}
      {activeTab === 'chats' && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-color)] space-y-3.5 bg-[var(--bg-sidebar)]">
            <div className="flex justify-between items-center select-none">
              <h2 className="text-[20px] font-bold font-display text-slate-900 dark:text-[#E9EDEF] tracking-tight">Conversations</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => navigate('/add-contact')}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2A3942] text-blue-600 dark:text-[#2563EB] hover:text-blue-700 dark:hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all"
                  title="Add Contact"
                >
                  <FiUserPlus size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2A3942] text-slate-500 dark:text-[#8696A0] hover:text-slate-900 dark:hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all relative animate-fade-in"
                  title="Sort Conversations"
                >
                  <FiSliders size={18} />
                  {showSortDropdown && (
                    <div className="absolute top-10 right-0 z-40 bg-white dark:bg-[#202C33] border border-slate-200 dark:border-white/10 rounded-xl p-1.5 w-40 shadow-2xl flex flex-col text-left">
                      {[
                        { id: 'recent', label: 'Recent' },
                        { id: 'oldest', label: 'Oldest' },
                        { id: 'alphabetical', label: 'A-Z' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'pinned', label: 'Pinned' },
                        { id: 'online', label: 'Online' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSortOrder(opt.id)}
                          className={`w-full py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-[#2A3942] rounded-md text-[12px] text-left transition-colors font-semibold cursor-pointer ${sortOrder === opt.id ? 'text-blue-600 dark:text-[#2563EB] font-bold' : 'text-slate-800 dark:text-[#E9EDEF]'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => toast.success('Broadcast feature coming soon.')}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2A3942] text-slate-500 dark:text-[#8696A0] hover:text-slate-900 dark:hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all"
                  title="New Broadcast Group"
                >
                  <FiRadio size={18} />
                </button>
              </div>
            </div>
            {/* Search bar */}
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-[#8696A0] pointer-events-none">
                <FiSearch size={18} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-[#202C33] border border-slate-200 dark:border-transparent rounded-full text-[14px] text-slate-900 dark:text-[#E9EDEF] outline-none placeholder:text-slate-400 dark:placeholder:text-[#8696A0] focus:bg-white dark:focus:bg-[#2A3942]/60 focus:border-blue-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* Filter pills */}
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-white/5 select-none shrink-0 bg-white dark:bg-[#111B21]">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'online', label: 'Online' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'groups', label: 'Groups' },
              { id: 'favorites', label: 'Starred' },
              { id: 'archived', label: 'Archived' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setChatFilter(f.id)}
                className={`py-1.5 px-3.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${chatFilter === f.id ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'bg-slate-100 dark:bg-[#202C33] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-[#8696A0] hover:text-slate-900 dark:hover:text-[#E9EDEF] hover:bg-slate-200 dark:hover:bg-[#2A3942]/60'}`}
              >
                {f.label} ({getFilterCount(f.id)})
              </button>
            ))}
          </div>

          {/* Online now row */}
          {chats.some((c) => c.type !== 'group' && c.user?.online) && (
            <div className="px-4 py-3.5 border-b border-white/5 select-none shrink-0 bg-[#111B21]/50">
              <h4 className="text-[10px] text-[#8696A0] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-ping" />
                Active Now
              </h4>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                {chats.filter((c) => c.type !== 'group' && c.user?.online).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { selectChat(c.id); onSelectChatProp && onSelectChatProp(c.id); }}
                    className="flex flex-col items-center gap-1 cursor-pointer group/active shrink-0"
                  >
                    <div className="relative">
                      <img src={c.user.avatar} alt="" className="w-11 h-11 rounded-full border border-[#2563EB]/30 p-0.5 group-hover/active:scale-105 transition-transform" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#2563EB] rounded-full border-2 border-[#111B21] animate-pulse" />
                    </div>
                    <span className="text-[10px] font-medium text-[#8696A0] max-w-[60px] truncate group-hover/active:text-[#E9EDEF]">
                      {c.user.name?.split(' ')[0] ?? '?'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending contact requests */}
          {pendingRequests.length > 0 && (
            <div className="px-4 py-3 border-b border-white/5 bg-emerald-500/[0.02]">
              <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Pending Contact Requests ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between p-2 bg-white/[0.03] border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={req.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.sender?.username}`}
                        alt=""
                        className="w-8 h-8 rounded-full border border-white/5 bg-slate-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{req.sender?.name}</h4>
                        <p className="text-[9px] text-slate-500 truncate">@{req.sender?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => declineRequest(req._id)} className="px-2.5 py-1 text-[9px] font-bold rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer">DECLINE</button>
                      <button onClick={() => acceptRequest(req._id)} className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer">ACCEPT</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
            {sortedChats.length > 0 ? sortedChats.map((chat) => {
              const entity = chat.type === 'group' ? chat.group : chat.user;
              const lastMsg = (chat.messages || [])[(chat.messages || []).length - 1];
              const msgType = lastMsg?.type || 'text';
              const typing = typingStatus[chat.id];
              const isTyping = typing && Object.values(typing).some((v) => v != null);
              const isVerified = entity.name === '' || entity.name === 'Aether AI' || entity.verified;

              let preview;
              if (isTyping) {
                preview = <span className="text-emerald-400 font-semibold animate-pulse">typing...</span>;
              } else if (lastMsg) {
                preview = msgType === 'text' ? lastMsg.text : `[${msgType.toUpperCase()} file]`;
              } else if (chat.draft) {
                preview = <span className="text-emerald-400 font-semibold">Draft: {chat.draft}</span>;
              } else {
                preview = 'No messages yet';
              }

              // When a search matched message content (not the name), surface it.
              const q = searchQuery.trim().toLowerCase();
              const nameHit = q && (entity?.name?.toLowerCase().includes(q) || entity?.username?.toLowerCase().includes(q));
              const contentHit = q && !nameHit
                ? (chat.messages || []).find((m) => m.text && m.text.toLowerCase().includes(q))
                : null;
              if (contentHit) {
                preview = <span><span className="text-blue-500 dark:text-blue-400 font-semibold">↳ </span>{contentHit.text}</span>;
              }

              return (
                <div key={chat.id} className="relative overflow-hidden rounded-xl bg-transparent group mx-2 mb-1">
                  {/* swipe background */}
                  <div className="absolute inset-0 bg-[#202C33] border border-white/5 rounded-xl flex justify-end items-center px-4 gap-2 text-[12px] font-bold text-[#8696A0] select-none">
                    <span className="text-[#2563EB]">Pin</span>
                    {' • '}
                    <span className="text-[#8696A0]">Archive</span>
                  </div>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -100, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => { if (info.offset.x < -75) toggleArchiveChat(chat.id); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setConvoContextMenu(chat); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
                    onClick={() => { selectChat(chat.id); onSelectChatProp && onSelectChatProp(chat.id); }}
                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer border transition-all duration-300 relative z-10 ${selectedChatId === chat.id ? 'bg-blue-50/80 dark:bg-[#2A3942]/60 border-blue-200 dark:border-white/[0.04] shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-[#2A3942]/25'}`}
                  >
                    <div className="relative shrink-0 select-none">
                      <img
                        src={entity?.avatar}
                        alt=""
                        className={`w-11 h-11 rounded-full border-2 border-transparent object-cover ${entity?.id === 'user_ai' ? 'animate-pulse ring-2 ring-blue-500/30 border-blue-500/20' : ''}`}
                      />
                      {chat.type !== 'group' && entity?.online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-600 rounded-full border-[2.5px] border-white dark:border-[#111B21]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5 select-none">
                        <h4 className="text-[16px] font-semibold text-slate-900 dark:text-[#E9EDEF] truncate font-display flex items-center gap-1">
                          {entity.name}
                          {isVerified && (
                            <span className="p-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full" title="Verified">
                              <FiCheck size={7} />
                            </span>
                          )}
                        </h4>
                        <span className="text-[12px] text-slate-500 dark:text-[#8696A0] tabular-nums shrink-0">{lastMsg ? lastMsg.timestamp : ''}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[14px] text-slate-600 dark:text-[#8696A0] truncate flex-1 font-sans leading-snug">{preview}</p>
                        <div className="flex items-center gap-1.5 shrink-0 select-none ml-1.5">
                          <div className="flex items-center gap-1.5 group-hover:hidden">
                            {chat.pinned && <FiBookmark size={11} className="text-blue-600" />}
                            {chat.favorite && <FiStar size={11} className="text-amber-500" />}
                            {chat.muted && <FiVolumeX size={11} className="text-slate-400 dark:text-[#667781]" />}
                            {chat.locked && <FiLock size={11} className="text-red-500" />}
                            {chat.archived && <span className="text-[9px] bg-slate-100 dark:bg-[#202C33] py-0.5 px-1.5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#8696A0] uppercase rounded tracking-wider font-semibold">Archived</span>}
                            {chat.unreadCount > 0 && (
                              <span className="px-1.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white font-bold font-display text-[10px] flex items-center justify-center shadow-md shadow-blue-500/20">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="hidden group-hover:flex items-center gap-1 bg-[#202C33] p-1 rounded-lg border border-white/10 shadow-lg">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                              className={`p-1 hover:text-[#2563EB] cursor-pointer ${chat.pinned ? 'text-[#2563EB]' : 'text-[#667781]'}`}
                              title={chat.pinned ? 'Unpin' : 'Pin'}
                            >
                              <FiBookmark size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMuteChat(chat.id); }}
                              className={`p-1 hover:text-yellow-400 cursor-pointer ${chat.muted ? 'text-yellow-400' : 'text-[#667781]'}`}
                              title={chat.muted ? 'Unmute' : 'Mute'}
                            >
                              <FiVolumeX size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            }) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-[#667781]">
                <FiMessageSquare size={22} className="mb-2 opacity-50" />
                <p className="text-[13px] font-medium">No conversations found</p>
              </div>
            )}
          </div>

          {/* Context menu */}
          {convoContextMenu && (
            <div
              className="fixed z-[999] bg-[#202C33] border border-white/10 rounded-2xl p-2.5 w-52 shadow-2xl select-none flex flex-col backdrop-blur-xl"
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { selectChat(convoContextMenu.id); onSelectChatProp && onSelectChatProp(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiMessageSquare size={13} className="text-[#2563EB]" /> Open Chat
              </button>
              <button onClick={() => { convoContextMenu.unreadCount > 0 ? markChatAsRead(convoContextMenu.id) : markChatAsUnread(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiCheck size={13} className="text-emerald-400" /> {convoContextMenu.unreadCount > 0 ? 'Mark as Read' : 'Mark as Unread'}
              </button>
              <button onClick={() => { togglePinChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiBookmark size={13} className="text-blue-400" /> {convoContextMenu.pinned ? 'Unpin Chat' : 'Pin Chat'}
              </button>
              <button onClick={() => { toggleArchiveChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiSliders size={13} className="text-purple-400" /> {convoContextMenu.archived ? 'Unarchive Chat' : 'Archive Chat'}
              </button>
              <button onClick={() => { toggleMuteChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiVolumeX size={13} className="text-blue-400" /> {convoContextMenu.muted ? 'Unmute Chat' : 'Mute Chat'}
              </button>
              <button onClick={() => { toggleLockChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiLock size={13} className="text-cyan-400" /> {convoContextMenu.locked ? 'Unlock Chat' : 'Lock Chat'}
              </button>
              <button onClick={() => { toggleFavoriteChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiStar size={13} className="text-yellow-500" fill={convoContextMenu.favorite ? 'currentColor' : 'none'} /> {convoContextMenu.favorite ? 'Remove Favorite' : 'Add Favorite'}
              </button>
              <div className="border-t border-[#2A3942] my-1" />
              <button onClick={() => { deleteChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-blue-500/10 rounded-lg text-[13px] text-blue-400 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer">
                <FiTrash2 size={13} className="text-blue-500" /> Delete Chat
              </button>
            </div>
          )}
        </>
      )}

      {/* ===================== CALLS TAB ===================== */}
      {activeTab === 'calls' && (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center select-none">
            <h2 className="text-base font-bold font-display text-white">Call Log</h2>
            <button onClick={() => toast.success('Dialpad open. Choose contact to initiate call.')} className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform" title="Initiate Dial">
              <FiPhone size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
            {callHistory.map((call) => (
              <div key={call.id} className="p-3 rounded-xl hover:bg-white/[0.015] border border-transparent hover:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={call.avatar} alt="" className="w-10 h-10 rounded-full border border-white/5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-display">{call.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-500 select-none">
                      <FiClock size={10} />
                      <span>{call.date}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => initiateCall(call.userId, call.name, call.avatar, call.type)} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-400 border border-white/5 active:scale-95 transition-all cursor-pointer">
                  <FiPhone size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== STATUS TAB ===================== */}
      {activeTab === 'status' && (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center select-none">
            <h2 className="text-base font-bold font-display text-white">Status Stories</h2>
            <button onClick={() => setShowStatusModal(true)} className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform" title="Post Text Status">
              <FiImage size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-4">
            {/* My status */}
            {(() => {
              const myStatus = statuses.find((s) => s.userId === 'user_me');
              const hasStatus = myStatus && myStatus.items && myStatus.items.length > 0;
              return (
                <div className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between transition-colors">
                  <div onClick={() => { hasStatus ? onSelectStatusProp(myStatus) : setShowStatusModal(true); }} className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="relative shrink-0 select-none">
                      <img src={user.avatar} alt="" className={`w-11 h-11 rounded-full p-0.5 border-2 ${hasStatus ? 'border-emerald-500 animate-pulse' : 'border-emerald-500/20'}`} />
                      {!hasStatus && (
                        <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full border-2 border-slate-950 text-slate-950">
                          <FiPlus size={8} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-display">My Status</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{hasStatus ? `${myStatus.items.length} status stories published` : 'Share thoughts or photos'}</p>
                    </div>
                  </div>
                  {hasStatus && (
                    <button onClick={() => setShowStatusModal(true)} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white border border-white/5 active:scale-95 transition-all cursor-pointer" title="Add another status story">
                      <FiPlus size={12} />
                    </button>
                  )}
                </div>
              );
            })()}
            {/* Others' statuses */}
            <div className="space-y-1">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2 mb-2 select-none">Recent Updates</h3>
              {statuses.filter((s) => {
                if (s.userId === 'user_me') return false;
                const inContacts = user?.contacts?.includes(s.userId);
                const inChats = chats?.some((c) => c.type !== 'group' && c.user && (c.user.id === s.userId || c.user._id === s.userId || (s.userUsername && c.user.username === s.userUsername)));
                return inContacts || inChats;
              }).map((s) => (
                <div key={s.id} onClick={() => onSelectStatusProp(s)} className="p-3 rounded-xl hover:bg-white/[0.015] border border-transparent hover:border-white/5 flex items-center gap-3 cursor-pointer transition-colors">
                  <div className="relative shrink-0 select-none p-0.5 border-2 border-emerald-500 rounded-full">
                    <img src={s.userAvatar} alt="" className="w-10 h-10 rounded-full border border-slate-950 border-2" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-display">{s.userName}</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">{s.items[0].timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===================== CHANNELS TAB ===================== */}
      {activeTab === 'channels' && (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center select-none">
            <h2 className="text-base font-bold font-display text-white">Discover Channels</h2>
            <button 
              onClick={() => setShowChannelModal(true)} 
              className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform" 
              title="Create Channel"
            >
              <FiPlus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-4">
            {channels.map((ch) => (
              <div key={ch.id} onClick={() => setSelectedChannelId(ch.id)} className={`p-3 border cursor-pointer transition-all rounded-2xl space-y-3 ${selectedChannelId === ch.id ? 'bg-slate-900 border-white/10' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={ch.avatar} alt="" className="w-9 h-9 rounded-full border border-white/5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 font-display">{ch.name}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">{ch.subscribers} Subscribers</p>
                    </div>
                  </div>
                  <button onClick={() => followChannel(ch.id)} className={`py-1 px-3 rounded-lg text-[9px] font-semibold transition-all active:scale-95 cursor-pointer border ${ch.following ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-emerald-500 border-transparent text-slate-950 shadow-md shadow-emerald-500/10'}`}>
                    {ch.following ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans px-1">{ch.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== COMMUNITIES TAB ===================== */}
      {activeTab === 'communities' && (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center select-none">
            <h2 className="text-base font-bold font-display text-white">Communities</h2>
            <button onClick={() => setShowCommunityModal(true)} className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform" title="Create Community">
              <FiPlus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-4">
            {communities && communities.map((comm) => (
              <div key={comm.id} onClick={() => setSelectedCommunityId(comm.id)} className={`p-4 border cursor-pointer transition-all rounded-2xl space-y-3 ${selectedCommunityId === comm.id ? 'bg-slate-900 border-white/10' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'}`}>
                <div className="flex items-center gap-3">
                  <img src={comm.avatar} alt="" className="w-10 h-10 rounded-xl border border-white/5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-display">{comm.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{comm.tagline}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{comm.description}</p>
                <div className="border-t border-white/5 pt-2 space-y-2">
                  <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 select-none">Active Forums</h5>
                  {comm.groups && comm.groups.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] py-1">
                      <span className="font-semibold text-slate-300 font-mono"># {g.name}</span>
                      <button onClick={() => joinCommunityForum(g.name)} className="text-[9px] font-semibold text-emerald-500 cursor-pointer hover:underline">Join</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== PROJECTS TAB ===================== */}
      {activeTab === 'projects' && (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center select-none">
            <h2 className="text-base font-bold font-display text-white">Project Workspaces</h2>
            <button onClick={() => setShowProjectModal(true)} className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform" title="Create Workspace Track">
              <FiPlus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-4">
            {projects.map((proj) => (
              <div key={proj.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-display">{proj.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{proj.description}</p>
                  </div>
                  <button onClick={() => { onSelectChatProp && onSelectChatProp(proj.chatId); setActiveTab('chats'); toast.success(`Welcome to #${proj.name} chat`); }} className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[9px] font-bold active:scale-95 transition-all cursor-pointer shadow-md shadow-emerald-500/10">
                    Chat
                  </button>
                </div>
                <div className="space-y-1 select-none">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                    <span>Progress Workspace</span>
                    <span>{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${proj.progress}%` }} />
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2 space-y-2 select-none">
                  <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Sprint Tasks</h5>
                  <div className="space-y-1">
                    {proj.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 py-0.5">
                        <input type="checkbox" checked={task.completed} onChange={() => toggleProjectTask(proj.id, task.id)} className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                        <span className={`text-[10px] ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{task.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); const val = newSubTasks[proj.id] || ''; if (val.trim()) { addProjectTask(proj.id, val); setNewSubTasks((prev) => ({ ...prev, [proj.id]: '' })); } }} className="flex gap-1.5 mt-2">
                    <input type="text" placeholder="Add sub-task..." value={newSubTasks[proj.id] || ''} onChange={(e) => setNewSubTasks((prev) => ({ ...prev, [proj.id]: e.target.value }))} className="flex-1 bg-slate-900 border border-white/5 rounded-lg py-1 px-2.5 text-[9px] text-slate-300 outline-none" />
                    <button type="submit" className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-lg text-[9px] text-slate-400 hover:text-white cursor-pointer font-bold">Add</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== AETHER AI TAB ===================== */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#080c14] relative">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-10 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FiCpu size={16} className="animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-white">Aether AI Co-Pilot</h2>
                <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Neural Core Connected
                </p>
              </div>
            </div>
            <button 
              onClick={() => setAiMessages([{ role: 'model', text: 'Welcome to Aether AI! I can help you draft responses, translate logs, generate images, or audit code. Ask me anything!' }])}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 border border-white/5 rounded-lg transition-colors cursor-pointer"
            >
              Clear Chat
            </button>
          </div>

          {/* AI Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${msg.role === 'user' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  {msg.role === 'user' ? 'ME' : 'AI'}
                </div>
                <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none shadow-md'}`}>
                  {msg.type === 'image' ? (
                    <div className="space-y-2">
                      <img src={msg.mediaUrl} alt="AI Generated" className="rounded-xl w-full object-cover max-h-60 border border-white/10" />
                      <p className="text-[11px] text-slate-300 italic">{msg.caption}</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isAiThinking && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs italic">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <FiCpu size={12} className="animate-spin" />
                </div>
                <span className="animate-pulse">Aether AI is processing neural response...</span>
              </div>
            )}
            <div ref={aiScrollRef} />
          </div>

          {/* AI Input Form */}
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!aiInputValue.trim() || isAiThinking) return;
              const userPrompt = aiInputValue.trim();
              setAiInputValue('');
              const updatedHistory = [...aiMessages, { role: 'user', text: userPrompt }];
              setAiMessages(updatedHistory);
              setIsAiThinking(true);

              try {
                const token = sessionStorage.getItem('aether_token') || localStorage.getItem('token');
                const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/ai/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ prompt: userPrompt, history: updatedHistory })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (data.type === 'image') {
                  setAiMessages(prev => [...prev, { role: 'model', type: 'image', mediaUrl: data.mediaUrl, caption: data.caption }]);
                } else {
                  setAiMessages(prev => [...prev, { role: 'model', text: data.response }]);
                }
              } catch (err) {
                toast.error(err.message || 'Failed to process AI request');
                setAiMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an issue connecting to my neural network.' }]);
              } finally {
                setIsAiThinking(false);
              }
            }} 
            className="p-3 border-t border-white/5 bg-slate-950 flex gap-2"
          >
            <input 
              type="text"
              value={aiInputValue}
              onChange={(e) => setAiInputValue(e.target.value)}
              placeholder="Ask Aether AI or type 'Draw a sunset'..."
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-blue-500/40 outline-none"
            />
            <button 
              type="submit" 
              disabled={isAiThinking || !aiInputValue.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-blue-500/20"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* ===================== SETTINGS TAB ===================== */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
            <h2 className="text-base font-bold font-display text-white">{isEditingProfile ? 'Edit Profile' : 'Settings'}</h2>
            {isEditingProfile && <button onClick={() => setIsEditingProfile(false)} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer">Back</button>}
          </div>
          {isEditingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <div onClick={() => avatarFileRef.current.click()} className="relative w-20 h-20 rounded-full group overflow-hidden border border-emerald-500/25 p-0.5 cursor-pointer bg-slate-950 flex items-center justify-center">
                  <img src={editAvatar || user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover group-hover:opacity-40 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs flex-col gap-0.5">
                    <FiCamera size={14} />
                    <span className="text-[8px] font-semibold select-none">Change</span>
                  </div>
                </div>
                <input type="file" ref={avatarFileRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden" />
                <p className="text-[9px] text-slate-500 select-none">Click photo circle to upload</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 select-none">Your Name</label>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 select-none">Username</label>
                  <input type="text" required value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 select-none">Bio / Status</label>
                  <textarea value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2.5 h-16 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer">Save Profile Changes</button>
            </form>
          ) : (
            <>
              <div onClick={() => { if (!user) return; setEditName(user.name); setEditUsername(user.username); setEditStatus(user.status || 'Decentralized Sync Protocol'); setEditAvatar(user.avatar); setIsEditingProfile(true); }} className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors">
                <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full border border-white/5 p-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 font-display truncate">{user.name}</h4>
                  <p className="text-[9px] text-slate-400 truncate">@{user.username}</p>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{user.status || 'Decentralized Sync Protocol'}</p>
                </div>
                <span className="text-[9px] text-emerald-400 font-bold hover:underline select-none">Edit</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">Visual Appearance</h3>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 select-none">System Theme</label>
                  <div className="flex gap-2">
                    {['dark', 'light'].map((mode) => (
                      <button key={mode} onClick={() => updateTheme({ mode })} className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold uppercase transition-all cursor-pointer ${(user?.themePreference?.mode || user?.theme?.mode) === mode ? 'bg-slate-900 border-white/10 text-emerald-400' : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200'}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 select-none">Chat Wallpaper Pattern</label>
                  <select value={(user?.themePreference?.chatWallpaper || user?.theme?.chatWallpaper) || 'grid'} onChange={(e) => updateTheme({ chatWallpaper: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none">
                    <option value="grid">Geometric Grid</option>
                    <option value="dots">Minimal Dots</option>
                    <option value="solid">Plain Canvas</option>
                    <option value="neon">Neon Mesh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 select-none">Bubble Corner Style</label>
                  <select value={(user?.themePreference?.bubbleStyle || user?.theme?.bubbleStyle) || 'rounded'} onChange={(e) => updateTheme({ bubbleStyle: e.target.value })} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none">
                    <option value="rounded">Classic Rounded</option>
                    <option value="sharp">Symmetric Sharp</option>
                    <option value="playful">Organic Playful</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">Privacy & Locks</h3>
                <div className="flex justify-between items-center text-xs py-1">
                  <div>
                    <h4 className="font-semibold text-slate-300">Biometric FaceID Lock</h4>
                    <p className="text-[9px] text-slate-500">Enable biometric dashboard protection</p>
                  </div>
                  <input type="checkbox" checked={(user?.securitySettings?.faceId ?? user?.security?.faceId) ?? false} onChange={(e) => updateSecurity({ faceId: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center text-xs py-1">
                  <div>
                    <h4 className="font-semibold text-slate-300">PIN Lock Verification</h4>
                    <p className="text-[9px] text-slate-500">Require 4-digit PIN code on launch</p>
                  </div>
                  <input type="checkbox" checked={(user?.securitySettings?.pinLock ?? user?.security?.pinLock) ?? false} onChange={(e) => updateSecurity({ pinLock: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer" />
                </div>
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                <h3 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">Aether Intelligent AI</h3>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 select-none">Gemini API Key</label>
                  <input type="password" placeholder="Enter Gemini API Key..." value={geminiApiKey} onChange={(e) => { setGeminiApiKey(e.target.value); sessionStorage.setItem('aether_gemini_api_key', e.target.value); }} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none placeholder:text-slate-600 font-sans" />
                  <p className="text-[8px] text-slate-500 mt-1 select-none leading-normal">Paste your Gemini API Key here (get one for free from Google AI Studio). This enables real-time, context-aware smart responses directly in the Aether AI chat thread!</p>
                </div>
              </div>
              {user.qrCode && (
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl space-y-2 select-none">
                  <h4 className="text-[10px] text-slate-500 font-semibold uppercase">Profile QR Code</h4>
                  <p className="text-[9px] text-slate-400 leading-normal">Other Aether devices can scan this credentials block to verify contacts securely.</p>
                  <div className="flex justify-center p-3 bg-white rounded-xl max-w-[150px] mx-auto border border-white/5">
                    <img src={user.qrCode} alt="Profile QR Code" className="w-24 h-24" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================== PROFILE TAB ===================== */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
            <h2 className="text-base font-bold font-display text-white">Your Profile</h2>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div onClick={() => navigate('/profile')} className="relative w-20 h-20 rounded-full overflow-hidden border border-emerald-500/25 p-0.5 cursor-pointer bg-slate-950 flex items-center justify-center group">
              <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold select-none">View</div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 font-display">{user.name}</h4>
              <p className="text-[10px] text-slate-500">@{user.username}</p>
            </div>
          </div>
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 font-sans text-xs text-slate-300">
            <div>
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Status / Bio</span>
              <p className="leading-relaxed text-slate-200">{user.bio || 'Available'}</p>
            </div>
            <div className="border-t border-white/5 pt-3">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Registered Phone</span>
              <p className="text-slate-200">{user.phone || 'Not linked'}</p>
            </div>
          </div>
          <button onClick={() => navigate('/profile')} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer text-center">Manage profile keys</button>
        </div>
      )}

      {/* ===================== NOTIFICATIONS TAB ===================== */}
      {activeTab === 'notifications' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
            <h2 className="text-base font-bold font-display text-white">Notifications</h2>
          </div>
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Contact Requests ({pendingRequests.length})
              </h4>
              {pendingRequests.map((req) => (
                <div key={req._id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2.5 mb-2">
                    <img src={req.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.sender?.username}`} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{req.sender?.name}</h4>
                      <p className="text-[9px] text-slate-500 truncate">@{req.sender?.username}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">wants to connect with you</p>
                  <div className="flex gap-2">
                    <button onClick={() => declineRequest(req._id)} className="flex-1 py-1.5 text-[9px] font-bold rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer">DECLINE</button>
                    <button onClick={() => acceptRequest(req._id)} className="flex-1 py-1.5 text-[9px] font-bold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer">ACCEPT</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/notifications')} className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-300 rounded-xl cursor-pointer">Open Alert logs</button>
        </div>
      )}

      {/* ===================== SEARCH TAB ===================== */}
      {activeTab === 'search' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 select-none">
            <h2 className="text-base font-bold font-display text-white">Search History</h2>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <FiSearch size={12} />
            </span>
            <input type="text" placeholder="Search database..." onClick={() => navigate('/search')} className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 outline-none cursor-pointer" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">Recent terms</h4>
            {['typography design', 'pdf system guidelines', 'Weekend runners call', 'sarah 2fa'].map((term, idx) => (
              <div key={idx} onClick={() => { navigate('/search'); toast.success(`Search term matched: "${term}"`); }} className="p-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.015] cursor-pointer flex justify-between items-center">
                <span>{term}</span>
                <FiArrowRight size={10} className="text-slate-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== AI TAB ===================== */}
      {activeTab === 'ai' && (
        <>
          <div className="p-4 border-b border-white/5 space-y-3.5">
            <div className="flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                  <img src={appLogo} alt="Aether" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-[20px] font-bold font-display text-[#E9EDEF] tracking-tight">Aether AI</h2>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => navigate('/add-contact')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2A3942] text-[#2563EB] hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all" title="Add Contact">
                  <FiUserPlus size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all relative" title="Sort Conversations">
                  <FiSliders size={18} />
                </button>
              </div>
            </div>
            <div className="relative">
              <FiSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696A0]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search AI conversations..." className="w-full pl-10 pr-4 py-2.5 bg-[#2A3942] border border-white/5 rounded-xl text-[14px] text-[#E9EDEF] placeholder-[#8696A0] outline-none focus:border-[#2563EB]/40 focus:bg-[#2A3942]/80 transition-all" />
            </div>
          </div>
          <div className="flex gap-1.5 px-4 py-2.5 border-b border-white/5 select-none">
            {[{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'favorites', label: 'Favorites' }, { id: 'groups', label: 'Groups' }, { id: 'pinned', label: 'Pinned' }, { id: 'archived', label: 'Archived' }].map((f) => (
              <button key={f.id} onClick={() => setChatFilter(f.id)} className={`px-3 py-1.5 text-[11px] font-bold rounded-full cursor-pointer transition-all ${chatFilter === f.id ? 'bg-[#2563EB] text-[#0B141A] shadow-md shadow-[#2563EB]/20' : 'bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#2A3942]/60'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar py-1 select-none">
            {sortedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-white/5 flex items-center justify-center mb-4">
                  <img src={appLogo} alt="Aether" className="w-full h-full object-cover" />
                </div>
                <p className="text-[14px] font-semibold text-[#E9EDEF] mb-1">No conversations yet</p>
                <p className="text-[12px] text-[#8696A0]">Start a new chat or ask the AI a question</p>
              </div>
            ) : sortedChats.map((chat) => {
              const entity = chat.type === 'group' ? chat.group : chat.user;
              const lastMsg = (chat.messages || [])[chat.messages.length - 1];
              const isVerified = chat.verified || entity?.verified;
              const isMuted = chat.muted || chat.isMuted;
              return (
                <div key={chat.id} className="relative overflow-hidden rounded-xl bg-transparent group mx-2 mb-1">
                  <div className="absolute inset-0 bg-[#202C33] border border-white/5 rounded-xl flex justify-end items-center px-4 gap-2 text-[12px] font-bold text-[#8696A0] select-none">
                    <span className="text-[#2563EB]">Pin</span> {' • '} <span className="text-[#8696A0]">Archive</span>
                  </div>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -100, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => { if (info.offset.x < -75) toggleArchiveChat(chat.id); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setConvoContextMenu(chat); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
                    onClick={() => { selectChat(chat.id); onSelectChatProp && onSelectChatProp(chat.id); }}
                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer border transition-all duration-300 relative z-10 ${selectedChatId === chat.id ? 'bg-[#2A3942]/60 border-white/[0.04] shadow-md shadow-black/10' : 'bg-transparent border-transparent hover:bg-[#2A3942]/25'}`}
                  >
                    <div className="relative shrink-0 select-none">
                      <img src={entity?.avatar} alt="" className={`w-11 h-11 rounded-full border-2 border-transparent object-cover ${entity?.id === 'user_ai' ? 'animate-pulse ring-2 ring-[#2563EB]/30 border-[#2563EB]/20' : ''}`} />
                      {chat.type !== 'group' && entity?.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2563EB] rounded-full border-[2.5px] border-[#111B21]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-[16px] font-semibold text-[#E9EDEF] truncate font-display flex items-center gap-1">
                          {entity.name}
                          {isVerified && <span className="p-0.5 bg-emerald-500/20 text-emerald-400 rounded-full" title="Verified"><FiCheck size={7} /></span>}
                        </h4>
                        <span className="text-[12px] text-[#8696A0] tabular-nums shrink-0">{lastMsg ? lastMsg.timestamp : ''}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-[13px] truncate flex-1 min-w-0 ${chat.unreadCount ? 'text-[#E9EDEF] font-semibold' : 'text-[#8696A0]'}`}>
                          {lastMsg?.text || lastMsg?.caption || (lastMsg?.type === 'image' ? '📷 Photo' : lastMsg?.type === 'voice' ? '🎤 Voice note' : '')}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {chat.pinned && <FiBookmark size={10} className="text-[#2563EB]" />}
                          {isMuted && <FiVolumeX size={10} className="text-[#8696A0]" />}
                          {chat.locked && <FiLock size={10} className="text-yellow-500" />}
                          {chat.unreadCount > 0 && <span className="bg-[#2563EB] text-[#0B141A] text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">{chat.unreadCount}</span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
          {convoContextMenu && (
            <div className="fixed inset-0 z-50" onClick={() => setConvoContextMenu(null)}>
              <div className="absolute bg-[#202C33] border border-white/10 rounded-xl p-1.5 w-48 shadow-2xl shadow-black/50 backdrop-blur-xl" style={{ top: contextMenuPos.y, left: contextMenuPos.x }}>
                <button onClick={() => { selectChat(convoContextMenu.id); onSelectChatProp && onSelectChatProp(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 cursor-pointer"><FiMessageSquare size={13} className="text-[#2563EB]" /> Open</button>
                <button onClick={() => { togglePinChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 cursor-pointer"><FiBookmark size={13} className="text-blue-400" /> {convoContextMenu.pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => { toggleMuteChat(convoContextMenu.id); setConvoContextMenu(null); }} className="w-full text-left py-2 px-3 hover:bg-[#2A3942] rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 cursor-pointer"><FiVolumeX size={13} className="text-blue-400" /> {convoContextMenu.muted ? 'Unmute' : 'Mute'}</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== STATUS CREATE MODAL ========== */}
      {showStatusModal && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white font-display">Create Status Story</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <input type="file" ref={statusFileRef} onChange={handleStatusFileChange} accept="image/*" className="hidden" />
              {statusImage ? (
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 flex items-center justify-center">
                  <img src={statusImage} alt="Status Preview" className="max-h-full max-w-full object-contain" />
                  <button type="button" onClick={() => setStatusImage(null)} className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-white rounded-full p-1.5 cursor-pointer text-[10px]">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => statusFileRef.current.click()} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors">
                  <FiImage size={20} />
                  <span className="text-[10px] font-semibold">Upload Photo Status</span>
                </button>
              )}
              <textarea value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={statusImage ? 'Add a caption...' : 'What is on your mind?...'} className="w-full p-3 h-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none resize-none placeholder:text-slate-500" />
              {!statusImage && (
                <div className="flex gap-2 justify-center">
                  {STATUS_BG_COLORS.map((color, idx) => (
                    <button key={idx} type="button" onClick={() => setStatusBgColor(color)} className={`w-6 h-6 rounded-full border cursor-pointer hover:scale-110 transition-transform ${statusBgColor === color ? 'border-emerald-500' : 'border-transparent'}`} style={{ background: color }} />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowStatusModal(false); setStatusImage(null); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer">Publish Story</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== PROJECT CREATE MODAL ========== */}
      {showProjectModal && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white font-display">Track New Project</h3>
            <form onSubmit={handleProjectSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Project Name</label>
                <input type="text" required value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Design Redesign" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description</label>
                <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="e.g. Layout scaling and audit guidelines specs." className="w-full p-2.5 h-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Linked Discussion Chat</label>
                <select value={projectChatId} onChange={(e) => setProjectChatId(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none">
                  {chats.map((c) => {
                    const name = c.type === 'group' ? c.group?.name : c.user?.name;
                    return <option key={c.id} value={c.id}>{name || 'Unnamed Chat'} ({c.type.toUpperCase()})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Sprint Tasks (Comma separated)</label>
                <input type="text" value={projectTasks} onChange={(e) => setProjectTasks(e.target.value)} placeholder="e.g. Audit checklist, Review typography" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowProjectModal(false); setProjectName(''); setProjectDescription(''); setProjectTasks(''); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer">Track Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== COMMUNITY CREATE MODAL ========== */}
      {showCommunityModal && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white font-display">Create a Community</h3>
            <form onSubmit={handleCommunitySubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Community Name</label>
                <input type="text" required value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="e.g. Acme Tech Studio" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Tagline</label>
                <input type="text" value={communityTagline} onChange={(e) => setCommunityTagline(e.target.value)} placeholder="e.g. Design & engineering sync" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description</label>
                <textarea value={communityDescription} onChange={(e) => setCommunityDescription(e.target.value)} placeholder="Describe what this community is about..." className="w-full p-2.5 h-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Sub-Groups (Comma separated)</label>
                <input type="text" value={communityGroups} onChange={(e) => setCommunityGroups(e.target.value)} placeholder="e.g. Announcements, Support, dev-logs" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowCommunityModal(false); setCommunityName(''); setCommunityTagline(''); setCommunityDescription(''); setCommunityGroups(''); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer">Create Space</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== CHANNEL CREATE MODAL ========== */}
      {showChannelModal && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white font-display">Create a Channel</h3>
            <form onSubmit={handleChannelSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Channel Name</label>
                <input type="text" required value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="e.g. tech-announcements" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description</label>
                <textarea value={channelDescription} onChange={(e) => setChannelDescription(e.target.value)} placeholder="Describe what this channel is for..." className="w-full p-2.5 h-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowChannelModal(false); setChannelName(''); setChannelDescription(''); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer">Create Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== NEW CHAT MODAL ========== */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-white/5 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white font-display">Start a New Chat</h3>
              <button onClick={() => { setShowNewChatModal(false); setDirectorySearchQuery(''); setDirectorySearchResults([]); setSentRequests([]); setActiveNewChatTab('search'); }} className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">Close</button>
            </div>
            {/* Tab switcher */}
            <div className="flex bg-[#0b0f19] p-1 rounded-xl border border-white/5 w-full">
              <button onClick={() => { setActiveNewChatTab('search'); setDirectorySearchQuery(''); setDirectorySearchResults([]); setSentRequests([]); }} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${activeNewChatTab === 'search' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>SEARCH DIRECTORY</button>
              <button onClick={() => { setActiveNewChatTab('group'); setGroupCreationStep(1); setGroupSelectedParticipants([]); setGroupSubject(''); setGroupDescription(''); setGroupParticipantSearchQuery(''); setGroupParticipantSearchResults([]); }} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${activeNewChatTab === 'group' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>CREATE GROUP</button>
              <button onClick={() => setActiveNewChatTab('manual')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${activeNewChatTab === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>ADD MANUALLY</button>
            </div>

            {/* Manual tab */}
            {activeNewChatTab === 'manual' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!manualUsername.trim()) { toast.error('Username is required'); return; }
                try {
                  await createContactAndChat(manualName, manualUsername, manualEmail, manualPhone);
                  setShowNewChatModal(false); setManualName(''); setManualUsername(''); setManualEmail(''); setManualPhone(''); setActiveNewChatTab('search');
                } catch {}
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</label>
                  <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Username *</label>
                  <input type="text" value={manualUsername} onChange={(e) => setManualUsername(e.target.value)} placeholder="e.g. johndoe" required className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Email Address (optional)</label>
                  <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="e.g. john@example.com" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number (optional)</label>
                  <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <button type="submit" className="w-full mt-2 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-600 transition-all cursor-pointer">ADD CONTACT & START CHAT</button>
              </form>
            )}

            {/* Group creation tab */}
            {activeNewChatTab === 'group' && groupCreationStep === 1 && (
              <div className="space-y-3 flex flex-col h-full max-h-[420px]">
                <div>
                  <h4 className="text-xs font-bold text-white font-display">Add Group Participants</h4>
                  <p className="text-[9px] text-slate-400">Select contacts to join the group. ({groupSelectedParticipants.length} selected)</p>
                </div>
                {groupSelectedParticipants.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 border-y border-white/5 shrink-0 select-none">
                    {groupSelectedParticipants.map((p) => (
                      <div key={p._id || p.id} className="flex flex-col items-center relative min-w-[50px] text-center">
                        <img src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`} alt="" className="w-10 h-10 rounded-full border border-emerald-500/30 p-0.5 bg-slate-900" />
                        <button onClick={() => setGroupSelectedParticipants((prev) => prev.filter((u) => (u._id || u.id) !== (p._id || p.id)))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 text-slate-400 hover:text-blue-400 border border-white/10 flex items-center justify-center text-[8px] font-bold cursor-pointer">✕</button>
                        <span className="text-[8px] text-slate-300 mt-1 truncate w-12 font-medium">{p.name?.split(' ')[0] ?? '?'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative shrink-0">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={14} /></span>
                  <input type="text" value={groupParticipantSearchQuery} onChange={(e) => setGroupParticipantSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 min-h-[160px]">
                  {isSearchingGroupParticipants ? (
                    <div className="text-center py-4 text-xs text-slate-400">Searching contacts...</div>
                  ) : (groupParticipantSearchQuery.trim() ? groupParticipantSearchResults : contacts).length > 0 ? (
                    (groupParticipantSearchQuery.trim() ? groupParticipantSearchResults : contacts).map((p) => {
                      const selected = groupSelectedParticipants.some((u) => (u._id || u.id) === (p._id || p.id));
                      return (
                        <div key={p._id || p.id} onClick={() => setGroupSelectedParticipants(selected ? (prev) => prev.filter((u) => (u._id || u.id) !== (p._id || p.id)) : (prev) => [...prev, p])} className={`p-2.5 rounded-xl flex items-center justify-between border cursor-pointer transition-all select-none ${selected ? 'bg-[#2563EB]/10 border-[#2563EB]/30' : 'bg-white/[0.01] hover:bg-slate-900 border-white/5 hover:border-white/10'}`}>
                          <div className="flex items-center gap-3">
                            <img src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-200 font-display">{p.name}</h4>
                              <p className="text-[9px] text-slate-500">@{p.username}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${selected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600 bg-transparent'}`}>
                            {selected && <FiCheck size={10} className="stroke-[4]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500 select-none">{groupParticipantSearchQuery ? `No users found matching "${groupParticipantSearchQuery}"` : 'Add contacts manually to select them.'}</div>
                  )}
                </div>
                <button onClick={() => setGroupCreationStep(2)} disabled={groupSelectedParticipants.length === 0} className="w-full shrink-0 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                  Next <FiArrowRight size={14} />
                </button>
              </div>
            )}

            {activeNewChatTab === 'group' && groupCreationStep === 2 && (
              <div className="space-y-4 flex flex-col h-full">
                <div>
                  <h4 className="text-xs font-bold text-white font-display">New Group Details</h4>
                  <p className="text-[9px] text-slate-400">Configure group subject and details.</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center relative select-none">
                    <span className="text-2xl font-bold text-emerald-400 font-display">{groupSubject ? groupSubject.substring(0, 2).toUpperCase() : 'GP'}</span>
                    <div className="absolute bottom-0 right-0 p-1.5 bg-[#2563EB] text-slate-950 rounded-full border border-slate-900">
                      <FiCamera size={12} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Group Subject *</label>
                      <span className="text-[8px] text-slate-500">{groupSubject.length}/25</span>
                    </div>
                    <input type="text" maxLength={25} value={groupSubject} onChange={(e) => setGroupSubject(e.target.value)} placeholder="e.g. Project Alpha 🚀" required className="w-full px-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Group Description (optional)</label>
                    <textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Add what this group is about..." rows={2} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500 resize-none" />
                  </div>
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar max-h-36">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block select-none">Selected Members ({groupSelectedParticipants.length})</label>
                  <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-950/30 rounded-xl border border-white/5">
                    {groupSelectedParticipants.map((p) => (
                      <div key={p._id || p.id} className="flex items-center gap-1.5 bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg text-[9px] font-semibold text-slate-300">
                        <img src={p.avatar} className="w-4 h-4 rounded-full" alt="" />
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2 shrink-0">
                  <button onClick={() => setGroupCreationStep(1)} className="flex-1 py-2 bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer">Back</button>
                  <button onClick={async () => {
                    if (!groupSubject.trim()) { toast.error('Group name is required'); return; }
                    try {
                      const ids = groupSelectedParticipants.map((p) => p._id || p.id);
                      await startGroupChat(groupSubject.trim(), ids);
                      setShowNewChatModal(false);
                    } catch {}
                  }} className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-600 transition-all cursor-pointer">Create Group</button>
                </div>
              </div>
            )}

            {/* Search directory tab */}
            {activeNewChatTab === 'search' && (
              <>
                <p className="text-[10px] text-slate-400">Search registered users by name, username or email to add as contact.</p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={14} /></span>
                  <input type="text" value={directorySearchQuery} onChange={(e) => setDirectorySearchQuery(e.target.value)} placeholder="Type name, username or email..." className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
                  {isSearchingDirectory ? (
                    <div className="text-center py-4 text-xs text-slate-400">Searching user database...</div>
                  ) : directorySearchQuery ? directorySearchResults.length > 0 ? directorySearchResults.map((u) => {
                    const alreadySent = sentRequests.includes(u.username);
                    return (
                      <div key={u._id || u.id} className="p-3 bg-white/[0.01] hover:bg-[#2563EB]/10 border border-white/5 hover:border-[#2563EB]/20 rounded-xl flex items-center justify-between transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-slate-200 font-display">{u.name}</h4>
                            <p className="text-[9px] text-slate-500">@{u.username} • {u.email}</p>
                          </div>
                        </div>
                        <button onClick={() => sendContactRequest(u)} disabled={alreadySent} className={`text-[9px] py-1.5 px-3 font-bold rounded-lg transition-all cursor-pointer ${alreadySent ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-[#2563EB] text-slate-950 hover:opacity-90'}`}>
                          {alreadySent ? 'REQUEST SENT' : 'ADD CONTACT'}
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-4 text-xs text-slate-400">No users found matching &quot;{directorySearchQuery}&quot;</div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500 select-none">Begin typing to lookup directory...</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
