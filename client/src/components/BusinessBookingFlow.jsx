import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiCalendar, FiClock, FiUser, FiPhone, FiMail, FiArrowLeft,
  FiCheck, FiMessageSquare, FiGrid, FiPackage, FiDollarSign
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const BusinessBookingFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    service: '',
    date: '',
    time: '',
    notes: ''
  });

  const preselectProduct = searchParams.get('product');
  const preselectService = searchParams.get('service');

  useEffect(() => {
    fetchBusiness();
  }, [id]);

  const fetchBusiness = async () => {
    try {
      const res = await axios.get(`${API}/public/${id}`);
      setBusiness(res.data);
      if (preselectService && res.data.services) {
        const svc = res.data.services.find(s => s._id === preselectService);
        if (svc) setForm(f => ({ ...f, service: svc.name }));
      }
    } catch (err) {
      toast.error('Business not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error('Date and time are required');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/appointments`, {
        businessId: id,
        customerName: form.customerName || user?.name || 'Guest',
        customerEmail: form.customerEmail || '',
        customerPhone: form.customerPhone || '',
        service: form.service,
        date: form.date,
        time: form.time,
        notes: form.notes
      }, { headers: headers() });
      toast.success('Appointment booked successfully!');
      navigate(`/business/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-500";
  const labelClass = "text-[10px] text-blue-300 font-bold uppercase tracking-wider block mb-1.5";

  if (loading) {
    return (
      <div className="flex-1 h-full bg-[#080c14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.03) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="p-6 border-b border-white/5 bg-[#0b0f19]/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(`/business/${id}`)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer bg-transparent border-none outline-none mb-3">
          <FiArrowLeft size={14} /> Back to business
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            {business.logo ? (
              <img src={business.logo} alt="" className="w-full h-full rounded-lg object-cover" />
            ) : (
              <FiCalendar size={18} className="text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-display">Book Appointment</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">{business.businessName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Customer Info */}
            <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-4">
              <h3 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <FiUser size={12} /> Your Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <div className="relative">
                    <FiUser size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className={inputClass + ' pl-9'} value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} placeholder="Your name" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Email</label>
                    <div className="relative">
                      <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input className={inputClass + ' pl-9'} type="email" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <div className="relative">
                      <FiPhone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input className={inputClass + ' pl-9'} value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} placeholder="+1 555 123 4567" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Selection */}
            {business.services?.length > 0 && (
              <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <FiGrid size={12} /> Select Service
                </h3>
                <div className="space-y-2">
                  {business.services.map(s => (
                    <label key={s._id} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                      form.service === s.name ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-slate-800/30 hover:border-blue-500/20'
                    }`}>
                      <input type="radio" name="service" value={s.name} checked={form.service === s.name}
                        onChange={e => setForm(p => ({ ...p, service: e.target.value }))} className="text-blue-600 focus:ring-blue-500/20" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-slate-200 font-medium">{s.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.duration && <span className="text-[9px] text-slate-500"><FiClock size={8} /> {s.duration} min</span>}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-400">
                        {s.price ? `$${s.price.toFixed(2)}` : '\u2014'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-4">
              <h3 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <FiCalendar size={12} /> Date & Time
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date *</label>
                  <div className="relative">
                    <FiCalendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className={inputClass + ' pl-9'} type="date" value={form.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Time *</label>
                  <div className="relative">
                    <FiClock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className={inputClass + ' pl-9'} type="time" value={form.time}
                      onChange={e => setForm(p => ({ ...p, time: e.target.value }))} required />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
              <h3 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Additional Notes</h3>
              <textarea className={inputClass + ' resize-none'} rows={3} value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requests or information..." />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10">
              {submitting ? 'Booking...' : <><FiCheck size={16} /> CONFIRM BOOKING</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessBookingFlow;
