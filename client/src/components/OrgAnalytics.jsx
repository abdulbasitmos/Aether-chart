import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiUsers, FiLayers, FiCheckSquare, FiRadio, FiCalendar, FiFolder, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import axios from 'axios';

const API_BASE = '/api/organizations';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } });

const StatCard = ({ icon, label, value, color }) => (
  <div className="p-4 rounded-2xl border border-white/5 bg-[#131b2e]/60 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className={`${color || 'text-emerald-400'}/60`}>{icon}</span>
    </div>
    <span className="text-2xl font-bold font-display text-white">{value ?? '-'}</span>
  </div>
);

const OrgAnalytics = ({ organizationId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [organizationId]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/analytics`, getAuthHeaders());
      setData(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-xs text-slate-500">Analytics not available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<FiUsers size={18} />} label="Members" value={data.membersCount} />
        <StatCard icon={<FiLayers size={18} />} label="Departments" value={data.departmentsCount} />
        <StatCard icon={<FiUsers size={18} />} label="Teams" value={data.teamsCount} />
        <StatCard icon={<FiCheckSquare size={18} />} label="Projects" value={data.projectsCount} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<FiCheckSquare size={18} />} label="Total Tasks" value={data.totalTasks} />
        <StatCard icon={<FiCheckSquare size={18} />} label="Done Tasks" value={data.doneTasks} />
        <StatCard icon={<FiTrendingUp size={18} />} label="Task Completion" value={`${data.taskCompletionRate || 0}%`} />
        <StatCard icon={<FiBarChart2 size={18} />} label="Project Stats" value={`${data.projectStats?.active || 0} active`} />
      </div>

      {data.roleDistribution && Object.keys(data.roleDistribution).length > 0 && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiPieChart size={14} className="text-emerald-400" /> Role Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(data.roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center gap-3 text-[10px]">
                <span className="text-slate-400 w-24 capitalize">{role.replace('_', ' ')}</span>
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / data.membersCount) * 100}%` }} />
                </div>
                <span className="text-slate-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.projectStats && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Project Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Planning', value: data.projectStats.planning, color: 'text-slate-400' },
              { label: 'Active', value: data.projectStats.active, color: 'text-emerald-400' },
              { label: 'Completed', value: data.projectStats.completed, color: 'text-blue-400' },
              { label: 'On Hold', value: data.projectStats.onHold, color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="p-3 bg-slate-900/50 border border-white/5 rounded-xl">
                <p className={`text-lg font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<FiRadio size={18} />} label="Announcements" value={data.announcementsCount} />
        <StatCard icon={<FiCalendar size={18} />} label="Events" value={data.eventsCount} />
        <StatCard icon={<FiFolder size={18} />} label="Files" value={data.filesCount} />
      </div>
    </div>
  );
};

export default OrgAnalytics;
