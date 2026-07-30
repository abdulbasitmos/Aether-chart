import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiInfo, FiAlertTriangle, FiTool, FiZap, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';

const API = '';

const TYPE_CONFIG = {
  info:        { icon: FiInfo,         color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   label: 'Info' },
  warning:     { icon: FiAlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  label: 'Warning' },
  maintenance: { icon: FiTool,          color: 'text-orange-400',bg: 'bg-orange-500/10', border: 'border-orange-500/25', label: 'Maintenance' },
  update:      { icon: FiZap,           color: 'text-purple-400',bg: 'bg-purple-500/10', border: 'border-purple-500/25', label: 'Update' },
  success:     { icon: FiCheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10',  border: 'border-green-500/25',  label: 'Success' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]'); }
    catch { return []; }
  });
  const [expanded, setExpanded] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/support/announcements/public`);
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetch_]);

  const visible = announcements.filter(a => !dismissed.includes(a._id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(currentIdx, visible.length - 1)];
  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    sessionStorage.setItem('dismissed_announcements', JSON.stringify(next));
    if (currentIdx >= visible.length - 1) setCurrentIdx(Math.max(0, visible.length - 2));
  };

  return (
    <div className={`relative w-full px-4 py-2.5 border-b ${cfg.border} ${cfg.bg} transition-all duration-300`}
      style={{ zIndex: 100 }}>
      <div className="flex items-center gap-3 max-w-5xl mx-auto">
        {/* Icon */}
        <div className={`shrink-0 flex items-center gap-1.5 ${cfg.color}`}>
          {current.pinned && <BsPinAngle size={10} />}
          <Icon size={14} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xs font-bold ${cfg.color} uppercase tracking-wider`}>{cfg.label}</span>
            <span className="text-xs font-semibold text-white truncate">{current.title}</span>
            {!expanded && (
              <span className="text-xs text-slate-400 truncate hidden sm:inline">{current.message}</span>
            )}
          </div>
          {expanded === current._id && (
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{current.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Multi-announcement pagination */}
          {visible.length > 1 && (
            <span className="text-[10px] text-slate-600 mr-1">{currentIdx + 1}/{visible.length}</span>
          )}
          {visible.length > 1 && currentIdx > 0 && (
            <button onClick={() => setCurrentIdx(i => i - 1)} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
              <FiChevronUp size={12} />
            </button>
          )}
          {visible.length > 1 && currentIdx < visible.length - 1 && (
            <button onClick={() => setCurrentIdx(i => i + 1)} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
              <FiChevronDown size={12} />
            </button>
          )}

          {/* Expand/collapse */}
          <button onClick={() => setExpanded(e => e === current._id ? null : current._id)}
            className={`p-1 rounded text-slate-500 hover:${cfg.color} transition-colors`}>
            {expanded === current._id ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
          </button>

          {/* Dismiss */}
          {!current.pinned && (
            <button onClick={() => dismiss(current._id)} title="Dismiss"
              className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
              <FiX size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
