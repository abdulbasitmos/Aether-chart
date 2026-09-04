import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useChat, resolveMediaUrl } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import {
  FiX, FiInfo, FiLayers, FiSearch, FiSliders, FiTrash2,
  FiFileText, FiLink, FiImage, FiCompass, FiShield, FiAlertTriangle,
  FiGlobe, FiCheck, FiHeart, FiCpu, FiStar, FiEdit, FiUserPlus,
  FiUserMinus, FiLogOut, FiBriefcase, FiCalendar, FiShoppingBag, FiVideo
} from 'react-icons/fi';
import { getAvatarSvg } from '../data/mockData';
import { filterMessages, hasLink, SEARCH_CATEGORIES, senderIdOf } from '../utils/messageSearch';
import toast from 'react-hot-toast';

const InfoPanel = () => {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { 
    selectedChat, 
    setIsRightPanelOpen, 
    rightPanelTab, 
    setRightPanelTab,
    sendMessage,
    setChatDisappearing,
    updateGroupSettings,
    addGroupMembers,
    leaveGroup,
    removeGroupMember,
    promoteGroupAdmin,
    demoteGroupAdmin,
    deleteChat
  } = useChat();

  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  // Advanced search-tab filters
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchStarred, setSearchStarred] = useState(false);
  const [searchSender, setSearchSender] = useState('all');
  // Media-tab sub-filter + search
  const [mediaFilter, setMediaFilter] = useState('photos');
  const [mediaSearch, setMediaSearch] = useState('');

  // Group settings & management states
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [contactsList, setContactsList] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  if (!selectedChat) return null;

  const targetUser = selectedChat.type === 'group' ? null : selectedChat.user;
  const targetGroup = selectedChat.type === 'group' ? selectedChat.group : null;
  
  const displayName = targetUser ? targetUser.name : targetGroup ? targetGroup.name : 'Aether Chat';
  const displayAvatar = targetUser ? targetUser.avatar : targetGroup ? targetGroup.avatar : '';
  const displayBio = targetUser ? targetUser.bio : targetGroup ? targetGroup.description : 'Unified Chat Space';

  const isCreator = selectedChat.creator === me?._id || 
                    selectedChat.creator?._id === me?._id || 
                    selectedChat.creator === me?.id || 
                    selectedChat.creator?._id === me?.id;

  const isAdmin = selectedChat.admins?.includes(me?._id) || 
                  selectedChat.admins?.includes(me?.id) || 
                  isCreator;

  const handleToggleAdmin = async (memberId, currentIsAdmin) => {
    try {
      if (currentIsAdmin) {
        if (window.confirm('Are you sure you want to demote this admin back to a regular member?')) {
          await demoteGroupAdmin(selectedChat.id, memberId);
        }
      } else {
        if (window.confirm('Are you sure you want to promote this member to group admin?')) {
          await promoteGroupAdmin(selectedChat.id, memberId);
        }
      }
    } catch (err) {}
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      await updateGroupSettings(selectedChat.id, { name: tempName });
      setIsEditingName(false);
    } catch (err) {}
  };

  const handleSaveDesc = async () => {
    try {
      await updateGroupSettings(selectedChat.id, { description: tempDesc });
      setIsEditingDesc(false);
    } catch (err) {}
  };

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await axios.get('/api/contacts');
      setContactsList(response.data || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSearchContacts = async (query) => {
    setSearchMemberQuery(query);
    if (!query.trim()) {
      loadContacts();
      return;
    }
    try {
      const response = await axios.get(`/api/users/search?q=${query}`);
      setContactsList(response.data || []);
    } catch (err) {
      console.error('Failed to search directory users:', err);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      try {
        await removeGroupMember(selectedChat.id, memberId);
      } catch (err) {}
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await leaveGroup(selectedChat.id);
        setIsRightPanelOpen(false);
      } catch (err) {}
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group for everyone? This action is permanent.')) {
      try {
        await deleteChat(selectedChat.id);
        setIsRightPanelOpen(false);
        toast.success('Group deleted successfully');
      } catch (err) {}
    }
  };

  // AI assistant helpers
  const handleAiAction = (actionType) => {
    setAiThinking(true);
    setAiOutput('');

    setTimeout(() => {
      setAiThinking(false);
      if (actionType === 'summarize') {
        setAiOutput(`📝 **Chat Summary:**\n\n1. Active discussion on FIGMA dark mode designs.\n2. Suggested blur parameter set to 16px.\n3. Design guidelines document shared (4.2 MB).\n4. Voted on primary display typography (Outfit is current choice).`);
      } else if (actionType === 'translate') {
        setAiOutput(`🌐 **Translations (Spanish & Japanese):**\n\n- *"Hey! Have you reviewed the prototype designs?"*\n  → ¿Hola! ¿Has revisado los diseños del prototipo?\n  → ねえ！プロトタイプのデザインを確認しましたか？`);
      } else if (actionType === 'polish') {
        setAiOutput(`✍️ **Polished Tone:**\n\n"Hello Alex, I have completed the review of the prototype specifications. The glassmorphism layers are excellent; let's implement a 16px blur radius to optimize typography contrast."`);
      } else if (actionType === 'suggest') {
        setAiOutput(`💡 **Suggested Replies & Emojis:**\n\n- "Absolutely! Let's lock that in. 👍🔥"\n- "Agreed, the Outfit typography looks amazing. 🎨✨"\n- "I will check the PDF guidelines right now. 📑🤖"`);
      }
    }, 1200);
  };

  const handleCustomAiPrompt = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiThinking(true);
    setAiOutput('');

    setTimeout(() => {
      setAiThinking(false);
      setAiOutput(`🤖 *Response to:* "${aiInput}"\n\nHere is a draft response for your chat:\n\n"Thanks for the details. The visual consistency is excellent. Let's merge these updates into the main branch tonight."`);
      setAiInput('');
    }, 1500);
  };

  // Chat message searching
  const currentMembersIds = targetGroup ? targetGroup.members?.map(m => m.id || m._id) || [] : [];
  const addableContacts = contactsList.filter(c => !currentMembersIds.includes(c._id) && !currentMembersIds.includes(c.id));

  // Advanced in-chat search: query + category chips + starred + sender.
  const searchResults = useMemo(() => filterMessages(selectedChat.messages || [], {
    query: localSearch.trim(),
    category: searchCategory,
    starred: searchStarred,
    senderId: searchSender !== 'all' ? searchSender : null,
  }), [selectedChat.messages, localSearch, searchCategory, searchStarred, searchSender]);

  // Distinct senders present in this chat (for the group sender dropdown).
  const chatSenders = useMemo(() => {
    if (selectedChat.type !== 'group') return [];
    const seen = new Map();
    (targetGroup?.members || []).forEach((m) => {
      const id = m.id || m._id;
      if (id) seen.set(id.toString(), m.name || 'Member');
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [selectedChat.type, targetGroup]);

  // Real shared media derived from the loaded messages (replaces mock data).
  const mediaBuckets = useMemo(() => {
    const msgs = (selectedChat.messages || []).filter((m) => !m.isDateDivider);
    return {
      photos: msgs.filter((m) => ['image', 'gif', 'sticker'].includes(m.type)),
      videos: msgs.filter((m) => m.type === 'video'),
      docs: msgs.filter((m) => m.type === 'document'),
      links: msgs.filter((m) => m.type === 'text' && hasLink(m.text)),
    };
  }, [selectedChat.messages]);

  const mediaQ = mediaSearch.trim().toLowerCase();
  const currentMedia = (mediaBuckets[mediaFilter] || []).filter((m) =>
    !mediaQ ||
    (m.fileName && m.fileName.toLowerCase().includes(mediaQ)) ||
    (m.caption && m.caption.toLowerCase().includes(mediaQ)) ||
    (m.text && m.text.toLowerCase().includes(mediaQ))
  );

  // Scroll to + flash a message in the main chat window by id.
  const scrollToMessage = (msg) => {
    const msgId = msg.id || msg._id;
    const el = document.getElementById(msgId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'shadow-[0_0_15px_rgba(16,185,129,0.2)]');
      setTimeout(() => {
        el.classList.remove('bg-emerald-500/20', 'border-emerald-500/40', 'shadow-[0_0_15px_rgba(16,185,129,0.2)]');
      }, 3000);
    } else {
      toast.error('Message not loaded in active viewport scroll limit');
    }
  };

  return (
    <div className="w-full md:w-80 h-full border-l border-white/5 bg-slate-950 flex flex-col justify-between overflow-hidden">
      
      {/* Header Tabs Navigation */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'info', icon: <FiInfo size={14} />, label: 'Details' },
            { id: 'ai', icon: <FiCpu size={14} />, label: 'AI' },
            { id: 'star', icon: <FiStar size={14} />, label: 'Starred' },
            { id: 'media', icon: <FiLayers size={14} />, label: 'Media' },
            { id: 'search', icon: <FiSearch size={14} />, label: 'Search' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                rightPanelTab === tab.id 
                  ? 'bg-slate-900 border border-white/5 text-emerald-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsRightPanelOpen(false)}
          className="w-7 h-7 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform"
        >
          <FiX size={14} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        
        {/* TABS 1: INFO VIEW */}
        {rightPanelTab === 'info' && (
          <div className="p-6 space-y-6">
            {/* Visual Cover Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-full h-24 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900 mb-6 border border-white/5 overflow-hidden">
                <div className="absolute inset-0 bg-slate-950/20" />
              </div>
              <img 
                src={displayAvatar || getAvatarSvg(displayName || 'G', '10b981', 'ffffff')} 
                alt="" 
                className="w-20 h-20 rounded-full border border-white/5 -mt-16 relative z-10 shadow-2xl bg-slate-900" 
              />
              
              {targetGroup ? (
                isEditingName ? (
                  <div className="flex items-center gap-1.5 mt-4 w-full">
                    <input 
                      type="text" 
                      value={tempName} 
                      onChange={(e) => setTempName(e.target.value)}
                      maxLength={25}
                      className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500/25 outline-none font-display font-semibold" 
                    />
                    <button 
                      onClick={handleSaveName}
                      className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 shrink-0"
                    >
                      <FiCheck size={14} />
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)}
                      className="w-7 h-7 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 mt-4 group/name w-full">
                    <h3 className="text-lg font-bold font-display text-white truncate max-w-[80%]">{displayName}</h3>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setTempName(displayName);
                          setIsEditingName(true);
                        }}
                        className="text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Edit Subject"
                      >
                        <FiEdit size={12} />
                      </button>
                    )}
                  </div>
                )
              ) : (
                <h3 className="text-lg font-bold font-display text-white mt-4">{displayName}</h3>
              )}

              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                {targetUser ? `@${targetUser.username}` : targetGroup ? `${targetGroup.members?.length || 0} members` : 'System bot'}
              </p>
            </div>

            {/* Description Card */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl group/desc">
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">About / Description</h4>
                {targetGroup && isAdmin && !isEditingDesc && (
                  <button 
                    onClick={() => {
                      setTempDesc(displayBio);
                      setIsEditingDesc(true);
                    }}
                    className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                    title="Edit Description"
                  >
                    <FiEdit size={12} />
                  </button>
                )}
              </div>
              
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea 
                    value={tempDesc} 
                    onChange={(e) => setTempDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500/25 outline-none font-sans" 
                  />
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={() => setIsEditingDesc(false)}
                      className="py-1 px-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveDesc}
                      className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{displayBio || 'No description set.'}</p>
              )}
            </div>

            {/* Business & Organization Workshop Card */}
            {targetUser && (
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/25 rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                    <FiBriefcase size={13} /> Business & Services Hub
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase border border-emerald-500/30">
                    {targetUser.accountType || 'Business'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Explore storefront products, service packages, operating hours, or book an appointment.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/business/${targetUser._id || targetUser.id || 'demo'}`)}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiShoppingBag size={13} /> Store Products
                  </button>
                  <button
                    onClick={() => navigate(`/business/${targetUser._id || targetUser.id || 'demo'}/book`)}
                    className="py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FiCalendar size={13} /> Book Slot
                  </button>
                </div>
              </div>
            )}

            {/* Group Settings Card (Admins Only) */}
            {targetGroup && isAdmin && (
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                <h4 className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Group Settings</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-200 font-semibold">Send messages</p>
                    <p className="text-[10px] text-slate-500">Only group admins can send messages</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const targetVal = !targetGroup.onlyAdminsCanMessage;
                        await updateGroupSettings(selectedChat.id, { onlyAdminsCanMessage: targetVal });
                      } catch (err) {}
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer outline-none relative ${
                      targetGroup.onlyAdminsCanMessage ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow-md transform duration-300 ${
                      targetGroup.onlyAdminsCanMessage ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Group Members Section */}
            {targetGroup && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Group Members ({targetGroup.members?.length || 0})</h4>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        loadContacts();
                        setShowAddMemberModal(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                    >
                      <FiUserPlus size={13} /> Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {targetGroup.members?.map(member => {
                    const isMemberCreator = selectedChat.creator === member.id || selectedChat.creator?._id === member.id || selectedChat.creator === member._id || selectedChat.creator?._id === member._id;
                    const isMemberAdmin = selectedChat.admins?.includes(member.id) || selectedChat.admins?.includes(member._id) || isMemberCreator;
                    return (
                      <div key={member.id} className="flex items-center justify-between group/member">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={member.avatar || getAvatarSvg(member.name || 'U')} 
                            alt="" 
                            className="w-7 h-7 rounded-full border border-white/5 bg-slate-900" 
                          />
                          <div className="max-w-[140px]">
                            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 truncate">
                              {member.name}
                              {isMemberCreator ? (
                                <span className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1 py-0.5 rounded shrink-0">
                                  Owner
                                </span>
                              ) : isMemberAdmin ? (
                                <span className="text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1 py-0.5 rounded shrink-0">
                                  Admin
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate">@{member.username}</p>
                          </div>
                        </div>

                        {/* Allow Creator to promote/demote or kick; co-admins can kick regular members */}
                        {isCreator && !isMemberCreator ? (
                          <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleToggleAdmin(member.id, isMemberAdmin)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                isMemberAdmin 
                                  ? 'hover:bg-amber-500/10 text-amber-500' 
                                  : 'hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'
                              }`}
                              title={isMemberAdmin ? "Demote Admin" : "Promote to Admin"}
                            >
                              <FiShield size={12} />
                            </button>
                            <button 
                              onClick={() => handleRemoveMember(member.id)}
                              className="w-6 h-6 rounded-md hover:bg-rose-500/10 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove from group"
                            >
                              <FiUserMinus size={12} />
                            </button>
                          </div>
                        ) : (isAdmin && !isMemberCreator && !isMemberAdmin) ? (
                          <button 
                            onClick={() => handleRemoveMember(member.id)}
                            className="w-6 h-6 rounded-md hover:bg-rose-500/10 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover/member:opacity-100 cursor-pointer"
                            title="Remove from group"
                          >
                            <FiUserMinus size={12} />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Credentials / Details (only for Direct Chats) */}
            {targetUser && (
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-400"><FiGlobe size={14} /></div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase">Email Address</p>
                    <p className="text-xs text-slate-300 font-medium">{targetUser.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-400"><FiShield size={14} /></div>
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase">Phone Identity</p>
                    <p className="text-xs text-slate-300 font-medium">{targetUser.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings toggles */}
            <div className="border-t border-white/5 pt-4 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold uppercase mb-2">Disappearing Messages</label>
                <select 
                  value={selectedChat.disappearing || 'off'}
                  onChange={(e) => {
                    setChatDisappearing(selectedChat.id, e.target.value);
                    if (e.target.value === 'off') {
                      toast.success('Disappearing messages turned off');
                    } else {
                      toast.success(`New messages will disappear after ${e.target.value}`, { icon: '⏳' });
                    }
                  }}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none"
                >
                  <option value="off">Off (Default)</option>
                  <option value="10s">10 Seconds</option>
                  <option value="30s">30 Seconds</option>
                  <option value="60s">1 Minute</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                </select>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <h5 className="text-xs font-semibold text-slate-300">Lock Chat Session</h5>
                  <p className="text-[9px] text-slate-500">Requires Face ID or security PIN to unlock</p>
                </div>
                <input 
                  type="checkbox" 
                  onChange={(e) => toast.success(e.target.checked ? 'Chat session locked.' : 'Chat session unlocked.')}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0" 
                />
              </div>
            </div>

            {/* Critical actions list */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              {targetGroup ? (
                <>
                  <button 
                    onClick={handleLeaveGroup}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <FiLogOut size={14} /> Leave Group
                  </button>
                  {isCreator && (
                    <button 
                      onClick={handleDeleteGroup}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <FiTrash2 size={14} /> Delete Group
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button 
                    onClick={() => toast.error('User reported successfully.')}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <FiAlertTriangle size={14} /> Report User
                  </button>
                  <button 
                    onClick={() => {
                      deleteChat(selectedChat.id);
                      setIsRightPanelOpen(false);
                      toast.success('Conversation history deleted.');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <FiTrash2 size={14} /> Delete Chat History
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TABS 2: AI CO-PILOT ASSISTANT */}
        {rightPanelTab === 'ai' && (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-gradient-to-tr from-emerald-500/10 via-indigo-500/5 to-transparent border border-emerald-500/20 rounded-2xl">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
                <FiCpu size={14} className="text-emerald-400 animate-pulse" /> Aether AI Copilot
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Utilize integrated AI features directly inside this session to draft responses, translate, or audit files.
              </p>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="space-y-2.5">
              <h5 className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Quick Actions</h5>
              
              <button 
                onClick={() => handleAiAction('summarize')}
                className="w-full text-left py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-medium flex items-center justify-between cursor-pointer transition-colors group"
              >
                <span>Summarize current conversation</span>
                <FiCpu size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button 
                onClick={() => handleAiAction('translate')}
                className="w-full text-left py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-medium flex items-center justify-between cursor-pointer transition-colors group"
              >
                <span>Translate messages (Multilingual)</span>
                <FiCpu size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button 
                onClick={() => handleAiAction('polish')}
                className="w-full text-left py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-medium flex items-center justify-between cursor-pointer transition-colors group"
              >
                <span>Polish last message draft</span>
                <FiCpu size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button 
                onClick={() => handleAiAction('suggest')}
                className="w-full text-left py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs text-slate-300 font-medium flex items-center justify-between cursor-pointer transition-colors group"
              >
                <span>Suggest replies & tone adjustments</span>
                <FiCpu size={12} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            {/* Custom Query Input */}
            <form onSubmit={handleCustomAiPrompt} className="space-y-2">
              <label className="block text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Custom prompt instruction</label>
              <div className="relative">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask me to rewrite or translate..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                />
                <button 
                  type="submit"
                  className="absolute inset-y-1 right-1 px-3 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[10px] active:scale-95 cursor-pointer"
                >
                  Ask
                </button>
              </div>
            </form>

            {/* Output screen */}
            {(aiThinking || aiOutput) && (
              <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl space-y-2 max-h-56 overflow-y-auto">
                <div className="flex justify-between items-center text-[10px] text-slate-500 select-none">
                  <span>Assistant Output</span>
                  {aiThinking && <span className="text-emerald-400 animate-pulse">Neural thinking...</span>}
                </div>
                
                {aiOutput && (
                  <div 
                    className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line"
                    dangerouslySetInnerHTML={{ 
                      __html: aiOutput
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/\*(.*?)\*/g, '<i>$1</i>')
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TABS 5: STARRED MESSAGES VIEW */}
        {rightPanelTab === 'star' && (
          <div className="p-6 space-y-4">
            {(() => {
              const starredMessages = selectedChat.messages.filter(m => m.starred);
              
              return (
                <>
                  <h5 className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider select-none">
                    Starred Messages ({starredMessages.length})
                  </h5>
                  
                  {starredMessages.length > 0 ? (
                    <div className="space-y-3">
                      {starredMessages.map((msg) => {
                        const isMe = msg.senderId === 'user_me';
                        const senderName = isMe ? 'You' : displayName;
                        
                        return (
                          <div 
                            key={msg.id} 
                            className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-1.5 hover:bg-white/[0.02] transition-colors relative group"
                          >
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold select-none">
                              <span>{senderName}</span>
                              <span>{msg.timestamp}</span>
                            </div>
                            
                            {(!msg.type || msg.type === 'text') && (
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">{msg.text}</p>
                            )}
                            
                            {msg.type === 'image' && (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-slate-900 border border-white/5" style={{ background: msg.mediaUrl }} />
                                <span className="text-[10px] text-slate-400 italic">Photo Shared</span>
                              </div>
                            )}

                            {msg.type === 'document' && (
                              <div className="flex items-center gap-2">
                                <FiFileText size={12} className="text-emerald-400" />
                                <span className="text-[10px] text-slate-300 truncate max-w-[150px]">{msg.fileName}</span>
                              </div>
                            )}

                            {msg.type === 'gif' && (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-6 rounded border border-white/5" style={{ background: msg.text }} />
                                <span className="text-[10px] text-slate-400 italic">GIF Animation</span>
                              </div>
                            )}

                            {msg.type === 'sticker' && (
                              <div className="flex items-center gap-2">
                                <div dangerouslySetInnerHTML={{ __html: msg.text }} className="w-6 h-6" />
                                <span className="text-[10px] text-slate-400 italic">Vector Sticker</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center select-none space-y-2">
                      <FiStar size={24} className="text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-500 font-semibold">No starred messages</p>
                      <p className="text-[9px] text-slate-600 leading-relaxed max-w-[180px] mx-auto">
                        Star key details in the message options menu to collect them here.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* TABS 3: MEDIA VIEW */}
        {rightPanelTab === 'media' && (
          <div className="p-6 space-y-5">
            {/* Sub-filter tabs */}
            <div className="flex gap-1.5">
              {[
                { id: 'photos', label: 'Photos', icon: <FiImage size={12} /> },
                { id: 'videos', label: 'Videos', icon: <FiVideo size={12} /> },
                { id: 'docs', label: 'Docs', icon: <FiFileText size={12} /> },
                { id: 'links', label: 'Links', icon: <FiLink size={12} /> },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMediaFilter(f.id)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                    mediaFilter === f.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.icon} {f.label}
                  <span className="opacity-70">{mediaBuckets[f.id]?.length || 0}</span>
                </button>
              ))}
            </div>

            {/* Search over media */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={13} /></span>
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder="Search media..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
              />
            </div>

            {currentMedia.length === 0 ? (
              <div className="h-40 flex flex-col justify-center items-center text-center text-slate-500">
                <FiLayers size={22} className="mb-2 opacity-50" />
                <p className="text-xs">No {mediaFilter} in this conversation yet</p>
              </div>
            ) : (mediaFilter === 'photos' || mediaFilter === 'videos') ? (
              <div className="grid grid-cols-3 gap-2">
                {currentMedia.map((m) => (
                  <div
                    key={m.id || m._id}
                    onClick={() => scrollToMessage(m)}
                    className="aspect-square rounded-xl border border-white/5 cursor-pointer hover:opacity-80 active:scale-95 transition-all overflow-hidden flex items-center justify-center bg-slate-900 relative"
                  >
                    {m.mediaUrl ? (
                      mediaFilter === 'videos' ? (
                        <>
                          <video src={resolveMediaUrl(m.mediaUrl)} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30"><FiVideo className="text-white" size={16} /></span>
                        </>
                      ) : (
                        <img src={resolveMediaUrl(m.mediaUrl)} alt={m.caption || 'Shared media'} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <FiImage className="text-white/20" size={14} />
                    )}
                  </div>
                ))}
              </div>
            ) : mediaFilter === 'docs' ? (
              <div className="space-y-2">
                {currentMedia.map((m) => (
                  <div
                    key={m.id || m._id}
                    onClick={() => scrollToMessage(m)}
                    className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors group"
                  >
                    <div className="p-2 bg-slate-950 rounded-lg text-emerald-400 border border-white/5"><FiFileText size={14} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{m.fileName || 'Document'}</p>
                      <p className="text-[9px] text-slate-500">{m.fileSize || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentMedia.map((m) => {
                  const url = (m.text.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/i) || [])[0] || m.text;
                  const href = url.startsWith('http') ? url : `https://${url}`;
                  return (
                    <a
                      key={m.id || m._id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-slate-900 border border-white/5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 bg-slate-950 rounded-lg text-emerald-400 border border-white/5"><FiLink size={14} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{m.text}</p>
                        <p className="text-[9px] text-slate-500 truncate">{url}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TABS 4: SEARCH INSIDE CHAT */}
        {rightPanelTab === 'search' && (
          <div className="p-6 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={14} /></span>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
              />
            </div>

            {/* Category filter chips + starred toggle */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEARCH_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSearchCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                    searchCategory === cat.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <button
                onClick={() => setSearchStarred((v) => !v)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  searchStarred ? 'bg-amber-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FiStar size={10} className={searchStarred ? 'fill-current' : ''} /> Starred
              </button>
            </div>

            {/* Sender dropdown (group chats only) */}
            {selectedChat.type === 'group' && chatSenders.length > 0 && (
              <select
                value={searchSender}
                onChange={(e) => setSearchSender(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none cursor-pointer"
              >
                <option value="all">All senders</option>
                {chatSenders.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {(localSearch.trim() || searchCategory !== 'all' || searchStarred || searchSender !== 'all') ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">{searchResults.length} Matches Found</p>
                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto no-scrollbar">
                  {searchResults.map((msg) => {
                    const isMine = senderIdOf(msg) === (me?._id || me?.id) || msg.senderId === 'user_me';
                    return (
                    <div
                      key={msg.id || msg._id}
                      onClick={() => scrollToMessage(msg)}
                      className="p-3 bg-slate-900/60 border border-white/5 hover:border-white/10 rounded-xl space-y-1 cursor-pointer hover:bg-slate-900 transition-all active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-medium select-none">
                        <span>{isMine ? 'You' : (msg.senderName || displayName)}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed truncate">
                        {msg.text || (msg.fileName ? `📎 ${msg.fileName}` : msg.caption || `[${msg.type || 'message'}]`)}
                      </p>
                    </div>
                    );
                  })}
                  {searchResults.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">No messages match these filters</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col justify-center items-center text-center text-slate-500">
                <FiSearch size={22} className="mb-2 opacity-50" />
                <p className="text-xs">Type a query or pick a filter to inspect this chat</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ADD MEMBER MODAL (WhatsApp style side drawer overlay) */}
      {showAddMemberModal && (
        <div className="absolute inset-0 bg-[#080c14]/98 z-[60] flex flex-col p-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white font-display">Add Participant</h3>
            <button 
              onClick={() => setShowAddMemberModal(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <FiX size={16} />
            </button>
          </div>

          <input 
            type="text"
            value={searchMemberQuery}
            onChange={(e) => handleSearchContacts(e.target.value)}
            placeholder="Search contact name or username..."
            className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-emerald-500/25 outline-none mb-4 font-sans"
          />

          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
            {isLoadingContacts ? (
              <p className="text-[10px] text-slate-500 text-center py-4">Loading contacts list...</p>
            ) : addableContacts.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-4">No new contacts found.</p>
            ) : (
              addableContacts.map(contact => (
                <div key={contact._id || contact.id} className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={contact.avatar || getAvatarSvg(contact.name || 'U')} 
                      alt="" 
                      className="w-7 h-7 rounded-full border border-white/5 bg-slate-900" 
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-300">{contact.name}</p>
                      <p className="text-[9px] text-slate-500">@{contact.username}</p>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      try {
                        await addGroupMembers(selectedChat.id, [contact._id || contact.id]);
                        setShowAddMemberModal(false);
                        setSearchMemberQuery('');
                      } catch (err) {}
                    }}
                    className="py-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer transition-colors active:scale-95"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer Branding info */}
      <div className="p-4 border-t border-white/5 bg-slate-950 text-center select-none">
        <p className="text-[9px] text-slate-600 font-display">Aether Encrypted Terminal Layer</p>
      </div>

    </div>
  );
};

export default InfoPanel;
