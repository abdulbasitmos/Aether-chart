import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLayers, FiMapPin, FiGlobe, FiMail, FiPhone, FiCalendar, FiMessageSquare, FiArrowLeft, FiClock, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || '';

export default function OrgPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(`${API}/api/organizations/${id}/public-profile`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setOrg(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, [id]);

  const handleMessageOrg = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to message this organization');
      return navigate('/');
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/organizations/${id}/start-chat`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/chats/${data.conversation._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#080c14]">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!org) return (
    <div className="flex-1 flex items-center justify-center bg-[#080c14]">
      <div className="text-center space-y-3">
        <FiLayers size={40} className="mx-auto text-slate-600" />
        <p className="text-sm text-slate-500">Organization not found</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer">Go back</button>
      </div>
    </div>
  );

  const upcomingEvents = (org.events || []).filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  const pastEvents = (org.events || []).filter(e => new Date(e.date) < new Date()).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const announcements = org.announcements || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#080c14]">
      <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer mb-4">
          <FiArrowLeft size={14} /> Back
        </button>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#0a0f1f] border border-white/5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg">
              {org.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white font-display">{org.name}</h1>
              <p className="text-xs text-blue-400 font-medium mt-0.5 capitalize">{org.orgType}</p>
              <p className="text-sm text-slate-400 mt-2">{org.description || 'No description provided.'}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                {org.website && <span className="flex items-center gap-1"><FiGlobe size={12} />{org.website}</span>}
                {org.email && <span className="flex items-center gap-1"><FiMail size={12} />{org.email}</span>}
                {org.phone && <span className="flex items-center gap-1"><FiPhone size={12} />{org.phone}</span>}
                {org.address && <span className="flex items-center gap-1"><FiMapPin size={12} />{org.address}</span>}
                <span className="flex items-center gap-1"><FiUsers size={12} />{org.memberCount || 0} members</span>
              </div>
            </div>
            <button onClick={handleMessageOrg} className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-2">
              <FiMessageSquare size={15} /> Message
            </button>
          </div>
        </div>

        {announcements.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-white font-display mb-3 flex items-center gap-2"><FiClock size={14} className="text-blue-400" /> Announcements</h2>
            <div className="space-y-2">
              {announcements.slice(0, 3).map((a, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                  <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                  {a.content && <p className="text-xs text-slate-400 mt-1">{a.content}</p>}
                  <p className="text-[10px] text-slate-600 mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white font-display mb-3 flex items-center gap-2"><FiCalendar size={14} className="text-blue-400" /> Upcoming Events</h2>
              <div className="space-y-2">
                {upcomingEvents.map((e, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                    <h3 className="text-sm font-semibold text-white">{e.title}</h3>
                    {e.description && <p className="text-xs text-slate-400 mt-1">{e.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><FiCalendar size={10} />{new Date(e.date).toLocaleDateString()}</span>
                      {e.location && <span className="flex items-center gap-1"><FiMapPin size={10} />{e.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white font-display mb-3 flex items-center gap-2"><FiClock size={14} className="text-slate-500" /> Past Events</h2>
              <div className="space-y-2">
                {pastEvents.map((e, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#0f1729] border border-white/5">
                    <h3 className="text-sm font-semibold text-white">{e.title}</h3>
                    {e.description && <p className="text-xs text-slate-400 mt-1">{e.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><FiCalendar size={10} />{new Date(e.date).toLocaleDateString()}</span>
                      {e.location && <span className="flex items-center gap-1"><FiMapPin size={10} />{e.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {upcomingEvents.length === 0 && pastEvents.length === 0 && (
          <div className="p-8 rounded-xl bg-[#0f1729] border border-white/5 text-center">
            <FiCalendar size={28} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No events yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
