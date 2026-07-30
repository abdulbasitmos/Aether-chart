import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiHome, FiRadio, FiLayers, FiCalendar,
  FiUsers, FiUserPlus, FiSettings, FiPlus, FiX, FiSend,
  FiCheck, FiTrash2, FiChevronRight, FiChevronLeft,
  FiShield, FiInfo, FiClock, FiCheckSquare, FiBarChart2, FiCpu,
  FiMessageSquare, FiInbox, FiActivity
} from 'react-icons/fi';
import OrgTeams from './OrgTeams';
import OrgProjects from './OrgProjects';
import OrgAnalytics from './OrgAnalytics';

const API_BASE = '/api/organizations';
const getToken = () => sessionStorage.getItem('aether_token');
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const roleHierarchy = ['founder', 'super_admin', 'admin', 'manager', 'moderator', 'staff', 'member', 'guest'];

const canAdmin = (role) => ['founder', 'super_admin', 'admin'].includes(role);
const canManage = (role) => ['founder', 'super_admin', 'admin', 'manager', 'moderator'].includes(role);

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const InboxTab = ({ organizationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await axios.get(`${API_BASE}/${organizationId}/inbox`, getAuthHeaders());
        setConversations(res.data);
      } catch (err) {
        toast.error('Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, [organizationId]);

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;

  if (conversations.length === 0) return (
    <div className="p-8 text-center text-sm text-slate-500">
      <FiInbox size={32} className="mx-auto mb-3 text-slate-600" />
      No external conversations yet. When non-members message this organization, they will appear here.
    </div>
  );

  return (
    <div className="space-y-2">
      {conversations.map(conv => {
        const lastMsg = conv.lastMessage;
        const externalParticipants = conv.participants?.filter(p => p?._id) || [];
        const externalUser = externalParticipants[0];
        return (
          <div key={conv._id} className="p-4 rounded-xl bg-[#0f1729] border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/chats/${conv._id}`)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {externalUser?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{conv.name || externalUser?.name || 'Unknown'}</p>
                <p className="text-xs text-slate-500 truncate">{lastMsg?.text || 'No messages yet'}</p>
              </div>
              {lastMsg && <span className="text-[10px] text-slate-600 shrink-0">{new Date(lastMsg.createdAt).toLocaleDateString()}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ORG_ROLES = [
  { value: 'admin',     label: 'Admin',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'manager',  label: 'Manager',   color: 'text-blue-400   bg-blue-500/10   border-blue-500/30'   },
  { value: 'moderator',label: 'Moderator', color: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/30'   },
  { value: 'staff',    label: 'Staff',     color: 'text-slate-300  bg-slate-700/30  border-white/10'       },
  { value: 'member',   label: 'Member',    color: 'text-slate-400  bg-slate-800/40  border-white/5'        },
  { value: 'guest',    label: 'Guest',     color: 'text-slate-500  bg-slate-900/40  border-white/5'        },
];

const OrgRoleBadge = ({ role }) => {
  const r = ORG_ROLES.find(x => x.value === role);
  if (!r) return <span className="text-[8px] text-slate-500 font-bold px-2 py-0.5 rounded-full border border-white/5 bg-slate-800">{role}</span>;
  return <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${r.color}`}>{r.label.toUpperCase()}</span>;
};

const OrganizationWorkspace = ({ organizationId, onBack }) => {
  const [organization, setOrganization] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewingDept, setViewingDept] = useState(null);
  const [loading, setLoading] = useState(true);

  const [joinRequests, setJoinRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);

  // Invite member
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  const [deptAnnTitle, setDeptAnnTitle] = useState('');
  const [deptAnnContent, setDeptAnnContent] = useState('');
  const [deptEventTitle, setDeptEventTitle] = useState('');
  const [deptEventDesc, setDeptEventDesc] = useState('');
  const [deptEventDate, setDeptEventDate] = useState('');
  const [deptEventLocation, setDeptEventLocation] = useState('');

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/workspace`, getAuthHeaders());
      const { organization: org, departments: depts, members: mems, myRole: role } = res.data;
      setOrganization(org);
      setDepartments(depts || []);
      setMembers(mems || []);
      setMyRole(role || 'member');
      setEditName(org?.name || '');
      setEditDesc(org?.description || '');
      setEditEmail(org?.email || '');
      setEditPhone(org?.phone || '');
      setEditWebsite(org?.website || '');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/announcements`, getAuthHeaders());
      setAnnouncements(res.data || []);
    } catch { /* ignore */ }
  }, [organizationId]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/events`, getAuthHeaders());
      setEvents(res.data || []);
    } catch { /* ignore */ }
  }, [organizationId]);

  const fetchJoinRequests = useCallback(async () => {
    if (!canAdmin(myRole)) return;
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/join-requests`, getAuthHeaders());
      setJoinRequests(res.data || []);
    } catch { /* ignore */ }
  }, [organizationId, myRole]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (organization) {
      fetchAnnouncements();
      fetchEvents();
      if (canAdmin(myRole)) fetchJoinRequests();
    }
  }, [organization, myRole, fetchAnnouncements, fetchEvents, fetchJoinRequests]);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    try {
      await axios.post(`${API_BASE}/${organizationId}/announcements`,
        { title: annTitle, content: annContent },
        getAuthHeaders()
      );
      toast.success('Announcement created');
      setAnnTitle('');
      setAnnContent('');
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create announcement');
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      await axios.post(`${API_BASE}/${organizationId}/departments`,
        { name: deptName, description: deptDesc },
        getAuthHeaders()
      );
      toast.success('Department created');
      setDeptName('');
      setDeptDesc('');
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create department');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    try {
      await axios.post(`${API_BASE}/${organizationId}/events`,
        { title: eventTitle, description: eventDesc, date: eventDate, location: eventLocation },
        getAuthHeaders()
      );
      toast.success('Event created');
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      setEventLocation('');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event');
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_BASE}/${organizationId}`,
        { name: editName, description: editDesc, email: editEmail, phone: editPhone, website: editWebsite },
        getAuthHeaders()
      );
      setOrganization(res.data.organization);
      toast.success('Organization updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update organization');
    }
  };

  const handleChangeRole = async (memberId, role) => {
    try {
      await axios.put(`${API_BASE}/${organizationId}/members/${memberId}/role`,
        { role },
        getAuthHeaders()
      );
      toast.success('Role updated');
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await axios.delete(`${API_BASE}/${organizationId}/members/${memberId}`, getAuthHeaders());
      toast.success('Member removed');
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await axios.post(`${API_BASE}/${organizationId}/join-request/${requestId}/approve`, {}, getAuthHeaders());
      toast.success('Join request approved');
      fetchJoinRequests();
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axios.post(`${API_BASE}/${organizationId}/join-request/${requestId}/reject`, {}, getAuthHeaders());
      toast.success('Join request rejected');
      fetchJoinRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleInviteMember = async e => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      await axios.post(`${API_BASE}/${organizationId}/invite`,
        { username: inviteUsername.trim(), role: inviteRole },
        getAuthHeaders()
      );
      toast.success(`Invited @${inviteUsername} as ${inviteRole}`);
      setInviteUsername('');
      setInviteRole('member');
      setShowInvite(false);
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invite failed — user may not exist');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateDeptAnnouncement = async (e) => {
    e.preventDefault();
    if (!deptAnnTitle.trim()) return;
    try {
      await axios.post(`${API_BASE}/${organizationId}/departments/${viewingDept._id}/announcements`,
        { title: deptAnnTitle, content: deptAnnContent },
        getAuthHeaders()
      );
      toast.success('Department announcement created');
      setDeptAnnTitle('');
      setDeptAnnContent('');
      fetchDeptDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create announcement');
    }
  };

  const handleCreateDeptEvent = async (e) => {
    e.preventDefault();
    if (!deptEventTitle.trim()) return;
    try {
      await axios.post(`${API_BASE}/${organizationId}/departments/${viewingDept._id}/events`,
        { title: deptEventTitle, description: deptEventDesc, date: deptEventDate, location: deptEventLocation },
        getAuthHeaders()
      );
      toast.success('Department event created');
      setDeptEventTitle('');
      setDeptEventDesc('');
      setDeptEventDate('');
      setDeptEventLocation('');
      fetchDeptDetail();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event');
    }
  };

  const fetchDeptDetail = async () => {
    if (!viewingDept) return;
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/departments/${viewingDept._id}`, getAuthHeaders());
      setViewingDept(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (viewingDept) fetchDeptDetail();
  }, [viewingDept?._id]);

  const deptMembers = viewingDept
    ? members.filter(m => (m.departments || []).includes(viewingDept._id))
    : [];

  const tabs = [
    { id: 'home', label: 'Home', icon: <FiHome size={12} /> },
    { id: 'hub', label: 'Hub', icon: <FiActivity size={12} /> },
    { id: 'announcements', label: 'Announcements', icon: <FiRadio size={12} /> },
    { id: 'departments', label: 'Departments', icon: <FiLayers size={12} /> },
    { id: 'teams', label: 'Teams', icon: <FiUsers size={12} /> },
    { id: 'projects', label: 'Projects', icon: <FiCheckSquare size={12} /> },
    { id: 'events', label: 'Events', icon: <FiCalendar size={12} /> },
    { id: 'members', label: 'Members', icon: <FiUsers size={12} /> },
    ...(canAdmin(myRole) ? [{ id: 'join-requests', label: 'Join Requests', icon: <FiUserPlus size={12} /> }] : []),
    ...(canAdmin(myRole) ? [{ id: 'inbox', label: 'Inbox', icon: <FiInbox size={12} /> }] : []),
    { id: 'analytics', label: 'Analytics', icon: <FiBarChart2 size={12} /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings size={12} /> },
  ];

  if (loading) {
    return (
      <div className="flex-1 h-full bg-[#080c14] flex items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-[10px] text-slate-500 font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex-1 h-full bg-[#080c14] flex items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <div className="text-center">
          <FiInfo size={28} className="text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Organization not found</p>
          <button onClick={onBack} className="mt-3 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-15 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer">
            <FiArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              {(organization.name || 'O')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white font-display truncate">{organization.name}</h2>
              <p className="text-[9px] text-slate-500 font-medium">{organization.orgType || 'Organization'} • {myRole}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar select-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setViewingDept(null); }}
              className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer text-[10px] ${
                activeTab === tab.id && !viewingDept
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6">
        <AnimatePresence mode="wait">
          {viewingDept ? (
            <motion.div key="dept-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5 max-w-3xl">
              <button onClick={() => setViewingDept(null)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white font-bold transition-all cursor-pointer">
                <FiChevronLeft size={12} /> Back to Departments
              </button>

              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-1">
                <h3 className="text-sm font-bold text-white font-display">{viewingDept.name}</h3>
                <p className="text-[10px] text-slate-400">{viewingDept.description || 'No description'}</p>
                <p className="text-[9px] text-slate-500 pt-1">{deptMembers.length} members</p>
              </div>

              {/* Dept Announcements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Announcements</h4>
                  {canManage(myRole) && (
                    <button onClick={() => document.getElementById('deptAnnForm').classList.toggle('hidden')} className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all">
                      <FiPlus size={10} /> Add
                    </button>
                  )}
                </div>
                <form id="deptAnnForm" onSubmit={handleCreateDeptAnnouncement} className="hidden space-y-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                  <input type="text" value={deptAnnTitle} onChange={e => setDeptAnnTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                  <textarea value={deptAnnContent} onChange={e => setDeptAnnContent(e.target.value)} placeholder="Content..." className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 h-16 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                  <button type="submit" className="py-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[9px] font-bold cursor-pointer transition-all">Create</button>
                </form>
                <div className="space-y-2">
                  {(viewingDept.announcements || []).map((a, i) => (
                    <div key={a._id || i} className="p-3 bg-slate-900/20 border border-white/5 rounded-xl space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                        <span className="text-emerald-400 font-bold uppercase">Bulletin</span>
                        <span>{formatDate(a.createdAt)}</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-200">{a.title}</h5>
                      <p className="text-[10px] text-slate-400">{a.content}</p>
                    </div>
                  ))}
                  {(!viewingDept.announcements || viewingDept.announcements.length === 0) && (
                    <p className="text-[10px] text-slate-600 italic text-center py-4">No department announcements</p>
                  )}
                </div>
              </div>

              {/* Dept Events */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Events</h4>
                  {canManage(myRole) && (
                    <button onClick={() => document.getElementById('deptEventForm').classList.toggle('hidden')} className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all">
                      <FiPlus size={10} /> Add
                    </button>
                  )}
                </div>
                <form id="deptEventForm" onSubmit={handleCreateDeptEvent} className="hidden space-y-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                  <input type="text" value={deptEventTitle} onChange={e => setDeptEventTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                  <textarea value={deptEventDesc} onChange={e => setDeptEventDesc(e.target.value)} placeholder="Description..." className="w-full bg-slate-900 border border-white/5 rounded-lg p-2.5 h-16 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={deptEventDate} onChange={e => setDeptEventDate(e.target.value)} className="bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                    <input type="text" value={deptEventLocation} onChange={e => setDeptEventLocation(e.target.value)} placeholder="Location..." className="bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                  </div>
                  <button type="submit" className="py-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[9px] font-bold cursor-pointer transition-all">Create</button>
                </form>
                <div className="space-y-2">
                  {(viewingDept.events || []).map((ev, i) => (
                    <div key={ev._id || i} className="p-3 bg-slate-900/20 border border-white/5 rounded-xl flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-[8px] font-bold text-center min-w-[36px] leading-tight">
                        {ev.date ? new Date(ev.date).getDate() : '?'}
                        <br />
                        <span className="text-[7px]">{ev.date ? new Date(ev.date).toLocaleString('en', { month: 'short' }) : ''}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-slate-200">{ev.title}</h5>
                        <p className="text-[9px] text-slate-500">{ev.description}</p>
                        {ev.location && <p className="text-[9px] text-slate-600">📍 {ev.location}</p>}
                      </div>
                    </div>
                  ))}
                  {(!viewingDept.events || viewingDept.events.length === 0) && (
                    <p className="text-[10px] text-slate-600 italic text-center py-4">No department events</p>
                  )}
                </div>
              </div>

              {/* Dept Members */}
              <div className="space-y-2">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Members ({deptMembers.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deptMembers.map(m => (
                    <div key={m._id} className="p-3 bg-slate-900/20 border border-white/5 rounded-xl flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-[9px] font-bold text-emerald-400 shrink-0 overflow-hidden">
                        {m.userId?.avatar ? <img src={m.userId.avatar} className="w-full h-full object-cover" /> : (m.userId?.name?.[0] || '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{m.userId?.name || 'Unknown'}</p>
                        <p className="text-[9px] text-slate-500">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {deptMembers.length === 0 && (
                  <p className="text-[10px] text-slate-600 italic text-center py-4">No members in this department</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl space-y-5">

              {/* Home */}
              {activeTab === 'home' && (
                <>
                  {/* Org card */}
                  <div className="p-5 bg-gradient-to-br from-slate-950/60 to-emerald-950/10 border border-emerald-500/10 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg shrink-0">
                        {(organization.name || 'O')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white font-display">{organization.name}</h3>
                        <p className="text-[10px] text-emerald-400/70 font-medium">{organization.orgType || 'Organization'} · <span className="capitalize text-emerald-300">{myRole}</span></p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{organization.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      {organization.email && <span className="text-[9px] text-slate-500 flex items-center gap-1">✉ {organization.email}</span>}
                      {organization.phone && <span className="text-[9px] text-slate-500">📞 {organization.phone}</span>}
                      {organization.website && <a href={organization.website} target="_blank" rel="noreferrer" className="text-[9px] text-emerald-400/70 hover:text-emerald-300 transition-colors">🌐 {organization.website}</a>}
                    </div>
                  </div>

                  {/* Stat grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Members',      value: members.length,               icon: '👥', color: 'text-emerald-400' },
                      { label: 'Departments',  value: departments.length,            icon: '🏗️', color: 'text-blue-400'    },
                      { label: 'Events',       value: events.length,                icon: '📅', color: 'text-amber-400'   },
                      { label: 'Announcements',value: announcements.length,         icon: '📢', color: 'text-purple-400'  },
                    ].map(s => (
                      <div key={s.label} className="p-4 bg-slate-900/30 border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all">
                        <span className="text-xl">{s.icon}</span>
                        <p className={`text-lg font-black font-display mt-1 ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] text-slate-500 font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent members */}
                  {members.length > 0 && (
                    <div className="p-4 bg-slate-900/20 border border-white/5 rounded-xl">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <FiUsers size={11} className="text-emerald-400" /> Recent Members
                      </h4>
                      <div className="flex -space-x-2">
                        {members.slice(0, 8).map((m, i) => (
                          <div key={m._id || i}
                            title={m.userId?.name || 'Member'}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 border-2 border-slate-950 flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden cursor-default">
                            {m.userId?.avatar ? <img src={m.userId.avatar} alt="" className="w-full h-full object-cover" /> : (m.userId?.name?.[0]?.toUpperCase() || '?')}
                          </div>
                        ))}
                        {members.length > 8 && (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-400">+{members.length - 8}</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Announcements */}
              {activeTab === 'announcements' && (
                <>
                  {canManage(myRole) && (
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                      <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiRadio size={12} /> Create Announcement</h4>
                      <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                        <input type="text" required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                        <textarea required value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Content..." className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                        <button type="submit" className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-lg shadow-emerald-500/10">Publish</button>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {announcements.length > 0 ? announcements.map((a, i) => (
                      <div key={a._id || i} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                          <span className="text-emerald-400 font-bold uppercase">Announcement</span>
                          <span className="flex items-center gap-1"><FiClock size={10} /> {formatDate(a.createdAt)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 font-display">{a.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{a.content}</p>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No announcements yet.</div>
                    )}
                  </div>
                </>
              )}

              {/* Departments */}
              {activeTab === 'departments' && (
                <>
                  {canAdmin(myRole) && (
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                      <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiPlus size={12} /> Create Department</h4>
                      <form onSubmit={handleCreateDepartment} className="space-y-3">
                        <input type="text" required value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="Department name..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                        <textarea value={deptDesc} onChange={e => setDeptDesc(e.target.value)} placeholder="Description..." className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 h-16 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                        <button type="submit" className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-lg shadow-emerald-500/10">Create</button>
                      </form>
                    </div>
                  )}

                  <div className="space-y-2">
                    {departments.map(d => {
                      const deptMemberCount = members.filter(m => (m.departments || []).includes(d._id)).length;
                      return (
                        <div key={d._id} onClick={() => setViewingDept(d)} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-all group">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 font-display">{d.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{d.description || 'No description'} • {deptMemberCount} members</p>
                          </div>
                          <FiChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-all" />
                        </div>
                      );
                    })}
                    {departments.length === 0 && (
                      <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No departments created yet.</div>
                    )}
                  </div>
                </>
              )}

              {/* Events */}
              {activeTab === 'events' && (
                <>
                  {canManage(myRole) && (
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                      <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiCalendar size={12} /> Create Event</h4>
                      <form onSubmit={handleCreateEvent} className="space-y-3">
                        <input type="text" required value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title..." className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                        <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Description..." className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 h-16 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                          <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Location..." className="bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                        </div>
                        <button type="submit" className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-lg shadow-emerald-500/10">Create Event</button>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {events.length > 0 ? events.map((ev, i) => (
                      <div key={ev._id || i} className="p-4 bg-slate-900/30 border border-white/5 rounded-xl flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl flex flex-col items-center justify-center min-w-[44px] select-none">
                          <span className="text-[8px] font-bold uppercase">{ev.date ? new Date(ev.date).toLocaleString('en', { month: 'short' }) : 'N/A'}</span>
                          <span className="text-xs font-bold font-display leading-none mt-0.5">{ev.date ? new Date(ev.date).getDate() : '?'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-200">{ev.title}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">{ev.description}</p>
                          {ev.location && <p className="text-[9px] text-slate-600 mt-0.5">📍 {ev.location}</p>}
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No upcoming events.</div>
                    )}
                  </div>
                </>
              )}

              {/* Teams */}
              {activeTab === 'teams' && (
                <OrgTeams organizationId={organizationId} canManage={canManage(myRole)} departments={departments} />
              )}

              {/* Projects */}
              {activeTab === 'projects' && (
                <OrgProjects organizationId={organizationId} canManage={canManage(myRole)} />
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <OrgAnalytics organizationId={organizationId} />
              )}

              {/* Members */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {/* Invite toolbar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{members.length} Member{members.length !== 1 ? 's' : ''}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Manage organization members and roles</p>
                    </div>
                    {canAdmin(myRole) && (
                      <button onClick={() => setShowInvite(v => !v)}
                        className="flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
                        <FiUserPlus size={12} /> INVITE
                      </button>
                    )}
                  </div>

                  {/* Invite form */}
                  {showInvite && canAdmin(myRole) && (
                    <form onSubmit={handleInviteMember} className="p-4 bg-slate-950/60 border border-emerald-500/20 rounded-2xl space-y-3">
                      <h5 className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                        <FiUserPlus size={11} /> Invite Member
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Username</label>
                          <input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="@username" required
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:border-emerald-500/40 outline-none placeholder:text-slate-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Role</label>
                          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
                            {ORG_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={inviting}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                          {inviting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={12} />}
                          {inviting ? 'Sending…' : 'SEND INVITE'}
                        </button>
                        <button type="button" onClick={() => setShowInvite(false)}
                          className="px-4 py-2 bg-slate-900 border border-white/10 text-slate-300 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                      </div>
                    </form>
                  )}

                  {/* Members list */}
                  <div className="space-y-2">
                    {members.length > 0 ? members.map(m => (
                      <div key={m._id} className="p-3 bg-slate-900/30 border border-white/5 hover:border-white/10 rounded-xl flex items-center gap-3 transition-all group">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0 overflow-hidden">
                          {m.userId?.avatar ? <img src={m.userId.avatar} alt="" className="w-full h-full object-cover" /> : (m.userId?.name?.[0]?.toUpperCase() || '?')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-200 truncate">{m.userId?.name || 'Unknown'}</p>
                          <p className="text-[9px] text-slate-500">@{m.userId?.username || 'unknown'}</p>
                        </div>
                        {m.role === 'founder'
                          ? <span className="text-[8px] font-bold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/30">FOUNDER</span>
                          : <OrgRoleBadge role={m.role} />
                        }
                        {canAdmin(myRole) && m.role !== 'founder' && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <select value={m.role} onChange={e => handleChangeRole(m._id, e.target.value)}
                              className="bg-slate-900 border border-white/5 rounded-lg py-1 px-1.5 text-[9px] text-slate-300 outline-none cursor-pointer">
                              {ORG_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <button onClick={() => handleRemoveMember(m._id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all cursor-pointer">
                              <FiTrash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        <FiUsers size={28} className="mx-auto mb-2 text-slate-700" />
                        No members yet. Invite people to join this organization.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Join Requests */}
              {activeTab === 'join-requests' && canAdmin(myRole) && (
                <div className="space-y-3">
                  {joinRequests.length > 0 ? joinRequests.map(r => (
                    <div key={r._id} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0 overflow-hidden">
                        {r.applicantId?.avatar ? <img src={r.applicantId.avatar} className="w-full h-full object-cover" /> : (r.applicantId?.name?.[0] || '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-200">{r.applicantId?.name || 'Unknown'}</p>
                        <p className="text-[9px] text-slate-500">@{r.applicantId?.username || 'unknown'}{r.message ? ` • "${r.message}"` : ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRequest(r._id)} className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all">
                          <FiCheck size={10} /> Approve
                        </button>
                        <button onClick={() => handleRejectRequest(r._id)} className="py-1 px-2.5 bg-slate-900 hover:bg-rose-500/10 border border-white/5 text-slate-300 hover:text-rose-400 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all">
                          <FiX size={10} /> Reject
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No pending join requests.</div>
                  )}
                </div>
              )}

              {/* Settings */}
              {activeTab === 'settings' && canAdmin(myRole) && (
                <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl">
                  <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5"><FiSettings size={12} /> Edit Organization Profile</h4>
                  <form onSubmit={handleUpdateOrganization} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Name</label>
                      <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Email</label>
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Phone</label>
                        <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Website</label>
                      <input type="text" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
                    </div>
                    <button type="submit" className="py-2 px-5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-emerald-500/10">Save Changes</button>
                  </form>
                </div>
              )}

              {/* Hub Panel */}
              {activeTab === 'hub' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                      <p className="text-xs text-slate-400 font-medium">{members.length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Members</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                      <p className="text-xs text-slate-400 font-medium">{(organization?.events || []).length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Events</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                      <p className="text-xs text-slate-400 font-medium">{(organization?.announcements || []).length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Announcements</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                    <h4 className="text-xs font-bold text-white font-display flex items-center gap-2 mb-3"><FiActivity size={13} className="text-blue-400" /> Recent Activity</h4>
                    {(announcements.length > 0 ? announcements.slice(0, 3) : []).length > 0 ? (
                      <div className="space-y-2">
                        {announcements.slice(0, 3).map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <FiRadio size={11} className="text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-slate-200">{a.title}</p>
                              <p className="text-[10px] text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No recent activity. Create an announcement or event to get started.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                    <h4 className="text-xs font-bold text-white font-display flex items-center gap-2 mb-3"><FiCalendar size={13} className="text-blue-400" /> Upcoming Events</h4>
                    {(events || []).filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3).length > 0 ? (
                      <div className="space-y-2">
                        {(events || []).filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3).map((e, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <FiCalendar size={11} className="text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-slate-200">{e.title}</p>
                              <p className="text-[10px] text-slate-500">{new Date(e.date).toLocaleDateString()}{e.location ? ` · ${e.location}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No upcoming events.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Inbox Panel (admin+) */}
              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  <InboxTab organizationId={organizationId} />
                </div>
              )}

              {['teams', 'projects'].includes(activeTab) && !canManage(myRole) && (
                <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">You don't have permission to manage this section.</div>
              )}

              {activeTab === 'settings' && !canAdmin(myRole) && (
                <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">You don't have permission to edit organization settings.</div>
              )}

              {activeTab === 'join-requests' && !canAdmin(myRole) && (
                <div className="p-8 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">Only admins can view join requests.</div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrganizationWorkspace;
