import React, { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiTrash2, FiShield, FiUser, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const ROLE_LABELS = {
  owner: { label: 'Owner', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  admin: { label: 'Admin', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  manager: { label: 'Manager', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  sales_agent: { label: 'Sales Agent', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  support: { label: 'Support', color: 'text-slate-400 bg-slate-900 border-white/5' },
};

const BusinessStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('support');

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API}/staff`, { headers: headers() });
      setStaff(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Username is required'); return; }
    try {
      await axios.post(`${API}/staff`, { username: username.trim(), role }, { headers: headers() });
      toast.success('Staff added');
      setUsername('');
      setRole('support');
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add staff');
    }
  };

  const handleRemove = async (id) => {
    try {
      await axios.delete(`${API}/staff/${id}`, { headers: headers() });
      toast.success('Staff removed');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove staff');
    }
  };

  const grouped = {
    owner: staff.filter(s => s.role === 'owner'),
    admin: staff.filter(s => s.role === 'admin'),
    manager: staff.filter(s => s.role === 'manager'),
    sales_agent: staff.filter(s => s.role === 'sales_agent'),
    support: staff.filter(s => s.role === 'support'),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Team Members ({staff.length})</h3>
        <button onClick={() => setShowForm(true)}
          className="py-1.5 px-3 bg-emerald-500 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1">
          <FiPlus size={12} /> ADD MEMBER
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Add Team Member</h4>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Username *</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username to add" className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales_agent">Sales Agent</option>
              <option value="support">Customer Support</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all cursor-pointer">
            ADD TO TEAM
          </button>
        </form>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([roleKey, members]) => {
          if (members.length === 0 && roleKey !== 'owner') return null;
          const roleMeta = ROLE_LABELS[roleKey];
          return (
            <div key={roleKey}>
              <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <FiShield size={11} className={roleMeta?.color?.split(' ')[0] || 'text-slate-500'} />
                {roleMeta?.label || roleKey} ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map(s => (
                  <div key={s._id} className="p-3 bg-[#131b2e]/60 border border-white/5 rounded-xl flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0 overflow-hidden">
                      {s.userId?.avatar ? <img src={s.userId.avatar} className="w-full h-full object-cover" /> : <FiUser size={14} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{s.userId?.name || 'Unknown'}</p>
                      <p className="text-[9px] text-slate-500">@{s.userId?.username || 'unknown'}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${roleMeta?.color || 'text-slate-400 bg-slate-900 border-white/5'}`}>
                      {roleMeta?.label || s.role}
                    </span>
                    {s.role !== 'owner' && (
                      <button onClick={() => handleRemove(s._id)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {staff.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
              <FiUsers size={22} className="text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No team members yet</p>
            <p className="text-[9px] text-slate-600 mt-1">Add staff to help manage your business</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessStaff;
