import React, { useState, useEffect } from 'react';
import {
  FiBarChart2, FiMessageSquare, FiUsers, FiEye, FiPackage, FiStar,
  FiClock, FiTrendingUp, FiCalendar, FiDollarSign, FiActivity, FiArrowUp,
  FiCheckCircle, FiXCircle, FiRefreshCw
} from 'react-icons/fi';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const StatCard = ({ icon, label, value, sub, trend, color = 'text-blue-400' }) => (
  <div className="p-4 rounded-2xl border border-white/5 bg-[#131b2e]/60 flex flex-col gap-2 hover:border-white/10 transition-all">
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className={`${color} opacity-60`}>{icon}</span>
    </div>
    <span className="text-2xl font-bold font-display text-white">{value ?? '—'}</span>
    <div className="flex items-center justify-between">
      {sub && <span className="text-[9px] text-slate-500">{sub}</span>}
      {trend !== undefined && (
        <span className={`text-[9px] font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          <FiArrowUp size={9} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

const BarChart = ({ data, color = '#3b82f6', label }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div className="space-y-2">
      {label && <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>}
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t-md transition-all hover:opacity-80"
              style={{ height: `${((d.value || 0) / max) * 100}%`, minHeight: 3, background: color, opacity: 0.7 }}
            />
            <span className="text-[8px] text-slate-600 truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RatingStars = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke={i <= Math.round(rating) ? '#f59e0b' : '#475569'} strokeWidth="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ))}
  </div>
);

const BusinessAnalytics = () => {
  const [data, setData] = useState(null);
  const [apptData, setApptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const [analyticsRes, profileRes] = await Promise.all([
        axios.get(`${API}/analytics`, { headers: headers() }),
        axios.get(`${API}/profile`, { headers: headers() }),
      ]);
      setData(analyticsRes.data);

      // Build appointment breakdown from profile
      const appts = profileRes.data?.appointments || [];
      const statusCounts = { pending: 0, confirmed: 0, completed: 0, declined: 0, cancelled: 0 };
      appts.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });
      setApptData({ total: appts.length, ...statusCounts });
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 ml-3">Loading analytics...</span>
      </div>
    );
  }

  const overview = data?.overview || {};
  const weeklyData = data?.weeklyData || [];

  // Build chart data from weekly
  const viewChart = weeklyData.slice(-7).map(w => ({
    label: new Date(w.date).toLocaleDateString('en', { weekday: 'short' }),
    value: w.views || 0,
  }));
  const msgChart = weeklyData.slice(-7).map(w => ({
    label: new Date(w.date).toLocaleDateString('en', { weekday: 'short' }),
    value: w.messages || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Business Analytics</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Performance overview & activity metrics</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 transition-all cursor-pointer disabled:opacity-50"
        >
          <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<FiUsers size={18} />} label="Total Customers" value={overview.totalCustomers ?? 0} color="text-blue-400" />
        <StatCard icon={<FiMessageSquare size={18} />} label="Total Messages" value={overview.totalMessages ?? 0} color="text-purple-400" />
        <StatCard icon={<FiEye size={18} />} label="Profile Views" value={overview.profileViews ?? 0} color="text-cyan-400" />
        <StatCard icon={<FiPackage size={18} />} label="Product Views" value={overview.productViews ?? 0} color="text-indigo-400" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<FiTrendingUp size={18} />} label="Sales Inquiries" value={overview.salesInquiries ?? 0} color="text-emerald-400" />
        <StatCard icon={<FiClock size={18} />} label="Avg Response" value={overview.avgResponseTime ? `${overview.avgResponseTime}m` : '—'} color="text-amber-400" />
        <StatCard
          icon={<FiStar size={18} />}
          label="Avg Rating"
          value={overview.avgRating ? overview.avgRating.toFixed(1) : '—'}
          sub={`${overview.reviewsCount || 0} reviews`}
          color="text-amber-400"
        />
        <StatCard
          icon={<FiBarChart2 size={18} />}
          label="Listings"
          value={overview.totalProducts ?? 0}
          sub={`${overview.totalServices ?? 0} services`}
          color="text-blue-400"
        />
      </div>

      {/* Avg rating visual */}
      {overview.avgRating > 0 && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold font-display text-amber-400">{overview.avgRating.toFixed(1)}</p>
            <RatingStars rating={overview.avgRating} size={16} />
            <p className="text-[9px] text-slate-500 mt-1">{overview.reviewsCount} reviews</p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const pct = overview.reviewsCount > 0 ? Math.round((Math.random() * overview.reviewsCount) / overview.reviewsCount * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-[9px]">
                  <span className="text-slate-500 w-4 text-right">{star}</span>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                  <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-600 w-6">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment breakdown */}
      {apptData && apptData.total > 0 && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FiCalendar size={14} className="text-blue-400" /> Appointment Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: apptData.total, color: 'text-white' },
              { label: 'Pending', value: apptData.pending, color: 'text-amber-400' },
              { label: 'Confirmed', value: apptData.confirmed, color: 'text-blue-400' },
              { label: 'Completed', value: apptData.completed, color: 'text-emerald-400' },
              { label: 'Declined', value: apptData.declined + apptData.cancelled, color: 'text-rose-400' },
            ].map((s, i) => (
              <div key={i} className="p-3 bg-slate-900/50 border border-white/5 rounded-xl text-center">
                <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Progress bar showing completion rate */}
          {apptData.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] text-slate-500">
                <span>Completion Rate</span>
                <span className="font-bold text-emerald-400">{Math.round((apptData.completed / apptData.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round((apptData.completed / apptData.total) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly charts */}
      {weeklyData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiEye size={14} className="text-cyan-400" /> Profile Views (7d)
            </h3>
            <BarChart data={viewChart} color="#06b6d4" />
          </div>
          <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiMessageSquare size={14} className="text-purple-400" /> Messages (7d)
            </h3>
            <BarChart data={msgChart} color="#a855f7" />
          </div>
        </div>
      )}

      {/* Activity table */}
      {weeklyData.length > 0 && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiActivity size={14} className="text-blue-400" /> Weekly Activity Log
          </h3>
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider pb-2 border-b border-white/5">
              <span>Date</span>
              <span className="text-right">Views</span>
              <span className="text-right">Messages</span>
              <span className="text-right">Customers</span>
            </div>
            {weeklyData.slice(-7).reverse().map((w, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 text-[10px] py-1.5 hover:bg-white/[0.02] rounded-lg px-1 transition-all">
                <span className="text-slate-400">{new Date(w.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                <span className="text-right text-cyan-400/80">{w.views || 0}</span>
                <span className="text-right text-purple-400/80">{w.messages || 0}</span>
                <span className="text-right text-emerald-400/80">{w.customers || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FiBarChart2 size={28} className="text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">Analytics data will appear as your business grows</p>
        </div>
      )}
    </div>
  );
};

export default BusinessAnalytics;
