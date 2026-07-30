import React, { useState } from 'react';
import { FiBriefcase, FiMapPin, FiClock, FiImage, FiCheck, FiArrowLeft, FiArrowRight, FiPackage, FiPhone, FiMail, FiGlobe } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BusinessSetupWizard = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    category: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    openingHours: '09:00',
    closingHours: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    logo: '',
    coverImage: ''
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleFinish = async () => {
    if (!form.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API}/profile`, form, { headers: headers() });
      toast.success('Business profile setup complete!');
      if (onComplete) onComplete();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-500";
  const labelClass = "text-[10px] text-blue-300 font-bold uppercase tracking-wider block mb-1.5";
  const btnClass = "py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2";

  const steps = [
    // Step 0: Basic Info
    <div key="step0" className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <FiBriefcase size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white font-display">Business Information</h3>
        <p className="text-[10px] text-slate-400 mt-1">Tell us about your business</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Business Name *</label>
          <input className={inputClass} value={form.businessName} onChange={e => update('businessName', e.target.value)} placeholder="Your Business Name" required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <input className={inputClass} value={form.category} onChange={e => update('category', e.target.value)} placeholder="e.g. Retail, Salon, Consulting" />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea className={inputClass + ' resize-none'} rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe what your business offers..." />
        </div>
      </div>
    </div>,

    // Step 1: Contact
    <div key="step1" className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <FiPhone size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white font-display">Contact Details</h3>
        <p className="text-[10px] text-slate-400 mt-1">How customers can reach you</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <FiPhone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className={inputClass + ' pl-9'} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 555 123 4567" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className={inputClass + ' pl-9'} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="contact@business.com" />
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <div className="relative">
            <FiGlobe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={inputClass + ' pl-9'} value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://business.com" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <div className="relative">
            <FiMapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={inputClass + ' pl-9'} value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St, City" />
          </div>
        </div>
      </div>
    </div>,

    // Step 2: Hours
    <div key="step2" className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <FiClock size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white font-display">Business Hours</h3>
        <p className="text-[10px] text-slate-400 mt-1">Set your working schedule</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Opening Time</label>
            <input type="time" className={inputClass} value={form.openingHours} onChange={e => update('openingHours', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Closing Time</label>
            <input type="time" className={inputClass} value={form.closingHours} onChange={e => update('closingHours', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Working Days</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                  form.workingDays.includes(day)
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-[#0f1729] text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // Step 3: Media & Finish
    <div key="step3" className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
          <FiImage size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white font-display">Branding & Finish</h3>
        <p className="text-[10px] text-slate-400 mt-1">Add your logo and cover image</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Logo URL</label>
          <div className="relative">
            <FiImage size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={inputClass + ' pl-9'} value={form.logo} onChange={e => update('logo', e.target.value)} placeholder="https://example.com/logo.png" />
          </div>
          {form.logo && (
            <div className="mt-2 w-16 h-16 rounded-lg border border-white/10 overflow-hidden bg-[#0f1729]">
              <img src={form.logo} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Cover Image URL</label>
          <input className={inputClass} value={form.coverImage} onChange={e => update('coverImage', e.target.value)} placeholder="https://example.com/cover.png" />
        </div>
      </div>
    </div>
  ];

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.03) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
      
      <div className="p-6 border-b border-white/5 bg-[#0b0f19]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <FiPackage size={20} className="text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-white font-display">Set Up Your Business</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Complete your business profile to get started</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
        <div className="max-w-lg mx-auto">
          {steps[step]}

          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="py-2 px-4 bg-[#0f1729] border border-white/10 text-slate-300 font-bold text-xs rounded-xl hover:border-blue-500/30 transition-all cursor-pointer flex items-center gap-2">
                <FiArrowLeft size={14} /> Back
              </button>
            ) : <div />}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} className={btnClass}>
                Next <FiArrowRight size={14} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className={btnClass}>
                {loading ? 'Saving...' : <><FiCheck size={14} /> Complete Setup</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessSetupWizard;
