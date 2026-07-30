import React, { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiX, FiTrash2, FiChevronRight, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = '/api/organizations';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } });

const OrgTeams = ({ organizationId, canManage, departments }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', departmentId: '' });

  useEffect(() => { fetchTeams(); }, [organizationId]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/teams`, getAuthHeaders());
      setTeams(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Team name is required'); return; }
    try {
      await axios.post(`${API_BASE}/${organizationId}/teams`, form, getAuthHeaders());
      toast.success('Team created');
      setForm({ name: '', description: '', departmentId: '' });
      setShowForm(false);
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create team');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${organizationId}/teams/${id}`, getAuthHeaders());
      toast.success('Team deleted');
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const getDeptName = (deptId) => {
    if (!deptId) return 'General';
    const dept = departments.find(d => d._id === deptId);
    return dept?.name || 'General';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Teams ({teams.length})</h3>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="py-1 px-2 bg-emerald-500 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer">
            <FiPlus size={10} /> New Team
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Create Team</h4>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"><FiX size={14} /></button>
          </div>
          <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Team name..." className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." rows={2} className="w-full bg-slate-900 border border-white/5 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
          <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none">
            <option value="">General (no department)</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer">CREATE TEAM</button>
        </form>
      )}

      <div className="space-y-2">
        {teams.map(team => (
          <div key={team._id} className="p-3 bg-slate-900/20 border border-white/5 rounded-xl flex items-center justify-between group">
            <div>
              <h4 className="text-xs font-bold text-slate-200">{team.name}</h4>
              <p className="text-[9px] text-slate-500">{team.description || 'No description'} • {team.members?.length || 0} members • {getDeptName(team.departmentId)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600">{team.members?.length || 0}</span>
              {canManage && (
                <button onClick={() => handleDelete(team._id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <FiTrash2 size={11} />
                </button>
              )}
            </div>
          </div>
        ))}
        {teams.length === 0 && !showForm && (
          <div className="text-center py-6 text-xs text-slate-500 italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No teams yet. Create teams within departments for better organization.</div>
        )}
      </div>
    </div>
  );
};

export default OrgTeams;
