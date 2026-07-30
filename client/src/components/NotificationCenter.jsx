import React, { useState, useEffect } from 'react';
import { 
  FiBell, FiMessageSquare, FiPhoneMissed, FiUsers, 
  FiTrendingUp, FiTrash2, FiCheck, FiCheckSquare, FiAlertCircle,
  FiUserPlus, FiUserCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/mark-read');
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      toast.success('All notifications marked as read', { icon: '✔️' });
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const clearAll = async () => {
    try {
      await axios.delete('/api/notifications');
      setNotifications([]);
      toast.success('Notification center cleared');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const removeNotification = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, unread: false } : n));
      toast.success('Notification read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleAcceptContact = async (notif) => {
    try {
      if (!notif.contactRequestId) {
        toast.error('Request ID not found');
        return;
      }
      await axios.post(`/api/contacts/requests/${notif.contactRequestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` }
      });
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, unread: false, type: 'contact_accepted' } : n));
      toast.success('Contact request accepted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleRejectContact = async (notif) => {
    try {
      if (!notif.contactRequestId) {
        toast.error('Request ID not found');
        return;
      }
      await axios.post(`/api/contacts/requests/${notif.contactRequestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` }
      });
      removeNotification(notif._id);
      toast.success('Contact request rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <FiCheckSquare size={14} className="text-emerald-400" />;
      case 'task_completed':
        return <FiCheck size={14} className="text-teal-400" />;
      case 'task_overdue':
        return <FiAlertCircle size={14} className="text-rose-400 animate-pulse" />;
      case 'task_due_today':
        return <FiClock size={14} className="text-yellow-400" />;
      case 'mention':
        return <FiUsers size={14} className="text-emerald-400" />;
      case 'contact_request':
        return <FiUserPlus size={14} className="text-blue-400" />;
      case 'contact_accepted':
        return <FiUserCheck size={14} className="text-emerald-400" />;
      default:
        return <FiBell size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h2 className="text-lg font-bold font-display text-white font-display">Notification Center</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage incoming alerts, mentions, and system logs</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={markAllRead}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiCheckSquare size={12} /> Mark all read
            </button>
            <button 
              onClick={clearAll}
              className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiTrash2 size={12} /> Clear all
            </button>
          </div>
        </div>
      </div>

      {/* Notifications timeline view */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3.5 z-10">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 select-none">
            <span className="animate-spin mr-2">&#9696;</span> Loading alerts...
          </div>
        ) : notifications.length > 0 ? (
          <div className="max-w-2xl mx-auto space-y-3">
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border flex items-start gap-4 transition-all relative group overflow-hidden ${
                    notif.unread 
                      ? 'bg-emerald-500/[0.02] border-emerald-500/25 shadow-lg shadow-emerald-500/5' 
                      : 'bg-white/[0.01] border-white/5'
                  }`}
                >
                  {/* Status Bar */}
                  {notif.unread && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                  )}

                  {/* Icon */}
                  <div className="p-2.5 bg-slate-900 border border-white/5 rounded-xl shrink-0">
                    {getIcon(notif.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex justify-between items-baseline mb-0.5 select-none text-[10px]">
                      <span className="font-bold text-slate-200">{notif.title}</span>
                      <span className="text-slate-500">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{notif.content}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 select-none">
                    {notif.type === 'contact_request' && notif.unread ? (
                      <>
                        <button
                          onClick={() => handleRejectContact(notif)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-900 border border-rose-500/20 hover:border-rose-500/40 rounded-lg cursor-pointer transition-colors"
                          title="Decline"
                        >
                          <FiTrash2 size={11} />
                        </button>
                        <button
                          onClick={() => handleAcceptContact(notif)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg cursor-pointer transition-colors"
                          title="Accept"
                        >
                          <FiUserCheck size={11} />
                        </button>
                      </>
                    ) : notif.unread && (
                      <button
                        onClick={() => removeNotification(notif._id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-white/5 hover:border-emerald-500/20 rounded-lg cursor-pointer transition-colors"
                        title="Mark as read"
                      >
                        <FiCheck size={11} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center mb-4 text-slate-600">
              <FiBell size={20} />
            </div>
            <h4 className="text-sm font-semibold text-slate-400">All caught up!</h4>
            <p className="text-slate-600 text-xs mt-1 max-w-[200px] leading-relaxed">
              You have no active notifications or group alerts.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Notifications sync in real-time across your authenticated workspace.
      </div>
    </div>
  );
};

export default NotificationCenter;
