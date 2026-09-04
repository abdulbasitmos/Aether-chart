import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { 
  FiSearch, FiMessageSquare, FiUser, FiTv, FiLayers, 
  FiClock, FiTrendingUp, FiArrowRight, FiBriefcase, FiStar,
  FiCalendar, FiMessageSquare as FiChat, FiMic
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SearchView = () => {
  const { 
    chats, 
    channels, 
    communities, 
    selectChat, 
    setSelectedChannelId, 
    setSelectedCommunityId, 
    setActiveTab 
  } = useChat();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ chats: [], messages: [], channels: [], communities: [] });
  const [businessResults, setBusinessResults] = useState([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [organizationResults, setOrganizationResults] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  // Voice search state
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  // Result category filter + recent searches
  const [category, setCategory] = useState('all');
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aether_recent_searches') || '[]'); }
    catch { return []; }
  });

  // Persist a term into the recent-searches list (most-recent first, max 8).
  const rememberSearch = (term) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      try { localStorage.setItem('aether_recent_searches', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem('aether_recent_searches'); } catch {}
  };

  // Record a search once the debounced query settles with real results.
  useEffect(() => {
    if (!query.trim()) return;
    const id = setTimeout(() => rememberSearch(query), 900);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ chats: [], messages: [], channels: [], communities: [] });
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(() => {
      const q = query.toLowerCase();

      // 1. Search Chats (by name or username)
      const matchedChats = chats.filter(c => {
        const name = c.type === 'group' ? c.group?.name : c.user?.name;
        const username = c.type === 'group' ? '' : c.user?.username;
        return name?.toLowerCase().includes(q) || username?.toLowerCase().includes(q);
      });

      // 2. Search Messages within chats
      const matchedMessages = [];
      chats.forEach(c => {
        const name = c.type === 'group' ? c.group?.name : c.user?.name;
        c.messages.forEach(msg => {
          if (msg.text && msg.text.toLowerCase().includes(q)) {
            matchedMessages.push({
              chatId: c.id,
              chatName: name,
              message: msg
            });
          }
        });
      });

      // 3. Search Channels
      const matchedChannels = channels.filter(ch => ch.name.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q));

      // 4. Search Communities
      const matchedCommunities = communities.filter(comm => comm.name.toLowerCase().includes(q) || comm.description.toLowerCase().includes(q));

      setResults({
        chats: matchedChats,
        messages: matchedMessages,
        channels: matchedChannels,
        communities: matchedCommunities
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, chats, channels, communities]);

  // API search for businesses
  useEffect(() => {
    if (!query.trim()) { setBusinessResults([]); return; }
    const token = sessionStorage.getItem('aether_token');
    if (!token) return;
    setBizLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
        setBusinessResults(res.data?.businesses || []);
      } catch { setBusinessResults([]); }
      setBizLoading(false);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [query]);
  // API search for organizations
  useEffect(() => {
    if (!query.trim()) { setOrganizationResults([]); return; }
    const token = sessionStorage.getItem('aether_token');
    if (!token) return;
    setOrgLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/organizations/search?q=${encodeURIComponent(query)}`);
        setOrganizationResults(res.data?.organizations || []);
      } catch {
        setOrganizationResults([]);
      }
      setOrgLoading(false);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [query]);
  const totalResults = results.chats.length + results.messages.length + results.channels.length + results.communities.length + businessResults.length + organizationResults.length;

  // Result category tabs (with live counts).
  const CATEGORY_TABS = [
    { id: 'all', label: 'All', count: totalResults },
    { id: 'chats', label: 'Contacts', count: results.chats.length },
    { id: 'messages', label: 'Messages', count: results.messages.length },
    { id: 'channels', label: 'Channels', count: results.channels.length },
    { id: 'communities', label: 'Communities', count: results.communities.length },
    { id: 'businesses', label: 'Businesses', count: businessResults.length },
    { id: 'organizations', label: 'Orgs', count: organizationResults.length },
  ];
  const showCat = (id) => category === 'all' || category === id;

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white">Universal Search</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Find contact sessions, message logs, communities, or public channels</p>
        </div>

        {/* Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={14} /></span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type username, message keyword, or channel name..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/25 outline-none placeholder:text-slate-500 transition-colors"
          />
        </div>

        {/* Category filter tabs */}
        {query.trim() && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_TABS.filter((t) => t.id === 'all' || t.count > 0).map((t) => (
              <button
                key={t.id}
                onClick={() => setCategory(t.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  category === t.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {t.label}
                <span className="opacity-70">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search results viewport */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 z-10">
        {loading ? (
          <div className="space-y-4 animate-pulse relative overflow-hidden shimmer-wrapper">
            <div className="h-4 bg-slate-900 w-24 rounded" />
            <div className="h-16 bg-slate-900/30 border border-white/5 rounded-2xl" />
            <div className="h-16 bg-slate-900/30 border border-white/5 rounded-2xl" />
          </div>
        ) : query ? (
          totalResults > 0 ? (
            <div className="space-y-5">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">{totalResults} matches indexed</h3>

              {/* Chat results */}
              {showCat('chats') && results.chats.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                    <FiUser size={10} /> Contact Sessions ({results.chats.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.chats.map((c) => {
                      const name = c.type === 'group' ? c.group?.name : c.user?.name;
                      const avatar = c.type === 'group' ? c.group?.avatar : c.user?.avatar;
                      return (
                        <div 
                          key={c.id} 
                          className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between transition-all cursor-pointer hover:border-white/10 active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3" onClick={() => {
                            selectChat(c.id);
                            navigate(`/chats/${c.id}`);
                          }} style={{cursor: 'pointer'}}>
                            <img src={avatar} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                            <span className="text-xs font-bold text-slate-200 font-display">{name}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectChat(c.id);
                              navigate(`/chats/${c.id}`);
                            }}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[10px]"
                          >
                            <FiMessageSquare size={12} /> Message
                          </button>
                          <span className="text-[9px] py-0.5 px-2 bg-slate-900 rounded border border-white/5 text-slate-500 capitalize">{c.type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message results */}
              {showCat('messages') && results.messages.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h4 className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                    <FiMessageSquare size={10} /> Message History ({results.messages.length})
                  </h4>
                  <div className="space-y-2">
                    {results.messages.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          selectChat(item.chatId);
                          navigate(`/chats/${item.chatId}`, { state: { highlightMessageId: item.message.id || item.message._id } });
                        }}
                        className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-1.5 hover:bg-slate-900/80 hover:border-white/10 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold select-none">
                          <span className="text-slate-300 font-bold">{item.chatName}</span>
                          <span className="flex items-center gap-1"><FiClock size={10} /> {item.message.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">{item.message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Channels results */}
              {showCat('channels') && results.channels.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h4 className="text-[9px] text-rose-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                    <FiTv size={10} /> Channels ({results.channels.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.channels.map((ch) => (
                      <div 
                        key={ch.id} 
                        onClick={() => {
                          setSelectedChannelId(ch.id);
                          setActiveTab('channels');
                          navigate('/channels');
                        }}
                        className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-3 transition-all cursor-pointer hover:border-white/10 active:scale-[0.99]"
                      >
                        <img src={ch.avatar} alt="" className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-200 font-display">{ch.name}</h5>
                          <p className="text-[9px] text-slate-500">{ch.subscribers} subscribers</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Business results */}
              {showCat('businesses') && businessResults.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h4 className="text-[9px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                    <FiBriefcase size={10} /> Businesses ({businessResults.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {businessResults.map((b) => (
                      <div key={b._id}
                        onClick={() => navigate(`/business/${b._id}`)}
                        className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-3 transition-all cursor-pointer hover:border-blue-500/20 active:scale-[0.99]"
                      >
                        {b.logo ? (
                          <img src={b.logo} alt="" className="w-8 h-8 rounded-xl border border-white/5 bg-slate-900 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <FiBriefcase size={14} className="text-blue-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-200 font-display">{b.businessName}</h5>
                          <p className="text-[9px] text-slate-500 truncate">{b.category || b.description || 'Business'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {b.availabilityStatus && (
                            <span className={`w-2 h-2 rounded-full ${b.availabilityStatus === 'open' ? 'bg-blue-400' : 'bg-slate-600'}`} />
                          )}
                          <FiArrowRight size={12} className="text-slate-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organization results */}
                {showCat('organizations') && organizationResults.length > 0 && (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <h4 className="text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                      <FiBriefcase size={10} /> Organizations ({organizationResults.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {organizationResults.map((org) => (
                        <div
                          key={org._id}
                          className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-3 transition-all cursor-pointer hover:border-purple-500/20 active:scale-[0.99]"
                        >
                          {org.logo ? (
                            <img src={org.logo} alt="" className="w-8 h-8 rounded-xl border border-white/5 bg-slate-900 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                              <FiBriefcase size={14} className="text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-200 font-display">{org.name}</h5>
                            <p className="text-[9px] text-slate-500 truncate">{org.description || 'Organization'}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/organization/${org._id}`); }}
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-[10px]"
                          >
                            <FiMessageSquare size={12} /> Message
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Communities results */}
              {showCat('communities') && results.communities.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <h4 className="text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                    <FiLayers size={10} /> Communities ({results.communities.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.communities.map((comm) => (
                      <div 
                        key={comm.id} 
                        onClick={() => {
                          setSelectedCommunityId(comm.id);
                          setActiveTab('communities');
                          navigate('/communities');
                        }}
                        className="p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-3 transition-all cursor-pointer hover:border-white/10 active:scale-[0.99]"
                      >
                        <img src={comm.avatar} alt="" className="w-8 h-8 rounded-xl border border-white/5 bg-slate-900" />
                        <div>
                          <h5 className="text-xs font-bold text-slate-200 font-display">{comm.name}</h5>
                          <p className="text-[9px] text-slate-500 truncate max-w-[150px]">{comm.tagline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 select-none">
              <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center mb-4 text-slate-600">
                <FiSearch size={20} />
              </div>
              <h4 className="text-sm font-semibold text-slate-400">No results found</h4>
              <p className="text-slate-600 text-xs mt-1 max-w-[200px] leading-relaxed">
                We couldn't find any chats, messages, or channels matching "{query}".
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 select-none min-h-[16rem] gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center mb-4 text-slate-600">
                <FiSearch size={20} />
              </div>
              <h4 className="text-sm font-semibold text-slate-400">Search Workspace</h4>
              <p className="text-slate-600 text-xs mt-1 max-w-[200px] leading-relaxed">
                Start typing above to search your entire messaging database index.
              </p>
            </div>

            {recentSearches.length > 0 && (
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <FiClock size={10} /> Recent Searches
                  </h5>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[9px] text-slate-500 hover:text-rose-400 uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-slate-900 border border-white/5 rounded-full text-[11px] text-slate-300 hover:text-white hover:border-emerald-500/25 cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <FiTrendingUp size={10} className="text-emerald-400" /> {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Searches contacts, messages, channels, communities, businesses & organizations — matches update as you type.
      </div>
    </div>
  );
};

export default SearchView;
