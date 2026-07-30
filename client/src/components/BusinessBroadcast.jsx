import React, { useState } from 'react';
import { FiSend, FiUsers, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const BusinessBroadcast = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) { toast.error('Message is required'); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/broadcast`, { message: message.trim(), title: title.trim() || undefined }, { headers: headers() });
      setResult(res.data);
      toast.success(`Broadcast sent to ${res.data.recipients} recipients`);
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
        <h3 className="text-xs font-bold text-white font-display mb-1">Send Broadcast</h3>
        <p className="text-[10px] text-slate-500 mb-4">Send a promotional message to all your customers</p>

        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Title (optional)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Flash Sale Announcement" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Message *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Type your promotional message..." className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500 resize-none" />
          </div>
          <button type="submit" disabled={sending} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? (
              <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <><FiSend size={14} /> SEND BROADCAST</>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <FiCheckCircle size={18} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-400">Broadcast sent successfully!</p>
              <p className="text-[9px] text-emerald-500/70">Delivered to {result.recipients} customers</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
        <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
          <FiUsers size={12} /> About Broadcasts
        </h4>
        <div className="text-[10px] text-slate-500 space-y-1.5">
          <p>Broadcasts are sent as notifications to all users who have chatted with your business.</p>
          <p>Use this for promotions, announcements, and updates.</p>
          <p className="text-blue-400/70">Please use responsibly to avoid spam complaints.</p>
        </div>
      </div>
    </div>
  );
};

export default BusinessBroadcast;
