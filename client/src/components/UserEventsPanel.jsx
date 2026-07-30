import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiCalendar, FiPlus, FiEdit3, FiTrash2, FiX, FiClock, FiMapPin, FiUsers,
  FiLink, FiCopy, FiCheck, FiGlobe, FiLock, FiTag, FiAlertCircle, FiInbox,
  FiChevronDown, FiChevronRight, FiArrowLeft, FiSend, FiStar, FiRefreshCw,
  FiDollarSign, FiEye, FiPlusCircle, FiMinusCircle, FiGrid, FiList
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/events';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const STATUS_CONFIG = {
  upcoming:  { label: 'Upcoming',  color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  ongoing:   { label: 'Live Now',  color: 'text-white bg-blue-600 border-blue-500 shadow-md shadow-blue-600/30' },
  completed: { label: 'Completed', color: 'text-slate-500 dark:text-slate-400 bg-slate-900 border-slate-200 dark:border-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500 dark:text-slate-400 bg-slate-900 border-slate-200 dark:border-white/10' }
};

const RSVP_CONFIG = {
  going:     { label: 'Going',     color: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30', icon: '👍' },
  maybe:     { label: 'Maybe',     color: 'bg-slate-900 border border-blue-500/30 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-600/20', icon: '🤔' },
  not_going: { label: 'Not Going', color: 'bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5', icon: '✋' }
};

const EmptyState = ({ icon, message, sub, action, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center select-none">
    <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/20 mb-4">
      {icon || <FiInbox size={28} className="text-blue-500 dark:text-blue-400" />}
    </div>
    <p className="text-sm text-slate-100 font-semibold">{message}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    {action && (
      <button onClick={onAction}
        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30">
        <FiPlus size={13} /> {action}
      </button>
    )}
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = 'text', required }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">{label}</label>}
    <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
      className="w-full px-3 py-2 bg-slate-950 border border-blue-500/20 rounded-xl text-xs text-slate-100 focus:border-blue-400 outline-none placeholder:text-slate-500" />
  </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 bg-slate-950 border border-blue-500/20 rounded-xl text-xs text-slate-100 focus:border-blue-400 outline-none placeholder:text-slate-500 resize-none" />
  </div>
);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};
const formatTime = (t) => t || '—';

const UserEventsPanel = () => {
  const { user } = useAuth();
  const chatContext = useChat?.();
  const socket = chatContext?.socket;

  const { token } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('my'); // 'my' | 'attending' | 'discover' | 'join'
  const [myEvents, setMyEvents] = useState([]);
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [publicEvents, setPublicEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [previewEvent, setPreviewEvent] = useState(null);

  // Form state
  const blankForm = {
    title: '', description: '', date: '', time: '', endTime: '',
    location: 'Online', locationUrl: '', imageUrl: '',
    isPublic: false, capacity: 0, price: 0, currency: 'USD', tags: '', sections: []
  };
  const [form, setForm] = useState(blankForm);
  const [sections, setSections] = useState([{ title: '', content: '' }]);

  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    fetchAll().then(() => {
      if (token) {
        setTab('join');
        setJoinToken(token);
        previewByToken(token);
      }
    });
  }, [token]);

  // Real-time RSVP notification
  useEffect(() => {
    if (!socket) return;
    const handleEventNotif = (data) => {
      toast.success(`🎉 ${data.userName || 'Someone'} responded "${data.rsvpStatus}" to "${data.eventTitle}"`);
      fetchAll();
    };
    socket.on('user_event_notification', handleEventNotif);
    return () => socket.off('user_event_notification', handleEventNotif);
  }, [socket]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [myRes, attendingRes, pubRes] = await Promise.all([
        axios.get(`${API}/my`, { headers: headers() }),
        axios.get(`${API}/attending`, { headers: headers() }),
        axios.get(`${API}/public/upcoming`)
      ]);
      setMyEvents(myRes.data || []);
      setAttendingEvents(attendingRes.data || []);
      setPublicEvents(pubRes.data || []);
    } catch (err) {
      console.warn('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(blankForm);
    setSections([{ title: '', content: '' }]);
    setEditEvent(null);
    setShowForm(false);
  };

  const openEdit = (event) => {
    setEditEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 10) : '',
      time: event.time || '',
      endTime: event.endTime || '',
      location: event.location || 'Online',
      locationUrl: event.locationUrl || '',
      imageUrl: event.imageUrl || '',
      isPublic: event.isPublic || false,
      capacity: event.capacity || 0,
      price: event.price || 0,
      currency: event.currency || 'USD',
      tags: (event.tags || []).join(', '),
      sections: event.sections || []
    });
    setSections(event.sections?.length ? event.sections : [{ title: '', content: '' }]);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        sections: sections.filter(s => s.title || s.content),
        capacity: parseInt(form.capacity) || 0,
        price: parseFloat(form.price) || 0
      };
      if (editEvent) {
        await axios.put(`${API}/${editEvent._id}`, payload, { headers: headers() });
        toast.success('Event updated!');
      } else {
        await axios.post(`${API}`, payload, { headers: headers() });
        toast.success('Event created!');
      }
      resetForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event');
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Delete this event?')) return;
    try {
      await axios.delete(`${API}/${eventId}`, { headers: headers() });
      toast.success('Event deleted');
      if (selectedEvent?._id === eventId) setSelectedEvent(null);
      fetchAll();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const generateInviteLink = async (eventId) => {
    try {
      const res = await axios.post(`${API}/${eventId}/invite-link`, {}, { headers: headers() });
      await fetchAll();
      toast.success('Invite link generated!');
      return res.data.inviteLink;
    } catch (err) {
      toast.error('Failed to generate invite link');
    }
  };

  const copyLink = async (link) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Link copied!');
  };

  const handleRSVP = async (eventId, status) => {
    try {
      const res = await axios.post(`${API}/${eventId}/rsvp`, { status }, { headers: headers() });
      toast.success(`RSVP updated: ${status}`);
      if (socket && res.data.event?.creator) {
        socket.emit('user_event_rsvp', {
          eventCreatorId: res.data.event.creator?._id || res.data.event.creator,
          eventTitle: res.data.event.title,
          rsvpStatus: status,
          userName: user?.name || 'Someone'
        });
      }
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to RSVP');
    }
  };

  const handleJoinByToken = async () => {
    const activeToken = joinToken.trim().replace(/.*\/join\//, '');
    if (!activeToken) return toast.error('Enter an invite link or token');
    setJoining(true);
    try {
      const res = await axios.post(`${API}/join/${activeToken}`, {}, { headers: headers() });
      toast.success(res.data.message || 'Joined event!');
      setJoinToken('');
      setPreviewEvent(null);
      fetchAll();
      setTab('attending');
      navigate('/my-events', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid invite link');
    } finally {
      setJoining(false);
    }
  };

  const previewByToken = async (overrideToken) => {
    const activeToken = (overrideToken || joinToken).trim().replace(/.*\/join\//, '');
    if (!activeToken) return;
    try {
      const res = await axios.get(`${API}/preview/${activeToken}`);
      setPreviewEvent(res.data);
    } catch (err) {
      toast.error('Invalid invite link');
      setPreviewEvent(null);
    }
  };

  const addSection = () => setSections([...sections, { title: '', content: '' }]);
  const removeSection = (i) => setSections(sections.filter((_, idx) => idx !== i));
  const updateSection = (i, field, val) => {
    const next = [...sections];
    next[i] = { ...next[i], [field]: val };
    setSections(next);
  };

  const tabs = [
    { key: 'my',        label: 'My Events',  icon: <FiCalendar size={13} />, count: myEvents.length },
    { key: 'attending', label: 'Attending',  icon: <FiUsers size={13} />,    count: attendingEvents.length },
    { key: 'discover',  label: 'Discover',   icon: <FiGlobe size={13} />,    count: publicEvents.length },
    { key: 'join',      label: 'Join',       icon: <FiLink size={13} /> }
  ];

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Form View
  if (showForm) {
    return (
      <div className="flex-1 h-full bg-slate-950 overflow-y-auto no-scrollbar text-slate-100">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={resetForm} className="p-2 rounded-xl bg-slate-900 border border-blue-500/20 text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-all cursor-pointer">
              <FiArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-100">{editEvent ? 'Edit Event' : 'Create New Event'}</h2>
              <p className="text-[10px] text-slate-400">Fill in the details for your event</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-4 shadow-xl">
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Event Details</p>
              <InputField label="Event Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="My Event Title" required />
              <TextAreaField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this event about?" rows={3} />
              <div className="grid grid-cols-3 gap-3">
                <InputField label="Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                <InputField label="Start Time *" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
                <InputField label="End Time" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-4 shadow-xl">
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Location</p>
              <InputField label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Online / Venue Name" />
              <InputField label="Location URL (optional)" value={form.locationUrl} onChange={e => setForm({ ...form, locationUrl: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>

            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-4 shadow-xl">
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Event Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Capacity (0 = unlimited)" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="0" />
                <InputField label="Price ($)" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
              <InputField label="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="networking, tech, design" />
              <InputField label="Cover Image URL" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-all ${form.isPublic ? 'bg-blue-600' : 'bg-slate-950 border border-slate-200 dark:border-white/20'} relative`}
                  onClick={() => setForm({ ...form, isPublic: !form.isPublic })}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.isPublic ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-xs text-slate-300">
                  {form.isPublic ? <><FiGlobe size={11} className="inline mr-1 text-blue-600 dark:text-blue-400" />Public (discoverable)</> : <><FiLock size={11} className="inline mr-1 text-slate-400" />Private (invite only)</>}
                </span>
              </label>
            </div>

            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Content Sections</p>
                <button type="button" onClick={addSection}
                  className="flex items-center gap-1 text-[9px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white transition-all cursor-pointer font-bold">
                  <FiPlusCircle size={12} /> Add Section
                </button>
              </div>
              {sections.map((section, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-blue-500 dark:text-blue-300 font-bold uppercase">Section {i + 1}</span>
                    {sections.length > 1 && (
                      <button type="button" onClick={() => removeSection(i)} className="text-slate-400 hover:text-slate-100 cursor-pointer">
                        <FiMinusCircle size={13} />
                      </button>
                    )}
                  </div>
                  <input value={section.title} onChange={e => updateSection(i, 'title', e.target.value)}
                    placeholder="Section Title (e.g. Agenda)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-blue-500/20 rounded-lg text-xs text-slate-100 outline-none placeholder:text-slate-500" />
                  <textarea value={section.content} onChange={e => updateSection(i, 'content', e.target.value)}
                    placeholder="Section content..." rows={3}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-blue-500/20 rounded-lg text-xs text-slate-100 outline-none placeholder:text-slate-500 resize-none" />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pb-6">
              <button type="button" onClick={resetForm}
                className="flex-1 py-2.5 bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-605 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer">Cancel</button>
              <button type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30">
                <FiCheck size={13} /> {editEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Selected Detail View
  if (selectedEvent) {
    const ev = selectedEvent;
    const isOwner = ev.creator?._id === currentUserId || ev.creator === currentUserId;
    const myRSVP = ev.rsvps?.find(r => (r.userId?._id || r.userId) === currentUserId);
    const goingCount = ev.rsvps?.filter(r => r.status === 'going').length || 0;
    const maybeCount = ev.rsvps?.filter(r => r.status === 'maybe').length || 0;
    const inviteLink = ev.inviteToken ? `${window.location.origin}/events/join/${ev.inviteToken}` : null;

    return (
      <div className="flex-1 h-full bg-slate-950 overflow-y-auto no-scrollbar text-slate-100">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
          <button onClick={() => setSelectedEvent(null)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-all cursor-pointer">
            <FiArrowLeft size={14} /> Back to Events
          </button>

          {ev.imageUrl ? (
            <img src={ev.imageUrl} alt={ev.title}
              className="w-full h-40 object-cover rounded-2xl border border-blue-500/20" onError={e => e.target.style.display = 'none'} />
          ) : (
            <div className="w-full h-32 rounded-2xl bg-slate-900 border border-blue-500/20 flex items-center justify-center">
              <FiCalendar size={32} className="text-blue-500 dark:text-blue-400" />
            </div>
          )}

          <div className="p-5 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-100">{ev.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[ev.status]?.color || STATUS_CONFIG.upcoming.color}`}>
                    {STATUS_CONFIG[ev.status]?.label || 'UPCOMING'}
                  </span>
                  {ev.isPublic ? (
                    <span className="text-[9px] text-blue-600 dark:text-blue-300 flex items-center gap-1"><FiGlobe size={9} /> Public</span>
                  ) : (
                    <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiLock size={9} /> Private</span>
                  )}
                  {ev.price > 0 && (
                    <span className="text-[9px] text-blue-600 dark:text-blue-300 flex items-center gap-1"><FiDollarSign size={9} /> {ev.price} {ev.currency}</span>
                  )}
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-300 hover:bg-blue-600/20 cursor-pointer transition-all">
                    <FiEdit3 size={13} />
                  </button>
                  <button onClick={() => handleDelete(ev._id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer transition-all">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {ev.description && <p className="text-xs text-slate-200 leading-relaxed">{ev.description}</p>}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FiCalendar size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span>{formatDate(ev.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FiClock size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span>{formatTime(ev.time)}{ev.endTime ? ` — ${formatTime(ev.endTime)}` : ''}</span>
              </div>
              {ev.location && (
                <div className="flex items-center gap-2 text-xs text-slate-300 col-span-2">
                  <FiMapPin size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  <span>{ev.location}</span>
                  {ev.locationUrl && (
                    <a href={ev.locationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">[Join Link]</a>
                  )}
                </div>
              )}
            </div>

            {ev.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ev.tags.map(t => (
                  <span key={t} className="text-[9px] px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full flex items-center gap-1">
                    <FiTag size={8} /> {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!isOwner && ev.status !== 'cancelled' && ev.status !== 'completed' && (
            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl shadow-xl">
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-3">Your RSVP</p>
              <div className="flex gap-2">
                {Object.entries(RSVP_CONFIG).map(([status, cfg]) => (
                  <button key={status} onClick={() => handleRSVP(ev._id, status)}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${cfg.color} ${myRSVP?.status === status ? 'ring-2 ring-blue-600 dark:ring-white' : ''} cursor-pointer`}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl shadow-xl">
            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-3">Attendance</p>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-100">{goingCount}</p>
                <p className="text-[9px] text-blue-600 dark:text-blue-300">Going</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-300">{maybeCount}</p>
                <p className="text-[9px] text-slate-400">Maybe</p>
              </div>
              {ev.capacity > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-400">{ev.capacity}</p>
                  <p className="text-[9px] text-slate-500">Capacity</p>
                </div>
              )}
            </div>
          </div>

          {ev.sections?.filter(s => s.title || s.content).length > 0 && (
            <div className="space-y-3">
              {ev.sections.filter(s => s.title || s.content).map((section, i) => (
                <div key={i} className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl shadow-xl">
                  {section.title && <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">{section.title}</h4>}
                  {section.content && <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{section.content}</p>}
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-3 shadow-xl">
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Invite Link</p>
              {inviteLink ? (
                <div className="flex gap-2">
                  <input value={inviteLink} readOnly
                    className="flex-1 px-3 py-2 bg-slate-950 border border-blue-500/20 rounded-xl text-[10px] text-blue-600 dark:text-blue-200 outline-none truncate font-mono" />
                  <button onClick={() => copyLink(inviteLink)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-blue-600/30">
                    {copiedLink ? <FiCheck size={12} /> : <FiCopy size={12} />}
                  </button>
                </div>
              ) : (
                <button onClick={() => generateInviteLink(ev._id).then(link => link && setSelectedEvent({ ...ev, inviteToken: link.split('/').pop() }))}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                  <FiLink size={13} /> Generate Invite Link
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderEventCard = (event, { showCreator = false } = {}) => {
    const myRsvp = event.rsvps?.find(r => (r.userId?._id || r.userId) === currentUserId);
    const goingCount = event.rsvps?.filter(r => r.status === 'going').length || 0;
    const isOwner = (event.creator?._id || event.creator) === currentUserId;

    return (
      <div key={event._id}
        onClick={() => setSelectedEvent(event)}
        className="p-4 bg-slate-900 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all group space-y-3 shadow-lg hover:shadow-xl">

        <div className="flex gap-3">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-blue-500/20 shrink-0" onError={e => e.target.style.display = 'none'} />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FiCalendar size={20} className="text-blue-500 dark:text-blue-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">{event.title}</h4>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CONFIG[event.status]?.color || STATUS_CONFIG.upcoming.color}`}>
                {STATUS_CONFIG[event.status]?.label || 'UPCOMING'}
              </span>
            </div>
            {showCreator && event.creator && (
              <p className="text-[9px] text-blue-600 dark:text-blue-300/70 mt-0.5">by {event.creator.name || event.creator.username}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-slate-400">
              <span className="text-[9px] flex items-center gap-1"><FiCalendar size={9} className="text-blue-500 dark:text-blue-400" /> {formatDate(event.date)}</span>
              <span className="text-[9px] flex items-center gap-1"><FiClock size={9} className="text-blue-500 dark:text-blue-400" /> {event.time}</span>
              {event.location && <span className="text-[9px] flex items-center gap-1"><FiMapPin size={9} className="text-blue-500 dark:text-blue-400" /> {event.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-blue-500/10 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-blue-600 dark:text-blue-300 flex items-center gap-1"><FiUsers size={9} /> {goingCount} going</span>
            {event.price > 0 && <span className="text-[9px] text-slate-100 font-bold flex items-center gap-1"><FiDollarSign size={9} /> {event.price}</span>}
            {event.isPublic ? (
              <span className="text-[9px] text-blue-600 dark:text-blue-400 flex items-center gap-1"><FiGlobe size={9} /> Public</span>
            ) : (
              <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiLock size={9} /> Private</span>
            )}
          </div>
          {myRsvp && (
            <span className="text-[9px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-md shadow-sm">{RSVP_CONFIG[myRsvp.status]?.icon} {RSVP_CONFIG[myRsvp.status]?.label}</span>
          )}
          {isOwner && !myRsvp && (
            <span className="text-[9px] text-blue-600 dark:text-blue-300 font-bold">Owner</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans relative">
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-100"
        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.06) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="shrink-0 p-4 pb-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2 font-display">
                <FiCalendar size={16} className="text-blue-500 dark:text-blue-400" /> Events
              </h1>
              <p className="text-[10px] text-slate-400">Create, manage and join events</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchAll} className="p-2 rounded-xl bg-slate-900 border border-blue-500/20 text-blue-500 dark:text-blue-300 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-all cursor-pointer">
                <FiRefreshCw size={14} />
              </button>
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/30">
                <FiPlus size={13} /> New Event
              </button>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-blue-500/20 overflow-x-auto no-scrollbar gap-0.5 mb-4">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 ${
                  tab === t.key ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-100 hover:bg-blue-500/10'
                }`}>
                {t.icon} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[8px] px-1.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-blue-900/40 text-blue-600 dark:text-blue-300'}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar z-10">
        <div className="max-w-3xl mx-auto p-4 pt-0">

          {tab === 'my' && (
            <div className="space-y-3">
              {myEvents.length === 0 ? (
                <EmptyState
                  icon={<FiCalendar size={28} className="text-blue-500 dark:text-blue-400" />}
                  message="No events created yet"
                  sub="Create your first event and share it with your network"
                  action="Create Event"
                  onAction={() => { resetForm(); setShowForm(true); }}
                />
              ) : myEvents.map(ev => renderEventCard(ev))}
            </div>
          )}

          {tab === 'attending' && (
            <div className="space-y-3">
              {attendingEvents.length === 0 ? (
                <EmptyState
                  icon={<FiUsers size={28} className="text-blue-500 dark:text-blue-400" />}
                  message="Not attending any events"
                  sub="Join events using an invite link or discover public events"
                  action="Join with Link"
                  onAction={() => setTab('join')}
                />
              ) : attendingEvents.map(ev => renderEventCard(ev, { showCreator: true }))}
            </div>
          )}

          {tab === 'discover' && (
            <div className="space-y-3">
              {publicEvents.length === 0 ? (
                <EmptyState
                  icon={<FiGlobe size={28} className="text-blue-500 dark:text-blue-400" />}
                  message="No public events available"
                  sub="Be the first to create a public event!"
                  action="Create Public Event"
                  onAction={() => { resetForm(); setForm({ ...blankForm, isPublic: true }); setShowForm(true); }}
                />
              ) : publicEvents.map(ev => renderEventCard(ev, { showCreator: true }))}
            </div>
          )}

          {tab === 'join' && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-100 mb-0.5">Join with Invite Link</p>
                    <p className="text-[10px] text-slate-400">Paste an event invite link or token to preview and join</p>
                  </div>
                  {token && (
                    <button onClick={() => { setPreviewEvent(null); setJoinToken(''); navigate('/my-events', { replace: true }); }}
                      className="text-[9px] text-slate-400 hover:text-slate-100 transition-colors bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      Clear Invite
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={joinToken}
                    onChange={e => setJoinToken(e.target.value)}
                    onBlur={() => previewByToken()}
                    placeholder="Paste invite link or token..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-blue-500/20 rounded-xl text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400 font-mono" />
                  <button onClick={() => previewByToken()}
                    className="px-3 py-2 bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer">
                    <FiEye size={13} />
                  </button>
                </div>

                {previewEvent && (
                  <div className="p-4 bg-slate-950 border border-blue-500/30 rounded-xl space-y-3">
                    <div className="flex gap-3">
                      {previewEvent.imageUrl && (
                        <img src={previewEvent.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-blue-500/20 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{previewEvent.title}</h4>
                        <p className="text-[9px] text-blue-600 dark:text-blue-300 mt-0.5">{formatDate(previewEvent.date)} at {previewEvent.time}</p>
                        {previewEvent.location && <p className="text-[9px] text-slate-400 mt-0.5">{previewEvent.location}</p>}
                        {previewEvent.creator && (
                          <p className="text-[9px] text-slate-500 mt-0.5">by {previewEvent.creator.name}</p>
                        )}
                      </div>
                    </div>
                    {previewEvent.description && (
                      <p className="text-[10px] text-slate-400 leading-relaxed">{previewEvent.description}</p>
                    )}
                    <button onClick={handleJoinByToken} disabled={joining}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                      {joining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheck size={13} />}
                      {joining ? 'Joining...' : 'Join This Event'}
                    </button>
                  </div>
                )}

                {!previewEvent && joinToken && (
                  <button onClick={handleJoinByToken} disabled={joining}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                    {joining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiLink size={13} />}
                    {joining ? 'Joining...' : 'Join Event'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserEventsPanel;
