import React, { useState, useEffect } from 'react';
import { FiTag, FiPlus, FiTrash2, FiCopy, FiCheck, FiX, FiCalendar, FiPercent, FiDollarSign, FiToggleLeft, FiToggleRight, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'business_coupons';

const defaultForm = {
  code: '',
  type: 'percentage',
  value: '',
  expiry: '',
  description: '',
  isActive: true,
};

const BusinessCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setCoupons(stored);
    } catch { setCoupons([]); }
  }, []);

  const saveCoupons = (updated) => {
    setCoupons(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Coupon code is required'); return; }
    if (!form.value || Number(form.value) <= 0) { toast.error('Value must be greater than 0'); return; }
    if (form.type === 'percentage' && Number(form.value) > 100) { toast.error('Percentage cannot exceed 100'); return; }
    const existing = coupons.find(c => c.code.toUpperCase() === form.code.toUpperCase());
    if (existing) { toast.error('Coupon code already exists'); return; }

    const newCoupon = {
      id: Date.now().toString(),
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      expiry: form.expiry || null,
      description: form.description.trim(),
      isActive: form.isActive,
      createdAt: new Date().toISOString(),
    };
    saveCoupons([newCoupon, ...coupons]);
    setForm(defaultForm);
    setShowForm(false);
    toast.success('Coupon created!');
  };

  const handleDelete = (id) => {
    saveCoupons(coupons.filter(c => c.id !== id));
    toast.success('Coupon deleted');
  };

  const handleToggle = (id) => {
    saveCoupons(coupons.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      toast.success(`Copied "${code}"`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const isExpired = (expiry) => expiry && new Date(expiry) < new Date();
  const expiresSoon = (expiry) => {
    if (!expiry) return false;
    const diff = new Date(expiry) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive && !isExpired(c.expiry)).length,
    expired: coupons.filter(c => isExpired(c.expiry)).length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Coupons & Discounts</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Create and manage promotional discount codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 text-white font-bold text-[9px] rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
        >
          <FiPlus size={12} /> NEW COUPON
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Expired', value: stats.expired, color: 'text-rose-400' },
        ].map((s, i) => (
          <div key={i} className="p-3 bg-[#131b2e]/60 border border-white/5 rounded-xl text-center">
            <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-5 bg-[#131b2e]/60 border border-blue-500/20 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Create Coupon</h4>
            <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm); }} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Coupon Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SUMMER20"
                maxLength={20}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white font-mono focus:border-blue-500/40 outline-none placeholder:text-slate-500 uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Type *</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                Value * {form.type === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                min="1"
                max={form.type === 'percentage' ? 100 : undefined}
                step="0.01"
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder={form.type === 'percentage' ? '20' : '10.00'}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Expiry Date</label>
              <input
                type="date"
                value={form.expiry}
                onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Summer sale - 20% off all products"
              className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500"
            />
          </div>

          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
            CREATE COUPON
          </button>
        </form>
      )}

      {/* Coupon list */}
      {coupons.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
            <FiTag size={22} className="text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">No coupons yet</p>
          <p className="text-[9px] text-slate-600 mt-1">Create your first discount coupon</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map(coupon => {
            const expired = isExpired(coupon.expiry);
            const soon = expiresSoon(coupon.expiry);
            const effectiveActive = coupon.isActive && !expired;
            return (
              <div key={coupon.id} className={`p-4 bg-[#131b2e]/60 border rounded-2xl transition-all ${expired ? 'border-rose-500/10 opacity-60' : coupon.isActive ? 'border-white/5 hover:border-blue-500/20' : 'border-white/5 opacity-75'}`}>
                <div className="flex items-center justify-between gap-3">
                  {/* Code */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${effectiveActive ? 'bg-blue-600/15 border border-blue-500/30' : 'bg-slate-900 border border-white/5'}`}>
                      {coupon.type === 'percentage' ? <FiPercent size={14} className={effectiveActive ? 'text-blue-400' : 'text-slate-500'} /> : <FiDollarSign size={14} className={effectiveActive ? 'text-blue-400' : 'text-slate-500'} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-sm font-bold tracking-widest ${expired ? 'text-slate-500 line-through' : 'text-white'}`}>{coupon.code}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${coupon.type === 'percentage' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
                          {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                        </span>
                        {expired && <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">EXPIRED</span>}
                        {soon && !expired && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1"><FiAlertTriangle size={8} />Expiring soon</span>}
                      </div>
                      {coupon.description && <p className="text-[9px] text-slate-500 mt-0.5 truncate">{coupon.description}</p>}
                      <div className="flex items-center gap-2 mt-0.5">
                        {coupon.expiry && (
                          <span className={`text-[9px] flex items-center gap-1 ${expired ? 'text-rose-400/70' : 'text-slate-500'}`}>
                            <FiCalendar size={8} />Expires {new Date(coupon.expiry).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(coupon.code, coupon.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 transition-all cursor-pointer"
                      title="Copy code"
                    >
                      {copiedId === coupon.id ? <FiCheck size={12} className="text-emerald-400" /> : <FiCopy size={12} />}
                    </button>
                    <button
                      onClick={() => handleToggle(coupon.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${coupon.isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'}`}
                      title={coupon.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {coupon.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                    >
                      <FiTrash2 size={12} />
                    </button>
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

export default BusinessCoupons;
