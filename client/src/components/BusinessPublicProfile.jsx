import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiBriefcase, FiStar, FiPhone, FiMail, FiGlobe, FiMapPin, FiClock,
  FiCalendar, FiMessageSquare, FiArrowLeft, FiCheck, FiX, FiChevronRight,
  FiPackage, FiGrid, FiClock as FiClockIcon, FiDollarSign, FiTag, FiUser,
  FiUsers, FiAlertCircle, FiInfo, FiPlus, FiMinus, FiShoppingBag
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const STATUS_COLORS = {
  open: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  closed: 'text-slate-400 bg-[#0f172a] border-white/10',
  busy: 'text-blue-300 bg-blue-600/20 border-blue-500/30',
  on_break: 'text-blue-300 bg-blue-600/20 border-blue-500/30',
  holiday: 'text-slate-400 bg-[#0f172a] border-white/10',
};


const BusinessPublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('about');

  // Checkout modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, [id]);

  useEffect(() => {
    if (activeSection === 'reviews') {
      fetchReviews();
    }
  }, [activeSection, id]);

  const fetchBusiness = async () => {
    try {
      const res = await axios.get(`${API}/public/${id}`);
      setBusiness(res.data);
    } catch (err) {
      toast.error('Business not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await axios.get(`${API}/reviews/${id}`);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.warn('Failed to fetch reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleChat = async () => {
    try {
      const res = await axios.post('/api/contacts/create-and-chat',
        { username: business.owner?.username || `business_${id}` },
        { headers: headers() }
      );
      navigate(`/chats/${res.data.conversation._id}`);
    } catch (err) {
      toast.error('Failed to start chat');
    }
  };

  const handleEventRSVP = async (eventId) => {
    try {
      const res = await axios.post(`${API}/${id}/events/${eventId}/rsvp`, {}, { headers: headers() });
      toast.success(res.data.message || 'RSVP confirmed!');
      fetchBusiness();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to RSVP');
    }
  };

  const handleWorkshopEnroll = async (workshopId) => {
    try {
      const res = await axios.post(`${API}/${id}/workshops/${workshopId}/enroll`, {}, { headers: headers() });
      toast.success(res.data.message || 'Enrolled successfully!');
      fetchBusiness();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll');
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setPurchasing(true);
    try {
      const variantName = selectedVariant ? selectedVariant.name : undefined;
      const variantValue = selectedVariant ? selectedVariant.value : undefined;
      await axios.post(`${API}/${id}/products/${selectedProduct._id}/purchase`, {
        quantity: purchaseQty,
        notes: purchaseNotes,
        variantName,
        variantValue
      }, { headers: headers() });

      toast.success('Purchase order placed successfully!');
      
      // Prefill chat message and start communication
      const msgText = `Hello! I just placed a purchase order for ${purchaseQty}x "${selectedProduct.name}"${variantName ? ` (${variantName}: ${variantValue})` : ''} via your business profile. Notes: ${purchaseNotes || 'None'}. Price: $${(selectedProduct.price * purchaseQty).toFixed(2)}`;
      
      const chatRes = await axios.post('/api/contacts/create-and-chat',
        { username: business.owner?.username || `business_${id}` },
        { headers: headers() }
      );

      // Close modal and navigate
      setSelectedProduct(null);
      navigate(`/chats/${chatRes.data.conversation._id}`, { state: { prefilledMessage: msgText } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/reviews/${id}`, newReview, { headers: headers() });
      toast.success('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
      fetchBusiness();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatPrice = (p) => {
    const num = parseFloat(p);
    return isNaN(num) ? '\u2014' : `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex-1 h-full bg-[#080c14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  const rating = business.averageRating || 0;

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.03) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="overflow-y-auto no-scrollbar flex-1 z-10">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">

          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer bg-transparent border-none outline-none mb-2">
            <FiArrowLeft size={14} /> Back
          </button>

          {/* Cover & Logo */}
          <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0f1729]">
            {business.coverImage ? (
              <img src={business.coverImage} alt="" className="w-full h-32 sm:h-48 object-cover" onError={e => e.target.style.display = 'none'} />
            ) : (
              <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-blue-900/30 to-slate-900" />
            )}
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 rounded-xl border-4 border-[#080c14] bg-[#0f1729] flex items-center justify-center overflow-hidden">
                {business.logo ? (
                  <img src={business.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiBriefcase size={24} className="text-blue-400" />
                )}
              </div>
            </div>
          </div>

          {/* Name & Status */}
          <div className="pt-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white font-display">{business.businessName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[business.availabilityStatus] || STATUS_COLORS.open}`}>
                  {(business.availabilityStatus || 'open').toUpperCase()}
                </span>
                {business.category && (
                  <span className="text-[9px] text-slate-400 bg-[#0f1729] px-2 py-0.5 rounded-full border border-white/5 flex items-center gap-1">
                    <FiTag size={9} /> {business.category}
                  </span>
                )}
                {rating > 0 && (
                  <span className="text-[9px] text-amber-400 flex items-center gap-1">
                    <FiStar size={9} /> {rating} ({business.reviews?.length || 0} reviews)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleChat}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/25">
                <FiMessageSquare size={13} /> CHAT
              </button>
              <button onClick={() => navigate(`/business/${id}/book`)}
                className="py-2 px-4 bg-blue-500/20 border border-blue-400/40 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
                <FiCalendar size={13} /> BOOK APPOINTMENT
              </button>
            </div>

          </div>

          {/* Section Tabs */}
          <div className="flex bg-[#0b0f19] p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar gap-0.5">
            {[
              { key: 'about', label: 'About', icon: <FiBriefcase size={13} /> },
              { key: 'products', label: 'Store & Products', icon: <FiPackage size={13} /> },
              { key: 'services', label: 'Services', icon: <FiGrid size={13} /> },
              { key: 'workshops', label: 'Workshops', icon: <FiUsers size={13} /> },
              { key: 'events', label: 'Events', icon: <FiCalendar size={13} /> },
              { key: 'reviews', label: 'Reviews', icon: <FiStar size={13} /> }
            ].map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 ${
                  activeSection === s.key ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* About Section */}
          {activeSection === 'about' && (
            <div className="space-y-4">
              {business.description && (
                <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl">
                  <p className="text-xs text-slate-300 leading-relaxed">{business.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {business.phone && (
                  <div className="p-4 bg-[#0f1729] border border-white/5 rounded-xl flex items-center gap-3">
                    <FiPhone size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[8px] text-slate-500 block uppercase tracking-wider">Phone</span>
                      <span className="text-xs text-slate-200">{business.phone}</span>
                    </div>
                  </div>
                )}
                {business.email && (
                  <div className="p-4 bg-[#0f1729] border border-white/5 rounded-xl flex items-center gap-3">
                    <FiMail size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[8px] text-slate-500 block uppercase tracking-wider">Email</span>
                      <span className="text-xs text-slate-200">{business.email}</span>
                    </div>
                  </div>
                )}
                {business.website && (
                  <div className="p-4 bg-[#0f1729] border border-white/5 rounded-xl flex items-center gap-3">
                    <FiGlobe size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[8px] text-slate-500 block uppercase tracking-wider">Website</span>
                      <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{business.website}</a>
                    </div>
                  </div>
                )}
                {business.address && (
                  <div className="p-4 bg-[#0f1729] border border-white/5 rounded-xl flex items-center gap-3">
                    <FiMapPin size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[8px] text-slate-500 block uppercase tracking-wider">Address</span>
                      <span className="text-xs text-slate-200">{business.address}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
                <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <FiClock size={12} /> Business Hours
                </h3>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-slate-500">Opening:</span>
                    <span className="text-slate-200 ml-2 font-bold">{business.openingHours}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Closing:</span>
                    <span className="text-slate-200 ml-2 font-bold">{business.closingHours}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                    <span key={day} className={`text-[8px] px-2 py-1 rounded-lg border ${(business.workingDays || []).includes(day) ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-slate-800 border-white/5 text-slate-600'}`}>
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Products Section */}
          {activeSection === 'products' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Store Products</h3>
              {business.products?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {business.products.map(p => (
                    <div key={p._id} className="p-4 bg-[#0f1729] border border-white/5 hover:border-blue-500/20 rounded-2xl flex flex-col justify-between gap-3 transition-all">
                      <div className="flex gap-3">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-16 h-16 rounded-xl border border-white/5 object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                            <FiPackage size={20} className="text-slate-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-200 truncate">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{p.description || 'No description available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <div>
                          <span className="text-[11px] font-bold text-blue-400">{formatPrice(p.price)}</span>
                          {p.stock > 0 ? (
                            <span className="text-[8px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 ml-2 font-semibold">IN STOCK ({p.stock})</span>
                          ) : (
                            <span className="text-[8px] text-slate-400 bg-[#0f172a] px-1.5 py-0.5 rounded border border-white/10 ml-2 font-semibold">OUT OF STOCK</span>
                          )}
                        </div>

                        <button
                          onClick={() => { setSelectedProduct(p); setPurchaseQty(1); setPurchaseNotes(''); setSelectedVariant(null); }}
                          disabled={p.stock <= 0}
                          className="py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 text-white font-bold text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <FiShoppingBag size={11} /> BUY NOW
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-[#0f1729] rounded-2xl border border-white/5">
                  <FiPackage size={28} className="mx-auto mb-2 opacity-40 text-blue-400" />
                  <p className="text-xs">No store products listed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Services Section */}
          {activeSection === 'services' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Services</h3>
              {business.services?.length > 0 ? business.services.map(s => (
                <div key={s._id} className="p-4 bg-[#0f1729] border border-white/5 hover:border-blue-500/20 rounded-2xl flex items-center gap-4 transition-all cursor-pointer"
                  onClick={() => navigate(`/business/${id}/book?service=${s._id}`)}>
                  <div className="w-14 h-14 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center shrink-0">
                    <FiGrid size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-200">{s.name}</h4>
                    {s.description && <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] font-bold text-blue-400">{formatPrice(s.price)}</span>
                      {s.duration && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon size={9} /> {s.duration} min</span>}
                    </div>
                  </div>
                  <FiChevronRight size={16} className="text-slate-600 shrink-0" />
                </div>
              )) : (
                <div className="text-center py-12 text-slate-500 bg-[#0f1729] rounded-2xl border border-white/5">
                  <FiGrid size={28} className="mx-auto mb-2 opacity-40 text-blue-400" />
                  <p className="text-xs">No services listed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Workshops Section */}
          {activeSection === 'workshops' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Workshops & Sessions</h3>
              {business.workshops?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {business.workshops.map(ws => {
                    const isEnrolled = currentUserId && (ws.attendees || []).includes(currentUserId);
                    const remainingCapacity = Math.max(0, ws.capacity - (ws.attendees || []).length);
                    const isUpcoming = ws.status === 'upcoming';
                    const isFull = remainingCapacity <= 0;

                    return (
                      <div key={ws._id} className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 transition-all">
                        <div className="flex gap-4 items-start flex-1 min-w-0">
                          {ws.imageUrl ? (
                            <img src={ws.imageUrl} alt="" className="w-20 h-20 rounded-xl border border-white/5 object-cover shrink-0 bg-slate-900" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                              <FiUsers size={28} />
                            </div>
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white leading-snug">{ws.title}</h4>
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400`}>
                                {(ws.status || 'upcoming').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{ws.description || 'No workshop description available'}</p>
                            {ws.instructor && (
                              <p className="text-[10px] text-blue-300 font-semibold flex items-center gap-1.5 pt-1">
                                <FiUser size={10} /> Instructor: {ws.instructor}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 pt-2 font-medium">
                              <span className="flex items-center gap-1"><FiCalendar size={11} className="text-slate-400" /> {new Date(ws.date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><FiClock size={11} className="text-slate-400" /> {ws.time} ({ws.duration} min)</span>
                              <span className="flex items-center gap-1"><FiUsers size={11} className="text-slate-400" /> {remainingCapacity} seats left</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex md:flex-col justify-between items-end md:justify-center border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 shrink-0 gap-3">
                          <div className="text-right">
                            <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Registration fee</span>
                            <span className="text-base font-bold text-blue-400">{ws.price > 0 ? `$${ws.price.toFixed(2)}` : 'FREE'}</span>
                          </div>
                          {isEnrolled ? (
                            <span className="py-1.5 px-4 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-xl flex items-center gap-1">
                              <FiCheck size={12} /> ENROLLED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleWorkshopEnroll(ws._id)}
                              disabled={isFull || !isUpcoming}
                              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-blue-500/10"
                            >
                              {isFull ? 'FULLY BOOKED' : !isUpcoming ? 'UNAVAILABLE' : 'ENROLL NOW'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-[#0f1729] rounded-2xl border border-white/5">
                  <FiUsers size={28} className="mx-auto mb-2 opacity-40 text-blue-400" />
                  <p className="text-xs">No active workshops or seminars listed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Events Section */}
          {activeSection === 'events' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Events</h3>
              {business.events?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {business.events.map(ev => {
                    const isRSVPed = currentUserId && (ev.rsvps || []).includes(currentUserId);
                    const remainingCapacity = Math.max(0, ev.capacity - (ev.rsvps || []).length);
                    const isFull = remainingCapacity <= 0;

                    return (
                      <div key={ev._id} className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 transition-all">
                        <div className="flex gap-4 items-start flex-1 min-w-0">
                          {ev.imageUrl ? (
                            <img src={ev.imageUrl} alt="" className="w-20 h-20 rounded-xl border border-white/5 object-cover shrink-0 bg-slate-900" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center shrink-0 text-purple-400">
                              <FiCalendar size={28} />
                            </div>
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white leading-snug">{ev.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{ev.description || 'No event details available'}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 pt-2 font-medium">
                              <span className="flex items-center gap-1"><FiCalendar size={11} className="text-slate-400" /> {new Date(ev.date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><FiClock size={11} className="text-slate-400" /> {ev.time}</span>
                              <span className="flex items-center gap-1"><FiMapPin size={11} className="text-slate-400" /> {ev.location || 'Online'}</span>
                              <span className="flex items-center gap-1"><FiUsers size={11} className="text-slate-400" /> {remainingCapacity} spots left</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex md:flex-col justify-between items-end md:justify-center border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 shrink-0 gap-3">
                          <div className="text-right">
                            <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Ticket Price</span>
                            <span className="text-base font-bold text-purple-400">{ev.price > 0 ? `$${ev.price.toFixed(2)}` : 'FREE'}</span>
                          </div>
                          {isRSVPed ? (
                            <span className="py-1.5 px-4 bg-purple-600/10 border border-purple-500/30 text-purple-400 font-bold text-[10px] rounded-xl flex items-center gap-1">
                              <FiCheck size={12} /> ATTENDING
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEventRSVP(ev._id)}
                              disabled={isFull}
                              className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-purple-500/10"
                            >
                              {isFull ? 'FULLY BOOKED' : 'RSVP / ATTEND'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-[#0f1729] rounded-2xl border border-white/5">
                  <FiCalendar size={28} className="mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-xs">No events listed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Section */}
          {activeSection === 'reviews' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Reviews</h3>
                {rating > 0 && (
                  <div className="flex items-center gap-1 text-sm font-bold text-white bg-slate-900 border border-white/5 px-2.5 py-1 rounded-xl">
                    <FiStar className="text-amber-400 fill-current" size={13} /> {rating} / 5
                  </div>
                )}
              </div>

              {/* Submit a Review Form */}
              <form onSubmit={handleReviewSubmit} className="p-5 bg-[#0f1729] border border-white/5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-200">Share Your Experience</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview(p => ({ ...p, rating: star }))}
                        className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                      >
                        <FiStar size={18} className={newReview.rating >= star ? 'text-amber-400 fill-current' : 'text-slate-600'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Your Review</label>
                  <textarea
                    value={newReview.comment}
                    onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))}
                    placeholder="Write your feedback..."
                    rows={3}
                    required
                    className="w-full bg-[#080c14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingReview ? 'Submitting...' : 'SUBMIT REVIEW'}
                </button>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviewsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((rev, idx) => (
                    <div key={idx} className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={rev.userId?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rev.userId?.username || 'user'}`}
                            alt=""
                            className="w-7 h-7 rounded-full border border-white/5 bg-slate-900 object-cover"
                          />
                          <div>
                            <span className="text-[11px] font-bold text-slate-200 block">{rev.userId?.name || 'Customer'}</span>
                            <span className="text-[9px] text-slate-500 block">@{rev.userId?.username || 'user'}</span>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <FiStar key={star} size={10} className={rev.rating >= star ? 'text-amber-400 fill-current' : 'text-slate-700'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-light pl-9">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 bg-[#0f1729] rounded-2xl border border-white/5">
                    <FiStar size={24} className="mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="text-xs">No reviews submitted yet. Be the first!</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic Product Checkout Modal Overlay */}
      {selectedProduct && (
        <div className="absolute inset-0 z-50 bg-[#030712]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f1729] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 bg-[#131b2e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiShoppingBag className="text-blue-400" size={16} />
                <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider">Confirm Purchase</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handlePurchase} className="p-5 space-y-4 overflow-y-auto no-scrollbar max-h-[80vh]">
              {/* Product Info Summary */}
              <div className="flex gap-3 p-3 bg-slate-950/45 border border-white/5 rounded-xl">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/5" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                    <FiPackage size={18} className="text-slate-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">{selectedProduct.name}</h4>
                  <span className="text-xs font-bold text-blue-400 block mt-0.5">{formatPrice(selectedProduct.price)}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Category: {selectedProduct.category || 'Default'}</span>
                </div>
              </div>

              {/* Product Variants (if exists) */}
              {selectedProduct.variants?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">Select Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.variants.map((v) => (
                      <button
                        key={v._id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition-all ${
                          selectedVariant?._id === v._id
                            ? 'border-blue-500 bg-blue-500/5 text-white'
                            : 'border-white/5 bg-slate-950/20 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <span className="block text-[8px] uppercase text-slate-500 font-bold">{v.name}</span>
                        <span className="block mt-0.5 truncate">{v.value}</span>
                        {v.price && <span className="block mt-0.5 text-blue-400 font-bold">${v.price.toFixed(2)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPurchaseQty(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className="text-xs font-bold text-white w-6 text-center">{purchaseQty}</span>
                  <button
                    type="button"
                    onClick={() => setPurchaseQty(q => Math.min(selectedProduct.stock || 99, q + 1))}
                    className="w-8 h-8 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <FiPlus size={12} />
                  </button>
                  <span className="text-[9px] text-slate-500">({selectedProduct.stock} items available)</span>
                </div>
              </div>

              {/* Order Notes */}
              <div className="space-y-1">
                <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">Order Notes</label>
                <textarea
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Size requirements, specific requests, delivery details..."
                  rows={2}
                  className="w-full bg-[#080c14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-500 resize-none"
                />
              </div>

              {/* Pricing Summary */}
              <div className="p-3 bg-slate-950/45 border border-white/5 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Unit Price</span>
                  <span>{formatPrice(selectedProduct.price)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Quantity</span>
                  <span>x {purchaseQty}</span>
                </div>
                {selectedVariant?.price && (
                  <div className="flex justify-between text-slate-400">
                    <span>Option Extra</span>
                    <span>+ ${selectedVariant.price.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/5 my-1.5" />
                <div className="flex justify-between text-white font-bold">
                  <span>Total Amount</span>
                  <span className="text-blue-400 text-sm">
                    ${((selectedProduct.price + (selectedVariant?.price || 0)) * purchaseQty).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Confirm / Action Button */}
              <button
                type="submit"
                disabled={purchasing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10"
              >
                {purchasing ? 'Processing Order...' : <><FiCheck size={13} /> PLACE ORDER</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPublicProfile;
