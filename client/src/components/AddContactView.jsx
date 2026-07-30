import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiUserPlus, FiCheck, FiArrowLeft, FiUsers, FiMail, FiAtSign,
  FiPlus, FiArrowRight, FiImage, FiMessageSquare, FiZap, FiShield, FiUserCheck,
  FiFilter, FiBriefcase, FiCalendar, FiShoppingBag, FiGlobe, FiMapPin, FiStar
} from 'react-icons/fi';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'search', label: 'REGISTERED USERS & BUSINESS DIRECTORY' },
  { key: 'group', label: 'CREATE GROUP' },
  { key: 'manual', label: 'ADD MANUALLY' },
];

const FILTER_TYPES = ['ALL', 'PERSONAL', 'BUSINESS', 'ORGANIZATION'];

const AddContactView = () => {
  const navigate = useNavigate();
  const { chats, createContactAndChat, startGroupChat } = useChat();

  // Tab state
  const [activeTab, setActiveTab] = useState('search');

  // --- SEARCH & REGISTERED USERS DIRECTORY ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [connectingUserId, setConnectingUserId] = useState(null);

  // --- ADD MANUALLY ---
  const [manualName, setManualName] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // --- CREATE GROUP ---
  const [groupStep, setGroupStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupContacts, setGroupContacts] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Load contacts for group creation
  useEffect(() => {
    if (activeTab === 'group') {
      (async () => {
        try {
          const res = await axios.get('/api/contacts');
          setGroupContacts(res.data);
        } catch (err) {
          console.warn('Failed to load contacts for group creation', err);
        }
      })();
    }
  }, [activeTab]);

  // Debounced group contact search
  useEffect(() => {
    if (!groupSearchQuery.trim()) { setGroupSearchResults([]); return; }
    const delay = setTimeout(async () => {
      setGroupLoading(true);
      const localMatches = groupContacts.filter(u => {
        const q = groupSearchQuery.toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      });
      try {
        const res = await axios.get(`/api/users/search?q=${groupSearchQuery}`);
        const raw = res.data;
        const apiUsers = Array.isArray(raw) ? raw : (raw.users || []);
        const combined = [...apiUsers];
        localMatches.forEach(lm => { if (!combined.some(u => u.username === lm.username)) combined.push(lm); });
        setGroupSearchResults(combined);
      } catch { setGroupSearchResults(localMatches); }
      finally { setGroupLoading(false); }
    }, 300);
    return () => clearTimeout(delay);
  }, [groupSearchQuery, groupContacts]);

  // Real registered users & business search
  useEffect(() => {
    let isMounted = true;
    const fetchRealUsers = async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (isMounted) {
          const raw = res.data;
          let list = [];
          if (Array.isArray(raw)) {
            list = raw;
          } else if (raw && Array.isArray(raw.users)) {
            list = raw.users;
          }
          setSearchResults(list);
        }
      } catch (err) {
        if (isMounted) setSearchResults([]);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };

    const delay = setTimeout(fetchRealUsers, searchQuery ? 250 : 0);
    return () => { isMounted = false; clearTimeout(delay); };
  }, [searchQuery]);

  const handleAddContact = async (usr) => {
    try {
      await axios.post('/api/contacts/request', { username: usr.username, message: '' });
      setSentRequests(prev => [...prev, usr.username]);
      toast.success(`Contact request sent to ${usr.name || usr.username}`);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg.includes('already in your contacts') || msg.includes('already connected')) {
        toast.error(`${usr.name || usr.username} is already in your contacts`);
      } else if (msg.includes('Request already pending')) {
        toast('Request already sent to ' + (usr.name || usr.username), { icon: '⏳' });
      } else if (!err.response) {
        setSentRequests(prev => [...prev, usr.username]);
        toast.success(`Contact request sent to ${usr.name || usr.username} (offline mode)`);
      } else {
        toast.error(msg || 'Failed to send request');
      }
    }
  };

  const handleConnectChat = async (usr) => {
    setConnectingUserId(usr._id || usr.id || usr.username);
    try {
      await createContactAndChat(usr.name || usr.username, usr.username, usr.email || '', usr.phone || '');
      toast.success(`Connected & opened chat with ${usr.name || usr.username}`);
      resetAll();
      navigate('/chats');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start chat with user');
    } finally {
      setConnectingUserId(null);
    }
  };

  const resetAll = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSentRequests([]);
    setManualName('');
    setManualUsername('');
    setManualEmail('');
    setManualPhone('');
    setGroupStep(1);
    setGroupName('');
    setGroupDesc('');
    setGroupSearchQuery('');
    setGroupSearchResults([]);
    setSelectedParticipants([]);
  };

  // Filtered users
  const filteredUsers = searchResults.filter(u => {
    if (filterType === 'ALL') return true;
    const accType = (u.accountType || 'personal').toUpperCase();
    return accType === filterType;
  });

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative font-sans text-slate-100">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetAll(); navigate('/chats'); }}
            className="p-2 bg-[#2A3942] border border-white/10 rounded-xl text-[#8696A0] hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              Find Users & Business Workshops
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Connect with registered users, view business storefronts, book appointments, or join organizations</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0b0f19] p-1 rounded-xl border border-white/5 w-full">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setGroupStep(1); }}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* ===== SEARCH DIRECTORY & REGISTERED USERS ===== */}
          {activeTab === 'search' && (
            <>
              {/* Search Bar & Type Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={15} /></span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search registered users, businesses, or organizations..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-100 focus:border-blue-500 outline-none placeholder:text-slate-500 transition-colors shadow-inner"
                  />
                </div>

                {/* Account Type Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <FiFilter size={12} /> Filter:
                  </span>
                  {FILTER_TYPES.map(ft => (
                    <button
                      key={ft}
                      onClick={() => setFilterType(ft)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                        filterType === ft
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                      }`}
                    >
                      {ft === 'BUSINESS' ? '💼 BUSINESS' : ft === 'ORGANIZATION' ? '🏛️ ORGANIZATION' : ft === 'PERSONAL' ? '👤 PERSONAL' : '🌐 ALL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Directory List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FiUsers size={14} className="text-blue-400" /> Registered Accounts ({filteredUsers.length})
                  </h3>
                  <span className="text-[10px] text-slate-500">Interactive Business & Booking Options</span>
                </div>

                {searchLoading ? (
                  <div className="flex items-center justify-center py-12 bg-slate-900/40 rounded-2xl border border-white/5">
                    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 ml-3 font-medium">Loading user directory...</span>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUsers.map(usr => {
                      const alreadySent = sentRequests.includes(usr.username);
                      const isConnecting = connectingUserId === (usr._id || usr.id || usr.username);
                      const accType = usr.accountType || 'personal';
                      const isBiz = accType === 'business';
                      const isOrg = accType === 'organization';

                      return (
                        <div
                          key={usr._id || usr.id || usr.username}
                          className={`p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all shadow-sm hover:shadow-lg border ${
                            isBiz
                              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/30 hover:border-emerald-400/60'
                              : isOrg
                              ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border-purple-500/30 hover:border-purple-400/60'
                              : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10 hover:border-blue-500/40'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={usr.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.username}`}
                                alt=""
                                className="w-11 h-11 rounded-full border border-white/10 bg-slate-950 object-cover"
                              />
                              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                usr.online ? 'bg-emerald-400' : 'bg-slate-500'
                              }`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                  {usr.name || usr.username}
                                </h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${
                                  isBiz ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  isOrg ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {isBiz ? <FiBriefcase size={10} /> : isOrg ? <FiShield size={10} /> : null}
                                  {accType}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">@{usr.username}</p>
                              {usr.email && <p className="text-[10px] text-slate-500 truncate">{usr.email}</p>}
                            </div>
                          </div>

                          {/* Dynamic Business / Org Actions Bar */}
                          {isBiz && (
                            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-2">
                              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <FiBriefcase size={11} /> Business Workshop & Storefront
                              </p>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => navigate(`/business/${usr._id || usr.id || 'demo'}`)}
                                  className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[9px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FiShoppingBag size={11} /> STOREFRONT
                                </button>
                                <button
                                  onClick={() => navigate(`/business/${usr._id || usr.id || 'demo'}/book`)}
                                  className="py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[9px] rounded-lg border border-emerald-500/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FiCalendar size={11} /> BOOK SLOT
                                </button>
                              </div>
                            </div>
                          )}

                          {isOrg && (
                            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-2">
                              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <FiShield size={11} /> Organization Workspace
                              </p>
                              <button
                                onClick={() => navigate(`/organization/${usr._id || usr.id || 'demo'}`)}
                                className="w-full py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <FiGlobe size={11} /> VIEW ORG WORKSPACE
                              </button>
                            </div>
                          )}

                          {/* Quick Messaging & Contact Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            {/* Direct Connect / Chat Button */}
                            <button
                              onClick={() => handleConnectChat(usr)}
                              disabled={isConnecting}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <FiMessageSquare size={13} /> {isConnecting ? 'CONNECTING...' : 'CHAT NOW'}
                            </button>

                            {/* Add Contact Button */}
                            <button
                              onClick={() => handleAddContact(usr)}
                              disabled={alreadySent}
                              className={`py-2 px-3 font-bold text-[10px] rounded-xl transition-all border cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                                alreadySent
                                  ? 'bg-slate-800 text-slate-400 border-white/5 cursor-not-allowed'
                                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/10 hover:border-blue-400/40'
                              }`}
                            >
                              <FiUserPlus size={13} />
                              {alreadySent ? 'SENT' : 'ADD'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-400 space-y-2">
                    <FiUsers size={32} className="mx-auto text-slate-500" />
                    <p className="text-xs font-semibold">No registered users or businesses match your criteria.</p>
                    <p className="text-[10px] text-slate-500">Try searching for a different name or clear the query.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== CREATE GROUP ===== */}
          {activeTab === 'group' && groupStep === 1 && (
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white font-display">Add Group Participants</h4>
                <p className="text-[9px] text-slate-400">Select registered users or contacts to join the group. ({selectedParticipants.length} selected)</p>
              </div>

              {selectedParticipants.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 border-y border-white/5 select-none">
                  {selectedParticipants.map(p => (
                    <div key={p._id || p.id} className="flex flex-col items-center relative min-w-[50px] text-center">
                      <img src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`} alt="" className="w-10 h-10 rounded-full border border-blue-500/30 p-0.5 bg-slate-900" />
                      <button onClick={() => setSelectedParticipants(prev => prev.filter(x => (x._id || x.id) !== (p._id || p.id)))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 text-slate-400 hover:text-blue-400 border border-white/10 flex items-center justify-center text-[8px] font-bold cursor-pointer">
                        ✕
                      </button>
                      <span className="text-[8px] text-slate-300 mt-1 truncate w-12 font-medium">{p.name.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={14} /></span>
                <input type="text" value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  placeholder="Search registered users for group..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
              </div>

              <div className="space-y-1.5 max-h-[320px] overflow-y-auto no-scrollbar">
                {groupLoading ? (
                  <div className="text-center py-4 text-xs text-slate-400">Searching directory...</div>
                ) : (groupSearchQuery.trim() ? groupSearchResults : groupContacts).length > 0 ? (
                  (groupSearchQuery.trim() ? groupSearchResults : groupContacts).map(usr => {
                    const isSelected = selectedParticipants.some(p => (p._id || p.id) === (usr._id || usr.id));
                    return (
                      <div key={usr._id || usr.id}
                        onClick={() => {
                          if (isSelected) setSelectedParticipants(prev => prev.filter(p => (p._id || p.id) !== (usr._id || usr.id)));
                          else setSelectedParticipants(prev => [...prev, usr]);
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-between border cursor-pointer transition-all select-none ${
                          isSelected ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/[0.01] hover:bg-slate-900 border-white/5 hover:border-white/10'
                        }`}>
                        <div className="flex items-center gap-3">
                          <img src={usr.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${usr.username}`} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 font-display">{usr.name}</h4>
                            <p className="text-[9px] text-slate-500">@{usr.username}</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-600 bg-transparent'
                        }`}>
                          {isSelected && <FiCheck size={10} className="stroke-[4]" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 select-none">
                    {groupSearchQuery ? `No users found matching "${groupSearchQuery}"` : 'No contacts available. Search directory to add members.'}
                  </div>
                )}
              </div>

              <button onClick={() => setGroupStep(2)} disabled={selectedParticipants.length === 0}
                className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                Next <FiArrowRight size={14} />
              </button>
            </div>
          )}

          {activeTab === 'group' && groupStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white font-display">New Group Details</h4>
                <p className="text-[9px] text-slate-400">Configure group subject and details.</p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center relative select-none">
                  <span className="text-2xl font-bold text-blue-400 font-display">{groupName ? groupName.substring(0, 2).toUpperCase() : 'GP'}</span>
                  <div className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full border border-slate-900">
                    <FiImage size={12} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Group Subject *</label>
                    <span className="text-[8px] text-slate-500">{groupName.length}/25</span>
                  </div>
                  <input type="text" maxLength={25} value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Project Alpha"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Group Description (optional)</label>
                  <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Add what this group is about..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500 resize-none" />
                </div>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block select-none">Selected Members ({selectedParticipants.length})</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-950/30 rounded-xl border border-white/5">
                  {selectedParticipants.map(usr => (
                    <div key={usr._id || usr.id} className="flex items-center gap-1.5 bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg text-[9px] font-semibold text-slate-300">
                      <img src={usr.avatar} className="w-4 h-4 rounded-full" alt="" />
                      <span>{usr.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setGroupStep(1)}
                  className="flex-1 py-2 bg-slate-900 border border-white/5 hover:border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer">
                  Back
                </button>
                <button onClick={async () => {
                  if (!groupName.trim()) { toast.error('Group name is required'); return; }
                  try {
                    const ids = selectedParticipants.map(u => u._id || u.id);
                    await startGroupChat(groupName.trim(), ids);
                    resetAll();
                    navigate('/chats');
                  } catch {}
                }}
                  className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-blue-700 transition-all cursor-pointer">
                  Create Group
                </button>
              </div>
            </div>
          )}

          {/* ===== ADD MANUALLY ===== */}
          {activeTab === 'manual' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!manualUsername.trim()) { toast.error('Username is required'); return; }
                try {
                  await createContactAndChat(manualName, manualUsername, manualEmail, manualPhone);
                  resetAll();
                  navigate('/chats');
                } catch {}
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</label>
                <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Username *</label>
                <input type="text" value={manualUsername} onChange={(e) => setManualUsername(e.target.value)}
                  placeholder="e.g. johndoe" required
                  className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Email Address (optional)</label>
                <input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number (optional)</label>
                <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/20 outline-none placeholder:text-slate-500" />
              </div>
              <button type="submit"
                className="w-full mt-2 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-blue-700 transition-all cursor-pointer">
                ADD CONTACT & START CHAT
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-500">
        Discover Business Workshops, book service appointments, or launch direct chats with any registered user.
      </div>
    </div>
  );
};

export default AddContactView;
