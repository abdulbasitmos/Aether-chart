import React, { useState, useEffect } from 'react';
import { FiInbox, FiTag, FiPhone, FiMail, FiMessageSquare, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const STATUS_CONFIG = {
  new:       { label: 'New',       color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  contacted: { label: 'Contacted', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  closed:    { label: 'Closed',    color: 'text-slate-400 bg-slate-900 border-white/5' },
};

const BusinessInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchInquiries(); }, []);

  const fetchInquiries = async () => {
    try {
      const res = await axios.get(`${API}/sales-inquiries`, { headers: headers() });
      setInquiries(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await axios.put(`${API}/sales-inquiries/${id}`, { status }, { headers: headers() });
      toast.success(`Inquiry marked as ${status}`);
      setInquiries(prev => prev.map(i => i._id === id ? { ...i, status } : i));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally { setUpdating(null); }
  };

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter);
  const counts = {
    all: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    closed: inquiries.filter(i => i.status === 'closed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs text-slate-400 ml-3">Loading inquiries...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Sales Inquiries</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Manage customer product inquiries</p>
        </div>
        <button onClick={fetchInquiries} className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
          <FiRefreshCw size={13} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {['all', 'new', 'contacted', 'closed'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${filter === tab ? 'bg-white/20' : 'bg-slate-800'}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
            <FiInbox size={22} className="text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">No {filter === 'all' ? '' : filter} inquiries</p>
          <p className="text-[9px] text-slate-600 mt-1">Product inquiries from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inquiry => {
            const cfg = STATUS_CONFIG[inquiry.status] || STATUS_CONFIG.new;
            return (
              <div key={inquiry._id} className="p-4 bg-[#131b2e]/60 border border-white/5 hover:border-white/10 rounded-2xl space-y-3 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                      {(inquiry.customerName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{inquiry.customerName || 'Unknown'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {inquiry.customerEmail && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiMail size={8} />{inquiry.customerEmail}</span>}
                        {inquiry.customerPhone && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiPhone size={8} />{inquiry.customerPhone}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>

                {inquiry.productName && (
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                    <FiTag size={9} />
                    <span>Product: <span className="text-blue-400 font-semibold">{inquiry.productName}</span></span>
                  </div>
                )}

                {inquiry.message && (
                  <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2.5">
                    <p className="text-[10px] text-slate-400 leading-relaxed flex gap-2">
                      <FiMessageSquare size={10} className="mt-0.5 shrink-0 text-slate-600" />
                      {inquiry.message}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-600">
                    {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  <div className="flex gap-1.5">
                    {inquiry.status !== 'contacted' && (
                      <button
                        onClick={() => handleUpdateStatus(inquiry._id, 'contacted')}
                        disabled={updating === inquiry._id}
                        className="py-1 px-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[9px] rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {inquiry.status !== 'closed' && (
                      <button
                        onClick={() => handleUpdateStatus(inquiry._id, 'closed')}
                        disabled={updating === inquiry._id}
                        className="py-1 px-2.5 bg-slate-900 border border-white/5 text-slate-400 font-bold text-[9px] rounded-lg hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        Close
                      </button>
                    )}
                    {inquiry.status === 'closed' && (
                      <button
                        onClick={() => handleUpdateStatus(inquiry._id, 'new')}
                        disabled={updating === inquiry._id}
                        className="py-1 px-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-[9px] rounded-lg hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BusinessInquiries;
