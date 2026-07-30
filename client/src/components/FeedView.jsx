import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiRss, FiPlus, FiImage, FiVideo, FiHeart, FiMessageSquare,
  FiShare2, FiTrash2, FiSend, FiRefreshCw, FiCheck, FiCopy,
  FiGlobe, FiTag, FiX, FiPlay, FiPause, FiMaximize, FiMoreHorizontal,
  FiFilter, FiUser, FiInbox, FiUploadCloud, FiLink
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

const API = '/api/feed';
const UPLOAD_API = '/api/upload';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'just now';
  const now = new Date();
  const date = new Date(dateStr);
  const diffInSec = Math.floor((now - date) / 1000);
  if (diffInSec < 60) return 'just now';
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const EmptyFeed = ({ filter, onReset }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center select-none">
    <div className="p-4 rounded-full bg-slate-900 border border-blue-500/20 mb-3">
      <FiInbox size={26} className="text-blue-500 dark:text-blue-400" />
    </div>
    <p className="text-sm font-semibold text-slate-100">No posts in this view</p>
    <p className="text-xs text-slate-400 mt-1">Be the first to share an update, photo, or video!</p>
    {filter !== 'all' && (
      <button onClick={onReset} className="mt-4 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors">
        View All Posts →
      </button>
    )}
  </div>
);

const FeedView = () => {
  const { user } = useAuth();
  const chatContext = useChat?.();
  const socket = chatContext?.socket;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'media' | 'my'
  const [selectedTag, setSelectedTag] = useState('');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedPostId = searchParams.get('post');

  // Post Creator State
  const [postText, setPostText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('none'); // 'none' | 'image' | 'video'
  const [tagInput, setTagInput] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Hidden File Inputs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Active Comments Drawer Toggle
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});

  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    fetchPosts();
  }, [filter, selectedTag, sharedPostId]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data) => {
      if (data.post) {
        setPosts(prev => [data.post, ...prev]);
        toast.success(`📢 New post by ${data.post.author?.name || 'someone'}`);
      }
    };

    const handlePostLiked = (data) => {
      setPosts(prev => prev.map(p => {
        if (p._id === data.postId) {
          return {
            ...p,
            likes: data.isLiked
              ? [...p.likes, data.userId]
              : p.likes.filter(id => (id._id || id) !== data.userId)
          };
        }
        return p;
      }));
    };

    const handleCommentAdded = (data) => {
      if (data.postId && data.comments) {
        setPosts(prev => prev.map(p => p._id === data.postId ? { ...p, comments: data.comments } : p));
      }
    };

    socket.on('feed_post_created', handleNewPost);
    socket.on('feed_post_liked', handlePostLiked);
    socket.on('feed_comment_added', handleCommentAdded);

    return () => {
      socket.off('feed_post_created', handleNewPost);
      socket.off('feed_post_liked', handlePostLiked);
      socket.off('feed_comment_added', handleCommentAdded);
    };
  }, [socket]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      if (sharedPostId) {
        // Fetch only single shared post
        const res = await axios.get(`${API}/${sharedPostId}`);
        if (res.data) {
          setPosts([res.data]);
        } else {
          setPosts([]);
        }
      } else {
        let url = `${API}?`;
        if (filter === 'media') url += 'filter=media&';
        if (selectedTag) url += `tag=${encodeURIComponent(selectedTag)}&`;
        
        const res = await axios.get(url);
        let list = res.data || [];
        
        if (filter === 'my') {
          list = list.filter(p => (p.author?._id || p.author) === currentUserId);
        }
        
        setPosts(list);
      }
    } catch (err) {
      console.warn('Failed to fetch feed:', err);
      if (sharedPostId) {
        toast.error('Shared post not found or deleted');
        setSearchParams({});
      }
    } finally {
      setLoading(false);
    }
  };

  // Device file upload handler
  const handleDeviceFileUpload = async (file, forcedType) => {
    if (!file) return;
    setUploadingMedia(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const fileData = reader.result;
          const res = await axios.post(UPLOAD_API, {
            fileData,
            fileName: file.name,
            mimeType: file.type
          }, { headers: headers() });

          const uploadedUrl = res.data.url || res.data.secure_url;
          const type = forcedType || res.data.mediaType || (file.type.startsWith('video/') ? 'video' : 'image');

          setMediaUrl(uploadedUrl);
          setMediaType(type);
          toast.success('Media uploaded successfully!', { id: toastId });
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to upload file', { id: toastId });
        } finally {
          setUploadingMedia(false);
        }
      };
    } catch (err) {
      toast.error('File reading failed', { id: toastId });
      setUploadingMedia(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && !mediaUrl.trim()) {
      return toast.error('Add text or media to your post');
    }

    setPublishing(true);
    try {
      const payload = {
        text: postText.trim(),
        mediaUrl: mediaUrl.trim(),
        mediaType,
        tags: tagInput ? tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean) : []
      };

      const res = await axios.post(API, payload, { headers: headers() });
      toast.success('Post published!');

      if (socket && res.data.post) {
        socket.emit('feed_new_post', { post: res.data.post });
      }

      setPostText('');
      setMediaUrl('');
      setMediaType('none');
      setTagInput('');
      setShowUrlInput(false);

      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const handleLikeToggle = async (postId) => {
    try {
      const res = await axios.post(`${API}/${postId}/like`, {}, { headers: headers() });
      
      setPosts(prev => prev.map(p => {
        if (p._id === postId) {
          const isLiked = res.data.isLiked;
          const updatedLikes = isLiked
            ? [...p.likes, currentUserId]
            : p.likes.filter(id => (id._id || id) !== currentUserId);
          return { ...p, likes: updatedLikes };
        }
        return p;
      }));

      if (socket) {
        socket.emit('feed_like_toggle', { postId, isLiked: res.data.isLiked, userId: currentUserId });
      }
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setSubmittingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await axios.post(`${API}/${postId}/comment`, { text }, { headers: headers() });
      toast.success('Comment posted!');

      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));

      if (socket) {
        socket.emit('feed_new_comment', { postId, comments: res.data.comments });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await axios.delete(`${API}/${postId}/comment/${commentId}`, { headers: headers() });
      toast.success('Comment deleted');
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleSharePost = async (post) => {
    try {
      const res = await axios.post(`${API}/${post._id}/share`, {}, { headers: headers() });
      await navigator.clipboard.writeText(res.data.shareUrl || `${window.location.origin}/feed?post=${post._id}`);
      toast.success('Post link copied to clipboard!');
      
      setPosts(prev => prev.map(p => p._id === post._id ? { ...p, sharesCount: res.data.sharesCount } : p));
    } catch (err) {
      toast.error('Failed to share post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/${postId}`, { headers: headers() });
      toast.success('Post deleted');
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const toggleCommentsDrawer = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col overflow-hidden relative font-sans text-slate-100">
      {/* Blue Radial Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-100"
        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.08) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      {/* Hidden Device File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={e => e.target.files?.[0] && handleDeviceFileUpload(e.target.files[0], 'image')}
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        onChange={e => e.target.files?.[0] && handleDeviceFileUpload(e.target.files[0], 'video')}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="shrink-0 p-4 pb-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2 font-display">
                <FiRss size={18} className="text-blue-500 dark:text-blue-400" /> Community Feed
              </h1>
              <p className="text-[10px] text-slate-400">Share updates, photos, videos, and connect live</p>
            </div>
            <button onClick={fetchPosts} className="p-2 rounded-xl bg-slate-900 border border-blue-500/20 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-all cursor-pointer">
              <FiRefreshCw size={14} />
            </button>
          </div>

          {/* Filter Tabs (Blue & White Only) */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-blue-500/20 overflow-x-auto no-scrollbar gap-1 mb-4">
            {[
              { key: 'all', label: 'All Posts', icon: <FiRss size={13} /> },
              { key: 'media', label: 'Photos & Videos', icon: <FiVideo size={13} /> },
              { key: 'my', label: 'My Posts', icon: <FiUser size={13} /> }
            ].map(tab => (
              <button key={tab.key} onClick={() => { setFilter(tab.key); setSelectedTag(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 ${
                  filter === tab.key && !selectedTag && !sharedPostId ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-400 hover:text-slate-100 hover:bg-blue-500/10'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
            {selectedTag && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30">
                #{selectedTag}
                <button onClick={() => setSelectedTag('')} className="hover:text-blue-800 dark:hover:text-white cursor-pointer ml-1"><FiX size={10} /></button>
              </span>
            )}
            {sharedPostId && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30">
                Viewing Shared Post
                <button onClick={() => setSearchParams({})} className="hover:text-blue-800 dark:hover:text-white cursor-pointer ml-1"><FiX size={10} /></button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar z-10">
        <div className="max-w-2xl mx-auto p-4 pt-0 space-y-4">

          {/* Post Creator Box */}
          {!sharedPostId && (
            <div className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 dark:bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-white shrink-0 shadow-md">
                  {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="What's on your mind? Upload a photo, video or write a post..."
                  rows={2}
                  className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-400 outline-none resize-none"
                />
              </div>

              {/* URL Fallback Input Drawer */}
              {showUrlInput && (
                <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Media Link URL</span>
                    <button onClick={() => { setShowUrlInput(false); setMediaUrl(''); setMediaType('none'); }} className="text-slate-400 hover:text-slate-100 cursor-pointer">
                      <FiX size={12} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={e => {
                      setMediaUrl(e.target.value);
                      if (mediaType === 'none') setMediaType('image');
                    }}
                    placeholder="Paste direct Image URL or Video URL"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-blue-500/20 rounded-lg text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>
              )}

              {/* Media Upload Loading / Preview Box */}
              {uploadingMedia && (
                <div className="p-4 bg-slate-950 border border-blue-500/30 rounded-xl flex items-center justify-center gap-2 text-xs text-blue-500 dark:text-blue-400 font-medium">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span>Uploading file from device...</span>
                </div>
              )}

              {!uploadingMedia && mediaUrl && (
                <div className="relative rounded-xl overflow-hidden border border-blue-500/30 bg-slate-950 max-h-60 flex items-center justify-center">
                  {mediaType === 'video' || mediaUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) ? (
                    <video src={mediaUrl} controls className="max-h-60 w-full object-contain" />
                  ) : (
                    <img src={mediaUrl} alt="" className="max-h-60 w-full object-contain" onError={e => e.target.style.display = 'none'} />
                  )}
                  <button onClick={() => { setMediaUrl(''); setMediaType('none'); }}
                    className="absolute top-2 right-2 p-1.5 bg-blue-950/80 border border-blue-500/30 rounded-full text-white hover:bg-blue-900 cursor-pointer transition-all">
                    <FiX size={13} />
                  </button>
                </div>
              )}

              {/* Tags Input */}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Tags (comma separated e.g. tech, design, update)"
                className="w-full px-3 py-1.5 bg-slate-950 border border-blue-500/20 rounded-xl text-[10px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400"
              />

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-blue-500/10 pt-2">
                <div className="flex gap-2 flex-wrap">
                  {/* Upload Image File Button */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-blue-500/20 hover:border-blue-400 text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <FiImage size={13} className="text-blue-500 dark:text-blue-400" /> Photo File
                  </button>

                  {/* Upload Video File Button */}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-blue-500/20 hover:border-blue-400 text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <FiVideo size={13} className="text-blue-500 dark:text-blue-400" /> Video File
                  </button>

                  {/* Media URL Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-blue-500/20 text-[10px] text-slate-500 hover:text-blue-500 transition-all cursor-pointer"
                  >
                    <FiLink size={12} /> Link
                  </button>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={publishing || uploadingMedia || (!postText.trim() && !mediaUrl.trim())}
                  className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                >
                  {publishing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={12} />}
                  <span>Post</span>
                </button>
              </div>
            </div>
          )}

          {/* Posts Stream */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <EmptyFeed filter={filter} onReset={() => { setFilter('all'); setSelectedTag(''); setSearchParams({}); }} />
          ) : (
            posts.map(post => {
              const isLiked = post.likes?.some(id => (id._id || id) === currentUserId);
              const likesCount = post.likes?.length || 0;
              const commentsCount = post.comments?.length || 0;
              const isOwner = (post.author?._id || post.author) === currentUserId;

              return (
                <div key={post._id} className="p-4 bg-slate-900 border border-blue-500/20 rounded-2xl space-y-3 transition-all hover:border-blue-500/40 shadow-xl">
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 dark:bg-blue-900/40 border border-blue-500/30 overflow-hidden flex items-center justify-center font-bold text-xs text-blue-600 dark:text-white shrink-0">
                        {post.author?.avatar ? (
                          <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (post.author?.name || post.author?.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{post.author?.name || 'Anonymous'}</h4>
                        <p className="text-[9px] text-slate-400">@{post.author?.username || 'user'} • {formatTimeAgo(post.createdAt)}</p>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => handleDeletePost(post._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-blue-500/20 cursor-pointer transition-all">
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Post Text */}
                  {post.text && (
                    <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                  )}

                  {/* Media Content */}
                  {post.mediaUrl && (
                    <div className="rounded-xl overflow-hidden border border-blue-500/20 bg-slate-950 max-h-96 flex items-center justify-center">
                      {post.mediaType === 'video' || post.mediaUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) ? (
                        <video src={post.mediaUrl} controls className="max-h-96 w-full object-contain" />
                      ) : (
                        <img src={post.mediaUrl} alt="" className="max-h-96 w-full object-contain" onError={e => e.target.style.display = 'none'} />
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.tags.map(t => (
                        <button key={t} onClick={() => setSelectedTag(t)}
                          className="text-[9px] px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-500/30 hover:text-white transition-all cursor-pointer font-medium">
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Bar (Like, Comment, Share) */}
                  <div className="flex items-center justify-between border-t border-blue-500/10 pt-2 text-[10px]">
                    <div className="flex gap-3">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLikeToggle(post._id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer font-bold border ${
                          isLiked 
                            ? 'text-white bg-blue-600 border-blue-500 shadow-md shadow-blue-600/20' 
                            : 'text-blue-600 dark:text-blue-300 bg-slate-950 border-blue-500/20 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20'
                        }`}
                      >
                        <FiHeart size={14} className={isLiked ? 'fill-current' : ''} />
                        <span>{likesCount}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        onClick={() => toggleCommentsDrawer(post._id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-blue-600 dark:text-blue-300 bg-slate-950 border border-blue-500/20 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-all cursor-pointer font-bold border"
                      >
                        <FiMessageSquare size={14} />
                        <span>{commentsCount}</span>
                      </button>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-blue-600 dark:text-blue-300 bg-slate-950 border border-blue-500/20 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600/20 transition-all cursor-pointer font-bold border"
                    >
                      <FiShare2 size={14} />
                      <span>{post.sharesCount || 0}</span>
                    </button>
                  </div>

                  {/* Collapsible Comments Section */}
                  {expandedComments[post._id] && (
                    <div className="pt-3 space-y-3 border-t border-blue-500/10">
                      {/* Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[post._id] || ''}
                          onChange={e => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post._id)}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-blue-500/20 rounded-xl text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400"
                        />
                        <button
                          onClick={() => handleAddComment(post._id)}
                          disabled={submittingComment[post._id] || !commentInputs[post._id]?.trim()}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                        >
                          {submittingComment[post._id] ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={11} />}
                        </button>
                      </div>

                      {/* Comment List */}
                      {post.comments?.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                          {post.comments.map(c => {
                            const isCommentOwner = (c.userId?._id || c.userId) === currentUserId;
                            return (
                              <div key={c._id} className="p-2.5 bg-slate-950 rounded-xl border border-blue-500/20 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-100">{c.userId?.name || 'User'}</span>
                                    <span className="text-[8px] text-blue-500/70 dark:text-blue-300/70">{formatTimeAgo(c.createdAt)}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-200 mt-0.5 leading-normal">{c.text}</p>
                                </div>
                                {isCommentOwner && (
                                  <button onClick={() => handleDeleteComment(post._id, c._id)} className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0">
                                    <FiTrash2 size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-2">No comments yet. Be the first to reply!</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedView;
