import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initialChats, mockCalls, mockStatuses, mockChannels, mockCommunities, mockUsers, getAvatarSvg } from '../data/mockData';
import { mockSocket } from '../services/mockSocket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${url.startsWith('/') ? '' : '/'}${url}`;
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState(() => {
    // Ensure AI chat exists in initial chats
    const aiChatExists = initialChats.some(c => c.id === 'chat_user_ai');
    if (aiChatExists) return initialChats;
    return [...initialChats, {
      id: 'chat_user_ai',
      type: 'direct',
      user: {
        id: 'user_ai',
        name: 'Aether AI',
        username: 'aether_ai',
        avatar: getAvatarSvg('AI', '10b981', 'ffffff'),
        phone: 'System Protocol',
        bio: 'Your secure AI co-pilot powered by Gemini.',
        online: true,
      },
      messages: [],
      unreadCount: 0,
      pinned: false,
      isFavorited: false,
      locked: false,
      muted: false,
      archived: false,
      verified: true,
      createdAt: new Date().toISOString(),
    }];
  });
  const [selectedChatId, setSelectedChatId] = useState('chat_user_1');
  const [typingStatus, setTypingStatus] = useState({}); // { chatId: { senderId: "typing..." } }

  // Navigation States
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls' | 'status' | 'channels' | 'communities' | 'projects' | 'settings' | 'profile' | 'search' | 'gallery' | 'notifications'
  const [selectedChannelId, setSelectedChannelId] = useState('channel_1');
  const [selectedCommunityId, setSelectedCommunityId] = useState('community_1');
  
  // Call State
  const [activeCall, setActiveCall] = useState(null); // { id, userId, name, avatar, type, direction: 'incoming'|'outgoing'|'connected', status: 'ringing'|'connected' }
  const [callDuration, setCallDuration] = useState(0);
  const [callHistory, setCallHistory] = useState(mockCalls);
  const [isMuted, setMutedState] = useState(false);
  const [isCameraOn, setCameraState] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const setIsMuted = (val) => {
    setMutedState(val);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !val;
      });
    }
  };

  const setIsCameraOn = (val) => {
    setCameraState(val);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = val;
      });
    }
  };
  const [signalStrength, setSignalStrength] = useState('strong');
  
  // Status, Channels, Communities State
  const [statuses, setStatuses] = useState(mockStatuses);
  const [channels, setChannels] = useState(mockChannels);
  const [communities, setCommunities] = useState(mockCommunities);
  
  // WebRTC Connection References
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callTimerRef = useRef(null);

  // Projects Board State
  const [projects, setProjects] = useState([
    {
      id: 'proj_1',
      name: 'Project Aether v1.0',
      description: 'Glassmorphism messaging client frontend implementation.',
      progress: 85,
      chatId: 'chat_group_1',
      tasks: [
        { id: 't1', text: 'Implement status stories upload', completed: true },
        { id: 't2', text: 'Theme light mode overrides', completed: true },
        { id: 't3', text: 'Create workspace project tracker', completed: false }
      ],
      members: ['EV', 'DP', 'SC']
    },
    {
      id: 'proj_2',
      name: 'Apollo Design Redesign',
      description: 'Design audit for Apollo portal visual scaling specifications.',
      progress: 33,
      chatId: 'chat_user_1',
      tasks: [
        { id: 't4', text: 'Figma prototype review', completed: true },
        { id: 't5', text: 'Accent palette scaling', completed: false },
        { id: 't6', text: 'Line height specifications documentation', completed: false }
      ],
      members: ['EV']
    }
  ]);
  
  // Modals & Panels
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('info'); // 'info' | 'ai' | 'media' | 'search'
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'unread' | 'groups' | 'pinned' | 'archived' | 'favorites'

  // Helper: Base64 Media Uploader
  const uploadBase64Media = async (fileName, base64Data) => {
    try {
      const response = await axios.post('/api/media/upload', {
        fileName,
        fileData: base64Data
      });
      return response.data.fileUrl;
    } catch (err) {
      console.error('Backend media upload failed:', err);
      return base64Data; // Fallback to raw base64 data string
    }
  };

  const activeCallRef = useRef(activeCall);
  const selectedChatIdRef = useRef(selectedChatId);
  const userRef = useRef(user);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 1. Sync backend data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      // 1. Fetch Conversations from REST API
      try {
        const response = await axios.get('/api/chats');
        if (response.data && response.data.length > 0) {
          // Normalize conversation object structure for client components
          const normalized = response.data.map(convo => {
            const partner = convo.participants.find(p => p._id !== userRef.current?._id) || convo.participants[0] || {};
            
            const item = {
              id: convo._id,
              type: convo.type,
              creator: convo.creator,
              admins: convo.admins || [],
              unreadCount: convo.unreadCount || 0,
              pinned: convo.pinnedBy?.includes(userRef.current?._id) || false,
              favorite: convo.favoritedBy?.includes(userRef.current?._id) || false,
              archived: convo.archivedBy?.includes(userRef.current?._id) || false,
              pinnedMessageId: convo.pinnedMessageId || null,
              messages: convo.messages || []
            };

            if (convo.type === 'group') {
              item.group = {
                name: convo.name || 'Group Chat',
                avatar: convo.avatar || getAvatarSvg(convo.name || 'G', '10b981', 'ffffff'),
                description: convo.description || '',
                creator: convo.creator,
                onlyAdminsCanMessage: convo.onlyAdminsCanMessage || false,
                members: convo.participants.map(p => ({
                  id: p._id,
                  name: p.name,
                  username: p.username,
                  avatar: p.avatar || getAvatarSvg(p.name || 'U'),
                  online: p.verified
                }))
              };
              // Add a dummy user field to avoid any undefined access crashes
              item.user = {
                id: 'group_id',
                name: convo.name || 'Group Chat',
                avatar: convo.avatar || getAvatarSvg(convo.name || 'G', '10b981', 'ffffff')
              };
            } else {
              item.user = {
                id: partner._id,
                name: partner.name,
                username: partner.username,
                avatar: partner.avatar || getAvatarSvg(partner.name || 'U'),
                phone: partner.phone,
                bio: partner.bio,
                online: partner.verified,
                lastSeen: partner.verified ? 'Active now' : 'Offline'
              };
            }

            return item;
          });
          setChats(prev => {
            const existingAiChat = prev.find(c => c.id === 'chat_user_ai');
            const aiChatToKeep = existingAiChat || {
              id: 'chat_user_ai',
              type: 'direct',
              user: {
                id: 'user_ai',
                name: 'Aether AI',
                username: 'aether_ai',
                avatar: getAvatarSvg('AI', '10b981', 'ffffff'),
                phone: 'System Protocol',
                bio: 'Your secure AI co-pilot powered by Grok.',
                online: true
              },
              messages: []
            };
            return [...normalized.filter(c => c.id !== 'chat_user_ai'), aiChatToKeep];
          });
          
          setSelectedChatId(prev => prev || normalized[0]?.id || 'chat_user_ai');
        }
      } catch (err) {
        if (err.response?.status !== 401) console.warn('Backend chats fetch failed:', err?.message);
      }

      // 2. Fetch Statuses
      try {
        const statusRes = await axios.get('/api/status');
        if (statusRes.data && statusRes.data.length > 0) {
          setStatuses(statusRes.data.map(s => ({
            id: s._id,
            userId: s.userId?._id || s.userId,
            userUsername: s.userId?.username,
            userName: s.userName,
            userAvatar: s.userAvatar,
            items: s.items
          })));
        }
      } catch (err) {}

      // 3. Fetch Channels
      try {
        const channelRes = await axios.get('/api/channels');
        if (channelRes.data && channelRes.data.length > 0) {
          setChannels(channelRes.data.map(ch => ({
            id: ch._id,
            name: ch.name,
            avatar: ch.avatar || getAvatarSvg(ch.name),
            subscribers: ch.subscribersCount >= 1000 ? `${(ch.subscribersCount/1000).toFixed(1)}K` : ch.subscribersCount,
            description: ch.description,
            following: ch.followers?.includes(userRef.current?._id || userRef.current?.id) || false,
            posts: (ch.posts || []).map(p => ({
              id: p._id,
              content: p.content,
              image: p.image,
              likes: p.likes?.length || 0,
              userLiked: p.likes?.includes(userRef.current?._id || userRef.current?.id) || false,
              date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today',
              comments: (p.comments || []).map(c => ({
                name: c.name,
                text: c.text,
                date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Just now'
              }))
            }))
          })));
        }
      } catch (err) {}

      // 4. Fetch Communities
      try {
        const commRes = await axios.get('/api/communities');
        if (commRes.data && commRes.data.length > 0) {
          setCommunities(commRes.data.map(c => ({
            id: c._id,
            name: c.name,
            tagline: c.tagline,
            description: c.description,
            avatar: c.avatar || getAvatarSvg(c.name),
            joined: c.joined?.includes(userRef.current?._id || userRef.current?.id) || false,
            announcements: (c.announcements || []).map(a => ({
              id: a._id,
              title: a.title,
              content: a.content,
              date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Just now'
            })),
            groups: (c.groups || []).map(g => ({
              id: g._id,
              name: g.group?.name || g.name,
              description: g.group?.description || g.description || ''
            }))
          })));
        }
      } catch (err) {}
    };

    loadData();

    // 2. Initialize Socket and Bind Event Handlers
    mockSocket.init(user);

    const handleIncomingCall = (callData) => {
      if (!activeCallRef.current) {
        setActiveCall({
          id: callData.callId,
          userId: callData.callerId,
          name: callData.callerName,
          avatar: callData.callerAvatar,
          type: callData.type,
          direction: 'incoming',
          status: 'ringing'
        });
        toast(`Incoming ${callData.type} call from ${callData.callerName}`, { icon: '📞' });
      }
    };

    const handleCallAccepted = () => {
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      toast.success('Call connected');
      // Setup local WebRTC stream attachment if active
      if (localStreamRef.current && peerConnectionRef.current) {
        setupWebRtcPeer();
      }
    };

    const handleCallDeclined = () => {
      setActiveCall(null);
      toast.error('Call declined');
      cleanupWebRtc();
    };

    const handleCallEnded = () => {
      setActiveCall(null);
      toast('Call ended by other party', { icon: '📞' });
      cleanupWebRtc();
    };

    const handleTypingStatus = ({ chatId, senderId, status }) => {
      setTypingStatus(prev => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          [senderId]: status
        }
      }));
    };

    const handleMessageReceived = (msgPayload) => {
      const { chatId, message } = msgPayload;
      if (!chatId || !message) return;

      // Skip if this is our own message (server already excludes sender, but safe check)
      const myId = userRef.current?._id || userRef.current?.id;
      const senderId = message.senderId?._id || message.senderId?.id || message.senderId;
      if (senderId?.toString() === myId?.toString()) return;

      setChats(prevChats => {
        return prevChats.map(c => {
          if (c.id === chatId) {
            // Prevent duplicates
            const exists = c.messages.some(m => m._id === message._id || m.id === message._id || m.id === message.id);
            if (exists) return c;

            // Notification for background chats
            if (chatId !== selectedChatIdRef.current && userRef.current?.notifications?.showPreview) {
              toast(`New message: ${message.text?.substring(0, 30)}...`, {
                icon: '💬',
                position: 'top-right'
              });
            }

            return {
              ...c,
              unreadCount: chatId === selectedChatIdRef.current ? 0 : c.unreadCount + 1,
              messages: [...c.messages, message]
            };
          }
          return c;
        });
      });
    };

    const handleConversationDeleted = ({ chatId }) => {
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (selectedChatIdRef.current === chatId) {
        setSelectedChatId(null);
      }
      toast('A conversation was deleted', { icon: '🗑️' });
    };

    const handleMessageDeleted = ({ chatId, messageId }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.filter(m => m.id !== messageId && m._id !== messageId)
          };
        }
        return c;
      }));
    };

    const handleMessageReactionUpdated = ({ chatId, messageId, reactions }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === messageId || m._id === messageId) ? { ...m, reactions } : m)
          };
        }
        return c;
      }));
    };

    const handleMessagePinned = ({ chatId, pinnedMessageId }) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinnedMessageId: pinnedMessageId || null } : c));
    };

    const handleMessageEdited = ({ chatId, message }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === message._id || m._id === message._id || m.id === message.id || m._id === message.id) ? { ...m, ...message } : m)
          };
        }
        return c;
      }));
    };

    const handlePollUpdated = ({ chatId, messageId, pollOptions }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === messageId || m._id === messageId) ? { ...m, pollOptions } : m)
          };
        }
        return c;
      }));
    };

    const handleMessageOpened = ({ chatId, messageId, openedBy }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => {
              if (m.id === messageId || m._id === messageId) {
                const isUserMeOpened = openedBy.includes(userRef.current?._id) || openedBy.includes(userRef.current?.id);
                return {
                  ...m,
                  viewOnceOpenedBy: openedBy,
                  mediaUrl: isUserMeOpened ? '' : m.mediaUrl
                };
              }
              return m;
            })
          };
        }
        return c;
      }));
    };

    const handleMessageStatusUpdate = ({ chatId, messageId, status }) => {
      if (!chatId || !messageId || !status) return;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === messageId || m._id === messageId) ? { ...m, status } : m)
          };
        }
        return c;
      }));
    };

    const handleWebrtcSignal = ({ senderId, signal }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (signal.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
      } else if (signal.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === 'offer') {
              pc.createAnswer()
                .then(answer => pc.setLocalDescription(answer))
                .then(() => {
                  mockSocket.emit('webrtc_signal', {
                    targetUserId: senderId,
                    signal: { sdp: pc.localDescription }
                  });
                });
            }
          })
          .catch(() => {});
      }
    };

    const handleUserOnline = ({ userId }) => {
      setChats(prev => prev.map(c => {
        if (c.type !== 'group' && c.user?.id === userId) {
          return {
            ...c,
            user: { ...c.user, online: true, lastSeen: 'Active now' }
          };
        }
        return c;
      }));
    };

    const handleUserOffline = ({ userId }) => {
      setChats(prev => prev.map(c => {
        if (c.type !== 'group' && c.user?.id === userId) {
          return {
            ...c,
            user: { ...c.user, online: false, lastSeen: 'Offline' }
          };
        }
        return c;
      }));
    };

    const handleTaskAssigned = ({ task, notification }) => {
      toast(notification.content, { icon: '📋', style: { border: '1px solid rgba(16, 185, 129, 0.2)' } });
    };
    const handleTaskCompleted = ({ taskId, notification }) => {
      toast(notification.content, { icon: '✔️' });
    };
    const handleTaskReminder = ({ task, type, notification }) => {
      toast(notification.content, { icon: '⏰', style: { border: '1px solid rgba(245, 158, 11, 0.2)' } });
    };
    const handleMention = ({ taskId, comment, notification }) => {
      toast(notification.content, { icon: '💬', style: { border: '1px solid rgba(59, 130, 246, 0.2)' } });
    };

    const unsubCall = mockSocket.on('incoming_call', handleIncomingCall);
    const unsubAccept = mockSocket.on('call_accepted', handleCallAccepted);
    const unsubDecline = mockSocket.on('call_declined', handleCallDeclined);
    const unsubCallEnded = mockSocket.on('call_ended', handleCallEnded);
    const unsubTyping = mockSocket.on('typing_status', handleTypingStatus);
    const unsubMsg = mockSocket.on('message_received', handleMessageReceived);
    const unsubWebrtc = mockSocket.on('webrtc_signal', handleWebrtcSignal);
    const unsubDelete = mockSocket.on('conversation_deleted', handleConversationDeleted);
    const unsubMsgDeleted = mockSocket.on('message_deleted', handleMessageDeleted);
    const unsubReaction = mockSocket.on('message_reaction_updated', handleMessageReactionUpdated);
    const unsubMsgPinned = mockSocket.on('message_pinned', handleMessagePinned);
    const unsubMsgEdited = mockSocket.on('message_edited', handleMessageEdited);
    const unsubPollUpdated = mockSocket.on('poll_updated', handlePollUpdated);
    const unsubMsgOpened = mockSocket.on('message_opened', handleMessageOpened);
    const unsubMsgStatus = mockSocket.on('message_status_update', handleMessageStatusUpdate);
    const unsubOnline = mockSocket.on('user_online', handleUserOnline);
    const unsubOffline = mockSocket.on('user_offline', handleUserOffline);
    const unsubTaskAssigned = mockSocket.on('taskAssigned', handleTaskAssigned);
    const unsubTaskCompleted = mockSocket.on('taskCompleted', handleTaskCompleted);
    const unsubTaskReminder = mockSocket.on('taskReminder', handleTaskReminder);
    const unsubMention = mockSocket.on('mention', handleMention);

    const handleChannelPostAdded = ({ channelId, post }) => {
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId || ch._id === channelId) {
          if (ch.posts.some(p => p.id === post._id || p.id === post.id)) return ch;
          const newPost = {
            id: post._id,
            content: post.content,
            image: post.image,
            likes: post.likes?.length || 0,
            userLiked: false,
            date: 'Just now',
            comments: post.comments || []
          };
          return { ...ch, posts: [newPost, ...ch.posts] };
        }
        return ch;
      }));
    };

    const handleChannelPostLiked = ({ channelId, postId, likes }) => {
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId || ch._id === channelId) {
          return {
            ...ch,
            posts: ch.posts.map(p => {
              if (p.id === postId || p._id === postId) {
                return {
                  ...p,
                  likes: likes?.length || 0,
                  userLiked: likes?.includes(userRef.current?._id || userRef.current?.id)
                };
              }
              return p;
            })
          };
        }
        return ch;
      }));
    };

    const handleChannelPostCommented = ({ channelId, postId, comment }) => {
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId || ch._id === channelId) {
          return {
            ...ch,
            posts: ch.posts.map(p => {
              if (p.id === postId || p._id === postId) {
                const newComment = {
                  name: comment.name,
                  text: comment.text,
                  date: 'Just now'
                };
                return {
                  ...p,
                  comments: [...(p.comments || []), newComment]
                };
              }
              return p;
            })
          };
        }
        return ch;
      }));
    };

    const handleCommunityAnnouncementAdded = ({ communityId, announcement }) => {
      setCommunities(prev => prev.map(c => {
        if (c.id === communityId || c._id === communityId) {
          if (c.announcements?.some(a => a.id === announcement._id || a._id === announcement._id)) return c;
          const newAnn = {
            id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            date: 'Just now'
          };
          return {
            ...c,
            announcements: [newAnn, ...(c.announcements || [])]
          };
        }
        return c;
      }));
    };

    const handleGroupSettingsUpdated = ({ chatId, name, avatar, description, onlyAdminsCanMessage }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            group: {
              ...c.group,
              name: name || c.group.name,
              avatar: avatar || c.group.avatar,
              description: description !== undefined ? description : c.group.description,
              onlyAdminsCanMessage: onlyAdminsCanMessage !== undefined ? onlyAdminsCanMessage : c.group.onlyAdminsCanMessage
            }
          };
        }
        return c;
      }));
    };

    const handleGroupMembersUpdated = ({ chatId, participants }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            group: {
              ...c.group,
              members: participants.map(p => ({
                id: p._id || p.id,
                name: p.name,
                username: p.username,
                avatar: p.avatar || getAvatarSvg(p.name || 'U'),
                online: p.verified
              }))
            }
          };
        }
        return c;
      }));
    };

    const handleGroupAdminsUpdated = ({ chatId, admins }) => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            admins: admins
          };
        }
        return c;
      }));
    };

    const unsubChannelPost = mockSocket.on('channel_post_added', handleChannelPostAdded);
    const unsubChannelLike = mockSocket.on('channel_post_liked', handleChannelPostLiked);
    const unsubChannelComment = mockSocket.on('channel_post_commented', handleChannelPostCommented);
    const unsubCommunityAnn = mockSocket.on('community_announcement_added', handleCommunityAnnouncementAdded);
    const unsubGroupSettings = mockSocket.on('group_settings_updated', handleGroupSettingsUpdated);
    const unsubGroupMembers = mockSocket.on('group_members_updated', handleGroupMembersUpdated);
    const unsubGroupAdmins = mockSocket.on('group_admins_updated', handleGroupAdminsUpdated);
    const unsubChannelDeleted = mockSocket.on('channel_deleted', (channelId) => {
      setChannels(prev => prev.filter(ch => ch.id !== channelId && ch._id !== channelId));
      setSelectedChannelId(prev => (prev === channelId ? null : prev));
    });

    return () => {
      unsubCall();
      unsubAccept();
      unsubDecline();
      unsubCallEnded();
      unsubTyping();
      unsubMsg();
      unsubWebrtc();
      unsubDelete();
      unsubMsgDeleted();
      unsubReaction();
      unsubMsgPinned();
      unsubMsgEdited();
      unsubPollUpdated();
      unsubMsgOpened();
      unsubMsgStatus();
      unsubChannelPost();
      unsubChannelLike();
      unsubChannelComment();
      unsubCommunityAnn();
      unsubGroupSettings();
      unsubGroupMembers();
      unsubGroupAdmins();
      unsubChannelDeleted();
      unsubOnline();
      unsubOffline();
      unsubTaskAssigned();
      unsubTaskCompleted();
      unsubTaskReminder();
      unsubMention();
    };
  }, [isAuthenticated]);

  // Call Duration Timer
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
        if (Math.random() < 0.05) {
          const signals = ['weak', 'fair', 'strong'];
          setSignalStrength(signals[Math.floor(Math.random() * signals.length)]);
        }
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }

    return () => clearInterval(callTimerRef.current);
  }, [activeCall?.status]);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const selectChat = useCallback(async (chatId) => {
    if (!chatId) return;
    setSelectedChatId(chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    
    // Fetch real-time message logs from backend REST API (skip mock IDs)
    if (/^[a-f\d]{24}$/i.test(chatId)) {
      try {
        const response = await axios.get(`/api/chats/${chatId}/messages`);
        if (response.data) {
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: response.data } : c));
          emitReadReceipts(chatId, response.data);
        }
      } catch (err) {
        if (err.response?.status !== 500) console.warn('Failed to load REST messages for chat', chatId, err?.message);
      }
    }
  }, [user]);

  // Emit read receipt for all unread messages when chat is selected
  const emitReadReceipts = async (chatId, messages) => {
    if (!messages || !mockSocket.isRealConnected) return;
    const myId = user?._id || user?.id;
    messages.forEach((msg) => {
      if (
        (msg.senderId?._id || msg.senderId)?.toString() !== myId?.toString() &&
        msg.status !== 'read'
      ) {
        mockSocket.emit('read_receipt', {
          chatId,
          messageId: msg._id || msg.id
        });
      }
    });
  };

  // Send Message Logic — optimized for instant local feedback
  const sendMessage = (content, messageType = 'text', additionalFields = {}, targetChatId = null) => {
    const destChatId = targetChatId || selectedChatId;
    if (!destChatId) return;

    const activeChat = chats.find(c => c.id === destChatId);
    const isSelfChat = activeChat?.user?.id === user?._id || activeChat?.user?.id === user?.id;

    const newMessage = {
      id: 'msg_' + Date.now(),
      senderId: 'user_me',
      senderName: user.name,
      senderAvatar: user.avatar,
      type: messageType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isSelfChat ? 'read' : 'sent',
      text: content || '',
      ...additionalFields
    };

    // disappearing message window duration calculation
    if (activeChat?.disappearing && activeChat.disappearing !== 'off') {
      const match = activeChat.disappearing.match(/^(\d+)(s|m|h|d)$/);
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2];
        let multiplier = 1000;
        if (unit === 'm') multiplier = 60 * 1000;
        if (unit === 'h') multiplier = 60 * 60 * 1000;
        if (unit === 'd') multiplier = 24 * 60 * 60 * 1000;
        newMessage.expiresAt = Date.now() + val * multiplier;
      }
    }

    // Append message locally IMMEDIATELY for instant feedback (before any async)
    const msgId = newMessage.id;
    setChats(prev => {
      const exists = prev.some(c => c.id === destChatId);
      if (exists) {
        return prev.map(c => c.id === destChatId ? { ...c, messages: [...(c.messages || []), newMessage] } : c);
      }
      if (destChatId === 'chat_user_ai') {
        const newAiChat = {
          id: 'chat_user_ai',
          type: 'direct',
          user: {
            id: 'user_ai',
            name: 'Aether AI',
            username: 'aether_ai',
            avatar: getAvatarSvg('AI', '10b981', 'ffffff'),
            phone: 'System Protocol',
            bio: 'Your secure AI co-pilot powered by Grok.',
            online: true
          },
          messages: [newMessage]
        };
        return [...prev, newAiChat];
      }
      return prev;
    });

    // Self-chat — no network calls needed, instantly done
    if (isSelfChat) return;

    // Async upload media if needed (updates message in-place when done)
    if (additionalFields.mediaUrl && additionalFields.mediaUrl.startsWith("data:")) {
      uploadBase64Media(content || 'media_file', additionalFields.mediaUrl)
        .then(fileUrl => {
          setChats(prev => prev.map(c => {
            if (c.id === destChatId) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === msgId ? { ...m, mediaUrl: fileUrl } : m)
              };
            }
            return c;
          }));
        })
        .catch(err => console.error('Failed to convert and upload file:', err));
    }

    // Dispatch payload to Socket.io backend if connected
    if (mockSocket.isRealConnected) {
      mockSocket.emit('send_message', {
        conversationId: destChatId,
        type: messageType,
        text: additionalFields.text || content || '',
        mediaUrl: additionalFields.mediaUrl || '',
        fileName: additionalFields.fileName || '',
        fileSize: additionalFields.fileSize || '',
        duration: additionalFields.duration || '',
        waveform: additionalFields.waveform || [],
        locationName: additionalFields.locationName || '',
        coordinates: additionalFields.coordinates || '',
        pollQuestion: additionalFields.pollQuestion || '',
        pollOptions: additionalFields.pollOptions || [],
        replyTo: additionalFields.replyTo || null,
        forwardedFrom: additionalFields.forwardedFrom || null,
        viewOnce: additionalFields.viewOnce || false,
        senderName: user.name,
        senderAvatar: user.avatar,
        senderUsername: user.username
      });
    }

    // AI routing handler — TIER 1: user Grok key → TIER 2: backend → TIER 3: simulation
    const isAiTarget = destChatId === 'chat_user_ai' ||
                       activeChat?.user?.username === 'aether_ai' ||
                       activeChat?.user?.id === 'user_ai' ||
                       activeChat?.user?.name === 'Aether AI';

    if (isAiTarget && messageType === 'text') {
      // Use latest chat messages from state snapshot (handles new chat_user_ai case)
      const chatHistory = (chats.find(c => c.id === destChatId)?.messages || []).slice(-15);
      
      mockSocket.emit('typing_status', { chatId: destChatId, senderId: 'user_ai', status: 'thinking...' });

      const appendAiMessage = (data) => {
        mockSocket.emit('typing_status', { chatId: destChatId, senderId: 'user_ai', status: null });
        const aiMessage = {
          id: 'ai_' + Date.now(),
          senderId: 'user_ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: data.type || 'text',
          text: data.response || data.text || data.caption || data.reply || data.message || '',
          ...(data.type === 'image' && { mediaUrl: data.mediaUrl, caption: data.caption })
        };
        setChats(prev => {
          const exists = prev.some(c => c.id === destChatId);
          if (exists) {
            return prev.map(c => c.id === destChatId ? { ...c, messages: [...(c.messages || []), aiMessage] } : c);
          }
          if (destChatId === 'chat_user_ai') {
            const newAiChat = {
              id: 'chat_user_ai',
              type: 'direct',
              user: {
                id: 'user_ai',
                name: 'Aether AI',
                username: 'aether_ai',
                avatar: getAvatarSvg('AI', '10b981', 'ffffff'),
                phone: 'System Protocol',
                bio: 'Your secure AI co-pilot powered by Grok.',
                online: true
              },
              messages: [aiMessage]
            };
            return [...prev, newAiChat];
          }
          return prev;
        });
      };

      // Helper check to skip placeholder keys that will fail
      const isPlaceholderKey = (key) => {
        return !key || 
               key.includes('placeholder') || 
               key.length < 15;
      };

      // TIER 2: Direct Grok API completions call from client (no server needed)
      const callGrokDirect = async (clientApiKey) => {
        const messages = [
          {
            role: 'system',
            content: "You are Aether AI, a highly intelligent personal AI assistant integrated into the AetherChat messaging platform. Your personality is sleek, tech-forward, professional yet friendly. Use markdown formatting: **bold** for key terms, bullet points with -, numbered lists, ## for section headers, and appropriate emojis. Keep responses clear, helpful, and well-structured.\n\nIf the user asks you to generate, draw, or create an image, start your response with `[IMAGE]` followed by a vivid image generation prompt, then `[CAPTION]` with a friendly caption. Otherwise reply normally."
          }
        ];
        chatHistory.forEach(msg => {
          if (msg.type === 'text' && msg.text) {
            messages.push({ role: msg.senderId === 'user_ai' ? 'assistant' : 'user', content: msg.text });
          }
        });
        messages.push({ role: 'user', content: content });

        // Try grok-beta first, fallback to grok-2-latest
        let res = await fetch('https://api.xai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientApiKey}`
          },
          body: JSON.stringify({
            messages,
            model: 'grok-beta',
            temperature: 0.9
          })
        });

        if (!res.ok) {
          res = await fetch('https://api.xai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientApiKey}`
            },
            body: JSON.stringify({
              messages,
              model: 'grok-2-latest',
              temperature: 0.9
            })
          });
        }

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Grok API error ${res.status}: ${errBody}`);
        }

        const json = await res.json();
        const responseText = json.choices?.[0]?.message?.content || 'I was unable to generate a response. Please try again.';

        if (responseText.trim().startsWith('[IMAGE]')) {
          const imgMatch = responseText.match(/\[IMAGE\]\s*(.+)/i);
          const capMatch = responseText.match(/\[CAPTION\]\s*(.+)/i);
          const imagePrompt = imgMatch ? imgMatch[1].split('\n')[0].trim() : content;
          const caption = capMatch ? capMatch[1].trim() : `Here is your generated image of "${content}"!`;
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
          appendAiMessage({ type: 'image', mediaUrl: imageUrl, caption, response: caption });
        } else {
          appendAiMessage({ type: 'text', response: responseText });
        }
      };

      const callRealAiApi = async () => {
        const clientApiKey = (localStorage.getItem('aether_grok_key') || '').trim();
        const hasValidClientKey = clientApiKey.length >= 15 && !clientApiKey.includes('placeholder');

        // TIER 1: User has their own Grok key — use it directly (fastest, no server needed)
        if (hasValidClientKey) {
          try {
            await callGrokDirect(clientApiKey);
            return;
          } catch (err) {
            console.warn('[AI] Direct Grok key failed:', err.message);
          }
        }

        // TIER 2: Try the backend server (uses server-side GROK_API_KEY from .env)
        try {
          const token = sessionStorage.getItem('aether_token');
          if (token) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ prompt: content, history: chatHistory }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              appendAiMessage(data);
              return;
            }
          }
        } catch (backendErr) {
          console.warn('[AI] Backend unavailable:', backendErr.message);
        }

        // TIER 3: Local simulation fallback (always works, no network needed)
        mockSocket.simulateAiResponse(content, chatHistory, (aiMessage) => {
          mockSocket.emit('typing_status', { chatId: destChatId, senderId: 'user_ai', status: null });
          setChats(prev => {
            const exists = prev.some(c => c.id === destChatId);
            if (exists) {
              return prev.map(c => c.id === destChatId ? { ...c, messages: [...(c.messages || []), aiMessage] } : c);
            }
            if (destChatId === 'chat_user_ai') {
              return [...prev, {
                id: 'chat_user_ai', type: 'direct',
                user: { id: 'user_ai', name: 'Aether AI', username: 'aether_ai', avatar: getAvatarSvg('AI', '10b981', 'ffffff'), phone: 'System Protocol', bio: 'Your AI co-pilot.', online: true },
                messages: [aiMessage]
              }];
            }
            return prev;
          });
        }, destChatId);
      };
      
      callRealAiApi();
    }
  };

  const setChatDisappearing = (chatId, duration) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, disappearing: duration } : c));
  };

  // Disappearing messages ticker loop
  useEffect(() => {
    const timer = setInterval(() => {
      setChats(prevChats => {
        let changed = false;
        const now = Date.now();
        const updated = prevChats.map(c => {
          const validMessages = c.messages.filter(m => {
            if (m.expiresAt && now > m.expiresAt) {
              changed = true;
              return false;
            }
            return true;
          });
          if (validMessages.length !== c.messages.length) {
            return { ...c, messages: validMessages };
          }
          return c;
        });
        return changed ? updated : prevChats;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const clearChatHistory = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [] } : c));
    toast.success('Chat history cleared', { icon: '🧹' });
  };

  const clearAllChatHistory = () => {
    setChats(prev => prev.map(c => ({ ...c, messages: [] })));
    toast.success('All chat history cleared', { icon: '🧹' });
  };

  // Message Modifications
  const deleteMessage = async (msgId, forEveryone = false) => {
    try {
      if (!forEveryone) {
        // "Delete for me" — remove from local state only, mark on server
        setChats(prev => prev.map(c => {
          if (c.id === selectedChatId) {
            return {
              ...c,
              messages: c.messages.filter(m => m.id !== msgId && m._id !== msgId)
            };
          }
          return c;
        }));
        await axios.delete(`/api/messages/${msgId}`);
        toast.success('Message deleted for you');
      } else {
        // "Delete for everyone" — remove from local state + delete on server
        setChats(prev => prev.map(c => {
          if (c.id === selectedChatId) {
            return {
              ...c,
              messages: c.messages.filter(m => m.id !== msgId && m._id !== msgId)
            };
          }
          return c;
        }));
        await axios.delete(`/api/messages/${msgId}?forEveryone=true`);
        toast.success('Message deleted for everyone');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Failed to delete message');
    }
  };

  const editMessage = async (msgId, newText) => {
    try {
      const response = await axios.put(`/api/messages/${msgId}`, { text: newText });
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, ...response.data, edited: true } : m)
          };
        }
        return c;
      }));
      toast.success('Message edited');
    } catch (err) {
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, text: newText, edited: true } : m)
          };
        }
        return c;
      }));
      toast.success('Message edited locally');
    }
  };

  const toggleStarMessage = async (msgId) => {
    try {
      const response = await axios.post(`/api/messages/${msgId}/star`);
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, starredBy: response.data.starredBy, starred: response.data.starred } : m)
          };
        }
        return c;
      }));
      toast.success(response.data.starred ? 'Message starred' : 'Message unstarred', { icon: '⭐' });
    } catch (err) {
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          const message = c.messages.find(m => m.id === msgId || m._id === msgId);
          const nextStarred = !message?.starred;
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, starred: nextStarred } : m)
          };
        }
        return c;
      }));
      toast.success('Star updated locally', { icon: '⭐' });
    }
  };

  const pinMessage = async (chatId, messageId) => {
    // Optimistic update (messageId null => unpin)
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinnedMessageId: messageId || null } : c));
    try {
      await axios.post(`/api/chats/${chatId}/pin-message`, { messageId: messageId || null });
      toast.success(messageId ? 'Message pinned to conversation' : 'Message unpinned', { icon: '📌' });
    } catch (err) {
      console.error('Failed to pin message:', err);
      toast.success(messageId ? 'Message pinned locally' : 'Message unpinned locally', { icon: '📌' });
    }
  };

  const addReaction = async (msgId, emoji) => {
    try {
      // Optimistic local update
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => {
              if (m.id === msgId || m._id === msgId) {
                const reactions = m.reactions ? [...m.reactions] : [];
                const existingIndex = reactions.findIndex(r => r.userId === 'user_me' || r.userId === user?._id || r.userId?._id === user?._id || r.senderId === 'user_me');
                if (existingIndex > -1) {
                  if (reactions[existingIndex].emoji === emoji) {
                    reactions.splice(existingIndex, 1);
                  } else {
                    reactions[existingIndex].emoji = emoji;
                  }
                } else {
                  reactions.push({ userId: user?._id || 'user_me', emoji });
                }
                return { ...m, reactions };
              }
              return m;
            })
          };
        }
        return c;
      }));

      // Call API
      const response = await axios.post(`/api/messages/${msgId}/react`, { emoji });
      
      // Update local state with exact backend reactions
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, reactions: response.data.reactions } : m)
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  };

  const votePoll = async (msgId, optionId) => {
    try {
      const response = await axios.post(`/api/messages/${msgId}/vote`, { optionId });
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => (m.id === msgId || m._id === msgId) ? { ...m, pollOptions: response.data.pollOptions } : m)
          };
        }
        return c;
      }));
      toast.success('Vote submitted');
    } catch (err) {
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return {
            ...c,
            messages: c.messages.map(m => {
              if ((m.id === msgId || m._id === msgId) && m.type === 'poll') {
                const userId = user?._id || 'user_me';
                const options = m.pollOptions.map(opt => {
                  const voted = opt.votedBy?.includes(userId);
                  let votedBy = opt.votedBy ? [...opt.votedBy] : [];
                  let votes = opt.votes || 0;
                  if (opt.optionId === optionId) {
                    if (voted) {
                      votedBy = votedBy.filter(u => u !== userId);
                      votes -= 1;
                    } else {
                      votedBy.push(userId);
                      votes += 1;
                    }
                  }
                  return { ...opt, votes, votedBy };
                });
                return { ...m, pollOptions: options };
              }
              return m;
            })
          };
        }
        return c;
      }));
      toast.success('Vote submitted locally');
    }
  };

  // WebRTC Signal & Call setup helpers
  const setupWebRtcPeer = (targetUserId) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && targetUserId) {
          mockSocket.emit('webrtc_signal', {
            targetUserId,
            signal: { candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          if (activeCallRef.current?.status === 'connected') {
            setActiveCall(null);
            toast.error('Call disconnected');
          }
          cleanupWebRtc();
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
    } catch (err) {
      console.warn('WebRTC peer configuration failed', err);
    }
  };

  const cleanupWebRtc = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
  };

  // Calling handlers with WebSockets signaling
  const initiateCall = (userId, name, avatar, type) => {
    const newCall = {
      id: 'call_' + Date.now(),
      userId,
      name,
      avatar,
      type,
      direction: 'outgoing',
      status: 'ringing'
    };
    setActiveCall(newCall);
    setIsMuted(false);
    setIsCameraOn(true);
    setIsScreenSharing(false);

    // Emit call invite via Socket.io signaling
    mockSocket.emit('call_invite', {
      targetUserId: userId,
      callType: type,
      callId: newCall.id,
      callerName: user.name,
      callerAvatar: user.avatar
    });

    // Request client camera/mic stream and create offer
    navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      .then(stream => {
        localStreamRef.current = stream;
        setupWebRtcPeer(userId);
        const pc = peerConnectionRef.current;
        if (pc) {
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              mockSocket.emit('webrtc_signal', {
                targetUserId: userId,
                signal: { sdp: pc.localDescription }
              });
            })
            .catch(() => {});
        }
      })
      .catch(err => console.warn('Media devices stream not available', err));

    setCallHistory(h => [
      {
        id: newCall.id,
        userId: newCall.userId,
        name: newCall.name,
        avatar: newCall.avatar,
        type: newCall.type,
        status: 'outgoing',
        date: 'Just now',
        missed: false
      },
      ...h
    ]);
  };

  const acceptCall = () => {
    if (!activeCall) return;
    setActiveCall(prev => ({ ...prev, status: 'connected' }));

    mockSocket.emit('call_accept', { callerId: activeCall.userId });

    // Request client media streams — answer will be created when offer arrives
    navigator.mediaDevices.getUserMedia({ audio: true, video: activeCall.type === 'video' })
      .then(stream => {
        localStreamRef.current = stream;
        setupWebRtcPeer(activeCall.userId);
      })
      .catch(() => {});

    setCallHistory(h => [
      {
        id: activeCall.id,
        userId: activeCall.userId,
        name: activeCall.name,
        avatar: activeCall.avatar,
        type: activeCall.type,
        status: 'incoming',
        date: 'Just now',
        missed: false
      },
      ...h
    ]);
  };

  const declineCall = () => {
    if (!activeCall) return;
    mockSocket.emit('call_decline', { callerId: activeCall.userId });
    cleanupWebRtc();

    setCallHistory(h => [
      {
        id: activeCall.id,
        userId: activeCall.userId,
        name: activeCall.name,
        avatar: activeCall.avatar,
        type: activeCall.type,
        status: 'missed',
        date: 'Just now',
        missed: true
      },
      ...h
    ]);
    setActiveCall(null);
  };

  const endCall = () => {
    if (activeCall) {
      mockSocket.emit('call_end', { targetUserId: activeCall.userId });
    }
    cleanupWebRtc();
    setActiveCall(null);
  };

  // Status updates
  const uploadStatus = async (type, content, additional = {}) => {
    let mediaUrl = content;
    if ((type === 'image' || type === 'video') && additional.mediaUrl) {
      mediaUrl = additional.mediaUrl;
    }

    // Strip url('...') wrapper if present
    if (typeof mediaUrl === 'string') {
      if (mediaUrl.startsWith("url('") && mediaUrl.endsWith("')")) {
        mediaUrl = mediaUrl.slice(5, -2);
      } else if (mediaUrl.startsWith('url("') && mediaUrl.endsWith('")')) {
        mediaUrl = mediaUrl.slice(5, -2);
      }
    }

    // Upload media status if it's base64
    if ((type === 'image' || type === 'video') && mediaUrl && mediaUrl.startsWith('data:')) {
      try {
        const ext = type === 'video' ? 'mp4' : 'png';
        mediaUrl = await uploadBase64Media(`status_${Date.now()}.${ext}`, mediaUrl);
      } catch (err) {
        console.error('Failed uploading base64 media for status:', err);
      }
    }

    const payload = {
      type,
      content: type === 'text' ? content : '',
      background: additional.background || '',
      mediaUrl: (type === 'image' || type === 'video') ? mediaUrl : '',
      caption: additional.caption || ''
    };

    try {
      await axios.post('/api/status', payload);
      // Fetch latest statuses to keep state perfectly live
      const statusRes = await axios.get('/api/status');
      if (statusRes.data) {
        setStatuses(statusRes.data.map(s => ({
          id: s._id,
          userId: s.userId?._id || s.userId,
          userUsername: s.userId?.username,
          userName: s.userName,
          userAvatar: s.userAvatar,
          items: s.items
        })));
      }
    } catch (err) {
      console.warn('Failed to upload status to backend API:', err);
      
      // Update local state directly as fallback
      const newItem = {
        id: 'story_' + Date.now(),
        type,
        timestamp: 'Just now',
        content: payload.content,
        background: payload.background,
        mediaUrl: payload.mediaUrl,
        caption: payload.caption,
        views: []
      };

      setStatuses(prev => {
        const myStatusIndex = prev.findIndex(s => s.userId === 'user_me' || s.userId === (user._id || user.id));
        if (myStatusIndex > -1) {
          const updated = [...prev];
          updated[myStatusIndex].items = [newItem, ...updated[myStatusIndex].items];
          return updated;
        } else {
          return [
            {
              id: 'status_me',
              userId: user._id || user.id,
              userName: user.name + ' (You)',
              userAvatar: user.avatar,
              items: [newItem]
            },
            ...prev
          ];
        }
      });
    }
    toast.success('Status story uploaded successfully!');
  };

  // Channels follow & react
  // Channels follow & react
  const followChannel = async (channelId) => {
    const chObj = channels.find(c => c.id === channelId);
    if (!chObj) return;

    try {
      if (chObj.following) {
        await axios.post(`/api/channels/${channelId}/unfollow`);
      } else {
        await axios.post(`/api/channels/${channelId}/follow`);
      }
    } catch (err) {
      toast.error('Failed to change follow status');
    }

    setChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        const isFollowing = ch.following;
        const currentSub = parseFloat(ch.subscribers) || 0;
        return {
          ...ch,
          following: !isFollowing,
          subscribers: isFollowing ? Math.max(0, currentSub - 1) : currentSub + 1
        };
      }
      return ch;
    }));
  };

  const addChannelPostComment = async (channelId, postId, commentText) => {
    if (!commentText.trim()) return;
    try {
      const response = await axios.post(`/api/channels/${channelId}/posts/${postId}/comment`, { text: commentText });
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId) {
          return {
            ...ch,
            posts: ch.posts.map(p => {
              if (p.id === postId || p._id === postId) {
                const newComment = {
                  name: response.data.name,
                  text: response.data.text,
                  date: 'Just now'
                };
                return {
                  ...p,
                  comments: [...(p.comments || []), newComment]
                };
              }
              return p;
            })
          };
        }
        return ch;
      }));
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const reactChannelPost = async (channelId, postId) => {
    try {
      const response = await axios.post(`/api/channels/${channelId}/posts/${postId}/like`);
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId) {
          return {
            ...ch,
            posts: ch.posts.map(p => {
              if (p.id === postId || p._id === postId) {
                const userLiked = response.data.likes?.includes(user._id || user.id);
                return {
                  ...p,
                  likes: response.data.likes?.length || 0,
                  userLiked
                };
              }
              return p;
            })
          };
        }
        return ch;
      }));
    } catch (err) {
      toast.error('Failed to like post');
    }
  };

  const createChannel = async (name, description, avatar) => {
    try {
      const response = await axios.post('/api/channels/create', {
        name,
        description,
        avatar: avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'
      });
      const newChan = {
        id: response.data._id,
        name: response.data.name,
        avatar: response.data.avatar,
        description: response.data.description,
        subscribers: 1,
        following: true,
        posts: [],
        ownerId: user._id || user.id
      };
      setChannels(prev => [newChan, ...prev]);
      setSelectedChannelId(newChan.id);
      toast.success(`Channel "${name}" created successfully!`);
      return newChan.id;
    } catch (err) {
      toast.error('Failed to create channel');
    }
  };

  const deleteChannel = async (channelId) => {
    try {
      await axios.delete(`/api/channels/${channelId}`);
      setChannels(prev => prev.filter(ch => ch.id !== channelId && ch._id !== channelId));
      setSelectedChannelId(prev => (prev === channelId ? null : prev));
      toast.success('Channel deleted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete channel');
    }
  };

  const addChannelPost = async (channelId, content, image = '') => {
    try {
      const response = await axios.post(`/api/channels/${channelId}/post`, {
        content,
        image
      });
      setChannels(prev => prev.map(ch => {
        if (ch.id === channelId) {
          if (ch.posts.some(p => p.id === response.data._id || p.id === response.data.id)) {
            return ch;
          }
          const newPost = {
            id: response.data._id,
            content: response.data.content,
            image: response.data.image,
            likes: response.data.likes?.length || 0,
            userLiked: false,
            date: 'Just now',
            comments: []
          };
          return { ...ch, posts: [newPost, ...ch.posts] };
        }
        return ch;
      }));
      toast.success('Broadcast post published!');
    } catch (err) {
      toast.error('Failed to publish post');
    }
  };

  // Communities Join
  const joinCommunity = async (commId) => {
    try {
      await axios.post(`/api/communities/${commId}/join`);
    } catch (err) {}

    setCommunities(prev => prev.map(c => {
      if (c.id === commId) {
        toast(`Joined ${c.name} community`);
        return { ...c, joined: true };
      }
      return c;
    }));
  };

  const createCommunity = async (name, tagline, description, groupsList = []) => {
    let newComm = {
      id: 'comm_' + Date.now(),
      name,
      tagline,
      description,
      avatar: getAvatarSvg(name.substring(0, 2).toUpperCase(), '10b981', 'ffffff'),
      joined: true,
      groups: groupsList.map((gName, idx) => ({ id: `g_${idx}_${Date.now()}`, name: gName }))
    };

    try {
      const response = await axios.post('/api/communities/create', { name, tagline, description });
      newComm.id = response.data._id;
    } catch (err) {}
    
    setCommunities(prev => [newComm, ...prev]);
    toast.success(`Community "${name}" created successfully!`);
  };

  const addCommunityAnnouncement = async (commId, title, content) => {
    try {
      const response = await axios.post(`/api/communities/${commId}/announcement`, {
        title,
        content
      });
      setCommunities(prev => prev.map(c => {
        if (c.id === commId || c._id === commId) {
          if (c.announcements?.some(a => a.id === response.data._id || a._id === response.data._id)) return c;
          const newAnn = {
            id: response.data._id,
            title: response.data.title,
            content: response.data.content,
            date: 'Just now'
          };
          return {
            ...c,
            announcements: [newAnn, ...(c.announcements || [])]
          };
        }
        return c;
      }));
      toast.success('Announcement broadcast published!');
    } catch (err) {
      toast.error('Failed to post announcement');
    }
  };

  const startDirectChat = async (targetUser) => {
    try {
      const response = await axios.post('/api/chats/create', {
        type: 'direct',
        participantIds: [targetUser._id || targetUser.id]
      });
      
      const convo = response.data;
      const partner = convo.participants.find(p => p._id !== user._id) || convo.participants[0] || {};
      const normalizedConvo = {
        id: convo._id,
        type: convo.type,
        user: {
          id: partner._id,
          name: partner.name,
          username: partner.username,
          avatar: partner.avatar || getAvatarSvg(partner.name || 'U'),
          phone: partner.phone,
          bio: partner.bio,
          online: partner.verified,
          lastSeen: partner.verified ? 'Active now' : 'Offline'
        },
        unreadCount: 0,
        pinned: false,
        favorite: false,
        archived: false,
        messages: convo.messages || []
      };

      setChats(prev => {
        const exists = prev.find(c => c.id === normalizedConvo.id);
        if (exists) {
          return prev;
        }
        return [normalizedConvo, ...prev];
      });

      setSelectedChatId(normalizedConvo.id);
      setActiveTab('chats');
      toast.success(`Started chat with ${partner.name}`);
      return normalizedConvo.id;
    } catch (err) {
      console.error('Failed to create direct chat:', err);
      toast.error('Failed to start chat session');
      throw err;
    }
  };

  const startOrgChat = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/organizations/${orgId}/start-chat`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const convo = data.conversation;
      const normalizedConvo = {
        id: convo._id,
        type: convo.type,
        group: {
          name: convo.name || 'Org Support',
          avatar: '',
          members: (convo.participants || []).map(p => ({ id: p._id, name: p.name, avatar: '' }))
        },
        user: { id: 'org_' + orgId, name: convo.name || 'Organization', avatar: '' },
        unreadCount: 0,
        pinned: false,
        favorite: false,
        archived: false,
        messages: []
      };
      setChats(prev => {
        const exists = prev.find(c => c.id === normalizedConvo.id);
        if (exists) return prev;
        return [normalizedConvo, ...prev];
      });
      setSelectedChatId(normalizedConvo.id);
      setActiveTab('chats');
      return normalizedConvo.id;
    } catch (err) {
      console.error('Failed to start org chat:', err);
      toast.error(err.message || 'Failed to start org chat');
      throw err;
    }
  };

  const startGroupChat = async (name, participantIds, avatar = '') => {
    try {
      const response = await axios.post('/api/chats/create', {
        type: 'group',
        name,
        avatar: avatar || getAvatarSvg(name || 'G', '10b981', 'ffffff'),
        participantIds
      });
      
      const convo = response.data;
      const normalizedConvo = {
        id: convo._id,
        type: convo.type,
        creator: convo.creator,
        admins: convo.admins || [],
        group: {
          name: convo.name || 'Group Chat',
          avatar: convo.avatar || getAvatarSvg(convo.name || 'G', '10b981', 'ffffff'),
          description: convo.description || '',
          creator: convo.creator,
          onlyAdminsCanMessage: convo.onlyAdminsCanMessage || false,
          members: convo.participants.map(p => ({
            id: p._id,
            name: p.name,
            username: p.username,
            avatar: p.avatar || getAvatarSvg(p.name || 'U'),
            online: p.verified
          }))
        },
        user: {
          id: 'group_id',
          name: convo.name || 'Group Chat',
          avatar: convo.avatar || getAvatarSvg(convo.name || 'G', '10b981', 'ffffff')
        },
        unreadCount: 0,
        pinned: false,
        favorite: false,
        archived: false,
        messages: convo.messages || []
      };

      setChats(prev => {
        const exists = prev.find(c => c.id === normalizedConvo.id);
        if (exists) {
          return prev;
        }
        return [normalizedConvo, ...prev];
      });

      setSelectedChatId(normalizedConvo.id);
      setActiveTab('chats');
      toast.success(`Group "${convo.name}" created successfully!`);
      return normalizedConvo.id;
    } catch (err) {
      console.error('Failed to create group chat:', err);
      toast.error('Failed to create group');
      throw err;
    }
  };

  const updateGroupSettings = async (chatId, settings) => {
    try {
      const response = await axios.put(`/api/chats/${chatId}/settings`, settings);
      const convo = response.data;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            group: {
              ...c.group,
              name: convo.name,
              avatar: convo.avatar,
              description: convo.description
            }
          };
        }
        return c;
      }));
      toast.success('Group settings updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update group settings');
      throw err;
    }
  };

  const addGroupMembers = async (chatId, memberIds) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/members/add`, { memberIds });
      const convo = response.data;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            group: {
              ...c.group,
              members: convo.participants.map(p => ({
                id: p._id || p.id,
                name: p.name,
                username: p.username,
                avatar: p.avatar || getAvatarSvg(p.name || 'U'),
                online: p.verified
              }))
            }
          };
        }
        return c;
      }));
      toast.success('Members added successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add members');
      throw err;
    }
  };

  const leaveGroup = async (chatId) => {
    try {
      await axios.post(`/api/chats/${chatId}/members/leave`);
      setChats(prev => prev.filter(c => c.id !== chatId));
      setSelectedChatId(null);
      toast.success('You left the group');
    } catch (err) {
      toast.error('Failed to leave group');
    }
  };

  const removeGroupMember = async (chatId, memberId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/members/remove`, { memberId });
      const convo = response.data;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            group: {
              ...c.group,
              members: convo.participants.map(p => ({
                id: p._id || p.id,
                name: p.name,
                username: p.username,
                avatar: p.avatar || getAvatarSvg(p.name || 'U'),
                online: p.verified
              }))
            }
          };
        }
        return c;
      }));
      toast.success('Member removed successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
      throw err;
    }
  };

  const promoteGroupAdmin = async (chatId, memberId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/members/promote`, { memberId });
      const convo = response.data;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            admins: convo.admins
          };
        }
        return c;
      }));
      toast.success('Member promoted to admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to promote member');
      throw err;
    }
  };

  const demoteGroupAdmin = async (chatId, memberId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/members/demote`, { memberId });
      const convo = response.data;
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            admins: convo.admins
          };
        }
        return c;
      }));
      toast.success('Admin demoted to member');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to demote admin');
      throw err;
    }
  };

  const createContactAndChat = async (name, username, email = '', phone = '') => {
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanName = name.trim() || sanitizedUsername;

    try {
      const response = await axios.post('/api/contacts/create-and-chat', {
        name: cleanName,
        username: sanitizedUsername,
        email,
        phone
      });
      
      const { conversation } = response.data;
      const partner = conversation.participants.find(p => p._id !== user._id) || conversation.participants[0] || {};
      
      const normalizedConvo = {
        id: conversation._id,
        type: conversation.type,
        user: {
          id: partner._id,
          name: partner.name,
          username: partner.username,
          avatar: partner.avatar || getAvatarSvg(partner.name || 'U'),
          phone: partner.phone,
          bio: partner.bio,
          online: partner.verified,
          lastSeen: partner.verified ? 'Active now' : 'Offline'
        },
        unreadCount: 0,
        pinned: false,
        favorite: false,
        archived: false,
        messages: conversation.messages || []
      };

      setChats(prev => {
        const exists = prev.find(c => c.id === normalizedConvo.id);
        if (exists) return prev;
        return [normalizedConvo, ...prev];
      });

      setSelectedChatId(normalizedConvo.id);
      setActiveTab('chats');
      toast.success(`Contact & chat started with ${partner.name}`);
      return normalizedConvo.id;
    } catch (err) {
      console.warn('Backend contact creation failed, using local simulation...', err);
      
      const localContactId = 'local_user_' + Date.now();
      const localChatId = 'local_chat_' + Date.now();
      
      const localConvo = {
        id: localChatId,
        type: 'direct',
        user: {
          id: localContactId,
          name: cleanName,
          username: sanitizedUsername,
          avatar: getAvatarSvg(cleanName),
          phone: phone,
          bio: 'Added as a local contact.',
          online: false,
          lastSeen: 'Offline'
        },
        unreadCount: 0,
        pinned: false,
        favorite: false,
        archived: false,
        messages: []
      };

      setChats(prev => {
        const exists = prev.find(c => c.user?.username === sanitizedUsername);
        if (exists) {
          setSelectedChatId(exists.id);
          return prev;
        }
        return [localConvo, ...prev];
      });

      setSelectedChatId(localConvo.id);
      setActiveTab('chats');
      toast.success(`Added local contact & chat for ${cleanName}`);
      return localChatId;
    }
  };

  // Workspace Board tasks
  const createProject = (name, description, chatId, tasksArray = []) => {
    const newProj = {
      id: 'proj_' + Date.now(),
      name,
      description,
      progress: 0,
      chatId,
      tasks: tasksArray.map((t, idx) => ({ id: `t_${idx}_${Date.now()}`, text: t, completed: false })),
      members: ['EV', 'user_me']
    };
    setProjects(prev => [newProj, ...prev]);
    toast.success(`Project "${name}" tracked successfully!`);
  };

  const toggleProjectTask = (projId, taskId) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projId) {
        const tasks = p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        const completedCount = tasks.filter(t => t.completed).length;
        const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
        return { ...p, tasks, progress };
      }
      return p;
    }));
  };

  const addProjectTask = (projId, taskText) => {
    if (!taskText.trim()) return;
    setProjects(prev => prev.map(p => {
      if (p.id === projId) {
        const tasks = [...p.tasks, { id: 't_' + Date.now(), text: taskText, completed: false }];
        const completedCount = tasks.filter(t => t.completed).length;
        const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
        return { ...p, tasks, progress };
      }
      return p;
    }));
    toast.success('Task added');
  };

  const togglePinChat = async (chatId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/pin`);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, pinned: response.data.pinnedBy?.includes(user._id || user.id) || false };
        }
        return c;
      }));
      const isPinned = response.data.pinnedBy?.includes(user._id || user.id);
      toast.success(isPinned ? 'Chat pinned to top' : 'Chat unpinned', { icon: '📌' });
    } catch (err) {
      toast.error('Failed to toggle pin state');
    }
  };

  const toggleFavoriteChat = async (chatId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/favorite`);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, favorite: response.data.favoritedBy?.includes(user._id || user.id) || false };
        }
        return c;
      }));
      const isFav = response.data.favoritedBy?.includes(user._id || user.id);
      toast.success(isFav ? 'Chat starred' : 'Chat unstarred', { icon: '⭐️' });
    } catch (err) {
      toast.error('Failed to toggle favorite state');
    }
  };

  const toggleArchiveChat = async (chatId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/archive`);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, archived: response.data.archivedBy?.includes(user._id || user.id) || false };
        }
        return c;
      }));
      const isArchived = response.data.archivedBy?.includes(user._id || user.id);
      toast.success(isArchived ? 'Chat archived' : 'Chat unarchived', { icon: '📦' });
    } catch (err) {
      toast.error('Failed to toggle archive state');
    }
  };

  const toggleMuteChat = async (chatId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/mute`);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, muted: response.data.mutedBy?.includes(user._id || user.id) || false };
        }
        return c;
      }));
      const isMuted = response.data.mutedBy?.includes(user._id || user.id);
      toast.success(isMuted ? 'Chat muted' : 'Chat unmuted', { icon: '🔇' });
    } catch (err) {
      toast.error('Failed to toggle mute state');
    }
  };

  const toggleLockChat = async (chatId) => {
    try {
      const response = await axios.post(`/api/chats/${chatId}/lock`);
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, locked: response.data.lockedBy?.includes(user._id || user.id) || false };
        }
        return c;
      }));
      const isLocked = response.data.lockedBy?.includes(user._id || user.id);
      toast.success(isLocked ? 'Chat locked' : 'Chat unlocked', { icon: '🔒' });
    } catch (err) {
      toast.error('Failed to toggle lock state');
    }
  };

  const markChatAsRead = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    toast.success('Conversation marked as read');
  };

  const markChatAsUnread = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c));
    toast.success('Conversation marked as unread');
  };

  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`/api/chats/${chatId}`);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      toast.success('Conversation deleted permanently', { icon: '🗑️' });
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  const deleteStatus = async (itemId) => {
    try {
      await axios.delete(`/api/status/${itemId}`);
      const statusRes = await axios.get('/api/status');
      if (statusRes.data) {
        setStatuses(statusRes.data.map(s => ({
          id: s._id,
          userId: s.userId?._id || s.userId,
          userUsername: s.userId?.username,
          userName: s.userName,
          userAvatar: s.userAvatar,
          items: s.items
        })));
      } else {
        setStatuses(prev => prev.map(s => {
          if (s.userId === 'user_me' || s.userId === (user._id || user.id)) {
            return {
              ...s,
              items: s.items.filter(item => item.id !== itemId && item._id !== itemId)
            };
          }
          return s;
        }).filter(s => s.items.length > 0));
      }
      toast.success('Story segment deleted!');
    } catch (err) {
      toast.error('Failed to delete story segment');
    }
  };

  const viewStatusItem = async (statusId, itemId) => {
    try {
      const response = await axios.post(`/api/status/${itemId}/view`);
      setStatuses(prev => prev.map(s => {
        if (s.id === statusId || s._id === statusId) {
          return {
            ...s,
            items: s.items.map(item => {
              if (item._id === itemId || item.id === itemId) {
                return { ...item, views: response.data.views || [] };
              }
              return item;
            })
          };
        }
        return s;
      }));
    } catch (err) {
      console.warn('Failed to view status item:', err);
    }
  };

  const openViewOnceMessage = async (messageId) => {
    try {
      const response = await axios.post(`/api/messages/${messageId}/open`);
      if (response.data.success) {
        setChats(prev => prev.map(c => {
          return {
            ...c,
            messages: c.messages.map(m => {
              if (m._id === messageId || m.id === messageId) {
                return {
                  ...m,
                  viewOnceOpenedBy: response.data.openedBy,
                  mediaUrl: ''
                };
              }
              return m;
            })
          };
        }));
      }
    } catch (err) {
      console.error('Failed to open view once message:', err);
    }
  };

  return (
    <ChatContext.Provider value={useMemo(() => ({
      chats,
      selectedChatId,
      selectedChat,
      typingStatus,
      activeTab,
      setActiveTab,
      selectedChannelId,
      setSelectedChannelId,
      selectedCommunityId,
      setSelectedCommunityId,
      
      // Call State
      activeCall,
      callDuration,
      callHistory,
      isMuted,
      isCameraOn,
      isScreenSharing,
      signalStrength,
      setIsMuted,
      setIsCameraOn,
      setIsScreenSharing,
      initiateCall,
      acceptCall,
      declineCall,
      endCall,

      // Extra Data
      statuses,
      channels,
      communities,
      
      // Right side panel state
      isRightPanelOpen,
      rightPanelTab,
      setIsRightPanelOpen,
      setRightPanelTab,

      // Search & Filters
      searchQuery,
      setSearchQuery,
      chatFilter,
      setChatFilter,

      // Message Actions
      selectChat,
      sendMessage,
      deleteMessage,
      editMessage,
      clearChatHistory,
      clearAllChatHistory,
      addReaction,
      votePoll,
      toggleStarMessage,
      pinMessage,
      setChatDisappearing,
      togglePinChat,
      toggleFavoriteChat,
      toggleArchiveChat,
      toggleMuteChat,
      toggleLockChat,
      markChatAsRead,
      markChatAsUnread,
      deleteChat,
      openViewOnceMessage,
      
      // Status Actions
      uploadStatus,
      deleteStatus,
      viewStatusItem,

      // Channels
      followChannel,
      addChannelPostComment,
      reactChannelPost,
      createChannel,
      deleteChannel,
      addChannelPost,

      // Communities
      joinCommunity,
      createCommunity,
      addCommunityAnnouncement,

      // Projects
      projects,
      createProject,
      toggleProjectTask,
      addProjectTask,
      
      // Contact Direct Chat creation
      startDirectChat,
      startOrgChat,
      startGroupChat,
      createContactAndChat,

      // Socket service
      mockSocket,

      // Media stream refs for CallOverlay
      localStreamRef,
      remoteStreamRef,

      // Group Management
      updateGroupSettings,
      addGroupMembers,
      leaveGroup,
      removeGroupMember,
      promoteGroupAdmin,
      demoteGroupAdmin
    }), [chats, selectedChatId, selectedChat, typingStatus, activeTab, activeCall, callDuration, callHistory, isMuted, isCameraOn, isScreenSharing, signalStrength, statuses, channels, communities, isRightPanelOpen, rightPanelTab, searchQuery, chatFilter, selectedChannelId, selectedCommunityId, projects])}>
      {children}
    </ChatContext.Provider>
  );
};
