import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiCompass, FiSearch, FiCheck, FiHeart, FiShare2, 
  FiMessageSquare, FiSend, FiClock, FiPlus, FiAlertCircle,
  FiImage, FiSettings, FiX, FiLayers, FiGlobe, FiTv, FiInfo, FiTrash2
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

const ChannelsView = () => {
  const { 
    channels, 
    selectedChannelId, 
    setSelectedChannelId, 
    followChannel, 
    reactChannelPost, 
    addChannelPostComment,
    createChannel,
    deleteChannel,
    addChannelPost
  } = useChat();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [commentInputs, setCommentInputs] = useState({}); // { postId: '' }
  const [loading, setLoading] = useState(true);

  // Categories & tab filters
  const [channelCategory, setChannelCategory] = useState('all'); // 'all' | 'following' | 'my_channels'
  
  // Create Channel Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');
  const [newChanAvatar, setNewChanAvatar] = useState('');
  const chanFileRef = useRef(null);

  // Broadcast Composer state (for channel owner/admins)
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');
  const postFileRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [selectedChannelId]);

  const activeChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  // Helper check: Is current user the creator of the active channel?
  const isChannelOwner = activeChannel && (
    activeChannel.ownerId === (user?._id || user?.id) || 
    activeChannel.name === 'Aether Announcements' // mock pre-seeded channel ownership/admin rights for convenience
  );

  const handleSendComment = (postId, e) => {
    e.preventDefault();
    const commentText = commentInputs[postId] || '';
    if (!commentText.trim()) return;

    addChannelPostComment(activeChannel.id, postId, commentText);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleShareChannelPost = (post) => {
    const text = `Check out this broadcast update from ${activeChannel.name}: "${post.content.substring(0, 60)}..."`;
    navigator.clipboard.writeText(text);
    toast.success('Broadcast link copied to clipboard!');
  };

  const handleChanAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewChanAvatar(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    const newId = await createChannel(newChanName, newChanDesc, newChanAvatar);
    if (newId) {
      setNewChanName('');
      setNewChanDesc('');
      setNewChanAvatar('');
      setIsCreateModalOpen(false);
    }
  };

  const handlePostImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPostImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePublishPostSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !postImage) return;

    let finalImage = postImage;
    // Helper uploader inside ChatContext handles base64 upload if it starts with data:
    await addChannelPost(activeChannel.id, postContent, finalImage);
    setPostContent('');
    setPostImage('');
  };

  // Filter channels based on tab categories and query
  const filteredChannels = channels.filter(chan => {
    const qMatch = chan.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!qMatch) return false;
    
    if (channelCategory === 'following') return chan.following;
    if (channelCategory === 'my_channels') {
      return chan.ownerId === (user?._id || user?.id) || chan.name === 'Aether Announcements';
    }
    return true; // 'all'
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* 1. Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-15 flex flex-col gap-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Broadcast Channels</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Follow curated broadcast nodes or host your own organization page</p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-emerald-500/10"
          >
            <FiPlus size={12} /> Create Channel
          </button>
        </div>

        {/* Filter Categories and search row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={12} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-xl text-[11px] text-slate-200 focus:border-emerald-500/25 outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-1.5 select-none shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Channels' },
              { id: 'following', label: 'Following' },
              { id: 'my_channels', label: 'Coordinated by Me' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setChannelCategory(tab.id)}
                className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                  channelCategory === tab.id 
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

      {/* 2. Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Channels list */}
        <div className="w-1/3 border-r border-white/5 overflow-y-auto no-scrollbar p-4 space-y-3 shrink-0 bg-slate-950/20">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1 select-none">Channel Feed</h3>
          
          <div className="space-y-1.5">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((chan) => (
                <div
                  key={chan.id}
                  onClick={() => setSelectedChannelId(chan.id)}
                  className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer border transition-all ${
                    selectedChannelId === chan.id 
                      ? 'bg-slate-900 border-white/5' 
                      : 'bg-transparent border-transparent hover:bg-white/[0.015]'
                  }`}
                >
                  <img src={chan.avatar} alt="" className="w-9 h-9 rounded-full border border-white/5 object-cover" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-200 truncate font-display flex items-center gap-1">
                      {chan.name}
                      <span className="p-0.5 bg-emerald-500/20 text-blue-400 rounded-full" title="Verified Broadcast Node"><FiCheck size={8} /></span>
                    </h4>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{chan.subscribers} Followers</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs italic">
                No channels match your search.
              </div>
            )}
          </div>
        </div>

        {/* Right side details / Broadcaster post feed */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-slate-950/5">
          {loading ? (
            <div className="space-y-4 animate-pulse relative overflow-hidden shimmer-wrapper h-full">
              <div className="h-6 bg-slate-900 w-1/3 rounded" />
              <div className="h-4 bg-slate-900 w-2/3 rounded" />
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-44 bg-slate-900/30 border border-white/5 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : activeChannel ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              {/* Channel Profile Banner */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                  <img src={activeChannel.avatar} alt="" className="w-12 h-12 rounded-full border border-white/5 object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1 font-display">
                      {activeChannel.name}
                      <span className="p-0.5 bg-emerald-500/20 text-blue-400 rounded-full"><FiCheck size={8} /></span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{activeChannel.subscribers} followers • Broadcast Node</p>
                    {activeChannel.description && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-md line-clamp-2">{activeChannel.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => followChannel(activeChannel.id)}
                    className={`py-1.5 px-4 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer border ${
                      activeChannel.following 
                        ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' 
                        : 'bg-emerald-500 border-transparent text-slate-950 shadow-md shadow-emerald-500/10'
                    }`}
                  >
                    {activeChannel.following ? 'Following' : 'Follow Node'}
                  </button>
                  {isChannelOwner && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete channel "${activeChannel.name}"? This cannot be undone.`)) {
                          deleteChannel(activeChannel.id);
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      title="Delete this channel"
                    >
                      <FiTrash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Broadcaster Post Composer (Only shown to creator/owner) */}
              {isChannelOwner && (
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FiTv size={12} /> Broadcast Composer (Admin Access)
                    </h4>
                  </div>
                  
                  <form onSubmit={handlePublishPostSubmit} className="space-y-3">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Write a broadcast announcement..."
                      className="w-full p-3 h-20 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/25 outline-none resize-none placeholder:text-slate-500 font-sans"
                    />

                    {postImage && (
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden border border-white/5 bg-slate-950">
                        <img src={postImage} alt="" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setPostImage('')}
                          className="absolute top-1 right-1 p-0.5 bg-slate-950/80 rounded-full text-slate-400 hover:text-white cursor-pointer"
                        >
                          <FiX size={10} />
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => postFileRef.current?.click()}
                        className="text-slate-500 hover:text-blue-400 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        <FiImage size={13} /> Add Attachment
                      </button>
                      <input 
                        type="file" 
                        ref={postFileRef} 
                        onChange={handlePostImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />

                      <button
                        type="submit"
                        disabled={!postContent.trim() && !postImage}
                        className="py-1.5 px-4 bg-emerald-500 disabled:opacity-50 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        Publish Broadcast
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Feed posts list */}
              <div className="space-y-5">
                {activeChannel.posts && activeChannel.posts.length > 0 ? (
                  activeChannel.posts.map((post) => (
                    <div key={post.id || post._id} className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4">
                      {/* Post Header */}
                      <div className="flex justify-between items-center select-none text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        <span className="text-blue-400 flex items-center gap-1"><FiGlobe size={10} /> Published Node update</span>
                        <span className="flex items-center gap-1 font-semibold normal-case"><FiClock size={10} /> {post.date || 'Today'}</span>
                      </div>

                      {/* Post Content */}
                      <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {post.content}
                      </p>

                      {/* Optional Post Image */}
                      {post.image && (
                        <div 
                          className="w-full aspect-[2/1] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative cursor-pointer"
                          onClick={() => toast.success('Viewing broadcast image')}
                        >
                          <img src={getFullImageUrl(post.image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Reactions & Actions Row */}
                      <div className="flex items-center gap-6 border-y border-white/5 py-2.5 select-none text-xs">
                        {/* Like Button */}
                        <button
                          onClick={() => reactChannelPost(activeChannel.id, post.id || post._id)}
                          className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                            post.userLiked ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <FiHeart size={14} fill={post.userLiked ? 'currentColor' : 'none'} />
                          <span>{post.likes} reactions</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => handleShareChannelPost(post)}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 font-bold cursor-pointer"
                        >
                          <FiShare2 size={13} />
                          <span>Share link</span>
                        </button>
                      </div>

                      {/* Comments section */}
                      <div className="space-y-3">
                        <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none flex items-center gap-1">
                          <FiMessageSquare size={10} /> Comments ({post.comments?.length || 0})
                        </h5>
                        
                        {post.comments && post.comments.length > 0 && (
                          <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar">
                            {post.comments.map((comment, index) => (
                              <div key={index} className="p-2.5 bg-slate-900/40 border border-white/5 rounded-xl text-[11px] flex gap-2.5">
                                <div className="w-6.5 h-6.5 rounded-full bg-slate-950 border border-white/5 text-[9px] font-bold text-blue-400 flex items-center justify-center select-none shrink-0 uppercase">
                                  {comment.name.substring(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline mb-0.5 select-none text-[8.5px]">
                                    <span className="font-bold text-slate-300">{comment.name}</span>
                                    <span className="text-slate-500 font-semibold">{comment.date || 'Just now'}</span>
                                  </div>
                                  <p className="text-slate-400 font-sans leading-relaxed">{comment.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Send comment form */}
                        <form onSubmit={(e) => handleSendComment(post.id || post._id, e)} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id || post._id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id || post._id]: e.target.value }))}
                            className="flex-1 bg-slate-900 border border-white/5 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!(commentInputs[post.id || post._id] || '').trim()}
                            className="p-2.5 bg-emerald-500 disabled:opacity-50 hover:bg-emerald-600 text-slate-950 rounded-xl cursor-pointer active:scale-95 transition-all shrink-0"
                          >
                            <FiSend size={11} />
                          </button>
                        </form>
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-2xl flex flex-col justify-center items-center">
                    <FiInfo size={16} className="opacity-40 mb-1.5" />
                    <span>No broadcast updates posted in this channel yet.</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 select-none text-slate-500">
              <FiCompass size={28} className="mb-2 opacity-40 animate-spin-slow" />
              <h4 className="text-sm font-semibold text-slate-400">No channel selected</h4>
              <p className="text-[10px] text-slate-600 mt-0.5">Choose a broadcast node from the feed column to begin.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Channel Modal Dialog */}
      <AnimatePresence>
        {isCreateModalOpen && (
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
                <h3 className="text-sm font-bold font-display text-white">Create Broadcast Node</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <FiX size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
                {/* Logo selector */}
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => chanFileRef.current?.click()}
                    className="w-12 h-12 rounded-full border border-dashed border-white/10 flex flex-col items-center justify-center text-[9px] text-slate-500 cursor-pointer hover:border-emerald-500/35 relative overflow-hidden bg-slate-900 shrink-0"
                  >
                    {newChanAvatar ? (
                      <img src={newChanAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <FiImage size={14} />
                        <span>Logo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={chanFileRef} 
                    onChange={handleChanAvatarUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-bold">Channel Avatar</p>
                    <p className="text-[9px] text-slate-500">Supports PNG/JPG under 2MB.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Channel Name</label>
                  <input
                    type="text"
                    required
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    placeholder="e.g. Technology News"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                  <textarea
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    placeholder="Describe what updates followers will receive..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl p-3 h-20 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Initialize Node
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default ChannelsView;
