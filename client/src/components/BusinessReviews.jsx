import React, { useState, useEffect } from 'react';
import { FiStar, FiRefreshCw, FiMessageSquare } from 'react-icons/fi';
import axios from 'axios';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const RatingStars = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24"
        fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
        stroke={i <= Math.round(rating) ? '#f59e0b' : '#475569'}
        strokeWidth="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ))}
  </div>
);

const BusinessReviews = ({ business }) => {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business?._id) fetchReviews(business._id);
  }, [business]);

  const fetchReviews = async (id) => {
    try {
      const res = await axios.get(`${API}/reviews/${id}`, { headers: headers() });
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.averageRating || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-xs text-slate-400 ml-3">Loading reviews...</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl flex items-center gap-6">
        <div className="text-center">
          <p className="text-5xl font-bold font-display text-amber-400">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
          <RatingStars rating={avgRating} size={18} />
          <p className="text-[9px] text-slate-500 mt-1">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
        </div>
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => Math.round(r.rating) === star).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[9px]">
                <span className="text-slate-500 w-3">{star}</span>
                <svg width={9} height={9} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-slate-600 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
            <FiStar size={22} className="text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">No reviews yet</p>
          <p className="text-[9px] text-slate-600 mt-1">Customer reviews will appear here once they rate your business</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review, i) => {
            const user = review.userId;
            const initial = (user?.name || user?.username || '?')[0].toUpperCase();
            return (
              <div key={review._id || i} className="p-4 bg-[#131b2e]/60 border border-white/5 hover:border-white/10 rounded-2xl space-y-2 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-200 truncate">{user?.name || user?.username || 'Anonymous'}</p>
                      <span className="text-[9px] text-slate-500 shrink-0">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <RatingStars rating={review.rating} size={12} />
                  </div>
                </div>
                {review.comment && (
                  <p className="text-[10px] text-slate-400 leading-relaxed pl-12">{review.comment}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BusinessReviews;
