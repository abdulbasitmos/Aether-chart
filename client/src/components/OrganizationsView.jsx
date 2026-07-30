import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLayers, FiSearch, FiPlus, FiUsers, FiArrowLeft, FiChevronRight, FiShield, FiExternalLink } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const OrganizationsView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myOrgs, setMyOrgs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', orgType: 'other', description: '', email: '', phone: '', website: '', address: '' });

  const token = () => sessionStorage.getItem('aether_token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetchMyOrgs();
  }, []);

  const fetchMyOrgs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/organizations/user/mine', { headers: headers() });
      setMyOrgs(res.data || []);
    } catch (err) {
      if (err.response?.status !== 401) console.warn('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await axios.get(`/api/organizations?q=${encodeURIComponent(q)}`, { headers: headers() });
      setSearchResults(res.data || []);
    } catch { setSearchResults([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) { toast.error('Organization name is required'); return; }
    try {
      const res = await axios.post('/api/organizations/create', createForm, { headers: headers() });
      toast.success('Organization created!');
      setShowCreate(false);
      setCreateForm({ name: '', orgType: 'other', description: '', email: '', phone: '', website: '', address: '' });
      fetchMyOrgs();
      navigate(`/organizations/${res.data.organization._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create organization');
    }
  };

  const handleJoinCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) { toast.error('Join code is required'); return; }
    try {
      const res = await axios.post('/api/organizations/join-code', { code: joinCode }, { headers: headers() });
      toast.success(`Joined ${res.data.organization.name}`);
      setJoinCode('');
      setShowJoin(false);
      fetchMyOrgs();
      navigate(`/organizations/${res.data.organization._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid join code');
    }
  };

  const handleRequestMembership = async (orgId) => {
    try {
      await axios.post(`/api/organizations/${orgId}/join-request`, { message: '' }, { headers: headers() });
      toast.success('Join request sent');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send join request');
    }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/chats')} className="p-2 bg-[#2A3942] border border-white/10 rounded-xl text-[#8696A0] hover:text-white active:scale-95 transition-all cursor-pointer">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold font-display text-white">Organizations</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage your organizations and departments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="flex-1 py-1.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-xl hover:bg-emerald-600 transition-all cursor-pointer flex items-center justify-center gap-1">
            <FiPlus size={12} /> Create
          </button>
          <button onClick={() => setShowJoin(true)} className="flex-1 py-1.5 bg-slate-900 border border-white/5 text-slate-300 font-bold text-[10px] rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1">
            <FiExternalLink size={12} /> Join via Code
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* My Organizations */}
          <div>
            <h3 className="text-xs font-bold text-white font-display mb-3 flex items-center gap-2">
              <FiLayers size={14} className="text-emerald-400" /> My Organizations
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : myOrgs.length > 0 ? (
              <div className="space-y-2">
                {myOrgs.map((item) => (
                  <div key={item.membership?._id || item.organization?._id}
                    onClick={() => navigate(`/organizations/${item.organization?._id}`)}
                    className="p-3 bg-white/[0.01] hover:bg-[#2563EB]/10 border border-white/5 hover:border-[#2563EB]/20 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.organization?.logo || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.organization?.name}`} alt="" className="w-9 h-9 rounded-xl border border-white/5 bg-slate-900" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 font-display">{item.organization?.name}</h4>
                        <p className="text-[9px] text-slate-500 capitalize">{item.role} • {item.organization?.orgType}</p>
                      </div>
                    </div>
                    <FiChevronRight size={14} className="text-slate-600" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center mx-auto mb-2 text-slate-500"><FiLayers size={18} /></div>
                <p className="text-xs text-slate-500">No organizations yet</p>
                <p className="text-[9px] text-slate-600 mt-1">Create one or join using an invite code</p>
              </div>
            )}
          </div>

          {/* Search Organizations */}
          <div>
            <h3 className="text-xs font-bold text-white font-display mb-3">Discover Organizations</h3>
            <div className="relative mb-3">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={14} /></span>
              <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search organizations by name..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((org) => {
                  const isMember = myOrgs.some(m => m.organization?._id === org._id);
                  return (
                    <div key={org._id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/organization/${org._id}`)}>
                        <img src={org.logo || `https://api.dicebear.com/7.x/bottts/svg?seed=${org.name}`} alt="" className="w-8 h-8 rounded-xl border border-white/5 bg-slate-900" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 font-display">{org.name}</h4>
                          <p className="text-[9px] text-slate-500 capitalize">{org.orgType} {org.publicStatus ? `• ${org.publicStatus}` : ''}</p>
                        </div>
                      </div>
                      {isMember ? (
                        <button onClick={() => navigate(`/organizations/${org._id}`)} className="text-[9px] py-1.5 px-3 font-bold rounded-lg bg-slate-700 text-slate-300 cursor-pointer">OPEN</button>
                      ) : (
                        <button onClick={() => navigate(`/organization/${org._id}`)} className="text-[9px] py-1.5 px-3 font-bold rounded-lg bg-[#2563EB] text-white hover:opacity-90 transition-all cursor-pointer">VIEW</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : searchQuery && (
              <div className="text-center py-4 text-xs text-slate-500">No organizations found matching "{searchQuery}"</div>
            )}
          </div>

        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreate && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111B21] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white font-display">Create Organization</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" placeholder="Organization Name *" value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} required className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
              <select value={createForm.orgType} onChange={(e) => setCreateForm(p => ({ ...p, orgType: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none">
                {['school','university','ngo','government','company','mosque','church','club','association','other'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <textarea placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
                <input type="text" placeholder="Phone" value={createForm.phone} onChange={(e) => setCreateForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-slate-900 border border-white/5 text-slate-300 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all cursor-pointer">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join via Code Modal */}
      {showJoin && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowJoin(false)}>
          <div className="bg-[#111B21] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white font-display">Join Organization</h3>
            <p className="text-[10px] text-slate-400">Enter the invite code shared by the organization admin.</p>
            <form onSubmit={handleJoinCode} className="space-y-3">
              <input type="text" placeholder="Enter join code (e.g. ABC123)" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required maxLength={8} className="w-full px-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-sm text-slate-200 text-center font-bold tracking-widest focus:border-emerald-500/20 outline-none placeholder:text-slate-500 uppercase" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowJoin(false)} className="flex-1 py-2 bg-slate-900 border border-white/5 text-slate-300 font-bold text-xs rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all cursor-pointer">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Create, manage, and collaborate within organizations
      </div>
    </div>
  );
};

export default OrganizationsView;
