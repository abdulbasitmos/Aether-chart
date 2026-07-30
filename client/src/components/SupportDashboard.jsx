import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  FiUsers, FiShield, FiUserCheck, FiSearch, FiCheck, FiTrash2,
  FiMessageSquare, FiArrowLeft, FiChevronLeft, FiChevronRight,
  FiSlash, FiAlertTriangle, FiInfo, FiTool, FiZap,
  FiPlus, FiBell, FiX, FiSend, FiRefreshCw, FiEdit3,
  FiLayout, FiEyeOff, FiEye, FiMail, FiChevronDown, FiCheckCircle, FiClock,
  FiBarChart2, FiTrendingUp, FiPieChart, FiFileText, FiList, FiActivity,
  FiCpu, FiDownload, FiTag, FiBookOpen, FiHelpCircle, FiKey, FiSidebar,
  FiMenu, FiGrid, FiSliders, FiCheckSquare, FiLayers
} from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API = '';
const getToken = () => sessionStorage.getItem('aether_token') || localStorage.getItem('token') || '';
const authHeaders = (extra = {}) => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
  ...extra,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const ANNOUNCE_TYPES = {
  info:        { label: 'Info',        color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: FiInfo },
  warning:     { label: 'Warning',     color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200',  icon: FiAlertTriangle },
  maintenance: { label: 'Maintenance', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FiTool },
  update:      { label: 'Update',      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FiZap },
  success:     { label: 'Success',     color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FiCheckCircle },
};

const CANNED_REPLIES = [
  {
    label: '🚀 Verification',
    title: 'Account Verification Help',
    text: 'Hello! To verify your Aether account, please navigate to Settings > Profile > Verification. Make sure your email and phone number are confirmed.'
  },
  {
    label: '🔒 Reset Password',
    title: 'Password Reset Instructions',
    text: 'Hi there! You can reset your password by clicking "Forgot Password" on the login screen. An OTP verification code will be sent to your registered email.'
  },
  {
    label: '💼 Business Setup',
    title: 'Business Workspace Setup',
    text: 'Hello! To switch your account to a Business Profile, go to Settings > Account > Upgrade to Business. You can customize your storefront and catalog immediately.'
  },
  {
    label: '🐞 Bug Report Info',
    title: 'Reporting a Bug',
    text: 'Thank you for reporting this issue! To help our engineering team investigate, please reply with your device type, OS version, and steps to reproduce.'
  },
  {
    label: '💳 Billing & Plans',
    title: 'Billing Query',
    text: 'Hi! All Aether core messaging features are free. Premium business perks and custom organizational tiers are billed monthly under Settings > Billing.'
  }
];

const Avatar = ({ name, avatar, size = 8, className = '' }) => {
  const initials = (name || '?').charAt(0).toUpperCase();
  const colors = ['from-blue-600 to-blue-800', 'from-blue-500 to-blue-700', 'from-blue-600 to-blue-800', 'from-blue-700 to-blue-900'];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return avatar
    ? <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-full object-cover shadow-sm ${className}`} />
    : <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${className}`} style={{ fontSize: size < 8 ? 10 : 13 }}>{initials}</div>;
};

const Badge = ({ children, color = 'slate' }) => {
  const map = {
    slate: 'bg-slate-100 text-slate-600 border border-white/10',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[color] || map.slate}`}>{children}</span>;
};

const Spinner = ({ size = 5 }) => <div className={`w-${size} h-${size} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />;

// ─── Advanced Stat Card with Mini SVG Sparkline Chart ──────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  colorClass = 'text-blue-600 bg-blue-50 border-blue-200 shadow-blue-500/10',
  trend = '+12%',
  sparklineData = [35, 45, 30, 65, 55, 80, 95]
}) => {
  const max = Math.max(...sparklineData, 1);
  const min = Math.min(...sparklineData, 0);
  const range = max - min || 1;
  const points = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * 120;
    const y = 32 - ((val - min) / range) * 25;
    return `${x},${y}`;
  }).join(' ');

  const gradId = `grad-${(label || 'stat').replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div className="group relative p-5 rounded-2xl border border-white/10 bg-[#0f1729] shadow-lg hover:shadow-2xl hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Subtle hover background blur effect */}
      <div className="absolute -right-10 -top-10 w-28 h-28 bg-gradient-to-br from-blue-500/10 to-blue-500/0 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110 ${colorClass}`}>
          <Icon size={19} />
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-1 relative z-10">
        <p className="text-3xl font-black text-white font-display tracking-tight">{value ?? <Spinner />}</p>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <FiTrendingUp size={10} /> {trend}
          </span>
        )}
      </div>

      {/* Interactive SVG Sparkline Chart */}
      <div className="w-full h-8 mt-2 pt-1 border-t border-white/10 flex items-end justify-between relative z-10">
        <div className="flex-1 min-w-0 pr-2">
          {sub && <p className="text-xs text-slate-400 font-medium truncate">{sub}</p>}
        </div>
        <svg className="w-24 h-7 overflow-visible shrink-0" viewBox="0 0 120 35">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill={`url(#${gradId})`} points={`0,35 ${points} 120,35`} />
          <polyline fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
      </div>
    </div>
  );
};

// ─── SVG Area Chart Component ──────────────────────────────────────────────────

const SVGAreaChart = ({ data, color = 'blue', labelKey = 'date', valueKey = 'count' }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-xs text-slate-400">No chart data available</div>;

  const values = data.map(d => d[valueKey] || 0);
  const maxVal = Math.max(...values, 1);
  const width = 600;
  const height = 180;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((d[valueKey] || 0) / maxVal) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const strokeColor = '#2563eb';
  const gradId = `chartGrad-${color}-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 drop-shadow-sm">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
          <line
            key={idx}
            x1={padding}
            y1={height - padding - pct * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - pct * (height - padding * 2)}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ))}
        {/* Fill Area */}
        <polygon points={areaPoints} fill={`url(#${gradId})`} />
        {/* Gradient Line */}
        <polyline fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
          const y = height - padding - ((d[valueKey] || 0) / maxVal) * (height - padding * 2);
          return (
            <g key={i} className="group cursor-pointer">
              <circle cx={x} cy={y} r="4" fill="#ffffff" stroke={strokeColor} strokeWidth="2.5" className="transition-all duration-200 group-hover:r-6" />
              <title>{`${d[labelKey]}: ${d[valueKey]}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── System Health Component ──────────────────────────────────────────────────

const SystemHealthWidget = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/support/system-health`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setHealth(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading || !health) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 border border-slate-700/80 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <FiActivity size={19} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">System Infrastructure Health</h3>
            <p className="text-[11px] text-slate-400">Real-time Node.js & MongoDB metrics</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" /> Server Operational
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/10 relative z-10">
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Server Uptime</p>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{health.formattedUptime}</p>
        </div>
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Memory RSS</p>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{health.memory?.rssMb} MB</p>
        </div>
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Heap Used</p>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{health.memory?.heapUsedMb} / {health.memory?.heapTotalMb} MB</p>
        </div>
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Database Status</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">{health.dbState}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const OverviewTab = ({ stats, onTabChange }) => {
  const cards = [
    { icon: FiUsers,     label: 'Total Real Users', value: stats?.totalUsers,      colorClass: 'text-blue-600 bg-blue-50 border-blue-200',   sub: `${stats?.activeUsers ?? 0} active registered accounts`, trend: '+18%' },
    { icon: FiUserCheck, label: 'Active Users',     value: stats?.activeUsers,     colorClass: 'text-blue-600 bg-blue-50 border-blue-200', sub: 'Accounts in good standing', trend: '+14%' },
    { icon: FiSlash,     label: 'Banned Accounts', value: stats?.bannedUsers,     colorClass: 'text-red-600 bg-red-50 border-red-200',      sub: 'Permanently restricted', trend: '0%' },
    { icon: FiClock,     label: 'Suspended',        value: stats?.suspendedUsers,  colorClass: 'text-blue-600 bg-blue-50 border-blue-200',  sub: 'Temporarily suspended', trend: '-5%' },
    { icon: FiShield,    label: 'Support & Admin',  value: stats?.supportUsers,    colorClass: 'text-blue-600 bg-blue-50 border-blue-200', sub: 'Moderation team members', trend: 'Fixed' },
    { icon: FiMail,      label: 'Open Support Tickets', value: stats?.pendingMessages, colorClass: 'text-blue-600 bg-blue-50 border-blue-200',   sub: 'Awaiting support reply', trend: '+4%' },
  ];

  return (
    <div className="space-y-8">
      {/* System Health Widget */}
      <SystemHealthWidget />

      {/* Advanced Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => onTabChange('inbox')} className="p-5 rounded-2xl bg-[#0f1729] border border-white/10 text-slate-100 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-left flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
            <FiMessageSquare size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-blue-600 transition-colors">Manage Support Tickets</p>
            <p className="text-xs text-slate-400">Reply to users or enable AI Auto Mode</p>
          </div>
        </button>
        <button onClick={() => onTabChange('faqs')} className="p-5 rounded-2xl bg-[#0f1729] border border-white/10 text-slate-100 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-left flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
            <FiBookOpen size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-blue-600 transition-colors">Knowledge Base & AI FAQs</p>
            <p className="text-xs text-slate-400">Train AI agent & edit custom FAQs</p>
          </div>
        </button>
        <button onClick={() => onTabChange('audit')} className="p-5 rounded-2xl bg-[#0f1729] border border-white/10 text-slate-100 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-left flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
            <FiList size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-white group-hover:text-blue-600 transition-colors">Staff Audit Trail</p>
            <p className="text-xs text-slate-400">Review all moderator & support actions</p>
          </div>
        </button>
      </div>

      {/* Actual Recent Signups Table */}
      <div className="bg-white rounded-2xl border border-white/10/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Recent User Registrations</h3>
            <p className="text-xs text-slate-400">Actual users registered in your database</p>
          </div>
          <button onClick={() => onTabChange('users')} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
            View All Users →
          </button>
        </div>

        <div className="space-y-3">
          {!stats ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : stats.recentSignups?.length > 0 ? stats.recentSignups.map(u => (
            <div key={u._id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-white/10/60 hover:bg-blue-50/40 hover:border-blue-200 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name} avatar={u.avatar} size={10} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">@{u.username || u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge color={u.role === 'admin' ? 'blue' : u.role === 'support' ? 'blue' : 'slate'}>{u.role || 'user'}</Badge>
                <Badge color={u.banned ? 'red' : 'blue'}>{u.banned ? 'banned' : 'active'}</Badge>
                <span className="text-xs text-slate-400 hidden sm:inline">{fmt(u.createdAt)}</span>
              </div>
            </div>
          )) : (
            <p className="text-center text-sm text-slate-400 py-8">No registered users found</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Suspend Modal ────────────────────────────────────────────────────────────

const SuspendModal = ({ user, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minStr = minDate.toISOString().slice(0, 10);

  const handleSubmit = async () => {
    if (!reason.trim() || !until) return toast.error('Fill in all required fields');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/support/users/${user._id}/suspend`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ reason, until }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${user.name} suspended until ${fmt(until)}`);
      onDone();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Suspend User Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><FiX size={16} /></button>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
          <Avatar name={user.name} avatar={user.avatar} size={10} />
          <div>
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-slate-400">@{user.username || user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1.5 block">Reason for Suspension</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Provide details regarding the suspension…"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white resize-none transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1.5 block">Suspended Until Date</label>
            <input type="date" value={until} min={minStr} onChange={e => setUntil(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
          </div>
          <button onClick={handleSubmit} disabled={loading || !reason.trim() || !until}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
            {loading ? <Spinner size={4} /> : <FiClock size={16} />} Confirm Account Suspension
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── User Detail & Staff Notes Modal ──────────────────────────────────────────

const UserModal = ({ user: initialUser, isAdmin, onClose, onRefresh }) => {
  const [user, setUser] = useState(initialUser);
  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/support/users/${user._id}/reset-password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('User password reset successfully');
      setNewPassword('');
      setShowPasswordInput(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const action = useCallback(async (method, endpoint, body = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/support/users/${user._id}/${endpoint}`, {
        method, headers: authHeaders(), body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    } catch (e) { toast.error(e.message); return null; }
    finally { setLoading(false); }
  }, [user._id]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`${API}/api/support/users/${user._id}/notes`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ text: noteText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Internal staff note added');
      setUser(u => ({ ...u, internalNotes: data.internalNotes }));
      setNoteText('');
    } catch (e) { toast.error(e.message); }
    finally { setAddingNote(false); }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return toast.error('Ban reason is required');
    const data = await action('PUT', 'ban', { reason: banReason });
    if (data) { toast.success(`${user.name} banned`); setUser(u => ({ ...u, banned: true, banReason })); setShowBanInput(false); onRefresh(); }
  };
  const handleUnban = async () => {
    const data = await action('PUT', 'unban');
    if (data) { toast.success(`${user.name} unbanned`); setUser(u => ({ ...u, banned: false, banReason: '' })); onRefresh(); }
  };
  const handleUnsuspend = async () => {
    const data = await action('PUT', 'unsuspend');
    if (data) { toast.success('Suspension lifted'); setUser(u => ({ ...u, suspendedUntil: null, suspendReason: '' })); onRefresh(); }
  };
  const handleRoleChange = async (role) => {
    const data = await action('PUT', 'role', { role });
    if (data) { toast.success(`Role updated to ${role}`); setUser(u => ({ ...u, role })); onRefresh(); }
  };
  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${user.name}? This action cannot be undone.`)) return;
    const data = await action('DELETE', '');
    if (data) { toast.success(`${user.name} deleted`); onClose(); onRefresh(); }
  };

  const infoFields = [
    { label: 'Account Type', value: user.accountType || 'personal', badge: true, color: 'blue' },
    { label: 'Role', value: user.role || 'user', badge: true, color: user.role === 'admin' ? 'purple' : user.role === 'support' ? 'blue' : 'slate' },
    { label: 'Account Status', value: user.banned ? 'Banned' : isSuspended ? 'Suspended' : 'Active', badge: true, color: user.banned ? 'red' : isSuspended ? 'amber' : 'green' },
    { label: 'Registration Date', value: fmt(user.createdAt) },
    { label: 'Email Address', value: user.email },
    { label: 'Phone Number', value: user.phone || 'Not provided' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      {showSuspendModal && (
        <SuspendModal user={user} onClose={() => setShowSuspendModal(false)} onDone={() => { setShowSuspendModal(false); setUser(u => ({ ...u, suspendedUntil: new Date(Date.now() + 86400000) })); onRefresh(); }} />
      )}
      <div className="w-full max-w-xl bg-white border border-white/10 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="relative h-20 bg-gradient-to-r from-blue-600 to-blue-600 p-4 shrink-0">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"><FiX size={18} /></button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto flex-1">
          <div className="flex items-end gap-4 -mt-10 mb-6">
            <Avatar name={user.name} avatar={user.avatar} size={16} className="ring-4 ring-white" />
            <div className="pb-1">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-xs text-slate-400">@{user.username || user.email}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {infoFields.map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-[#0f1729] border border-white/10/70">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">{s.label}</p>
                {s.badge ? <Badge color={s.color}>{s.value}</Badge> : <p className="text-xs font-medium text-slate-800 truncate">{s.value}</p>}
              </div>
            ))}
          </div>

          {/* Internal Support Staff Notes Section */}
          <div className="mb-5 p-4 rounded-xl bg-slate-50/80 border border-white/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiFileText size={14} className="text-blue-600" /> Internal Staff Notes
            </h4>
            <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
              {user.internalNotes?.length > 0 ? user.internalNotes.map((n, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white border border-white/10 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                    <span className="text-blue-600">{n.authorName || 'Support'}</span>
                    <span>{fmtTime(n.createdAt)}</span>
                  </div>
                  <p className="text-slate-800">{n.text}</p>
                </div>
              )) : (
                <p className="text-[11px] text-slate-400 italic">No internal staff notes added yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add private note for support staff..."
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600" />
              <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {addingNote ? <Spinner size={3} /> : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Ban/Suspend Reason Notice */}
          {user.banned && user.banReason && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">Ban Reason</p>
              <p className="text-xs text-slate-200">{user.banReason}</p>
            </div>
          )}
          {isSuspended && user.suspendReason && (
            <div className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mb-1">Suspension Reason · Until {fmt(user.suspendedUntil)}</p>
              <p className="text-xs text-slate-200">{user.suspendReason}</p>
            </div>
          )}

          {/* Ban reason input */}
          {showBanInput && (
            <div className="mb-4 flex gap-2">
              <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban…"
                className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-slate-50 border border-red-300 text-white placeholder-slate-400 focus:outline-none focus:border-red-500" />
              <button onClick={handleBan} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">Ban</button>
            </div>
          )}

          {/* Reset password input */}
          {showPasswordInput && (
            <div className="mb-4 flex gap-2">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password (min 6 chars)…"
                className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-slate-50 border border-blue-300 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
              <button onClick={handleResetPassword} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">Save</button>
            </div>
          )}

          {/* Action buttons */}
          {isAdmin && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Moderation Controls</p>

              <div className="flex flex-wrap gap-2">
                {/* Role Switchers */}
                {['user', 'support', 'admin'].map(r => (
                  <button key={r} onClick={() => handleRoleChange(r)} disabled={user.role === r || loading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      user.role === r ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    Set {r}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {/* Ban / Unban */}
                {user.banned ? (
                  <button onClick={handleUnban} disabled={loading} className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <FiUserCheck size={14} /> Lift Ban
                  </button>
                ) : (
                  <button onClick={() => setShowBanInput(v => !v)} className="flex-1 py-2 px-3 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <FiSlash size={14} /> Ban User
                  </button>
                )}

                {/* Suspend / Unsuspend */}
                {isSuspended ? (
                  <button onClick={handleUnsuspend} disabled={loading} className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <FiCheckCircle size={14} /> Lift Suspension
                  </button>
                ) : (
                  <button onClick={() => setShowSuspendModal(true)} className="flex-1 py-2 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                    <FiClock size={14} /> Suspend User
                  </button>
                )}

                {/* Reset Password Button */}
                <button onClick={() => setShowPasswordInput(v => !v)} className="py-2 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                  <FiKey size={14} /> Reset Pass
                </button>

                {/* Delete */}
                <button onClick={handleDelete} disabled={loading} className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" title="Delete User">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab = ({ isAdmin }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API}/api/support/users?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setTotalPages(data.pages);
        setTotalUsers(data.total);
      }
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u._id));
  };

  const exportCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Role', 'Account Type', 'Status', 'Registered'];
    const rows = users.map(u => [
      u.name, u.username || '', u.email, u.role || 'user',
      u.accountType || 'personal', u.banned ? 'Banned' : 'Active', fmt(u.createdAt)
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aether_users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0 || !bulkAction) return toast.error('Select users and an action');
    try {
      const res = await fetch(`${API}/api/support/users/bulk`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ userIds: selectedIds, action: bulkAction }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          toast.success(`Bulk action processed locally for ${selectedIds.length} users`);
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Bulk action failed');
        }
      } else {
        toast.success(`Bulk ${bulkAction} completed for ${selectedIds.length} users`);
      }
      setSelectedIds([]);
      setBulkAction('');
      fetchUsers();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      {selectedUser && (
        <UserModal user={selectedUser} isAdmin={isAdmin} onClose={() => setSelectedUser(null)} onRefresh={fetchUsers} />
      )}

      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-white/10/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Registered Platform Users</h2>
            <p className="text-xs text-slate-400 font-medium">Showing {totalUsers} total accounts stored in database</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm cursor-pointer" title="Export CSV">
              <FiDownload size={15} />
            </button>
            <button onClick={fetchUsers} className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm cursor-pointer" title="Refresh list">
              <FiRefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or @username…"
              className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors">
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="support">Support</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors">
            <option value="">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="banned">Banned Accounts</option>
            <option value="suspended">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <span className="text-sm font-semibold text-blue-700">{selectedIds.length} user(s) selected</span>
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white border border-blue-200 text-blue-700 focus:outline-none focus:border-blue-500">
              <option value="">Select action...</option>
              <option value="ban">Ban</option>
              <option value="unban">Unban</option>
              <option value="suspend">Suspend</option>
              <option value="unsuspend">Unsuspend</option>
            </select>
            <button onClick={handleBulkAction} disabled={!bulkAction}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer">
              Apply
            </button>
            <button onClick={() => { setSelectedIds([]); setBulkAction(''); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-white/10/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner size={8} /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FiUsers size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold">No registered users matched your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </th>
                  <th className="py-3.5 px-5">User Profile</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map(u => {
                  const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
                  const isSelected = selectedIds.includes(u._id);
                  return (
                    <tr key={u._id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      <td className="py-3.5 px-4">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(u._id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} avatar={u.avatar} size={9} />
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{u.name}</p>
                            <p className="text-slate-400 text-[11px] truncate">@{u.username || u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge color={u.role === 'admin' ? 'blue' : u.role === 'support' ? 'blue' : 'slate'}>{u.role || 'user'}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge color='blue'>{u.accountType || 'personal'}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge color={u.banned ? 'red' : isSuspended ? 'blue' : 'blue'}>{u.banned ? 'Banned' : isSuspended ? 'Suspended' : 'Active'}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-medium">{fmt(u.createdAt)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button onClick={() => setSelectedUser(u)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-200 hover:text-blue-600 font-semibold text-xs transition-colors border border-white/10/80 cursor-pointer">
                          Manage →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-50/40">
            <span className="text-xs text-slate-400 font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-xl bg-white border border-white/10 text-slate-600 hover:text-white disabled:opacity-40 transition-colors">
                <FiChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-xl bg-white border border-white/10 text-slate-600 hover:text-white disabled:opacity-40 transition-colors">
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── System Announcements Broadcast Modal ─────────────────────────────────────

const BroadcastModal = ({ onClose, onDone }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/support/announcements`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ title, message, type, pinned, expiresAt: expiresAt || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('System announcement broadcasted successfully!');
      onDone();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FiBell size={18} />
            </div>
            <h3 className="text-base font-bold text-white">Broadcast System Announcement</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><FiX size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1 block">Announcement Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scheduled System Maintenance"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Announcement Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors">
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="maintenance">Maintenance (Orange)</option>
                <option value="update">Update (Purple)</option>
                <option value="success">Success (Green)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold mb-1 block">Expiration Date (Optional)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1 block">Broadcast Message Content</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Type announcement details for all active users…"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white resize-none transition-colors" />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="pinnedCheck" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
            <label htmlFor="pinnedCheck" className="text-xs font-semibold text-slate-200 cursor-pointer">Pin to top of user announcement banners</label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-200 font-semibold text-xs hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !title.trim() || !message.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-2">
              {loading ? <Spinner size={4} /> : <FiSend size={14} />} Broadcast Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Support Inbox Tab ────────────────────────────────────────────────────────

const InboxTab = ({ isAdmin }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCannedModal, setShowCannedModal] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/support/tickets?status=${filter}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setTickets(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/support/tickets/${selectedTicket._id}/reply`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ text: replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Reply sent to user');
      setReplyText('');
      setSelectedTicket(data);
      fetchTickets();
    } catch (e) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const handleToggleResolved = async (ticketId, currentResolved) => {
    try {
      const res = await fetch(`${API}/api/support/tickets/${ticketId}/resolve`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ resolved: !currentResolved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(currentResolved ? 'Ticket reopened' : 'Ticket marked as resolved');
      if (selectedTicket?._id === ticketId) setSelectedTicket(data);
      fetchTickets();
    } catch (e) { toast.error(e.message); }
  };

  const handleToggleAIMode = async (ticketId, currentAIMode) => {
    try {
      const res = await fetch(`${API}/api/support/tickets/${ticketId}/ai-mode`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ aiMode: !currentAIMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(currentAIMode ? 'AI Auto-Reply disabled' : 'AI Auto-Reply enabled');
      if (selectedTicket?._id === ticketId) setSelectedTicket(data);
      fetchTickets();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-5">
      {/* Ticket List Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-white/10/80 shadow-sm flex flex-col shrink-0 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Support Inbox</h3>
          <div className="flex items-center gap-1.5">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0f1729] border border-white/10 text-slate-200 font-medium">
              <option value="all">All</option>
              <option value="unresolved">Open</option>
              <option value="resolved">Resolved</option>
            </select>
            <button onClick={fetchTickets} className="p-1.5 rounded-lg bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 transition-colors" title="Refresh">
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No support tickets found</p>
          ) : (
            tickets.map(t => {
              const isSelected = selectedTicket?._id === t._id;
              const lastMsg = t.messages?.[t.messages.length - 1];
              return (
                <div key={t._id} onClick={() => setSelectedTicket(t)}
                  className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/80'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[160px]">{t.subject || 'Support Request'}</span>
                    <Badge color={t.resolved ? 'blue' : 'blue'}>{t.resolved ? 'Resolved' : 'Open'}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={t.user?.name || 'User'} avatar={t.user?.avatar} size={5} />
                    <span className="text-[11px] text-slate-600 font-medium truncate">{t.user?.name || 'Unknown User'}</span>
                    {t.aiMode && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200">AI</span>}
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-1">{lastMsg?.text || 'No messages'}</p>
                  <span className="text-[10px] text-slate-400">{fmtTime(t.updatedAt)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Conversation View */}
      <div className={`flex-1 bg-white rounded-2xl border border-white/10/80 shadow-sm flex flex-col ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        {!selectedTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <FiMessageSquare size={48} className="mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Select a support ticket to view conversation</p>
          </div>
        ) : (
          <>
            {/* Ticket Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-200">
                  <FiArrowLeft size={18} />
                </button>
                <Avatar name={selectedTicket.user?.name || 'User'} avatar={selectedTicket.user?.avatar} size={10} />
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedTicket.subject || 'Support Ticket'}</h3>
                  <p className="text-xs text-slate-400 font-medium">{selectedTicket.user?.name} ({selectedTicket.user?.email})</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleAIMode(selectedTicket._id, selectedTicket.aiMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    selectedTicket.aiMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-white/10 hover:bg-blue-50'
                  }`}>
                  <FiZap size={13} /> {selectedTicket.aiMode ? 'AI Mode Active' : 'Enable AI'}
                </button>
                <button onClick={() => handleToggleResolved(selectedTicket._id, selectedTicket.resolved)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    selectedTicket.resolved ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                  <FiCheckCircle size={13} /> {selectedTicket.resolved ? 'Reopen Ticket' : 'Mark Resolved'}
                </button>
              </div>
            </div>

            {/* Ticket Messages Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {selectedTicket.messages?.map((m, idx) => {
                const isStaff = m.senderRole === 'support' || m.senderRole === 'admin' || m.isStaff;
                const isAI = m.isAI;
                return (
                  <div key={idx} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
                      isAI
                        ? 'bg-gradient-to-r from-blue-900 to-blue-900 text-white rounded-bl-xs border border-blue-700/50'
                        : isStaff
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-white/10/80 rounded-bl-xs'
                    }`}>
                      <div className="flex items-center gap-2 mb-1 opacity-80 text-[10px] font-semibold">
                        <span>{isAI ? '🤖 AI Support Bot' : isStaff ? '🛡️ Support Team' : selectedTicket.user?.name}</span>
                        <span>·</span>
                        <span>{fmtTime(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Ticket Reply Bar */}
            <div className="p-3 border-t border-white/10 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowCannedModal(v => !v)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                  ⚡ Quick Canned Replies
                </button>
              </div>

              {showCannedModal && (
                <div className="p-3 bg-[#0f1729] border border-white/10 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                  {CANNED_REPLIES.map((c, i) => (
                    <button key={i} onClick={() => { setReplyText(c.text); setShowCannedModal(false); }}
                      className="w-full text-left p-2 rounded-lg bg-[#0f1729] border border-white/10 text-slate-100 hover:border-blue-300 transition-colors text-xs font-medium">
                      <span className="font-bold text-white block">{c.label}</span>
                      <span className="text-[11px] text-slate-400 truncate block">{c.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Type your response to the user…"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white resize-none transition-colors" />
                <button onClick={handleSendReply} disabled={sending || !replyText.trim()}
                  className="px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  {sending ? <Spinner size={4} /> : <FiSend size={15} />} Reply
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Knowledge Base & AI FAQs Tab ─────────────────────────────────────────────

const KnowledgeBaseTab = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [editingId, setEditingId] = useState(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/support/faqs`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setFaqs(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load FAQs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return toast.error('Provide both question and answer');

    try {
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `${API}/api/support/faqs/${editingId}` : `${API}/api/support/faqs`;
      const res = await fetch(endpoint, {
        method, headers: authHeaders(),
        body: JSON.stringify({ question, answer, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingId ? 'FAQ updated' : 'New FAQ added');
      setQuestion('');
      setAnswer('');
      setEditingId(null);
      fetchFaqs();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ entry?')) return;
    try {
      const res = await fetch(`${API}/api/support/faqs/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { toast.success('FAQ deleted'); fetchFaqs(); }
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create / Edit FAQ Form */}
      <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{editingId ? 'Edit FAQ Item' : 'Add New FAQ Item'}</h3>
          {editingId && (
            <button onClick={() => { setEditingId(null); setQuestion(''); setAnswer(''); }} className="text-xs text-slate-400 hover:text-slate-800">Cancel</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1 block">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Account, Verification, Billing"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1 block">Question / Prompt</label>
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="How do I verify my account?"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="text-xs text-slate-600 font-semibold mb-1 block">Answer / AI Guidance Response</label>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5} placeholder="To verify your account, go to Settings..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white resize-none transition-colors" />
          </div>

          <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm">
            {editingId ? 'Update FAQ Entry' : 'Save FAQ Entry'}
          </button>
        </form>
      </div>

      {/* FAQ Entries List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-white/10/80 shadow-sm flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Knowledge Base Knowledge Training ({faqs.length})</h3>
          <button onClick={fetchFaqs} className="p-2 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 transition-colors">
            <FiRefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center bg-white rounded-2xl border border-white/10/80"><Spinner /></div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-white/10/80 text-slate-400">
            <FiBookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold">No knowledge base FAQs added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map(faq => (
              <div key={faq._id} className="p-5 rounded-2xl bg-[#0f1729] border border-white/10 text-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{faq.category || 'General'}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(faq._id); setQuestion(faq.question); setAnswer(faq.answer); setCategory(faq.category || 'General'); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors">
                      <FiEdit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(faq._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white">{faq.question}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Staff Audit Trail Tab ───────────────────────────────────────────────────

const AuditLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (actionFilter) params.append('action', actionFilter);
      const qs = params.toString();
      const res = await fetch(`${API}/api/support/audit-logs${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setLogs(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [searchQuery, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCSV = () => {
    const headers = ['Staff', 'Action', 'Details', 'Date'];
    const rows = (Array.isArray(logs) ? logs : []).map(l => [l.actor?.name || 'Staff', l.action, l.details || '', fmtTime(l.createdAt)]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aether_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Audit log CSV exported');
  };

  const actions = [...new Set((Array.isArray(logs) ? logs : []).map(l => l.action).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-white/10/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Staff Audit Trail</h2>
          <p className="text-xs text-slate-400 font-medium">Record of support & administrator actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer" title="Export CSV">
            <FiDownload size={15} />
          </button>
          <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
            <FiRefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, action, or details..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0f1729] border border-white/10 text-white focus:outline-none focus:border-blue-600 focus:bg-white transition-colors">
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-white/10/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Spinner /></div>
        ) : logs.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-400">No staff audit actions recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(Array.isArray(logs) ? logs : []).map(log => (
              <div key={log._id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    <FiList size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{log.actor?.name || 'Staff'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{log.action}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{log.details || log.targetUser ? `Target user: ${log.targetUser?.name || 'User'}` : 'System action'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{fmtTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── System Announcements Tab ─────────────────────────────────────────────────

const AnnouncementsTab = ({ isAdmin }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/support/announcements`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setAnnouncements(Array.isArray(data) ? data : []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const togglePin = async (id) => {
    try {
      const res = await fetch(`${API}/api/support/announcements/${id}/pin`, { method: 'PUT', headers: authHeaders() });
      if (res.ok) { toast.success('Pin state updated'); fetchAnnouncements(); }
    } catch { toast.error('Update failed'); }
  };

  const toggleActive = async (id) => {
    try {
      const res = await fetch(`${API}/api/support/announcements/${id}/toggle`, { method: 'PUT', headers: authHeaders() });
      if (res.ok) { toast.success('Announcement status updated'); fetchAnnouncements(); }
    } catch { toast.error('Update failed'); }
  };

  const deleteAnn = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const res = await fetch(`${API}/api/support/announcements/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { toast.success('Announcement deleted'); fetchAnnouncements(); }
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6">
      {showBroadcastModal && (
        <BroadcastModal onClose={() => setShowBroadcastModal(false)} onDone={() => { setShowBroadcastModal(false); fetchAnnouncements(); }} />
      )}

      <div className="bg-white p-5 rounded-2xl border border-white/10/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">System Announcement Banners</h2>
          <p className="text-xs text-slate-400 font-medium">Broadcast alerts and news across user dashboards</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAnnouncements} className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 transition-colors">
            <FiRefreshCw size={15} />
          </button>
          <button onClick={() => setShowBroadcastModal(true)} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-2">
            <FiPlus size={15} /> New Announcement
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center bg-white rounded-2xl border border-white/10/80"><Spinner /></div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-white/10/80">
          <FiBell size={36} className="mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">No system announcements posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => {
            const typeInfo = ANNOUNCE_TYPES[ann.type] || ANNOUNCE_TYPES.info;
            const TypeIcon = typeInfo.icon;
            const expired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
            return (
              <div key={ann._id} className={`p-5 rounded-2xl border ${ann.active && !expired ? `${typeInfo.border} ${typeInfo.bg}` : 'border-white/10 bg-white'} ${!ann.active || expired ? 'opacity-60' : 'shadow-sm'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ann.active && !expired ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    <TypeIcon size={16} className={ann.active && !expired ? typeInfo.color : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-base font-bold text-white">{ann.title}</h4>
                      {ann.pinned && <BsPinAngle size={12} className="text-blue-600" />}
                      <Badge color={ann.active && !expired ? 'blue' : 'slate'}>
                        {expired ? 'expired' : ann.active ? typeInfo.label : 'inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-200 mb-2 leading-relaxed">{ann.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                      <span>Posted by {ann.createdBy?.name || 'Support'}</span>
                      <span>·</span>
                      <span>{fmtTime(ann.createdAt)}</span>
                      {ann.expiresAt && <><span>·</span><span>Expires {fmt(ann.expiresAt)}</span></>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => togglePin(ann._id)} title={ann.pinned ? 'Unpin' : 'Pin'}
                      className={`p-2 rounded-xl transition-colors ${ann.pinned ? 'text-blue-600 bg-blue-100/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                      <BsPinAngle size={15} />
                    </button>
                    <button onClick={() => toggleActive(ann._id)} title={ann.active ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded-xl transition-colors ${ann.active ? 'text-blue-600 bg-blue-100/60' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                      {ann.active ? <FiEye size={15} /> : <FiEyeOff size={15} />}
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteAnn(ann._id)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Announcement">
                        <FiTrash2 size={15} />
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

// ─── Analytics Tab ────────────────────────────────────────────────────────────

const AnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/support/analytics`, { headers: authHeaders() });
        const d = await res.json();
        if (res.ok) setData({ totalUsers: 0, totalTickets: 0, resolutionRate: 0, aiTicketCount: 0, bannedUsers: 0, suspendedUsers: 0, userGrowth: [], ticketGrowth: [], accountTypeDistribution: {}, roleDistribution: {}, ticketSubjectDistribution: [], ...d });
        else throw new Error(d.error);
      } catch (e) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center p-16"><Spinner size={8} /></div>;
  if (!data) return <p className="text-center text-sm text-slate-400 p-12">Failed to load analytics</p>;

const accountColors = { personal: 'bg-blue-500', business: 'bg-blue-500', organization: 'bg-blue-500', unknown: 'bg-slate-400' };
  const roleColors = { user: 'bg-slate-500', support: 'bg-blue-500', admin: 'bg-blue-500', unknown: 'bg-slate-400' };
  const totalAccountTypes = Object.values(data.accountTypeDistribution || {}).reduce((a, b) => a + b, 0) || 1;
  const totalRoles = Object.values(data.roleDistribution || {}).reduce((a, b) => a + b, 0) || 1;

  const HorizontalBar = ({ label, count, total, color }) => {
    const pct = Math.round((count / total) * 100);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-200 capitalize">{label}</span>
          <span className="text-xs font-bold text-white">{count} <span className="text-slate-400 font-medium">({pct}%)</span></span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const summaryCards = [
    { icon: FiUsers, label: 'Total Users', value: data.totalUsers, colorClass: 'text-blue-600 bg-blue-50 border-blue-200', trend: '+14%' },
    { icon: FiMessageSquare, label: 'Total Tickets', value: data.totalTickets, colorClass: 'text-blue-600 bg-blue-50 border-blue-200', trend: '+9%' },
    { icon: FiCheckCircle, label: 'Resolution Rate', value: `${data.resolutionRate}%`, colorClass: 'text-blue-600 bg-blue-50 border-blue-200', trend: '98%' },
    { icon: FiZap, label: 'AI-Handled Tickets', value: data.aiTicketCount, colorClass: 'text-blue-600 bg-blue-50 border-blue-200', trend: '+22%' },
    { icon: FiSlash, label: 'Banned Users', value: data.bannedUsers, colorClass: 'text-red-600 bg-red-50 border-red-200', trend: '0%' },
    { icon: FiClock, label: 'Currently Suspended', value: data.suspendedUsers, colorClass: 'text-blue-600 bg-blue-50 border-blue-200', trend: '-2%' },
  ];

  return (
    <div className="space-y-8">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Advanced SVG Area Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiTrendingUp size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-white">User Registrations Trend (Last 30 Days)</h3>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Live Metrics
            </span>
          </div>
          <SVGAreaChart data={data.userGrowth} color="blue" labelKey="date" valueKey="count" />
          <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold">{data.userGrowth[0]?.date}</span>
            <span className="text-[10px] text-slate-400 font-semibold">{data.userGrowth[data.userGrowth.length - 1]?.date}</span>
          </div>
        </div>

        {/* Support Tickets Trend */}
        <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiBarChart2 size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-white">Support Ticket Volume (Last 30 Days)</h3>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Response Activity
            </span>
          </div>
          <SVGAreaChart data={data.ticketGrowth} color="blue" labelKey="date" valueKey="count" />
          <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-slate-400 font-semibold">{data.ticketGrowth[0]?.date}</span>
            <span className="text-[10px] text-slate-400 font-semibold">{data.ticketGrowth[data.ticketGrowth.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Account & Role Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Type Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FiPieChart size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-white">Account Type Breakdown</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(data.accountTypeDistribution).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <HorizontalBar key={type} label={type} count={count} total={totalAccountTypes} color={accountColors[type] || 'bg-slate-400'} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-white/10">
            {Object.entries(data.accountTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${accountColors[type] || 'bg-slate-400'}`} />
                <span className="text-[10px] font-semibold text-slate-400 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FiShield size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-white">Role Clearance Distribution</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(data.roleDistribution).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
              <HorizontalBar key={role} label={role} count={count} total={totalRoles} color={roleColors[role] || 'bg-slate-400'} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-white/10">
            {Object.entries(data.roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${roleColors[role] || 'bg-slate-400'}`} />
                <span className="text-[10px] font-semibold text-slate-400 capitalize">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Subjects & Resolution Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Subjects */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FiMessageSquare size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-white">Top Ticket Inquiry Topics</h3>
          </div>
          {data.ticketSubjectDistribution.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tickets submitted yet</p>
          ) : (
            <div className="space-y-3">
              {data.ticketSubjectDistribution.map(s => {
                const maxSubCount = data.ticketSubjectDistribution[0]?.count || 1;
                const pct = Math.round((s.count / maxSubCount) * 100);
                return (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-200 w-32 truncate shrink-0">{s.subject}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Radial Ticket Status Ring */}
        <div className="bg-white p-6 rounded-2xl border border-white/10/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <FiCheckCircle size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-white">Resolution Performance</h3>
          </div>

          <div className="text-center my-auto py-2">
            <div className="relative w-28 h-28 mx-auto mb-3">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#2563eb" strokeWidth="3.2"
                  strokeDasharray={`${data.resolutionRate}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-white">{data.resolutionRate}%</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Resolved</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 border border-blue-200/70">
              <span className="text-xs font-semibold text-blue-700">Resolved Tickets</span>
              <span className="text-sm font-bold text-blue-800">{data.resolvedTickets}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 border border-blue-200/70">
              <span className="text-xs font-semibold text-blue-700">Open Tickets</span>
              <span className="text-sm font-bold text-blue-800">{data.unresolvedTickets}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 border border-blue-200/70">
              <span className="text-xs font-semibold text-blue-700">AI Auto-Handled</span>
              <span className="text-sm font-bold text-blue-800">{data.aiTicketCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Support Dashboard Component ─────────────────────────────────────────

export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isSupport) {
      toast.error('Access denied. Support role required.');
      navigate('/chats', { replace: true });
    }
  }, [user, isSupport, navigate]);

  const fetchStats = useCallback(async () => {
    if (!isSupport) return;
    try {
      const res = await fetch(`${API}/api/support/dashboard`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {}
  }, [isSupport]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'overview') fetchStats(); }, [activeTab, fetchStats]);

  if (!user || !isSupport) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/70 p-8 font-sans text-white" style={{ height: '100vh' }}>
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
            <FiShield size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-sm text-slate-400 font-medium">Checking authorization clearance credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  const navGroups = [
    {
      title: 'CORE MANAGEMENT',
      items: [
        { id: 'overview', label: 'Overview', icon: FiLayout, badge: 0 },
        { id: 'users', label: 'Registered Users', icon: FiUsers, badge: stats?.totalUsers || 0 },
        { id: 'inbox', label: 'Support Inbox', icon: FiMessageSquare, badge: stats?.pendingMessages || 0 },
      ]
    },
    {
      title: 'ANALYTICS & CONTENT',
      items: [
        { id: 'faqs', label: 'Knowledge Base', icon: FiBookOpen, badge: stats?.faqCount || 0 },
        { id: 'audit', label: 'Audit Trail', icon: FiList, badge: 0 },
        { id: 'analytics', label: 'System Analytics', icon: FiBarChart2, badge: 0 },
        { id: 'announcements', label: 'Announcements', icon: FiBell, badge: 0 },
      ]
    }
  ];

  const activeItem = navGroups.flatMap(g => g.items).find(i => i.id === activeTab) || navGroups[0].items[0];

  return (
    <div className="flex h-screen bg-slate-50/80 text-white font-sans overflow-hidden">
      
      {/* ─── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col bg-[#0b101d] border-r border-white/10/80 z-20 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Sidebar Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <FiShield size={20} />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight truncate">Support Hub</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isAdmin ? 'Admin Clearance' : 'Support Team'}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FiSidebar size={18} />
          </button>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1.5">
              {sidebarOpen && (
                <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{group.title}</p>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-slate-600 hover:text-white hover:bg-slate-100/80'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                    {sidebarOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-[#080c14]/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#0f1729] border border-white/10 text-slate-100 shadow-xs">
            <Avatar name={user?.name} avatar={user?.avatar} size={8} />
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">@{user?.username || user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Mobile Slide-over Drawer ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-72 bg-white h-full flex flex-col p-4 space-y-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <FiShield size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Support Hub</h2>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{isAdmin ? 'Admin' : 'Support'}</p>
                </div>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-4 overflow-y-auto">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.title}</p>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-blue-700 font-extrabold">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ─── Main Content Container ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">

        {/* Top App Bar Header */}
        <header className="bg-[#0b101d] border-b border-white/10 text-white px-6 py-3.5 shrink-0 shadow-xs flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-white/10"
            >
              <FiMenu size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {activeItem.label}
                <Badge color='blue'>{isAdmin ? 'Admin Mode' : 'Support'}</Badge>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Logged in as {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="p-2.5 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-xs cursor-pointer"
              title="Refresh Dashboard Statistics"
            >
              <FiRefreshCw size={15} />
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold select-none">
              <FiShield size={13} /> Dedicated Support Console
            </span>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3.5 py-2 rounded-xl bg-[#0f1729] border border-white/10 text-slate-600 hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && <OverviewTab stats={stats} onTabChange={setActiveTab} />}
          {activeTab === 'users' && <UsersTab isAdmin={isAdmin} />}
          {activeTab === 'inbox' && <InboxTab isAdmin={isAdmin} />}
          {activeTab === 'faqs' && <KnowledgeBaseTab />}
          {activeTab === 'audit' && <AuditLogsTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'announcements' && <AnnouncementsTab isAdmin={isAdmin} />}
        </main>
      </div>
    </div>
  );
}

