import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiPlus, FiEdit3, FiTrash2, FiX, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const BusinessQuickReplies = () => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', message: '', shortcut: '', category: 'general' });

  useEffect(() => { fetchReplies(); }, []);

  const fetchReplies = async () => {
    try {
      const res = await axios.get(`${API}/quick-replies`, { headers: headers() });
      setReplies(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ title: '', message: '', shortcut: '', category: 'general' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API}/quick-replies/${editId}`, form, { headers: headers() });
        toast.success('Quick reply updated');
      } else {
        await axios.post(`${API}/quick-replies`, form, { headers: headers() });
        toast.success('Quick reply created');
      }
      resetForm();
      fetchReplies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleEdit = (qr) => {
    setForm({ title: qr.title, message: qr.message, shortcut: qr.shortcut || '', category: qr.category || 'general' });
    setEditId(qr._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/quick-replies/${id}`, { headers: headers() });
      toast.success('Quick reply deleted');
      fetchReplies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const filtered = replies.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.message.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = replies.length;
  const recentCount = replies.filter(r => new Date(r.createdAt) > new Date(Date.now() - 7 * 86400000)).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-white/5 bg-[#131b2e]/60">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Quick Replies</span>
          <p className="text-2xl font-bold font-display text-white mt-1">{totalCount}</p>
        </div>
        <div className="p-4 rounded-2xl border border-white/5 bg-[#131b2e]/60">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Added This Week</span>
          <p className="text-2xl font-bold font-display text-white mt-1">{recentCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search quick replies..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="py-1.5 px-3 bg-emerald-500 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1">
          <FiPlus size={12} /> ADD REPLY
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">{editId ? 'Edit Quick Reply' : 'New Quick Reply'}</h4>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Welcome Message" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Shortcut</label>
              <input type="text" value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value }))} placeholder="e.g. /welcome" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Message *</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={3} placeholder="Type your quick reply message..." className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none">
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="greeting">Greeting</option>
              <option value="closing">Closing</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all cursor-pointer">
            {editId ? 'UPDATE' : 'CREATE'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {filtered.length > 0 ? filtered.map(qr => (
          <div key={qr._id} className="p-4 bg-[#131b2e]/60 border border-white/5 hover:border-blue-500/10 rounded-2xl flex items-start gap-4 group transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
              <FiMessageSquare size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-200">{qr.title}</h4>
                <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5">{qr.category}</span>
                {qr.shortcut && <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">{qr.shortcut}</span>}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{qr.message}</p>
            </div>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
              <button onClick={() => handleEdit(qr)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-emerald-400 transition-all cursor-pointer">
                <FiEdit3 size={12} />
              </button>
              <button onClick={() => handleDelete(qr._id)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                <FiTrash2 size={12} />
              </button>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
              <FiMessageSquare size={22} className="text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">{search ? 'No matching quick replies' : 'No quick replies yet'}</p>
            <p className="text-[9px] text-slate-600 mt-1">{search ? 'Try a different search' : 'Create your first quick reply for faster responses'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessQuickReplies;
