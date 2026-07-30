import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiHeart, FiSend, FiChevronLeft, FiChevronRight, FiEye, FiPlay, FiPause } from 'react-icons/fi';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
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

const StatusViewer = ({ status, onClose }) => {
  const { user } = useAuth();
  const { statuses, sendMessage, chats, selectChat, viewStatusItem } = useChat();
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);

  // Find the fresh live status object from context
  const liveStatus = statuses.find(s => s.id === status.id || s._id === status._id || s.userId === status.userId) || status;
  const currentItem = liveStatus.items[itemIndex];

  // Record view if viewed other user's status
  useEffect(() => {
    if (!currentItem) return;
    const isMyStatus = liveStatus.userId === user?._id || liveStatus.userId === user?.id || liveStatus.userId === 'user_me';
    if (!isMyStatus) {
      viewStatusItem(liveStatus.id || liveStatus._id, currentItem._id || currentItem.id);
    }
  }, [itemIndex, liveStatus, user]);

  // Story Auto-progress Timer
  useEffect(() => {
    if (isPaused) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNext();
          return 0;
        }
        return prev + 1;
      });
    }, 50); // 50ms * 100 = 5000ms (5 seconds per story segment)

    return () => clearInterval(interval);
  }, [itemIndex, liveStatus, isPaused]);

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        toast(isPaused ? "Story Resumed" : "Story Paused", { id: 'status_pause_hint', icon: '⏱️' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemIndex, liveStatus, isPaused]);

  const handleNext = () => {
    if (itemIndex < liveStatus.items.length - 1) {
      setItemIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (itemIndex > 0) {
      setItemIndex(prev => prev - 1);
    }
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    // Find the direct conversation with the status author
    const authorChat = chats.find(c => c.type === 'direct' && c.user && (c.user.id === liveStatus.userId || c.user._id === liveStatus.userId));
    
    if (authorChat) {
      selectChat(authorChat.id);
      sendMessage(`Replied to status story: "${replyText}"`, 'text');
    } else {
      sendMessage(`Replied to status story: "${replyText}"`, 'text');
    }

    setReplyText('');
    toast.success('Reply sent securely!');
    onClose();
  };

  const handleQuickReaction = (emoji) => {
    const authorChat = chats.find(c => c.type === 'direct' && c.user && (c.user.id === liveStatus.userId || c.user._id === liveStatus.userId));
    
    if (authorChat) {
      selectChat(authorChat.id);
      sendMessage(`Reacted ${emoji} to status story`, 'text');
    } else {
      sendMessage(`Reacted ${emoji} to status story`, 'text');
    }

    toast.success(`Reacted ${emoji}!`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none"
      >
        <div 
          className="relative w-full max-w-sm h-[96vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black flex flex-col"
          style={{ background: '#0a0e1a' }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          
          {/* Top Panel (absolute): Progress bars + User info */}
          <div className="absolute top-0 left-0 right-0 z-30 px-5 pt-5 pb-4 flex flex-col gap-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
            {/* Progress Bars */}
            <div className="flex gap-1.5 w-full">
              {liveStatus.items.map((item, idx) => (
                <div key={item.id || item._id} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{
                      width: idx < itemIndex ? '100%' : idx === itemIndex ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header User info */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src={liveStatus.userAvatar} alt="" className="w-9 h-9 rounded-full border-2 border-white/20 shadow" />
                <div>
                  <h4 className="text-sm font-bold text-white font-display">{liveStatus.userName}</h4>
                  <p className="text-[10px] text-white/60">{formatStatusTime(currentItem?.createdAt) || currentItem?.timestamp || 'Just now'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                  title={isPaused ? 'Play Story' : 'Pause Story'}
                >
                  {isPaused ? <FiPlay size={12} /> : <FiPause size={12} />}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Center Story Display Panel */}
          <div className="absolute inset-0 flex items-center justify-center select-none" style={{ top: '90px', bottom: '160px' }}>
            {/* Navigation click shields */}
            <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer z-20" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
            <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer z-20" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

            {/* Content Display Card */}
            {currentItem?.type === 'text' ? (() => {
              // Parse the stored background field (may be JSON with style info, or plain color/gradient)
              let bgStyle = currentItem?.background || 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)';
              let fontClass = 'font-sans';
              let fontSizeClass = 'text-2xl';
              let textColor = '#ffffff';
              try {
                const parsed = JSON.parse(currentItem.background);
                bgStyle = parsed.background || bgStyle;
                fontClass = parsed.font || fontClass;
                fontSizeClass = parsed.fontSize || fontSizeClass;
                textColor = parsed.textColor || textColor;
              } catch {}

              return (
                <motion.div
                  key={currentItem?.id || currentItem?._id || 'empty'}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="w-full h-full rounded-2xl flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden border border-white/5"
                  style={{ background: bgStyle }}
                >
                  {/* Decorative blobs */}
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/5 filter blur-2xl pointer-events-none" />
                  <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-black/10 filter blur-2xl pointer-events-none" />

                  <p
                    className={`font-bold leading-relaxed z-10 px-8 ${fontSizeClass} ${fontClass}`}
                    style={{ color: textColor, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
                  >
                    {currentItem?.content}
                  </p>
                </motion.div>
              );
            })() : currentItem?.type === 'video' ? (
              <motion.div
                key={currentItem?.id || currentItem?._id}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-end border border-white/5 bg-slate-950"
              >
                <video
                  src={getFullImageUrl(currentItem?.mediaUrl)}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  autoPlay
                  muted={false}
                  loop
                  playsInline
                  controls={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 z-10" />
                {currentItem?.caption && (
                  <div className="relative z-20 pb-6 px-5">
                    <p className="text-sm text-white font-semibold text-center leading-relaxed drop-shadow-xl">
                      {currentItem.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={currentItem?.id || currentItem?._id}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-end border border-white/5 bg-slate-950"
              >
                <img
                  src={getFullImageUrl(currentItem?.mediaUrl)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  style={{ imageRendering: 'high-quality' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 z-10" />
                {currentItem?.caption && (
                  <div className="relative z-20 pb-6 px-5">
                    <p className="text-sm text-white font-semibold text-center leading-relaxed drop-shadow-xl">
                      {currentItem.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom Panel (absolute): Reactions + Viewers + Reply bar */}
          <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-6 pt-8 flex flex-col gap-3 items-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80), transparent)' }}>

            {/* Quick Reactions Bar */}
            <div className="flex gap-2 bg-black/50 backdrop-blur-md border border-white/10 py-1.5 px-3 rounded-full shadow-xl">
              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleQuickReaction(emoji); }}
                  className="text-base hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Views badge */}
            {(() => {
              const isMyStatus = liveStatus.userId === user?._id || liveStatus.userId === user?.id || liveStatus.userId === 'user_me';
              return isMyStatus ? (
                <div className="flex flex-col items-center gap-1 relative">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowViewersList(!showViewersList); }}
                    className="flex items-center gap-1.5 bg-black/40 backdrop-blur border border-white/10 hover:border-emerald-500/30 px-3 py-1 rounded-full text-[10px] text-white/60 hover:text-white select-none cursor-pointer transition-colors"
                  >
                    <FiEye size={11} className="text-emerald-400" />
                    <span>{currentItem?.views?.length || 0} views</span>
                  </button>
                  {showViewersList && (
                    <div className="absolute bottom-full mb-2 bg-[#0a0e1a]/95 border border-white/10 rounded-2xl p-3 w-52 max-h-36 overflow-y-auto shadow-2xl flex flex-col gap-2 text-left z-30 backdrop-blur">
                      <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 pb-1.5">Seen by</p>
                      {currentItem?.views && currentItem.views.length > 0 ? (
                        currentItem.views.map(viewer => (
                          <div key={viewer._id || viewer.id} className="flex items-center gap-2">
                            <img src={viewer.avatar} className="w-5 h-5 rounded-full border border-white/10" alt="" />
                            <span className="text-[11px] font-semibold text-white/80 truncate">{viewer.name || viewer.username}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-white/30 italic text-center py-1">No views yet</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-[10px] text-white/50 select-none">
                  <FiEye size={11} />
                  <span>Viewed</span>
                </div>
              );
            })()}

            {/* Reply form */}
            <form onSubmit={handleReplySubmit} className="flex gap-2 w-full items-center">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${liveStatus.userName.split(' ')[0]}…`}
                className="flex-1 px-4 py-2.5 bg-black/50 backdrop-blur border border-white/10 rounded-2xl text-white text-xs focus:border-emerald-500/40 outline-none transition-colors placeholder:text-white/30 font-sans"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center text-slate-950 transition-all cursor-pointer shrink-0 shadow-lg shadow-emerald-500/30"
              >
                <FiSend size={14} />
              </button>
            </form>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusViewer;
