import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat, resolveMediaUrl } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiPhone, FiVideo, FiPaperclip, FiSmile, FiMic, FiSend, 
  FiMoreVertical, FiSearch, FiCheck, FiCornerUpLeft, FiEdit, FiTrash2,
  FiStar, FiCheckSquare, FiAlertCircle, FiX, FiBookmark, FiArrowDown,
  FiImage, FiFileText, FiMapPin, FiRadio, FiCalendar, FiInfo,
  FiDownload, FiShare2, FiPlay, FiPause, FiHelpCircle, FiMessageSquare,
  FiVolumeX, FiVolume2, FiLock, FiGlobe, FiCopy, FiShield, FiArrowUp, 
  FiCheckCircle, FiUploadCloud, FiLayers, FiClock, FiEye, FiEyeOff,
  FiCpu, FiBriefcase, FiRefreshCw, FiZap, FiCode, FiSlash,
  FiChevronUp, FiChevronDown
} from 'react-icons/fi';
import { filterMessages, SEARCH_CATEGORIES } from '../utils/messageSearch';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import StickerPicker from './StickerPicker';
import GifPicker from './GifPicker';
import { getAvatarSvg } from '../data/mockData';
import TasksView from './TasksView';
import appLogo from '../assets/logo.svg';

// ==========================================
// 1. AudioPlayer Sub-Component
// ==========================================
const AudioPlayer = React.memo(({ src, duration, waveform }) => {
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    if (src) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const changeSpeed = () => {
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;
    
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-950/40 py-2 px-3 rounded-xl border border-white/5 min-w-[200px]" aria-label="Audio voice note player">
      <button 
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-slate-950 active:scale-90 transition-transform cursor-pointer"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <FiPause size={12} fill="currentColor" /> : <FiPlay size={12} fill="currentColor" />}
      </button>
      
      <div className="flex-1">
        {/* Sound waves bars */}
        <div className="flex items-end h-5 gap-[2px]">
          {(waveform && waveform.length > 0 ? waveform : [0.25, 0.6, 0.9, 0.7, 0.4, 0.2, 0.55, 0.95, 0.8, 0.35, 0.5, 0.75, 0.3, 0.45]).map((val, i) => (
            <div 
              key={i} 
              className={`w-[2px] rounded-full transition-colors ${playing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} 
              style={{ height: `${Math.max(10, val * 100)}%` }} 
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1 select-none">
          <button onClick={changeSpeed} className="hover:text-emerald-500 font-bold bg-slate-900/60 px-1 py-0.5 rounded cursor-pointer" aria-label="Adjust speed">
            {playbackRate}x
          </button>
          <span>{duration || '0:05'}</span>
        </div>
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

// ==========================================
// 2. ChatSkeleton / LoadingState Sub-Component
// ==========================================
const ChatSkeleton = () => {
  return (
    <div className="flex-1 h-full bg-[#0B141A] flex flex-col justify-between overflow-hidden relative select-none animate-pulse">
      {/* Header Skeleton */}
      <div className="py-4 px-6 border-b border-white/5 bg-[#202C33]/90 flex justify-between items-center z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#2A3942]" />
          <div className="space-y-2">
            <div className="w-28 h-4 bg-[#2A3942] rounded animate-pulse" />
            <div className="w-20 h-3 bg-[#202C33] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2A3942]" />
          <div className="w-10 h-10 rounded-full bg-[#2A3942]" />
          <div className="w-10 h-10 rounded-full bg-[#2A3942]" />
        </div>
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-2 max-w-[60%] mr-auto">
          <div className="h-10 bg-[#202C33] border border-transparent rounded-2xl rounded-tl-none animate-pulse" />
          <div className="w-12 h-2.5 bg-[#111B21] rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 max-w-[60%] ml-auto items-end">
          <div className="h-14 w-80 bg-[#1E40AF]/30 border border-transparent rounded-2xl rounded-tr-none animate-pulse" />
          <div className="w-12 h-2.5 bg-[#111B21] rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 max-w-[60%] mr-auto">
          <div className="h-8 w-44 bg-[#202C33] border border-transparent rounded-2xl rounded-tl-none animate-pulse" />
          <div className="w-12 h-2.5 bg-[#111B21] rounded animate-pulse" />
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="p-4 border-t border-white/5 bg-[#0B141A]/95 flex gap-3">
        <div className="flex-1 h-12 rounded-2xl bg-[#202C33]/90" />
      </div>
    </div>
  );
};

// ==========================================
// 3. EmptyConversation Sub-Component
// ==========================================
const EmptyConversation = ({ onAction }) => {
  return (
    <div className="flex-1 h-full bg-[#0B141A] flex flex-col justify-center items-center text-center p-6 select-none relative overflow-y-auto">
      <div className="absolute inset-0 opacity-[0.012] pointer-events-none" style={{ backgroundImage: "radial-gradient(#2563EB 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      
      <div className="max-w-md bg-[#202C33]/60 border border-white/5 rounded-2xl p-8 shadow-2xl backdrop-blur-xl space-y-6 flex flex-col items-center">
        <div className="w-14 h-14 bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-[#2563EB]/5">
          <FiMessageSquare size={26} />
        </div>
        
        <div>
          <h3 className="text-[18px] font-bold font-display text-[#E9EDEF] mb-2">Secure Channel Initialized</h3>
          <p className="text-[#8696A0] text-[13px] leading-relaxed max-w-xs mx-auto">
            You are at the start of a private, end-to-end encrypted messaging session. Say hello to begin syncing.
          </p>
        </div>

        {/* Encryption badge */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] rounded-lg text-[11px] font-bold uppercase tracking-wider select-none">
          <FiLock size={11} /> End-To-End Encrypted (TLS)
        </div>

        {/* Suggested Action Pills */}
        <div className="w-full space-y-2.5 pt-2">
          <p className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider text-left pl-1">Suggested Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => onAction('hello')}
              className="py-2.5 px-3 bg-[#2A3942]/30 hover:bg-[#2A3942]/60 active:scale-98 border border-white/5 rounded-xl text-left text-[13px] text-[#E9EDEF] font-medium transition-all flex items-center justify-between cursor-pointer group"
            >
              <span>Say Hello 👋</span>
              <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </button>
            <button 
              onClick={() => onAction('gif')}
              className="py-2.5 px-3 bg-[#2A3942]/30 hover:bg-[#2A3942]/60 active:scale-98 border border-white/5 rounded-xl text-left text-[13px] text-[#E9EDEF] font-medium transition-all flex items-center justify-between cursor-pointer group"
            >
              <span>Send a GIF 🌌</span>
              <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </button>
            <button 
              onClick={() => onAction('location')}
              className="py-2.5 px-3 bg-[#2A3942]/30 hover:bg-[#2A3942]/60 active:scale-98 border border-white/5 rounded-xl text-left text-[13px] text-[#E9EDEF] font-medium transition-all flex items-center justify-between cursor-pointer group"
            >
              <span>Share Location 📍</span>
              <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </button>
            <button 
              onClick={() => onAction('tips')}
              className="py-2.5 px-3 bg-[#2A3942]/30 hover:bg-[#2A3942]/60 active:scale-98 border border-white/5 rounded-xl text-left text-[13px] text-[#E9EDEF] font-medium transition-all flex items-center justify-between cursor-pointer group"
            >
              <span>Show Chat Tips 💡</span>
              <span className="text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 4. Main ChatWindow Component
// ==========================================
const ChatWindow = () => {
  const { user: me, updateTheme } = useAuth();
  const { 
    selectedChat, 
    selectedChatId,
    typingStatus, 
    initiateCall, 
    setIsRightPanelOpen, 
    isRightPanelOpen,
    sendMessage,
    deleteMessage,
    editMessage,
    addReaction,
    votePoll,
    toggleStarMessage,
    pinMessage,
    clearChatHistory,
    setChatDisappearing,
    setRightPanelTab,
    chats,
    openViewOnceMessage,
    startDirectChat,
    mockSocket
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('chat'); // 'chat' | 'media' | 'tasks'
  const [convertTaskData, setConvertTaskData] = useState(null); // { text, messageId }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' | 'gif' | 'sticker'
  
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [viewOnceActive, setViewOnceActive] = useState(false);
  const [viewOnceModalMedia, setViewOnceModalMedia] = useState(null); // { url, type, id }
  
  // Custom Header More Menu states
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'wallpaper' | 'disappearing' | null
  const [localMuted, setLocalMuted] = useState(false);

  // Voice Recording simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [localRecording, setLocalRecording] = useState(false); // Emits recording status

  // Message actions context menu
  const [contextMenuMsg, setContextMenuMsg] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [replyingToMsg, setReplyingToMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);

  const [showReactionsMsgId, setShowReactionsMsgId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [deleteTargetMsg, setDeleteTargetMsg] = useState(null); // message pending delete confirmation
  const [forwardMsg, setForwardMsg] = useState(null); // message to forward
  const [fwdSearchQuery, setFwdSearchQuery] = useState('');
  const [fwdSearchResults, setFwdSearchResults] = useState([]);
  const [fwdLoading, setFwdLoading] = useState(false);

  // Inline in-chat search bar (Ctrl+F / header search icon)
  const [inlineSearchOpen, setInlineSearchOpen] = useState(false);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const [inlineSearchCategory, setInlineSearchCategory] = useState('all');
  const [inlineSearchStarred, setInlineSearchStarred] = useState(false);
  const [inlineMatchIndex, setInlineMatchIndex] = useState(0);
  const inlineSearchInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Auto-fill input from router navigation state (e.g. purchase order from BusinessPublicProfile)
  useEffect(() => {
    if (location.state?.prefilledMessage) {
      setInputText(location.state.prefilledMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.prefilledMessage, location.pathname, navigate]);

  // Reset forward search when modal is closed
  useEffect(() => {
    if (!forwardMsg) {
      setFwdSearchQuery('');
      setFwdSearchResults([]);
      setFwdLoading(false);
    }
  }, [forwardMsg]);

  // Debounced search for global contacts/users
  useEffect(() => {
    if (!fwdSearchQuery.trim()) {
      setFwdSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setFwdLoading(true);
      try {
        const response = await axios.get(`/api/users/search?q=${fwdSearchQuery}`);
        if (response.data) {
          const existingUserIds = chats
            .filter(c => c.type === 'direct' && c.user)
            .map(c => (c.user.id || c.user._id || '').toString());
          
          const filteredUsers = response.data.filter(u => {
            const userIdStr = (u.id || u._id || '').toString();
            return userIdStr !== (me?.id || me?._id || '').toString() && !existingUserIds.includes(userIdStr);
          });
          setFwdSearchResults(filteredUsers);
        }
      } catch (err) {
        console.error('Failed to search users in forward modal:', err);
      } finally {
        setFwdLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [fwdSearchQuery, chats, me]);

  // Message highlight logic
  const highlightMessage = useCallback((msgId) => {
    setTimeout(() => {
      const el = document.getElementById(msgId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-emerald-500/20');
        el.classList.add('border-emerald-500/40');
        el.classList.add('shadow-[0_0_15px_rgba(16,185,129,0.2)]');
        setTimeout(() => {
          el.classList.remove('bg-emerald-500/20');
          el.classList.remove('border-emerald-500/40');
          el.classList.remove('shadow-[0_0_15px_rgba(16,185,129,0.2)]');
        }, 3000);
      }
    }, 300);
  }, []);

  // Inline search: list of matching message ids (in chat order) over the
  // currently-loaded messages, using the shared filter helper.
  const inlineSearchMatches = useMemo(() => {
    const q = inlineSearchQuery.trim();
    if (!inlineSearchOpen) return [];
    if (!q && inlineSearchCategory === 'all' && !inlineSearchStarred) return [];
    return filterMessages(selectedChat?.messages || [], {
      query: q,
      category: inlineSearchCategory,
      starred: inlineSearchStarred,
    }).map((m) => m.id || m._id);
  }, [inlineSearchOpen, inlineSearchQuery, inlineSearchCategory, inlineSearchStarred, selectedChat?.messages]);

  // Jump to a match by index (wraps around) and flash it.
  const goToInlineMatch = useCallback((index) => {
    const list = inlineSearchMatches;
    if (!list.length) return;
    const clamped = ((index % list.length) + list.length) % list.length;
    setInlineMatchIndex(clamped);
    highlightMessage(list[clamped]);
  }, [inlineSearchMatches, highlightMessage]);

  // When the match set changes (new query/filter), jump to the first hit.
  useEffect(() => {
    if (inlineSearchMatches.length) {
      setInlineMatchIndex(0);
      highlightMessage(inlineSearchMatches[0]);
    } else {
      setInlineMatchIndex(0);
    }
  }, [inlineSearchMatches, highlightMessage]);

  // Focus the input whenever the inline bar opens.
  useEffect(() => {
    if (inlineSearchOpen) {
      setTimeout(() => inlineSearchInputRef.current?.focus(), 50);
    }
  }, [inlineSearchOpen]);

  // Listen for router state to highlight search results
  useEffect(() => {
    if (location.state?.highlightMessageId && selectedChat?.messages?.length > 0) {
      highlightMessage(location.state.highlightMessageId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.highlightMessageId, selectedChat?.id, selectedChat?.messages, highlightMessage, navigate, location.pathname]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const scrollContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  const isGroup = selectedChat?.type === 'group';
  const target = selectedChat ? (selectedChat.type === 'group' ? selectedChat.group : selectedChat.user) : null;
  const isCreator = selectedChat?.creator === me?._id || selectedChat?.creator === me?.id || selectedChat?.creator?._id === me?._id || selectedChat?.creator?._id === me?.id;
  const isAdmin = selectedChat?.admins?.includes(me?._id) || selectedChat?.admins?.includes(me?.id) || isCreator;
  const isMessagingBlocked = isGroup && selectedChat?.group?.onlyAdminsCanMessage && !isAdmin;
  const isAiChat = target?.username === 'aether_ai' || selectedChat?.id === 'chat_user_ai' || target?.name === 'Aether AI' || target?.id === 'user_ai';

  // Enhanced AI Features State
  const [aiModel, setAiModel] = useState('gemini-flash'); // 'gemini-flash' | 'gemini-pro' | 'code-copilot' | 'creative'
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Text to Speech (TTS) handler
  const handleSpeakMessage = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      toast('Audio playback stopped');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block snippet omitted.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
    toast.success('Reading AI response aloud 🔊');
  };

  // Copy AI response
  const handleCopyAiText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('AI response copied to clipboard!', { icon: '📋' });
  };

  // Regenerate last AI response
  const handleRegenerateResponse = (aiMsgIndex) => {
    const messages = selectedChat?.messages || [];
    let userPrompt = '';
    for (let i = aiMsgIndex - 1; i >= 0; i--) {
      if (messages[i].senderId !== 'user_ai') {
        userPrompt = messages[i].text;
        break;
      }
    }
    if (userPrompt) {
      sendMessage(userPrompt, 'text');
      toast.success('Regenerating AI response...', { icon: '🔄' });
    } else {
      toast.error('No previous prompt found to regenerate.');
    }
  };

  // Export AI conversation history as Markdown
  const exportAiConversation = () => {
    const messages = selectedChat?.messages || [];
    if (messages.length === 0) {
      toast.error('No messages to export.');
      return;
    }
    let content = `# Aether AI Session Export (${new Date().toLocaleDateString()})\n\n`;
    messages.forEach(m => {
      const sender = m.senderId === 'user_ai' ? 'Aether AI' : (me?.name || 'User');
      content += `### ${sender} [${m.timestamp}]\n${m.text}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aether_ai_chat_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('AI transcript exported!', { icon: '📥' });
  };

  // Robust inline markdown renderer (bold, italic, code, links)
  const renderInlineMarkdown = (rawLine) => {
    if (!rawLine) return null;
    // Split by code spans, bold, italic
    const parts = [];
    let remaining = rawLine;
    let key = 0;

    // We'll do a simple sequential parse
    const patterns = [
      { re: /`([^`]+)`/g, render: (m, g1) => <code key={key++} className="bg-[#0a0f1e] border border-cyan-500/20 rounded px-1.5 py-0.5 text-[12.5px] text-cyan-300 font-mono mx-0.5">{g1}</code> },
      { re: /\*\*(.+?)\*\*/g, render: (m, g1) => <strong key={key++} className="font-bold text-white">{g1}</strong> },
      { re: /\*(.+?)\*/g, render: (m, g1) => <em key={key++} className="italic text-slate-300">{g1}</em> },
    ];

    // Combine all patterns into one regex for sequential splitting
    const combined = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;
    const result = [];
    let lastIdx = 0;
    let match;
    while ((match = combined.exec(rawLine)) !== null) {
      if (match.index > lastIdx) {
        result.push(rawLine.slice(lastIdx, match.index));
      }
      if (match[1] !== undefined) {
        result.push(<code key={key++} className="bg-[#0a0f1e] border border-cyan-500/20 rounded px-1.5 py-0.5 text-[12.5px] text-cyan-300 font-mono mx-0.5">{match[1]}</code>);
      } else if (match[2] !== undefined) {
        result.push(<strong key={key++} className="font-bold text-white">{match[2]}</strong>);
      } else if (match[3] !== undefined) {
        result.push(<em key={key++} className="italic text-slate-300">{match[3]}</em>);
      }
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < rawLine.length) result.push(rawLine.slice(lastIdx));
    return result.length > 0 ? result : rawLine;
  };

  // Render AI message with code syntax blocks, markdown, and action buttons
  const renderAiMessageContent = (text, isMe, isAiChat, msgId, msgIdx) => {
    // Fallback for user messages or non-ai chats
    if (!isAiChat || isMe) {
      return (
        <p className="text-[14.5px] font-sans leading-[1.55] whitespace-pre-wrap tracking-[0.01em] break-words">
          {text || ''}
        </p>
      );
    }

    // Null/empty safety
    const safeText = (text || '').toString();
    if (!safeText.trim()) {
      return <p className="text-[14px] text-slate-400 italic">No response received.</p>;
    }

    // ---- Split text into code blocks and text blocks ----
    const segments = [];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(safeText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: safeText.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'code', lang: match[1] || 'code', content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < safeText.length) {
      segments.push({ type: 'text', content: safeText.substring(lastIndex) });
    }

    // ---- Render each text block with markdown line-by-line ----
    const renderTextBlock = (rawText, blockIdx) => {
      const lines = rawText.split('\n');
      const elements = [];
      let listBuffer = [];
      let blockKey = 0;

      const flushList = () => {
        if (listBuffer.length > 0) {
          elements.push(
            <ul key={`ul-${blockIdx}-${blockKey++}`} className="space-y-1 pl-4 my-1">
              {listBuffer.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-200">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>{renderInlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
          listBuffer = [];
        }
      };

      lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // Blank line
        if (!trimmed) {
          flushList();
          elements.push(<div key={`br-${blockIdx}-${lineIdx}`} className="h-2" />);
          return;
        }

        // H1 heading: # ...
        if (/^#\s+(.+)/.test(trimmed)) {
          flushList();
          const content = trimmed.replace(/^#\s+/, '');
          elements.push(
            <h3 key={`h1-${blockIdx}-${lineIdx}`} className="text-[16px] font-extrabold text-white mt-3 mb-1 leading-snug">
              {renderInlineMarkdown(content)}
            </h3>
          );
          return;
        }

        // H2 heading: ## ...
        if (/^##\s+(.+)/.test(trimmed)) {
          flushList();
          const content = trimmed.replace(/^##\s+/, '');
          elements.push(
            <h4 key={`h2-${blockIdx}-${lineIdx}`} className="text-[14.5px] font-bold text-cyan-200 mt-2.5 mb-0.5 leading-snug">
              {renderInlineMarkdown(content)}
            </h4>
          );
          return;
        }

        // H3 heading: ### ...
        if (/^###\s+(.+)/.test(trimmed)) {
          flushList();
          const content = trimmed.replace(/^###\s+/, '');
          elements.push(
            <h5 key={`h3-${blockIdx}-${lineIdx}`} className="text-[13.5px] font-bold text-cyan-300 mt-2 mb-0.5 uppercase tracking-wide">
              {renderInlineMarkdown(content)}
            </h5>
          );
          return;
        }

        // Bullet / unordered list: -, *, •
        if (/^[-*•]\s+(.+)/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, '');
          listBuffer.push(content);
          return;
        }

        // Numbered list: 1. 2. etc
        if (/^\d+\.\s+(.+)/.test(trimmed)) {
          flushList();
          const num = trimmed.match(/^(\d+)\./)?.[1];
          const content = trimmed.replace(/^\d+\.\s+/, '');
          elements.push(
            <div key={`ol-${blockIdx}-${lineIdx}`} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-200 my-0.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center justify-center mt-0.5">{num}</span>
              <span>{renderInlineMarkdown(content)}</span>
            </div>
          );
          return;
        }

        // Horizontal rule: ---
        if (/^[-]{3,}$/.test(trimmed)) {
          flushList();
          elements.push(<hr key={`hr-${blockIdx}-${lineIdx}`} className="border-cyan-500/20 my-2" />);
          return;
        }

        // Normal paragraph line
        flushList();
        elements.push(
          <p key={`p-${blockIdx}-${lineIdx}`} className="text-[14px] leading-[1.7] text-slate-100 break-words">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      });

      flushList();
      return elements;
    };

    return (
      <div className="space-y-1 font-sans min-w-0 w-full">
        {segments.map((seg, sIdx) => {
          if (seg.type === 'code') {
            return (
              <div key={sIdx} className="my-2.5 rounded-xl overflow-hidden border border-cyan-500/30 bg-[#060a14] shadow-lg font-mono text-[13px]">
                <div className="flex justify-between items-center px-3.5 py-1.5 bg-[#0e172a] border-b border-cyan-500/20 text-[11px] text-cyan-300 font-semibold select-none">
                  <span className="uppercase flex items-center gap-1.5">
                    <FiCode size={13} className="text-cyan-400" /> {seg.lang || 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(seg.content);
                      toast.success('Code snippet copied!', { icon: '💻' });
                    }}
                    className="px-2.5 py-0.5 bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-cyan-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <FiCopy size={11} /> Copy Code
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-cyan-100/90 leading-relaxed no-scrollbar bg-[#060a14]">
                  <code>{seg.content}</code>
                </pre>
              </div>
            );
          }
          return (
            <div key={sIdx} className="space-y-1">
              {renderTextBlock(seg.content, sIdx)}
            </div>
          );
        })}

        {/* AI Action toolbar underneath response */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-cyan-500/15 mt-3 select-none text-[11px]">
          <button
            type="button"
            onClick={() => handleCopyAiText(safeText)}
            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-300 hover:text-cyan-100 transition-all flex items-center gap-1 cursor-pointer font-medium"
            title="Copy full response"
          >
            <FiCopy size={12} /> Copy
          </button>
          <button
            type="button"
            onClick={() => handleSpeakMessage(msgId, safeText)}
            className={`px-2.5 py-1 border rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium ${
              speakingMsgId === msgId
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-300 hover:text-cyan-100'
            }`}
            title="Listen to audio"
          >
            {speakingMsgId === msgId ? <FiPause size={12} /> : <FiVolume2 size={12} />}
            {speakingMsgId === msgId ? 'Stop' : 'Speak'}
          </button>
          <button
            type="button"
            onClick={() => handleRegenerateResponse(msgIdx)}
            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-300 hover:text-cyan-100 transition-all flex items-center gap-1 cursor-pointer font-medium"
            title="Regenerate answer"
          >
            <FiRefreshCw size={12} /> Regenerate
          </button>
        </div>
      </div>
    );
  };

  // Real File upload references
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Trigger loading skeleton upon switching chat sessions
  useEffect(() => {
    if (selectedChat?.id) {
      setLocalLoading(true);
      setReplyingToMsg(null);
      setEditingMsg(null);
      setInputText('');
      setShowEmojiPicker(false);
      setShowAttachmentMenu(false);
      setShowMoreMenu(false);
      setActiveSubMenu(null);
      setContextMenuMsg(null);
      setDeleteTargetMsg(null);
      setActiveSubTab('chat');

      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedChat?.id]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Esc: close menus
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        setReplyingToMsg(null);
        setEditingMsg(null);
        setContextMenuMsg(null);
        setDeleteTargetMsg(null);
        setShowMoreMenu(false);
        setActiveSubMenu(null);
      }
      
      // 2. Ctrl + F: Search inside chat (inline bar)
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setInlineSearchOpen(true);
      }

      // 3. Home: scroll to first message
      if (e.key === 'Home') {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }

      // 4. End: scroll to latest message
      if (e.key === 'End') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsRightPanelOpen, setRightPanelTab]);

  // Handle global click to dismiss context menus
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenuMsg) setContextMenuMsg(null);
      if (showMoreMenu) {
        setShowMoreMenu(false);
        setActiveSubMenu(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenuMsg, showMoreMenu]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isFarUp = scrollHeight - clientHeight - scrollTop > 400;
    setShowScrollBtn(isFarUp);
  }, []);

  const addAttachment = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    let type = 'document';
    if (isImage) type = 'image';
    if (isVideo) type = 'video';

    const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;
    
    setAttachments(prev => [...prev, {
      id: Date.now() + Math.random().toString(),
      file,
      previewUrl,
      type,
      name: file.name,
      size: file.size
    }]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(addAttachment);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      Array.from(e.clipboardData.files).forEach(addAttachment);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(addAttachment);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(addAttachment);
    }
  };

  // Auto Scroll to latest message
  const prevMessagesLengthRef = useRef(0);
  const prevChatIdRef = useRef(null);

  useEffect(() => {
    if (!selectedChat) return;

    const messagesCount = selectedChat.messages?.length || 0;
    const isNewMessage = prevChatIdRef.current === selectedChat.id && messagesCount > prevMessagesLengthRef.current;

    // If it's a new message, scroll smoothly; if we just switched chats or loaded, scroll instantly
    if (isNewMessage) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }

    prevMessagesLengthRef.current = messagesCount;
    prevChatIdRef.current = selectedChat.id;
  }, [selectedChat?.id, selectedChat?.messages?.length, localLoading]);

  // Export JSON conversation log to client download
  const exportChatHistory = () => {
    if (!selectedChat?.messages || selectedChat.messages.length === 0) {
      toast.error('No messages in history to export');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedChat.messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chat_export_${selectedChat.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Chat history exported successfully!');
  };

  // Suggested Actions click listener for empty state
  const handleEmptyAction = (action) => {
    if (action === 'hello') {
      sendMessage('Hello! 👋', 'text');
    } else if (action === 'gif') {
      sendMessage('linear-gradient(to right, #2563EB, #1D4ED8)', 'gif');
    } else if (action === 'location') {
      sendMessage('Coordinates shared', 'location', {
        locationName: 'Design Syndicate Sandbox HQ',
        coordinates: '37.7749° N, 122.4194° W'
      });
    } else if (action === 'tips') {
      toast.success('💡 Pro-Tip: Right-click any message to open the actions context menu!');
    }
  };

  // Pre-process and enrich messages with Date Dividers and Sender Groupings
  const processedMessages = useMemo(() => {
    if (!selectedChat?.messages || selectedChat.messages.length === 0) return [];
    
    const enriched = [];
    let lastDateStr = '';
    
    selectedChat.messages.forEach((msg, idx) => {
      // 1. Resolve date label
      let dateLabel = 'Today';
      if (msg.timestamp?.includes('Yesterday')) {
        dateLabel = 'Yesterday';
      } else if (msg.timestamp?.includes(',')) {
        dateLabel = msg.timestamp.split(',')[0];
      } else if (msg.timestamp?.match(/[a-zA-Z]+ \d+/)) {
        dateLabel = msg.timestamp;
      }
      
      if (dateLabel !== lastDateStr) {
        enriched.push({
          isDateDivider: true,
          dateLabel,
          id: `divider_${msg.id || idx}`
        });
        lastDateStr = dateLabel;
      }

      // 2. Identify grouped cluster end
      const nextMsg = selectedChat.messages[idx + 1];
      const isConsecutive = nextMsg && nextMsg.senderId === msg.senderId;
      enriched.push({
        ...msg,
        isGroupEnd: !isConsecutive
      });
    });

    return enriched;
  }, [selectedChat?.messages]);
const isTyping = selectedChat && typingStatus?.[selectedChat.id] && Object.values(typingStatus[selectedChat.id]).some(s => s !== null);
  const typingText = isTyping ?
    Object.values(typingStatus[selectedChat.id]).filter(s => s !== null)[0] : '';

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;
    if (isSending) return;
    setIsSending(true);

    const payload = {};
    if (replyingToMsg) {
      payload.replyTo = {
        id: replyingToMsg.id,
        text: replyingToMsg.text,
        senderName: replyingToMsg.senderId === 'user_me' ? 'You' : target.name
      };
    }

    if (attachments.length > 0) {
      attachments.forEach(att => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          const sizeStr = att.file.size > 1024 * 1024 
            ? (att.file.size / (1024 * 1024)).toFixed(1) + ' MB' 
            : (att.file.size / 1024).toFixed(0) + ' KB';
          
          sendMessage(att.file.name, att.type, {
            fileName: att.file.name,
            fileSize: sizeStr,
            mediaUrl: base64Data,
            viewOnce: viewOnceActive
          });
        };
        reader.readAsDataURL(att.file);
      });
      setAttachments([]);
      setViewOnceActive(false);
    }

    if (inputText.trim()) {
      if (editingMsg) {
        editMessage(editingMsg.id || editingMsg._id, inputText);
        setEditingMsg(null);
      } else {
        sendMessage(inputText, 'text', payload);
      }
    }

    setInputText('');
    setReplyingToMsg(null);
    setShowEmojiPicker(false);
    setIsSending(false);
  };

  const handleEmojiClick = (emojiData) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  // Typing indicator emission with debounce
  useEffect(() => {
    if (!selectedChatId || !mockSocket) return;

    const timeout = setTimeout(() => {
      if (inputText.trim().length > 0 && mockSocket.isRealConnected) {
        mockSocket.emit('typing', { chatId: selectedChatId, isTyping: true });
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (mockSocket.isRealConnected && selectedChatId) {
        mockSocket.emit('typing', { chatId: selectedChatId, isTyping: false });
      }
    };
  }, [inputText, selectedChatId, mockSocket]);

  const handleSendVoiceNote = (blob, durationStr, waveformArray) => {
    setIsRecording(false);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      
      const sizeStr = blob.size > 1024 * 1024 
        ? (blob.size / (1024 * 1024)).toFixed(1) + ' MB' 
        : (blob.size / 1024).toFixed(0) + ' KB';

      sendMessage(`voice-note-${Date.now()}.webm`, 'audio', {
        fileName: `Voice note (${durationStr})`,
        fileSize: sizeStr,
        duration: durationStr,
        mediaUrl: base64Data,
        waveform: waveformArray
      });
    };
    reader.readAsDataURL(blob);
  };

  const handleFileUpload = (type) => {
    setShowAttachmentMenu(false);
    
    if (type === 'image') {
      imageInputRef.current?.click();
    } else if (type === 'document') {
      fileInputRef.current?.click();
    } else if (type === 'location') {
      sendMessage('Coordinates shared', 'location', {
        locationName: 'Design Syndicate Sandbox HQ',
        coordinates: '37.7749° N, 122.4194° W'
      });
      toast.success('Location coordinates shared');
    }
  };

  // Intercept right-clicks for custom floating context menu
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuMsg(msg);
  };

  // Safe send handler for AI fallback workspace (no selectedChat yet)
  const handleAiFallbackSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;
    if (isSending) return;
    setIsSending(true);

    if (attachments.length > 0) {
      attachments.forEach(att => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          const sizeStr = att.file.size > 1024 * 1024 
            ? (att.file.size / (1024 * 1024)).toFixed(1) + ' MB' 
            : (att.file.size / 1024).toFixed(0) + ' KB';
          sendMessage(att.file.name, att.type, {
            fileName: att.file.name,
            fileSize: sizeStr,
            mediaUrl: base64Data,
          });
        };
        reader.readAsDataURL(att.file);
      });
      setAttachments([]);
    }

    if (inputText.trim()) {
      sendMessage(inputText, 'text', {});
    }

    setInputText('');
    setShowEmojiPicker(false);
    setIsSending(false);
  };

  if (localLoading) {
    return <ChatSkeleton />;
  }

  if (!selectedChat) {
    // If we're trying to access the AI chat but it doesn't exist yet, show AI workspace
    if (selectedChatId === 'chat_user_ai') {
      return (
        <div className="flex-1 h-full bg-[#0B141A] flex flex-col overflow-hidden select-none relative">
          {/* AI Neural Header */}
          <div className="shrink-0 p-4 border-b border-white/5 bg-gradient-to-r from-[#0B141A] via-[#1E3A8A] to-[#0B141A]">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center bg-[#202C33] border border-white/5 shadow-[0_0_30px_rgba(37,211,102,0.1)]">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2563EB]/30 animate-spin-slow" />
                <img src={appLogo} alt="Aether AI" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold font-display text-[#E9EDEF]">Aether AI</h2>
                <p className="text-[11px] text-[#2563EB]">Online</p>
              </div>
            </div>
          </div>

          {/* Onboarding AI Workspace */}
          <div className="flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fade-in">
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-[#202C33] border border-white/5 shadow-[0_0_50px_rgba(37,211,102,0.15)] animate-pulse animate-float">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2563EB]/40 animate-spin-slow" />
                <img src={appLogo} alt="Aether Logo" className="w-12 h-12 object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]" />
              </div>
              <h2 className="text-[18px] font-bold font-display text-[#E9EDEF] mt-3">I'm Aether AI. How can I help you today?</h2>
              <p className="text-[#8696A0] text-[13px] max-w-xs leading-relaxed">
                I am your secure AI assistant powered by Gemini. You can ask me to draft components, summarize logs, or translate data.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto py-2 px-4 w-full">
              {[
                { text: '📝 Summarize conversation', prompt: 'Summarize our recent discussion logs in clear bullet points.' },
                { text: '🎨 Design React Tailwind template', prompt: 'Write a responsive React component template using Tailwind CSS.' },
                { text: '🌐 Translate logs to Spanish', prompt: 'Translate my technical error codes and logs to Spanish.' },
                { text: '✍️ Polish this professional draft', prompt: 'Polish this draft to sound highly executive and friendly.' }
              ].map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => sendMessage(card.prompt, 'text', {})}
                  className="p-3.5 bg-[#202C33]/60 hover:bg-[#2A3942] border border-white/5 hover:border-[#2563EB]/30 rounded-xl text-left cursor-pointer transition-all duration-200 group active:scale-98"
                >
                  <p className="text-[13px] font-semibold text-[#E9EDEF] group-hover:text-[#2563EB] transition-colors">{card.text}</p>
                  <p className="text-[11px] text-[#8696A0] mt-1 truncate">{card.prompt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Input Bar with attachment support */}
          <div className="shrink-0 p-4 border-t border-white/5 bg-[#0B141A]">
            <div className="flex items-center gap-2 bg-[#202C33] rounded-xl px-4 py-2.5 border border-white/5">
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={imageInputRef}
                onChange={(e) => { if (e.target.files[0]) addAttachment(e.target.files[0]); e.target.value = ''; }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => { if (e.target.files[0]) addAttachment(e.target.files[0]); e.target.value = ''; }}
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip"
                className="hidden"
              />

              {/* Attachment button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(!showAttachmentMenu);
                    setShowEmojiPicker(false);
                  }}
                  className={`p-2 rounded-full hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] transition-all cursor-pointer ${
                    showAttachmentMenu ? 'bg-[#2A3942] text-[#2563EB]' : ''
                  }`}
                  title="Attach file"
                >
                  <FiPaperclip size={18} />
                </button>

                {showAttachmentMenu && (
                  <div className="absolute bottom-12 left-0 w-44 bg-[#202C33] border border-white/10 rounded-2xl p-2 space-y-1 shadow-2xl z-50">
                    <button
                      type="button"
                      onClick={() => { setShowAttachmentMenu(false); imageInputRef.current?.click(); }}
                      className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FiImage size={16} className="text-[#2563EB]" /> Image
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }}
                      className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <FiFileText size={16} className="text-blue-400" /> Document
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAiFallbackSend(e); }}
                placeholder="Ask Aether AI anything..."
                className="flex-1 bg-transparent text-[14px] text-[#E9EDEF] placeholder-[#8696A0] outline-none"
              />
              <button
                type="button"
                onClick={(e) => handleAiFallbackSend(e)}
                className="px-4 py-1.5 bg-[#2563EB] text-[#0B141A] font-bold text-[12px] rounded-lg active:scale-95 cursor-pointer transition-all hover:bg-[#1D4ED8]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 h-full bg-[#080c14] flex flex-col justify-center items-center text-center p-6 select-none relative">
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: "radial-gradient(#2563EB 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <div className="w-16 h-16 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mb-6 text-slate-500 animate-pulse">
          <FiMessageSquare size={32} />
        </div>
        <h3 className="text-lg font-bold font-display text-white mb-2">No Session Selected</h3>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
          Select an active chat session from the dashboard sidebar or initiate a new one to begin private message synchronization.
        </p>
      </div>
    );
  }

  const handleForwardTo = async (targetChatId, chatName, directUser = null) => {
    let destId = targetChatId;
    if (!destId && directUser) {
      toast.loading('Starting conversation...', { id: 'fwd_convo' });
      try {
        destId = await startDirectChat(directUser);
        toast.dismiss('fwd_convo');
      } catch (err) {
        toast.error('Failed to start conversation', { id: 'fwd_convo' });
        return;
      }
    }
    if (!destId) return;

    const fwdContent = forwardMsg.text || forwardMsg.fileName || 'Forwarded message';
    const fwdType = forwardMsg.type || 'text';
    const fwdFields = {};
    if (forwardMsg.mediaUrl) fwdFields.mediaUrl = forwardMsg.mediaUrl;
    if (forwardMsg.fileName) fwdFields.fileName = forwardMsg.fileName;
    if (forwardMsg.fileSize) fwdFields.fileSize = forwardMsg.fileSize;
    if (forwardMsg.locationName) fwdFields.locationName = forwardMsg.locationName;
    if (forwardMsg.coordinates) fwdFields.coordinates = forwardMsg.coordinates;
    if (forwardMsg.duration) fwdFields.duration = forwardMsg.duration;
    if (forwardMsg.waveform) fwdFields.waveform = forwardMsg.waveform;
    if (forwardMsg.pollQuestion) fwdFields.pollQuestion = forwardMsg.pollQuestion;
    if (forwardMsg.pollOptions) fwdFields.pollOptions = forwardMsg.pollOptions;
    if (forwardMsg.viewOnce) fwdFields.viewOnce = forwardMsg.viewOnce;
    fwdFields.forwardedFrom = forwardMsg.id || forwardMsg._id;

    sendMessage(fwdContent, fwdType, fwdFields, destId);
    setForwardMsg(null);
    toast.success(`Message forwarded to ${chatName}`, { icon: '↗️' });
  };

  const userTheme = me.themePreference || me.theme || {};
  const isDark = userTheme.mode === 'dark';
  const patternColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)';

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="flex-1 h-full bg-[#0B141A] flex flex-col justify-between overflow-hidden relative"
    >
      
      {/* Background Pattern Wallpaper */}
      {userTheme.chatWallpaper !== 'solid' && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundImage: userTheme.chatWallpaper === 'dots'
              ? `radial-gradient(${patternColor} 1px, transparent 1px)`
              : userTheme.chatWallpaper === 'neon'
                ? `radial-gradient(circle at 30% 20%, rgba(37,211,102,0.02) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(37,211,102,0.02) 0%, transparent 45%)`
                : `radial-gradient(${patternColor} 0.8px, transparent 0.8px), radial-gradient(${patternColor} 0.8px, transparent 0.8px)`,
            backgroundPosition: userTheme.chatWallpaper === 'dots' ? '0 0' : '0 0, 16px 16px',
            backgroundSize: userTheme.chatWallpaper === 'dots' ? "24px 24px" : userTheme.chatWallpaper === 'neon' ? "100% 100%" : "32px 32px"
          }} 
        />
      )}

      {/* 1. Chat Header */}
      <div className="py-4 px-6 border-b border-white/5 bg-[#202C33]/90 backdrop-blur-md flex justify-between items-center z-20 select-none">
        
        {/* Profile Details */}
        {isAiChat ? (
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 animate-pulse flex items-center justify-center border-2 border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]" style={{ animationDuration: '4s' }}>
                <img src={appLogo} alt="Aether AI Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#202C33] shadow-sm animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#E9EDEF] font-display">Aether AI</h3>
                {/* AI Model Selector Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[11px] font-semibold text-cyan-300 transition-all cursor-pointer"
                  >
                    <FiZap size={11} className="text-cyan-400 animate-pulse" />
                    {aiModel === 'gemini-flash' && 'Gemini 1.5 Flash ⚡'}
                    {aiModel === 'gemini-pro' && 'Gemini 1.5 Pro 🧠'}
                    {aiModel === 'code-copilot' && 'Code Copilot 💻'}
                    {aiModel === 'creative' && 'Creative Assistant 🎨'}
                    <span className="text-[9px] opacity-70">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showModelDropdown && (
                    <div className="absolute top-8 left-0 w-56 bg-[#0f172a] border border-cyan-500/30 rounded-xl p-1.5 shadow-2xl z-50 select-none space-y-1">
                      {[
                        { id: 'gemini-flash', name: 'Gemini 1.5 Flash ⚡', desc: 'Fast & responsive general queries' },
                        { id: 'gemini-pro', name: 'Gemini 1.5 Pro 🧠', desc: 'Deep reasoning & complex tasks' },
                        { id: 'code-copilot', name: 'Code Copilot 💻', desc: 'Syntax, refactoring & architecture' },
                        { id: 'creative', name: 'Creative Assistant 🎨', desc: 'Drafting, summarizing & ideation' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setAiModel(m.id);
                            setShowModelDropdown(false);
                            toast.success(`Switched AI Model to ${m.name}`);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                            aiModel === m.id
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="font-semibold">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#8696A0] mt-0.5">
                <span className="text-emerald-400 font-bold flex items-center gap-1">● Online</span>
                <span className="text-[#64748B] select-none">•</span>
                <span className="text-cyan-400 font-bold flex items-center gap-0.5" title="Secure E2E Encryption"><FiLock size={10} /> Secure Gemini Engine</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0 cursor-pointer" onClick={() => setIsRightPanelOpen(true)}>
              <img 
                src={target?.avatar || getAvatarSvg(target?.name || 'U')} 
                alt="" 
                className={`w-12 h-12 rounded-full border border-white/5 object-cover ${
                  target?.id === 'user_ai' ? 'animate-pulse ring-2 ring-emerald-500/30' : ''
                }`} 
              />
              {selectedChat.type !== 'group' && target?.online && (
                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#2563EB] rounded-full border-2 border-[#202C33] shadow-sm animate-pulse" />
              )}
            </div>
            
              <div>
              <div className="flex items-center gap-1.5">
                <h3 onClick={() => setIsRightPanelOpen(true)} className="text-[18px] font-semibold text-[#E9EDEF] font-display cursor-pointer hover:text-[#2563EB] transition-colors">
                  {target?.name}
                </h3>
                {selectedChat.type !== 'group' && target?.username && (
                  <span className="text-[11px] text-[#8696A0] font-medium">@{target.username}</span>
                )}
                {target?.accountType === 'business' && (
                  <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                    BUSINESS
                  </span>
                )}
              </div>
              {isTyping ? (
                <p className="text-[13px] text-[#2563EB] font-semibold animate-pulse">{typingText}</p>
              ) : (
                <div className="flex items-center gap-1.5 text-[13px] text-[#8696A0] mt-0.5">
                  <span>{selectedChat.type !== 'group' ? target?.lastSeen : `${selectedChat.group?.members?.length || 0} members online`}</span>
                  <span className="text-[#64748B] select-none">•</span>
                  <span className="text-[#2563EB] font-bold flex items-center gap-0.5" title="End-to-end encrypted session"><FiLock size={10} /> Secure</span>
                  {target?.accountType === 'business' && target?._id && (
                    <a href={`/business/${target._id}`} onClick={e => { e.preventDefault(); navigate(`/business/${target._id}`); }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 ml-1">
                      <FiBriefcase size={11} /> View Business
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isAiChat && (
            <button
              onClick={exportAiConversation}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[12px] text-cyan-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Export conversation transcript"
            >
              <FiDownload size={14} /> Export Transcript
            </button>
          )}
          {!isAiChat && selectedChat.type === 'direct' && (
            <>
              <button 
                onClick={() => initiateCall(target?.id, target?.name, target?.avatar, 'voice')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all duration-300"
                title="Voice Call"
              >
                <FiPhone size={20} />
              </button>

              <button 
                onClick={() => initiateCall(target?.id, target?.name, target?.avatar, 'video')}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] cursor-pointer active:scale-95 transition-all duration-300"
                title="Video Call"
              >
                <FiVideo size={20} />
              </button>
            </>
          )}

          <button
            onClick={() => setInlineSearchOpen((v) => !v)}
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300 ${
              inlineSearchOpen
                ? 'bg-[#2563EB]/20 text-[#2563EB]'
                : 'hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF]'
            }`}
            title="Search in Chat"
          >
            <FiSearch size={20} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMenu(!showMoreMenu);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer ${
              showMoreMenu 
                ? 'bg-[#2A3942] border-white/10 text-[#2563EB] shadow-md' 
                : 'bg-transparent border-transparent text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Menu Options"
          >
            <FiMoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      {!isAiChat && (
        <div className="flex bg-[#0B141A] p-1 border-b border-white/5 select-none shrink-0 z-10 px-6 justify-start gap-8">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'media', label: 'Media' },
            { id: 'tasks', label: 'Tasks' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`py-2.5 text-[13px] font-semibold tracking-wider uppercase border-b-2 cursor-pointer transition-all duration-300 ${
                activeSubTab === t.id
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#8696A0] hover:text-[#E9EDEF]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Header More Menu Dropdown */}
      {showMoreMenu && (
        <div className="absolute top-16 right-4 z-40 bg-[#202C33] border border-white/10 rounded-2xl p-2 w-56 shadow-2xl select-none flex flex-col backdrop-blur-xl">
          {activeSubMenu === null ? (
            <>
              <button 
                onClick={() => {
                  setIsRightPanelOpen(true);
                  setRightPanelTab('info');
                  setShowMoreMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiInfo size={14} className="text-[#2563EB]" /> View Contact Info
              </button>
              <button 
                onClick={() => {
                  setIsRightPanelOpen(true);
                  setRightPanelTab('media');
                  setShowMoreMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiImage size={14} className="text-blue-400" /> Shared Media & Files
              </button>
              <button 
                onClick={() => {
                  setIsRightPanelOpen(true);
                  setRightPanelTab('search');
                  setShowMoreMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiSearch size={14} className="text-blue-400" /> Search in Chat
              </button>
              <button 
                onClick={() => {
                  setLocalMuted(!localMuted);
                  toast.success(localMuted ? 'Chat notifications unmuted' : 'Chat notifications muted');
                  setShowMoreMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiVolumeX size={14} className="text-blue-400" /> {localMuted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>
              
              <div className="border-t border-white/5 my-1" />

              <button 
                onClick={() => setActiveSubMenu('wallpaper')}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5"><FiLayers size={14} className="text-blue-400" /> Chat Wallpaper</span>
                <span className="text-[11px] text-[#64748B]">&gt;</span>
              </button>

              <button 
                onClick={() => setActiveSubMenu('disappearing')}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5"><FiClock size={14} className="text-blue-400" /> Disappearing</span>
                <span className="text-[11px] text-[#64748B]">&gt;</span>
              </button>

              <div className="border-t border-white/5 my-1" />

              <button 
                onClick={exportChatHistory}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiDownload size={14} className="text-blue-400" /> Export Chat Log
              </button>
              <button 
                onClick={() => {
                  clearChatHistory(selectedChat.id);
                  setShowMoreMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiTrash2 size={13} className="text-red-400" /> Clear Chat History
              </button>
            </>
          ) : activeSubMenu === 'wallpaper' ? (
            <>
              <div className="flex justify-between items-center px-3 py-1 mb-1.5 border-b border-white/5 pb-2">
                <span className="text-[11px] font-bold text-[#8696A0]">SELECT WALLPAPER</span>
                <button onClick={() => setActiveSubMenu(null)} className="text-[11px] text-[#2563EB] font-bold hover:underline cursor-pointer">Back</button>
              </div>
              {['grid', 'dots', 'solid', 'neon'].map((themeName) => (
                <button 
                  key={themeName}
                  onClick={() => {
                    updateTheme({ chatWallpaper: themeName });
                    toast.success(`Wallpaper set to ${themeName}`);
                    setShowMoreMenu(false);
                    setActiveSubMenu(null);
                  }}
                  className={`w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] font-semibold capitalize cursor-pointer ${
                    userTheme.chatWallpaper === themeName ? 'text-[#2563EB] font-bold' : 'text-[#E9EDEF]'
                  }`}
                >
                  {themeName}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="flex justify-between items-center px-3 py-1 mb-1.5 border-b border-white/5 pb-2">
                <span className="text-[11px] font-bold text-[#8696A0]">DISAPPEARING MESSAGES</span>
                <button onClick={() => setActiveSubMenu(null)} className="text-[11px] text-[#2563EB] font-bold hover:underline cursor-pointer">Back</button>
              </div>
              {[
                { id: 'off', label: 'Off' },
                { id: '10s', label: '10 seconds' },
                { id: '24h', label: '24 hours' },
                { id: '7d', label: '7 days' },
                { id: '90d', label: '90 days' }
              ].map((option) => (
                <button 
                  key={option.id}
                  onClick={() => {
                    setChatDisappearing(selectedChat.id, option.id);
                    toast.success(`Disappearing messages set to ${option.label}`);
                    setShowMoreMenu(false);
                    setActiveSubMenu(null);
                  }}
                  className={`w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] font-semibold cursor-pointer ${
                    selectedChat.disappearing === option.id ? 'text-[#2563EB] font-bold' : 'text-[#E9EDEF]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {activeSubTab === 'chat' && (
        <>
          {/* Inline in-chat search bar (Ctrl+F / header search icon) */}
          {inlineSearchOpen && (
            <div className="bg-[#202C33] border-b border-white/5 px-4 py-2.5 z-20 flex flex-col gap-2 select-none animate-fade-in">
              <div className="flex items-center gap-2">
                <FiSearch size={16} className="text-[#8696A0] shrink-0" />
                <input
                  ref={inlineSearchInputRef}
                  value={inlineSearchQuery}
                  onChange={(e) => setInlineSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goToInlineMatch(inlineMatchIndex + (e.shiftKey ? -1 : 1));
                    } else if (e.key === 'Escape') {
                      setInlineSearchOpen(false);
                    }
                  }}
                  placeholder="Search in this chat..."
                  className="flex-1 bg-transparent text-[13px] text-[#E9EDEF] placeholder-[#8696A0] outline-none"
                />
                <span className="text-[11px] text-[#8696A0] tabular-nums shrink-0 min-w-[56px] text-right">
                  {inlineSearchMatches.length
                    ? `${inlineMatchIndex + 1} of ${inlineSearchMatches.length}`
                    : (inlineSearchQuery.trim() || inlineSearchStarred || inlineSearchCategory !== 'all' ? 'No results' : '')}
                </span>
                <button
                  disabled={!inlineSearchMatches.length}
                  onClick={() => goToInlineMatch(inlineMatchIndex - 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696A0] enabled:hover:text-[#E9EDEF] enabled:hover:bg-[#2A3942] disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                  title="Previous match"
                >
                  <FiChevronUp size={16} />
                </button>
                <button
                  disabled={!inlineSearchMatches.length}
                  onClick={() => goToInlineMatch(inlineMatchIndex + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696A0] enabled:hover:text-[#E9EDEF] enabled:hover:bg-[#2A3942] disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
                  title="Next match"
                >
                  <FiChevronDown size={16} />
                </button>
                <button
                  onClick={() => {
                    setInlineSearchOpen(false);
                    setInlineSearchQuery('');
                    setInlineSearchCategory('all');
                    setInlineSearchStarred(false);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#2A3942] cursor-pointer transition-colors"
                  title="Close search"
                >
                  <FiX size={16} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SEARCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setInlineSearchCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                      inlineSearchCategory === cat.id
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  onClick={() => setInlineSearchStarred((v) => !v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                    inlineSearchStarred
                      ? 'bg-amber-500 text-white'
                      : 'bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF]'
                  }`}
                >
                  <FiStar size={11} className={inlineSearchStarred ? 'fill-current' : ''} /> Starred
                </button>
              </div>
            </div>
          )}

          {/* Pinned Message Banner */}
          {(() => {
            const pinnedMsg = selectedChat.pinnedMessageId
              ? (selectedChat.messages || []).find(m => (m.id || m._id) === selectedChat.pinnedMessageId)
              : null;
            if (!selectedChat.pinnedMessageId) return null;
            return (
        <div className="bg-[#202C33]/95 backdrop-blur border-b border-white/5 py-2.5 px-5 flex justify-between items-center z-10 text-[13px] text-[#E9EDEF] select-none">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[#2563EB] font-bold">📌 Pinned message:</span>
            <span className="truncate italic text-[#8696A0]">{pinnedMsg ? (pinnedMsg.text || `[${pinnedMsg.type || 'file'}]`) : 'Message unavailable'}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {pinnedMsg && (
              <button
                onClick={() => highlightMessage(selectedChat.pinnedMessageId)}
                className="text-[12px] text-[#2563EB] font-semibold cursor-pointer hover:underline"
              >
                View
              </button>
            )}
            <button
              onClick={() => pinMessage(selectedChat.id, null)}
              className="text-[#8696A0] hover:text-white cursor-pointer transition-colors"
              title="Unpin message"
            >
              <FiX size={15} />
            </button>
          </div>
        </div>
            );
          })()}

      {/* 2. Messages List viewport */}
      {(selectedChat?.messages || []).length === 0 ? (
        isAiChat ? (
          <div className="flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar p-6 space-y-6">
            <div className="flex flex-col items-center justify-center py-6 select-none text-center space-y-4 animate-fade-in">
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-[#202C33] border border-white/5 shadow-[0_0_50px_rgba(37,211,102,0.15)] animate-pulse animate-float">
                {/* Rotating dashed green ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2563EB]/40 animate-spin-slow" />
                {/* Pulsing Green Website Logo Image inside */}
                <img src={appLogo} alt="Aether Logo" className="w-12 h-12 object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]" />
              </div>
              <h2 className="text-[18px] font-bold font-display text-[#E9EDEF] mt-3">I'm Aether AI. How can I help you today?</h2>
              <p className="text-[#8696A0] text-[13px] max-w-xs leading-relaxed">
                I am your secure AI assistant powered by Gemini. You can ask me to draft components, summarize logs, or translate data.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto py-2 px-4 w-full">
              {[
                { text: '📝 Summarize conversation', prompt: 'Summarize our recent discussion logs in clear bullet points.' },
                { text: '🎨 Design React Tailwind template', prompt: 'Write a responsive React component template using Tailwind CSS.' },
                { text: '🌐 Translate logs to Spanish', prompt: 'Translate my technical error codes and logs to Spanish.' },
                { text: '✍️ Polish this professional draft', prompt: 'Polish this draft to sound highly executive and friendly.' }
              ].map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => setInputText(card.prompt)}
                  className="p-3.5 bg-[#202C33]/60 hover:bg-[#2A3942] border border-white/5 hover:border-[#2563EB]/30 rounded-xl text-left cursor-pointer transition-all duration-200 group active:scale-98"
                >
                  <p className="text-[13px] font-semibold text-[#E9EDEF] group-hover:text-[#2563EB] transition-colors">{card.text}</p>
                  <p className="text-[11px] text-[#8696A0] mt-1 truncate">{card.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyConversation onAction={handleEmptyAction} />
        )
      ) : (
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar relative"
        >
          {processedMessages.map((msg, idx) => {
            // Render Date separators
            if (msg.isDateDivider) {
              return (
                <div 
                  key={msg.id || msg._id || `divider_${idx}`} 
                  className="sticky top-0 z-10 flex justify-center py-2 select-none"
                >
                  <span className="px-4 py-1.5 bg-[#F8FAFC]/95 border border-white/[0.06] rounded-full text-[10px] font-bold text-[#8696A0] uppercase tracking-[0.15em] backdrop-blur-xl shadow-lg shadow-black/30">
                    {msg.dateLabel}
                  </span>
                </div>
              );
            }

            // ── Self-chat detection ──────────────────────────────────────────
            // When a user chats with themselves, target.id === me.id.
            // Every message carries senderId 'user_me', so without this fix
            // every bubble stacks on the right with the same color.
            // We alternate by sequential index: even = right (sent side),
            // odd = left (received / echo side).
            const myId = me?._id || me?.id || '';
            const targetId = target?.id || target?._id || '';
            const isSelfChat = !isAiChat &&
              selectedChat?.type === 'direct' &&
              myId && targetId &&
              myId.toString() === targetId.toString();

            const rawIsMe = isAiChat
              ? (msg.senderId !== 'user_ai')
              : (msg.senderId === 'user_me' ||
                 msg.senderId === me?._id ||
                 msg.senderId?._id === me?._id ||
                 msg.senderId === me?.id ||
                 msg.senderId?.id === me?.id);

            // In self-chat, alternate sides by actual message index inside messages array
            const actualMsgIndex = selectedChat.messages ? selectedChat.messages.findIndex(m => (m.id || m._id) === (msg.id || msg._id)) : idx;
            const isMe = isSelfChat
              ? (actualMsgIndex % 2 === 0)   // even → right (sent)
              : rawIsMe;

            const senderName = msg.senderName || (msg.senderId && typeof msg.senderId === 'object' ? msg.senderId.name : 'Group Member');
            const senderAvatar = msg.senderAvatar || (msg.senderId && typeof msg.senderId === 'object' ? msg.senderId.avatar : null);
            const bStyle = userTheme.bubbleStyle || 'rounded';
            const bubbleShape = bStyle === 'sharp'
              ? 'rounded-none border-2'
              : bStyle === 'playful'
                ? isMe ? 'rounded-3xl rounded-tr-none' : 'rounded-3xl rounded-tl-none'
                : isMe ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none';
            
            const showAvatar = selectedChat.type === 'group' && !isMe && msg.isGroupEnd;
            
            return (
              <div 
                id={msg.id || msg._id}
                key={msg.id || msg._id || idx}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                className={`flex items-end gap-2.5 ${isAiChat && !isMe ? 'max-w-[88%]' : 'max-w-[75%]'} ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'} transition-all duration-300 px-1 group/msg hover:bg-white/[0.02] rounded-xl`}
              >
                {/* Avatar positioning for group members */}
                {selectedChat.type === 'group' && !isMe && (
                  <div className="w-8 h-8 shrink-0 select-none mb-5">
                    {showAvatar ? (
                      <img 
                        src={senderAvatar || getAvatarSvg(senderName || 'U')} 
                        alt="" 
                        className="w-8 h-8 rounded-full border-2 border-[#2563EB]/20 bg-[#202C33] shadow-md shadow-black/20" 
                        title={senderName}
                      />
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Name display on first message in group clusters */}
                  {selectedChat.type === 'group' && !isMe && msg.isGroupEnd && (
                    <span className="text-[11px] text-[#2563EB] font-bold ml-2 mb-1 tracking-wide">{senderName}</span>
                  )}
                  
                  {/* Message bubble container */}
                  <div 
                    className={`relative group transition-all duration-200 ${bubbleShape} ${
                      isMe && isAiChat ? 'p-3.5 min-w-[120px]'
                      : !isMe && isAiChat ? 'p-4 min-w-[220px] w-full'
                      : 'p-3.5'
                    } ${
                      isMe 
                        ? isAiChat
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-[#2563EB] text-[#E9EDEF] shadow-lg shadow-indigo-950/40 border border-indigo-400/25'
                          : 'bg-gradient-to-br from-[#1E40AF] to-[#2563EB] text-[#E9EDEF] shadow-lg shadow-emerald-900/30 border border-emerald-400/10 hover:shadow-xl hover:shadow-emerald-900/40' 
                        : isAiChat 
                          ? 'bg-gradient-to-br from-[#1a3a6e] to-[#1e4d9b] border border-blue-400/40 shadow-[0_4px_25px_rgba(59,130,246,0.2)] text-white backdrop-blur-md hover:border-blue-400/60'
                          : 'bg-[#1C2733] border border-blue-400/5 shadow-lg shadow-black/20 text-[#E9EDEF] hover:shadow-xl hover:shadow-black/25'
                    }`}
                  >
                    
                    {/* Reply context line */}
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg border-l-[3px] text-[12px] select-none ${
                        isMe 
                          ? 'bg-black/20 border-emerald-400/60 text-[#CBD5E1]' 
                          : 'bg-white/[0.04] border-sky-400 text-[#8696A0]'
                      }`}>
                        <p className="font-semibold text-[#2563EB] text-[11px]">{msg.replyTo.senderName}</p>
                        <p className="truncate mt-0.5 opacity-80">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {/* TYPE 1: TEXT message */}
                    {(!msg.type || msg.type === 'text') && (
                      renderAiMessageContent(msg.text, isMe, isAiChat, msg.id || msg._id, idx)
                    )}

                    {/* TYPE 2: IMAGE message */}
                    {msg.type === 'image' && (() => {
                      const isViewOnce = msg.viewOnce;
                      const myId = me?._id || me?.id;
                      const isMsgMe = msg.senderId === 'user_me' || msg.senderId?._id === myId || msg.senderId?.toString() === myId;
                      const alreadyOpened = isViewOnce && msg.viewOnceOpenedBy && msg.viewOnceOpenedBy.length > 0;
                      const hiddenForMe = isViewOnce && !isMsgMe && alreadyOpened;

                      if (isViewOnce && !isMsgMe && !alreadyOpened && msg.mediaUrl) {
                        // Recipient sees locked tap-to-view card
                        return (
                          <motion.div
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setViewOnceModalMedia({ url: resolveMediaUrl(msg.mediaUrl), type: 'image', id: msg._id || msg.id });
                              openViewOnceMessage(msg._id || msg.id);
                            }}
                            className="w-52 aspect-[4/3] rounded-xl cursor-pointer overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center gap-2 select-none relative shadow-lg shadow-emerald-500/5"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                            <div className="p-3 bg-emerald-500/15 rounded-full border border-emerald-500/30">
                              <FiEye size={22} className="text-blue-400" />
                            </div>
                            <div className="text-center z-10">
                              <p className="text-xs font-bold text-emerald-300">Tap to view</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">Viewable once only</p>
                            </div>
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[8px] text-violet-500/60 font-bold">
                              <FiShield size={8} /> VIEW ONCE
                            </div>
                          </motion.div>
                        );
                      }

                      if (isViewOnce && (hiddenForMe || (isMsgMe && alreadyOpened))) {
                        // Already opened — show greyed out expired card
                        return (
                          <div className="w-52 aspect-[4/3] rounded-xl border border-white/5 bg-slate-950/60 flex flex-col items-center justify-center gap-2 select-none">
                            <div className="p-3 bg-slate-800/60 rounded-full border border-white/5">
                              <FiEyeOff size={20} className="text-slate-600" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-slate-500">Photo opened</p>
                              <p className="text-[9px] text-slate-600 mt-0.5">No longer available</p>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-slate-700 font-bold">
                              <FiShield size={8} /> VIEW ONCE
                            </div>
                          </div>
                        );
                      }

                      // Normal image (not view-once, or sender preview)
                      return (
                        <div className="space-y-2">
                          <div 
                            onClick={() => msg.mediaUrl && toast.success('Fullscreen image opened!')}
                            className="w-56 aspect-[4/3] rounded-xl cursor-pointer hover:brightness-90 active:scale-[0.98] transition-all overflow-hidden flex items-center justify-center border border-white/[0.06] bg-black/30 relative shadow-md shadow-black/20"
                          >
                            {msg.mediaUrl ? (
                              <img 
                                src={resolveMediaUrl(msg.mediaUrl)} 
                                alt={msg.text || msg.caption || "Image"} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error("Error loading chat image:", e.target.src);
                                }}
                              />
                            ) : (
                              <FiImage className="text-white/15" size={24} />
                            )}
                            {isViewOnce && isMsgMe && (
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-emerald-600/90 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow-lg shadow-emerald-500/20">
                                <FiEye size={8} /> 1×
                              </div>
                            )}
                          </div>
                            {msg.caption && <p className="text-[12px] font-medium text-[#CBD5E1] px-1 leading-relaxed mt-1">{msg.caption}</p>}
                        </div>
                      );
                    })()}

                    {/* TYPE 3: DOCUMENT message */}
                    {msg.type === 'document' && (
                      <div 
                        onClick={() => toast.success(`Downloading ${msg.fileName}...`)}
                        className="p-2.5 bg-black/20 rounded-xl border border-white/[0.06] flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="p-2 bg-[#2563EB]/10 rounded-lg text-[#2563EB] border border-[#2563EB]/10 shrink-0"><FiFileText size={14} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#E9EDEF] truncate group-hover:text-[#2563EB] transition-colors">{msg.fileName}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">{msg.fileSize}</p>
                        </div>
                        <FiDownload size={13} className="text-[#64748B] group-hover:text-[#E9EDEF] transition-colors shrink-0" />
                      </div>
                    )}

                    {/* TYPE 4: AUDIO message */}
                    {msg.type === 'audio' && (
                       <AudioPlayer src={resolveMediaUrl(msg.mediaUrl)} duration={msg.duration} waveform={msg.waveform} />
                    )}

                    {/* TYPE 7: GIF message */}
                    {msg.type === 'gif' && (
                      <div 
                        onClick={() => toast.success('GIF played')}
                        className="w-48 aspect-video rounded-xl cursor-pointer hover:brightness-90 active:scale-[0.98] transition-all overflow-hidden flex items-center justify-center border border-white/[0.06] relative shadow-md shadow-black/20"
                        style={{ background: msg.text?.startsWith('linear') ? msg.text : 'linear-gradient(to right, #2563EB, #1D4ED8)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] to-transparent" />
                        <span className="text-[9px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full select-none z-10 backdrop-blur-sm border border-white/10">GIF</span>
                      </div>
                    )}

                    {/* TYPE 8: STICKER message */}
                    {msg.type === 'sticker' && (
                      <div className="w-20 h-20 flex items-center justify-center p-1">
                        <div dangerouslySetInnerHTML={{ __html: msg.text }} className="w-full h-full" />
                      </div>
                    )}

                    {/* TYPE 5: LOCATION message */}
                    {msg.type === 'location' && (
                      <div 
                        onClick={() => toast.success(`Opening maps location: ${msg.locationName}`)}
                        className="p-2.5 bg-black/20 hover:bg-white/[0.04] rounded-xl border border-white/[0.06] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <div className="p-2 bg-[#2563EB]/10 text-[#2563EB] rounded-lg shrink-0"><FiMapPin size={14} /></div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#E9EDEF] truncate">{msg.locationName}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">{msg.coordinates}</p>
                        </div>
                      </div>
                    )}

                    {/* TYPE 6: POLL message */}
                    {msg.type === 'poll' && (
                      <div className="space-y-3 w-64 select-none">
                        <h5 className="text-[13px] font-bold text-[#E9EDEF] font-display">{msg.pollQuestion}</h5>
                        <div className="space-y-1.5">
{msg.pollOptions?.map((opt) => {
                            const totalVotes = (msg.pollOptions || []).reduce((acc, current) => acc + current.votes, 0);
                            const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            const myId = me?._id || me?.id;
                            const isVoted = opt.votedBy && opt.votedBy.some(v => v === 'user_me' || v === myId || v?._id === myId);

                            return (
                              <div 
                                key={opt.optionId}
                                onClick={() => votePoll(msg.id || msg._id, opt.optionId)}
                                className={`relative p-2.5 rounded-xl border cursor-pointer overflow-hidden transition-all duration-200 ${
                                  isVoted 
                                    ? 'border-[#2563EB]/30 bg-[#2563EB]/5 hover:bg-[#2563EB]/10' 
                                    : 'border-white/[0.06] bg-black/20 hover:bg-white/[0.04]'
                                }`}
                              >
                                {/* Percentage fill bar background */}
                                <div 
                                  className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${isVoted ? 'bg-[#2563EB]/10' : 'bg-white/[0.03]'}`}
                                  style={{ width: `${percent}%` }}
                                />
                                
                                <div className="relative flex justify-between items-center text-[12px]">
                                  <span className={`font-medium ${isVoted ? 'text-[#2563EB]' : 'text-[#CBD5E1]'}`}>
                                    {isVoted && <FiCheck size={10} className="inline mr-1.5 -mt-0.5" />}
                                    {opt.text}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] tabular-nums font-bold">
                                    {percent}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-[#64748B] font-medium">
                          {(msg.pollOptions || []).reduce((acc, c) => acc + c.votes, 0)} vote{(msg.pollOptions || []).reduce((acc, c) => acc + c.votes, 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Emoji reactions bar overlay */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? 'left-2' : 'right-2'} flex items-center gap-0.5 bg-[#F1F5F9] border border-white/[0.08] rounded-full py-0.5 px-2 shadow-lg shadow-black/20 text-[11px] select-none z-10`}>
                        {[...new Set(msg.reactions.map(r => r.emoji))].map((emoji, i) => (
                          <span key={i} className="leading-none">{emoji}</span>
                        ))}
                        {msg.reactions.length > 1 && (
                          <span className="text-[9px] text-[#64748B] font-bold ml-0.5">{msg.reactions.length}</span>
                        )}
                      </div>
                    )}

                    {/* Emoji reactions selection picker popup */}
                    {showReactionsMsgId === (msg.id || msg._id) && (
                      <div className={`absolute -top-10 ${isMe ? 'left-0' : 'right-0'} bg-[#F1F5F9] border border-white/[0.08] rounded-full py-1.5 px-3 shadow-2xl shadow-black/40 flex gap-2 z-30 select-none backdrop-blur-md`}>
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              addReaction(msg.id || msg._id, emoji);
                              setShowReactionsMsgId(null);
                            }}
                            className="hover:scale-130 transition-transform active:scale-95 cursor-pointer text-xs"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Context Menu button (appears on hover) */}
                    <div className={`absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1 bg-[#111B21]/95 rounded-lg p-0.5 border border-white/[0.08] select-none shadow-xl shadow-black/30 backdrop-blur-md ${isMe ? 'left-2' : 'right-2'}`}>
                      <button 
                        onClick={() => setReplyingToMsg(msg)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 rounded"
                        title="Reply"
                      >
                        <FiCornerUpLeft size={11} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionsMsgId(showReactionsMsgId === (msg.id || msg._id) ? null : (msg.id || msg._id));
                        }}
                        className={`p-1 cursor-pointer hover:bg-white/5 rounded transition-colors ${
                          showReactionsMsgId === (msg.id || msg._id) ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                        title="React Emoji"
                      >
                        <FiSmile size={11} />
                      </button>
                      <button
                        onClick={() => {
                          pinMessage(selectedChat.id, msg.id || msg._id);
                        }}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 rounded"
                        title="Pin Message"
                      >
                        <FiBookmark size={11} />
                      </button>
                      <button 
                        onClick={() => toggleStarMessage(msg.id || msg._id)}
                        className={`p-1 cursor-pointer hover:bg-white/5 rounded transition-colors ${
                          msg.starred ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                        }`}
                        title={msg.starred ? 'Unstar Message' : 'Star Message'}
                      >
                        <FiStar size={11} fill={msg.starred ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => setForwardMsg(msg)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 rounded"
                        title="Forward Message"
                      >
                        <FiShare2 size={11} />
                      </button>
                      {isMe && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingMsg(msg);
                              setInputText(msg.text || '');
                            }}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 rounded"
                            title="Edit Message"
                          >
                            <FiEdit size={11} />
                          </button>
                          <button 
                            onClick={() => setDeleteTargetMsg(msg)}
                            className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer hover:bg-rose-500/5 rounded"
                            title="Delete Message"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>

                  </div>

                  {/* Timestamp Details */}
                  <span className={`text-[11px] text-[#64748B] mt-1 select-none tabular-nums flex items-center gap-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {msg.starred && <FiStar size={9} fill="#2563EB" className="text-blue-400 shrink-0" />}
                    {isAiChat && !isMe && (
                      <span className="text-[8px] text-blue-400 font-extrabold tracking-wider uppercase bg-[#0B141A]/80 border border-blue-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none mr-0.5">
                        <FiCpu size={8} className="animate-pulse" /> AI
                      </span>
                    )}
                    {msg.forwardedFrom && (
                      <span className="text-[9px] text-slate-400 italic select-none shrink-0">Forwarded</span>
                    )}
                    {msg.expiresAt && (
                      <span className="text-[10px] text-amber-500/80 font-mono animate-pulse flex items-center gap-0.5 shrink-0" title="Disappearing message">
                        ⏳ {Math.max(0, Math.round((msg.expiresAt - Date.now()) / 1000))}s
                      </span>
                    )}
                    <span className="opacity-70">{msg.timestamp}</span>
                    {msg.edited && <span className="text-[10px] italic opacity-50">edited</span>}
                    {isMe && (
                      <span className={`font-medium ${msg.status === 'read' ? 'text-blue-400' : msg.status === 'delivered' ? 'text-slate-400' : 'text-slate-600'} flex items-center`}>
                        {msg.status === 'read'
                          ? <><span className="mr-0.5">✓</span><span>✓</span></>
                          : <span>✓</span>
                        }
                      </span>
                    )}
                  </span>

                </div>
              </div>
            );
          })}
          
          {/* Viewport typing dots overlay */}
          {isTyping && (
            isAiChat ? (
              <div className="flex items-center gap-3.5 mr-auto max-w-[80%] select-none px-1 my-3 animate-fade-in">
                <div className="relative w-10 h-10 rounded-full bg-[#0f172a] border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0">
                  <img src={appLogo} alt="Aether Logo" className="w-5 h-5 object-contain animate-pulse" />
                  <div className="absolute inset-0 rounded-full border border-cyan-400/60 animate-ping opacity-40" />
                </div>
                <div className="bg-[#0d1527]/95 border border-cyan-500/30 rounded-2xl rounded-tl-none py-3 px-4 text-[13.5px] text-cyan-200 flex items-center gap-3 shadow-xl shadow-cyan-950/50 backdrop-blur-md">
                  <span className="font-semibold text-white tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Aether AI is thinking...
                  </span>
                  <div className="flex gap-1 items-center ml-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mr-auto max-w-[75%] select-none px-1">
                <img src={target?.avatar || getAvatarSvg(target?.name || 'U')} alt="" className="w-8 h-8 rounded-full border-2 border-[#2563EB]/20 bg-[#202C33] shadow-md shadow-black/20" />
                <div className="bg-[#202C33] border border-white/[0.04] rounded-2xl rounded-tl-none py-2.5 px-4 text-[14px] text-[#8696A0] flex items-center gap-1.5 shadow-lg shadow-black/15">
                  <span className="font-semibold text-[#E9EDEF]">{typingText.split(' ')[0]}</span> is typing
                  <div className="flex gap-1 items-center ml-1">
                    <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* Floating Jump to Latest Message Button */}
      {showScrollBtn && (
        <button
          onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-6 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full shadow-lg cursor-pointer z-20 hover:scale-110 active:scale-95 transition-transform"
          title="Scroll to bottom"
        >
          <FiArrowDown size={14} />
        </button>
      )}

      {/* 3. Input Console Section */}
      <div className="p-4 border-t border-white/5 bg-[#0B141A]/95 relative z-10 flex flex-col gap-3.5">
        
        {/* Reply Preview Header banner */}
        {replyingToMsg && (
          <div className="flex justify-between items-center p-3 bg-[#202C33] border border-white/10 rounded-xl text-[13px] select-none shadow-md">
            <div className="flex items-center gap-2 text-[#8696A0]">
              <FiCornerUpLeft size={13} className="text-[#2563EB]" />
              <span>Replying to <b className="text-[#E9EDEF]">{replyingToMsg.senderId === 'user_me' ? 'You' : target?.name}</b>: <i className="text-[#8696A0]">{replyingToMsg.text?.substring(0, 30)}...</i></span>
            </div>
            <button 
              onClick={() => setReplyingToMsg(null)}
              className="text-[#8696A0] hover:text-[#E9EDEF] cursor-pointer font-bold text-[12px] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Input box + Trigger Actions */}
        {isRecording ? (
          <VoiceRecorder onCancel={() => setIsRecording(false)} onSend={handleSendVoiceNote} />
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {/* Quick AI Suggestion Chips Strip */}
            {isAiChat && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 no-scrollbar select-none shrink-0">
                {[
                  { label: '💻 Write Code', prompt: 'Write a clean React component using Tailwind CSS.' },
                  { label: '📝 Summarize', prompt: 'Summarize our recent discussion logs in clear points.' },
                  { label: '🌐 Translate', prompt: 'Translate this log into Spanish.' },
                  { label: '💡 Explain Concept', prompt: 'Explain how WebSockets work in simple terms.' },
                  { label: '🚀 Refactor', prompt: 'Give suggestions for code refactoring and optimization.' }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(chip.prompt)}
                    className="px-3 py-1 bg-[#10192e] hover:bg-[#182645] border border-cyan-500/25 hover:border-cyan-500/50 rounded-full text-[12px] text-cyan-300 font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 flex items-center gap-1"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
            {/* Attachment Preview Ribbon */}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 overflow-x-auto p-2 bg-[#202C33]/50 rounded-xl border border-white/5 no-scrollbar">
                  {attachments.map(att => (
                    <div key={att.id} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-[#202C33] flex items-center justify-center group">
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <FiFileText size={20} className="text-[#8696A0]" />
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeAttachment(att.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <FiX size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-center z-10">
                        {att.name}
                      </div>
                    </div>
                  ))}
                </div>
                {/* View Once Toggle */}
                {attachments.some(a => a.type === 'image') && (
                  <button
                    type="button"
                    onClick={() => setViewOnceActive(v => !v)}
                    className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                      viewOnceActive
                        ? 'bg-[#2563EB]/15 border-[#2563EB]/30 text-[#2563EB]'
                        : 'bg-[#202C33] border border-white/10 text-[#8696A0] hover:text-[#E9EDEF]'
                    }`}
                    title="View once — recipient can only view this media one time"
                  >
                    {viewOnceActive ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                    {viewOnceActive ? 'View Once ON' : 'View Once'}
                  </button>
                )}
              </div>
            )}
            
            {isMessagingBlocked ? (
              <div className="w-full flex items-center justify-center bg-[#202C33] border border-white/10 rounded-2xl py-3.5 px-4 text-[#8696A0] font-sans text-[13px] select-none gap-2 shadow-lg">
                <FiLock size={14} className="text-amber-500/80 shrink-0 animate-pulse" />
                <span>Only admins can send messages in this group.</span>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-3 items-center w-full bg-[#202C33]/90 hover:bg-[#202C33] border border-white/5 focus-within:border-[#2563EB]/30 focus-within:ring-2 focus-within:ring-[#2563EB]/10 rounded-2xl p-2 px-3 shadow-xl transition-all duration-300 relative">
                {/* Attachment Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(!showAttachmentMenu);
                      setShowEmojiPicker(false);
                    }}
                    className={`p-2.5 rounded-full hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] transition-all cursor-pointer ${
                      showAttachmentMenu ? 'bg-[#2A3942] text-[#2563EB]' : ''
                    }`}
                    title="Attachment menu"
                    aria-label="Attachment Options"
                  >
                    <FiPaperclip size={20} />
                  </button>

                  {/* Float attachment drop menu */}
                  {showAttachmentMenu && (
                    <div className="absolute bottom-14 left-0 w-48 bg-[#202C33] border border-white/10 rounded-2xl p-2.5 space-y-1 shadow-2xl flex flex-col select-none z-50">
                      <button 
                        type="button" 
                        onClick={() => handleFileUpload('image')}
                        className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <FiImage size={16} className="text-[#2563EB]" /> Image File
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => handleFileUpload('document')}
                        className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <FiFileText size={16} className="text-blue-400" /> Document PDF
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleFileUpload('location')}
                        className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <FiMapPin size={16} className="text-rose-400" /> Coordinates GPS
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setShowAttachmentMenu(false);
                          sendMessage('typography choice', 'poll', {
                            pollQuestion: 'Draft poll choice session',
                            pollOptions: [
                              { optionId: 'o1', text: 'Option A', votes: 0, votedBy: [] },
                              { optionId: 'o2', text: 'Option B', votes: 0, votedBy: [] }
                            ]
                          });
                          toast.success('Poll editor mock successfully created');
                        }}
                        className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <FiRadio size={16} className="text-blue-400" /> Interactive Poll
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setShowAttachmentMenu(false);
                          sendMessage('meeting brief', 'text', { scheduled: true });
                          toast.success('Message scheduled for 5:00 PM.');
                        }}
                        className="w-full text-left py-2 px-3 hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-[#E9EDEF] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <FiCalendar size={16} className="text-blue-400" /> Schedule Message
                      </button>
                    </div>
                  )}
                </div>

                {/* Emoji Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowAttachmentMenu(false);
                    }}
                    className={`p-2.5 rounded-full hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] transition-all cursor-pointer ${
                      showEmojiPicker ? 'bg-[#2A3942] text-[#2563EB]' : ''
                    }`}
                    title="Emoji keyboard"
                    aria-label="Emoji selector"
                  >
                    <FiSmile size={20} />
                  </button>

                  {/* Emoji Picker dropdown */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-30 shadow-2xl rounded-2xl border border-white/10 overflow-hidden w-[300px] bg-white dark:bg-[#202C33] flex flex-col">
                      {/* Tab Selector row */}
                      <div className="flex bg-slate-100 dark:bg-[#111B21] p-1 border-b border-white/10 text-[10px] font-bold select-none">
                        {[
                          { id: 'emoji', label: 'EMOJI' },
                          { id: 'gif', label: 'GIFS' },
                          { id: 'sticker', label: 'STICKERS' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPickerTab(tab.id)}
                            className={`flex-1 py-1.5 rounded cursor-pointer transition-colors ${
                              pickerTab === tab.id 
                                ? 'bg-white dark:bg-[#202C33] text-[#2563EB] border border-white/10' 
                                : 'text-[#8696A0] hover:text-[#E9EDEF]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Render content based on active tab */}
                      {pickerTab === 'emoji' ? (
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme={isDark ? 'dark' : 'light'}
                          width={300}
                          height={320}
                        />
                      ) : pickerTab === 'gif' ? (
                        <GifPicker
                          onSelect={(url) => {
                            sendMessage(url, 'gif');
                            setShowEmojiPicker(false);
                            toast.success('GIF sent');
                          }}
                          theme={isDark ? 'dark' : 'light'}
                        />
                      ) : (
                        <StickerPicker
                          onSelect={(emoji) => {
                            sendMessage(emoji, 'sticker');
                            setShowEmojiPicker(false);
                            toast.success('Sticker sent');
                          }}
                          theme={isDark ? 'dark' : 'light'}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Input Text Area */}
                <div className="flex-1 flex gap-2 items-center bg-transparent relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.ctrlKey) {
                          // Quick send
                          e.preventDefault();
                          handleSend(e);
                        } else if (!e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }
                    }}
                    rows={1}
                    placeholder={editingMsg ? "Edit message..." : "Type a message securely..."}
                    className="flex-1 py-1.5 bg-transparent text-[15px] text-[#E9EDEF] outline-none placeholder:text-[#8696A0] resize-none max-h-24 no-scrollbar"
                    style={{ height: 'auto' }}
                    aria-label="Message Input Console"
                  />
                  {inputText.length > 0 && (
                    <span className="text-[9px] text-[#8696A0] font-mono select-none self-center shrink-0 pr-1">
                      {inputText.length}
                    </span>
                  )}
                </div>

                {/* Send / Mic Button */}
                {inputText.trim() ? (
                  <button
                    type="submit"
                    disabled={isSending}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md shadow-[#2563EB]/10 active:scale-95 cursor-pointer transition-all duration-300 shrink-0 ${isSending ? 'bg-[#2563EB]/50 cursor-not-allowed' : 'bg-[#2563EB] text-[#0B141A] hover:bg-[#2563EB]/90'}`}
                    aria-label="Send Message"
                  >
                    <FiSend size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRecording(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#2A3942] text-[#8696A0] hover:text-[#E9EDEF] active:scale-95 cursor-pointer transition-all duration-300 shrink-0"
                    title="Voice recording indicator"
                    aria-label="Record voice note"
                  >
                    <FiMic size={18} />
                  </button>
                )}
              </form>
            )}
          </div>
        )}
        
        {/* Hidden File Upload Inputs */}
        <input 
          type="file" 
          ref={imageInputRef} 
          onChange={handleImageSelect} 
          accept="image/*" 
          className="hidden"
          multiple
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" 
          className="hidden"
          multiple
        />
      </div>
        </>
      )}

      {activeSubTab === 'media' && (
        <div className="flex-1 overflow-y-auto p-6 bg-[#080c14] relative no-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-white font-display">Conversation Gallery</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Shared media attachments, files, and recordings</p>
            </div>
            
            {(selectedChat?.messages || []).filter(m => m.type === 'image' || m.type === 'document' || m.type === 'audio' || m.type === 'video').length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                <FiImage size={24} className="mb-2 opacity-50" />
                <p className="text-xs">No media or files shared in this chat yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {selectedChat.messages
                  .filter(m => m.type === 'image' || m.type === 'document' || m.type === 'audio' || m.type === 'video')
                  .map(m => {
                    const isImage = m.type === 'image';
                    const isVideo = m.type === 'video';
                    const isAudio = m.type === 'audio';
                    return (
                      <div key={m._id || m.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 bg-[#131b2e]/60 group flex items-center justify-center">
                        {isImage && m.mediaUrl ? (
                          <img src={resolveMediaUrl(m.mediaUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : isVideo && m.mediaUrl ? (
                          <video src={resolveMediaUrl(m.mediaUrl)} className="w-full h-full object-cover" />
                        ) : isAudio ? (
                          <FiMic size={20} className="text-blue-400" />
                        ) : (
                          <FiFileText size={20} className="text-blue-400" />
                        )}
                        <a 
                          href={resolveMediaUrl(m.mediaUrl) || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white"
                        >
                          <span className="text-[8px] truncate font-semibold uppercase tracking-wider">{m.type}</span>
                          <span className="text-[7px] text-slate-300 truncate">{m.text || m.fileName || 'Shared File'}</span>
                        </a>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'tasks' && (
        <TasksView 
          conversationId={selectedChat.id} 
          participants={selectedChat.type === 'group' ? (selectedChat.group?.members || []) : [me, target]} 
          me={me}
          convertTaskData={convertTaskData}
          onClearConvertData={() => setConvertTaskData(null)}
        />
      )}

      {/* 4. Drag & Drop File Upload Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#0b0f19]/90 border-2 border-dashed border-emerald-500/50 rounded-2xl flex flex-col justify-center items-center z-[100] m-4 backdrop-blur-sm select-none pointer-events-none">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-3xl flex items-center justify-center mb-4 text-blue-400 animate-bounce">
            <FiUploadCloud size={30} />
          </div>
          <h3 className="text-sm font-bold text-white font-display mb-1">Drop Files to Upload</h3>
          <p className="text-slate-400 text-[10px] max-w-xs text-center leading-relaxed">
            Attach photos, videos, audio clips, or documents directly to this secure conversation history.
          </p>
        </div>
      )}

      {/* 5. Custom Floating Message Context Menu */}
      {contextMenuMsg && (
        <div 
          className="fixed z-[999] bg-[#131b2e] border border-white/5 rounded-2xl p-2 w-48 shadow-2xl select-none flex flex-col backdrop-blur-xl"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              setReplyingToMsg(contextMenuMsg);
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiCornerUpLeft size={13} className="text-blue-400" /> Reply
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(contextMenuMsg.text || '');
              toast.success('Copied text to clipboard!');
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiCopy size={13} className="text-blue-400" /> Copy Text
          </button>
          <button 
            onClick={() => {
              setForwardMsg(contextMenuMsg);
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiShare2 size={13} className="text-blue-400" /> Forward
          </button>
          <button
            onClick={() => {
              pinMessage(selectedChat.id, contextMenuMsg.id || contextMenuMsg._id);
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiBookmark size={13} className="text-amber-400" /> Pin Message
          </button>
          <button 
            onClick={() => {
              setConvertTaskData({
                text: contextMenuMsg.text || '',
                messageId: contextMenuMsg.id || contextMenuMsg._id
              });
              setActiveSubTab('tasks');
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer font-bold text-blue-400"
          >
            <FiCheckSquare size={13} className="text-blue-400" /> ⭐ Convert To Task
          </button>
          <button 
            onClick={() => {
              toggleStarMessage(contextMenuMsg.id || contextMenuMsg._id);
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiStar size={13} fill={contextMenuMsg.starred ? 'currentColor' : 'none'} className="text-blue-400" /> 
            {contextMenuMsg.starred ? 'Unstar Message' : 'Star Message'}
          </button>
          <button 
            onClick={() => {
              toast.success(`Translated: "${contextMenuMsg.text || 'No text'}"`);
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiGlobe size={13} className="text-blue-400" /> Translate (AI)
          </button>
          <button 
            onClick={() => {
              toast.success('AI Summary: This message discusses designs, alignment factors, and security.');
              setContextMenuMsg(null);
            }}
            className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <FiInfo size={13} className="text-teal-400" /> Summarize (AI)
          </button>
          {contextMenuMsg.senderId === 'user_me' && (
            <>
              <button 
                onClick={() => {
                  setEditingMsg(contextMenuMsg);
                  setInputText(contextMenuMsg.text || '');
                  setContextMenuMsg(null);
                }}
                className="w-full text-left py-2 px-3 hover:bg-white/[0.03] rounded-lg text-xs text-slate-300 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiEdit size={13} className="text-blue-400" /> Edit Message
              </button>
              <button 
                onClick={() => {
                  setDeleteTargetMsg(contextMenuMsg);
                  setContextMenuMsg(null);
                }}
                className="w-full text-left py-2 px-3 hover:bg-rose-500/10 rounded-lg text-xs text-rose-400 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FiTrash2 size={13} className="text-rose-500" /> Delete Message
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetMsg && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in"
          onClick={() => setDeleteTargetMsg(null)}
        >
          <div
            className="w-72 bg-[#1F2C34] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-[#E9EDEF]">Delete message?</h3>
              <p className="text-[11px] text-[#8696A0] mt-1 leading-relaxed">
                Choose how you want to delete this message.
              </p>
            </div>
            <div className="p-2 flex flex-col">
              <button
                onClick={() => {
                  deleteMessage(deleteTargetMsg.id || deleteTargetMsg._id, false);
                  setDeleteTargetMsg(null);
                }}
                className="w-full text-left py-2.5 px-3 hover:bg-white/[0.04] rounded-xl text-[13px] text-[#E9EDEF] font-medium flex items-center gap-3 transition-colors cursor-pointer"
              >
                <FiTrash2 size={14} className="text-[#8696A0]" />
                <div>
                  <p>Delete for me</p>
                  <p className="text-[10px] text-[#8696A0]">Message will be removed from your chat</p>
                </div>
              </button>
              <button
                onClick={() => {
                  deleteMessage(deleteTargetMsg.id || deleteTargetMsg._id, true);
                  setDeleteTargetMsg(null);
                }}
                className="w-full text-left py-2.5 px-3 hover:bg-rose-500/10 rounded-xl text-[13px] text-rose-400 font-medium flex items-center gap-3 transition-colors cursor-pointer"
              >
                <FiTrash2 size={14} className="text-rose-400" />
                <div>
                  <p>Delete for everyone</p>
                  <p className="text-[10px] text-[#8696A0]">Message will be removed for all participants</p>
                </div>
              </button>
            </div>
            <div className="p-2 border-t border-white/5">
              <button
                onClick={() => setDeleteTargetMsg(null)}
                className="w-full py-2 text-[13px] text-[#8696A0] font-medium hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardMsg && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in"
          onClick={() => setForwardMsg(null)}
        >
          <div
            className="w-80 max-h-[70vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-200">Forward Message</h3>
              <button onClick={() => setForwardMsg(null)} className="text-slate-400 hover:text-white cursor-pointer transition-colors">
                <FiX size={16} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-white/5 bg-slate-950/40 shrink-0">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <FiSearch size={12} />
                </span>
                <input
                  type="text"
                  value={fwdSearchQuery}
                  onChange={(e) => setFwdSearchQuery(e.target.value)}
                  placeholder="Search chats or new contacts..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-white/5 rounded-xl text-[11px] text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500 transition-all font-sans"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-2 overflow-y-auto flex-1 max-h-[48vh] no-scrollbar space-y-4">
              {/* SECTION 1: ACTIVE CHATS */}
              <div>
                <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-3 mb-1.5 select-none">
                  {fwdSearchQuery ? 'Matching Conversations' : 'Recent Chats'}
                </h4>
                
                {(() => {
                  const filtered = chats.filter(c => {
                    if (c.id === selectedChat?.id) return false;
                    if (!fwdSearchQuery.trim()) return true;
                    const name = c.type === 'group' ? c.group?.name : c.user?.name;
                    const username = c.type === 'group' ? '' : c.user?.username;
                    return name?.toLowerCase().includes(fwdSearchQuery.toLowerCase()) || 
                           username?.toLowerCase().includes(fwdSearchQuery.toLowerCase());
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-[10px] text-slate-500 px-3 py-1.5 italic">
                        {fwdSearchQuery ? 'No matching active chats' : 'No other active chats'}
                      </p>
                    );
                  }

                  return filtered.map(c => {
                    const chatTarget = c.type === 'group' ? c.group : c.user;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleForwardTo(c.id, chatTarget?.name || 'chat')}
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.03] rounded-xl flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <img
                          src={chatTarget?.avatar || getAvatarSvg(chatTarget?.name || 'U')}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/5 bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{chatTarget?.name || 'Chat'}</p>
                          <p className="text-[9px] text-slate-500 truncate capitalize">{c.type}</p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* SECTION 2: GLOBAL DIRECTORY USERS */}
              {fwdSearchQuery.trim() && (
                <div>
                  <h4 className="text-[9px] text-blue-400 font-bold uppercase tracking-wider px-3 mb-1.5 select-none flex items-center gap-1">
                    Global Directory
                  </h4>
                  
                  {fwdLoading ? (
                    <p className="text-[10px] text-slate-400 px-3 py-1.5 animate-pulse">Searching users...</p>
                  ) : fwdSearchResults.length === 0 ? (
                    <p className="text-[10px] text-slate-500 px-3 py-1.5 italic">No new directory contacts found</p>
                  ) : (
                    fwdSearchResults.map(usr => (
                      <button
                        key={usr._id || usr.id}
                        onClick={() => handleForwardTo(null, usr.name, usr)}
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.03] rounded-xl flex items-center gap-3 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                      >
                        <img
                          src={usr.avatar || getAvatarSvg(usr.name || 'U')}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/5 bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{usr.name}</p>
                          <p className="text-[9px] text-slate-500 truncate">@{usr.username || 'user'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW ONCE FULLSCREEN MODAL */}
      <AnimatePresence>
        {viewOnceModalMedia && (
          <ViewOnceModal
            media={viewOnceModalMedia}
            onClose={() => setViewOnceModalMedia(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ==========================================
// ViewOnce Fullscreen Modal Sub-Component
// ==========================================
const ViewOnceModal = ({ media, onClose }) => {
  const [countdown, setCountdown] = useState(10);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setClosing(true);
          setTimeout(onClose, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center"
      onClick={handleClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <FiEye size={14} className="text-blue-400" />
          </div>
          <span className="text-xs font-bold text-emerald-300">View Once</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Countdown ring */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="16"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeDasharray={`${(countdown / 10) * 100.5} 100.5`}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] font-bold text-emerald-300 z-10">{countdown}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <FiX size={18} className="text-white/70" />
          </button>
        </div>
      </div>

      {/* Countdown bar */}
      <div className="absolute top-[60px] left-0 right-0 h-0.5 bg-slate-800">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 10, ease: 'linear' }}
        />
      </div>

      {/* Image */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: closing ? 0.88 : 1, opacity: closing ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="max-w-[90vw] max-h-[75vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={media.url}
          alt="View once"
          className="max-w-full max-h-[75vh] object-contain select-none pointer-events-none"
          draggable={false}
        />
      </motion.div>

      {/* Bottom note */}
      <p className="absolute bottom-6 text-[11px] text-slate-500 select-none flex items-center gap-1.5">
        <FiShield size={11} />
        This photo will be removed after viewing · Cannot be saved or forwarded
      </p>
    </motion.div>
  );
};

export default ChatWindow;

