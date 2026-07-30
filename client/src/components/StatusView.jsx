import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiSmile, FiPlus, FiUploadCloud, FiClock, FiEye, 
  FiMoreVertical, FiVolumeX, FiCheck, FiPlay, FiFileText,
  FiTrash2, FiSearch, FiLayers, FiLock, FiGlobe, FiChevronRight, FiImage, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const getFullImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:')) {
    return url;
  }
  return `${url}`;
};

const formatStatusTime = (createdAt) => {
  if (!createdAt) return 'Just now';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const StatusView = ({ onSelectStatus }) => {
  const { statuses, uploadStatus, deleteStatus, chats } = useChat();
  const { user, updatePrivacy } = useAuth();
  
  const [statusText, setStatusText] = useState('');
  const [statusColor, setStatusColor] = useState('linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)');
  const [loading, setLoading] = useState(true);
  
  // New Enhanced Status states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(''); // 'image' | 'video'
  const [mediaCaption, setMediaCaption] = useState('');
  const [statusFont, setStatusFont] = useState('font-sans');
  const [statusFontSize, setStatusFontSize] = useState('text-lg');
  const [statusTextColor, setStatusTextColor] = useState('#ffffff');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'recent' | 'viewed' | 'my_stories'
  const [statusVisibility, setStatusVisibility] = useState(user.privacySettings?.statusVisibility || 'contacts');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const myId = user?._id || user?.id || '';

  const myStatusObj = statuses.find(s => {
    const sid = s.userId?._id || s.userId?.id || s.userId || '';
    return sid === 'user_me' || sid.toString() === myId.toString();
  });
  const hasMyStatus = myStatusObj && myStatusObj.items && myStatusObj.items.length > 0;

  // Build a Set of my contact IDs for O(1) lookups
  const myContactIdSet = new Set(
    (user?.contacts || []).map(c =>
      (typeof c === 'string' ? c : (c?._id || c?.id || '')).toString()
    )
  );

  // Filter other users' statuses — show only mutual contacts:
  // I have them AND they have me in their contacts (or we share a direct chat)
  const otherStatuses = statuses.filter(s => {
    // Extract the status owner's ID regardless of whether userId is populated or raw
    const ownerId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
    if (!ownerId || ownerId === myId.toString()) return false;

    // Am I in their contact list? (populated userId has contacts array)
    const theyHaveMe = Array.isArray(s.userId?.contacts)
      ? s.userId.contacts.some(c => (c?._id || c?.id || c || '').toString() === myId.toString())
      : false;

    // Do I have them in my contact list?
    const iHaveThem = myContactIdSet.has(ownerId);

    // Fallback: we share a direct chat (in-app contacts via chat)
    const shareChat = chats?.some(c => {
      if (c.type !== 'direct' || !c.user) return false;
      const partnerId = (c.user.id || c.user._id || c.user || '').toString();
      return partnerId === ownerId || 
             (s.userUsername && c.user.username === s.userUsername);
    });

    // Mutual: both sides have each other, OR share a direct chat
    return (iHaveThem && theyHaveMe) || shareChat;
  });

  // Apply search query filtering
  const searchedStatuses = otherStatuses.filter(s => {
    const q = searchQuery.toLowerCase();
    const nameMatch = s.userName.toLowerCase().includes(q);
    const contentMatch = s.items.some(item => 
      (item.content && item.content.toLowerCase().includes(q)) || 
      (item.caption && item.caption.toLowerCase().includes(q))
    );
    return nameMatch || contentMatch;
  });

  // Partition stories into recent and viewed
  // In our app, we simulate viewed status if the user viewed it
  const recentUpdates = searchedStatuses.filter(s => s.items.length > 0); 
  const viewedUpdates = []; // local simulation array

  const statusBackgrounds = [
    'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #f97316 0%, #e11d48 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
  ];

  const handlePostTextStatus = (e) => {
    e.preventDefault();
    if (!statusText.trim()) return;
    
    const styleObj = {
      background: statusColor,
      font: statusFont,
      fontSize: statusFontSize,
      textColor: statusTextColor
    };
    
    uploadStatus('text', statusText, { background: JSON.stringify(styleObj) });
    setStatusText('');
    toast.success('Text status published!');
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image

    if (file.size > limit) {
      toast.error(isVideo ? 'Video size must be smaller than 50MB' : 'Image size must be smaller than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedMedia(event.target.result);
      setMediaType(isVideo ? 'video' : 'image');
    };
    reader.readAsDataURL(file);
  };

  const handlePublishMediaStatus = (e) => {
    e.preventDefault();
    if (!selectedMedia) return;

    uploadStatus(mediaType, '', {
      mediaUrl: selectedMedia,
      caption: mediaCaption
    });

    setSelectedMedia(null);
    setMediaType('');
    setMediaCaption('');
    toast.success(`${mediaType === 'video' ? 'Video' : 'Image'} status published!`);
  };

  const handlePrivacyChange = (value) => {
    setStatusVisibility(value);
    updatePrivacy({ statusVisibility: value });
    setShowPrivacyDropdown(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* 1. Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-20 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Status Stories</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Publish ephemeral stories that expire securely after 24 hours</p>
          </div>

          {/* Privacy settings button */}
          <div className="relative">
            <button
              onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
              className="px-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-[10px] text-slate-400 hover:text-white font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer select-none"
            >
              <FiLock size={12} className="text-emerald-400" />
              <span className="capitalize">{statusVisibility.replace('_', ' ')}</span>
            </button>
            
            {showPrivacyDropdown && (
              <div className="absolute right-0 mt-2 z-30 bg-[#131b2e] border border-white/5 rounded-xl p-1.5 w-40 shadow-2xl flex flex-col text-left">
                {[
                  { id: 'everyone', label: 'Everyone' },
                  { id: 'contacts', label: 'My Contacts' },
                  { id: 'only_me', label: 'Only Me' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handlePrivacyChange(opt.id)}
                    className={`w-full py-1.5 px-2 hover:bg-white/[0.03] rounded-md text-[10px] text-left transition-colors font-semibold cursor-pointer ${
                      statusVisibility === opt.id ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search & Tabs Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={16} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts' updates..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-[11px] text-slate-200 focus:border-emerald-500/20 outline-none"
            />
          </div>

          <div className="flex gap-1.5 select-none shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Updates' },
              { id: 'recent', label: 'Recent' },
              { id: 'my_stories', label: 'My Stories' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                  filterTab === tab.id 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar z-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: My Status Card & Composer */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* My Status Card */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between h-44">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 select-none">
                  <img 
                    src={user.avatar} 
                    alt="My Avatar" 
                    className={`w-12 h-12 rounded-full p-0.5 border-2 ${
                      hasMyStatus ? 'border-emerald-500 animate-pulse' : 'border-slate-800'
                    }`} 
                  />
                  {!hasMyStatus && (
                    <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full border-2 border-slate-950 text-slate-950 cursor-pointer">
                      <FiPlus size={8} />
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-slate-200 font-display">My Status</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {hasMyStatus ? `${myStatusObj.items.length} stories active` : 'Publish thoughts or photos'}
                  </p>
                </div>
              </div>

              {hasMyStatus ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectStatus(myStatusObj)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[10px] font-bold text-emerald-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FiPlay size={10} /> View Stories
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-600 italic">No status stories published. Use the composer below to share.</p>
              )}
            </div>

            {/* Privacy Summary Info Box */}
            <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><FiGlobe size={16} /></div>
              <div>
                <h5 className="text-[11px] font-bold text-slate-200">Story Privacy Active</h5>
                <p className="text-[9px] text-slate-500 mt-0.5">Visible to: <span className="capitalize text-slate-400 font-semibold">{statusVisibility}</span></p>
              </div>
            </div>

          </div>

          {/* Middle/Right Column: Composers & Feed list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ═══════════════════════════════════════════════════════════════
                Advanced Status Composer
                ═══════════════════════════════════════════════════════════════ */}
            {selectedMedia ? (
              /* ── MEDIA (Image / Video) COMPOSER ─────────────────────────── */
              <div className="bg-white/[0.015] border border-white/5 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    {mediaType === 'video' ? <FiPlay size={11} className="text-violet-400" /> : <FiImage size={11} className="text-emerald-400" />}
                    {mediaType === 'video' ? 'Video' : 'Image'} Story Editor
                  </h4>
                  <button onClick={() => { setSelectedMedia(null); setMediaType(''); }} className="text-slate-400 hover:text-white cursor-pointer transition-colors">
                    <FiX size={14} />
                  </button>
                </div>

                {/* Preview */}
                <div className="p-4">
                  <div className="relative w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden mx-auto border border-white/10 bg-slate-950 flex items-end shadow-2xl shadow-black/60">
                    {mediaType === 'video' ? (
                      <video
                        src={selectedMedia}
                        className="absolute inset-0 w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img src={selectedMedia} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {/* Gradient overlay + caption preview */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />
                    {mediaCaption && (
                      <p className="relative z-20 text-xs text-white font-semibold text-center w-full pb-4 px-3 leading-relaxed drop-shadow-lg">
                        {mediaCaption}
                      </p>
                    )}
                    {/* Story-style progress bar at the top */}
                    <div className="absolute top-3 left-3 right-3 z-20 h-0.5 bg-white/20 rounded-full">
                      <div className="h-full w-1/3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Caption + Publish */}
                <form onSubmit={handlePublishMediaStatus} className="px-4 pb-4 space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      maxLength={150}
                      placeholder="Add a caption to your story…"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/30 outline-none placeholder:text-slate-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-mono">
                      {mediaCaption.length}/150
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <FiUploadCloud size={13} /> Publish {mediaType === 'video' ? 'Video' : 'Image'} Story
                  </button>
                </form>
              </div>
            ) : (
              /* ── TEXT / UPLOAD SELECTOR COMPOSER ────────────────────────── */
              <div className="bg-white/[0.015] border border-white/5 rounded-2xl overflow-hidden">
                {/* Composer header */}
                <div className="px-5 pt-4 pb-3 border-b border-white/5">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Create a Story</h4>
                </div>

                <div className="p-5 space-y-4">
                  {/* Live preview card */}
                  {statusText && (
                    <div
                      className="w-full rounded-2xl p-6 min-h-[120px] flex flex-col justify-center items-center text-center border border-white/5 relative overflow-hidden transition-all"
                      style={{ background: (() => { try { const s = JSON.parse(statusColor); return s.background || statusColor; } catch { return statusColor; } })() }}
                    >
                      <div className="absolute top-3 left-3 right-3 h-0.5 bg-white/20 rounded-full"><div className="h-full w-1/2 bg-white/60 rounded-full" /></div>
                      <p
                        className={`font-bold leading-relaxed z-10 px-2 ${statusFontSize} ${statusFont}`}
                        style={{ color: statusTextColor, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                      >
                        {statusText}
                      </p>
                    </div>
                  )}

                  {/* Textarea */}
                  <form onSubmit={handlePostTextStatus} className="space-y-4">
                    <textarea
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="What's on your mind? Share a thought, quote or update…"
                      maxLength={300}
                      rows={4}
                      className="w-full p-4 bg-slate-900 border border-white/5 rounded-xl text-sm text-slate-200 focus:border-emerald-500/30 outline-none resize-none placeholder:text-slate-500 font-sans leading-relaxed"
                    />

                    {/* Styling Controls Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Background gradient pickers */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Background</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {statusBackgrounds.map((bg, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setStatusColor(bg)}
                              title={`Theme ${idx + 1}`}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform flex-shrink-0 ${statusColor === bg ? 'border-white scale-110' : 'border-transparent'}`}
                              style={{ background: bg }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Font style picker */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Font Style</span>
                        <div className="flex gap-1.5">
                          {[
                            { cls: 'font-sans', label: 'Sans' },
                            { cls: 'font-serif', label: 'Serif' },
                            { cls: 'font-mono', label: 'Mono' }
                          ].map(f => (
                            <button
                              key={f.cls}
                              type="button"
                              onClick={() => setStatusFont(f.cls)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all ${statusFont === f.cls ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'}`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font size picker */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Text Size</span>
                        <div className="flex gap-1.5">
                          {[
                            { cls: 'text-sm', label: 'S' },
                            { cls: 'text-lg', label: 'M' },
                            { cls: 'text-2xl', label: 'L' },
                            { cls: 'text-4xl', label: 'XL' }
                          ].map(sz => (
                            <button
                              key={sz.cls}
                              type="button"
                              onClick={() => setStatusFontSize(sz.cls)}
                              className={`w-7 h-7 rounded-lg text-[9px] font-bold cursor-pointer transition-all flex items-center justify-center ${statusFontSize === sz.cls ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'}`}
                            >
                              {sz.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Text color + char count row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Text color */}
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-colors"
                            style={{ background: statusTextColor }}
                          />
                          <span className="text-[9px] text-slate-500 font-bold group-hover:text-slate-300 transition-colors">Text Color</span>
                          <input
                            type="color"
                            value={statusTextColor}
                            onChange={(e) => setStatusTextColor(e.target.value)}
                            className="opacity-0 absolute w-0 h-0"
                          />
                        </label>

                        <span className="text-slate-700">|</span>

                        {/* Media upload buttons */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-slate-500 hover:text-emerald-400 flex items-center gap-1 text-[9px] font-bold cursor-pointer transition-colors"
                        >
                          <FiImage size={12} /> Photo/Video
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleMediaUpload}
                          accept="image/*,video/*"
                          className="hidden"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono select-none ${statusText.length > 250 ? 'text-amber-400' : 'text-slate-600'}`}>
                          {statusText.length}/300
                        </span>
                        <button
                          type="submit"
                          disabled={!statusText.trim()}
                          className="py-2 px-5 bg-emerald-500 disabled:opacity-40 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/15 flex items-center gap-1.5"
                        >
                          <FiCheck size={11} /> Publish
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Stories Feed View */}
            {loading ? (
              <div className="space-y-4 animate-pulse relative overflow-hidden shimmer-wrapper">
                <div className="h-4 bg-slate-900 w-24 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl h-16 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Active story deletion / details block */}
                {filterTab === 'my_stories' && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">Active Story Segments</h3>
                    {hasMyStatus && myStatusObj.items.length > 0 ? (
                      <div className="space-y-2">
                        {myStatusObj.items.map((item) => (
                          <div 
                            key={item.id || item._id}
                            className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold border border-white/5"
                                style={{ background: item.type === 'text' ? item.background : `url(${getFullImageUrl(item.mediaUrl)}) center/cover` }}
                              >
                                {item.type === 'text' ? item.content.substring(0, 10) + '...' : ''}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-300 capitalize">{item.type} segment</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">{formatStatusTime(item.createdAt) || item.timestamp || 'Just now'}</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => deleteStatus(item.id || item._id)}
                              className="p-2 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-white/5 rounded-xl active:scale-95 transition-all cursor-pointer"
                              title="Delete Story Segment"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
                        You have no active status stories published.
                      </div>
                    )}
                  </div>
                )}

                {/* Recent updates list */}
                {filterTab !== 'my_stories' && recentUpdates.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">Recent Updates</h3>
                    
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {recentUpdates.map((stat) => (
                        <motion.div
                          key={stat.id}
                          variants={itemVariants}
                          onClick={() => onSelectStatus(stat)}
                          className="p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 rounded-2xl flex items-center justify-between cursor-pointer transition-all group hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0 select-none p-0.5 border-2 border-emerald-500 rounded-full">
                              <img src={stat.userAvatar} alt="" className="w-10 h-10 rounded-full border border-slate-950 border-2 bg-slate-900" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-200 font-display group-hover:text-emerald-400 transition-colors">{stat.userName}</h4>
                              <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                                <FiClock size={10} />
                                <span>{formatStatusTime(stat.items[0]?.createdAt) || stat.items[0]?.timestamp || 'Just now'}</span>
                              </p>
                            </div>
                          </div>
                          
                          <span className="text-[9px] text-slate-500 group-hover:text-white transition-colors select-none font-semibold">Click to view</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}

                {filterTab !== 'my_stories' && recentUpdates.length === 0 && (
                  <div className="h-48 border border-dashed border-white/5 rounded-2xl flex flex-col justify-center items-center text-slate-500 text-center p-6">
                    <FiLayers size={26} className="opacity-45 mb-2" />
                    <h5 className="text-xs font-bold text-slate-400">No Stories Found</h5>
                    <p className="text-[10px] text-slate-600 mt-0.5">Try searching for other keywords or publish your own story!</p>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </div>
      
    </div>
  );
};

export default StatusView;
