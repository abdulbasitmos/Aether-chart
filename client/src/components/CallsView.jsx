import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { 
  FiPhone, FiVideo, FiSearch, FiPhoneCall, FiPhoneMissed, 
  FiClock, FiTrash2, FiPlus, FiGrid, FiArrowUpRight, FiArrowDownLeft 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CallsView = () => {
  const { callHistory, initiateCall, clearChatHistory } = useChat();
  const [filter, setFilter] = useState('all'); // 'all' | 'missed'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Simulate skeleton loader
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [filter]);

  const filteredCalls = callHistory.filter(call => {
    const matchesSearch = call.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'missed' && call.missed);
    return matchesSearch && matchesFilter;
  });

  const getCallDirectionIcon = (status) => {
    if (status === 'outgoing') {
      return <FiArrowUpRight className="text-blue-400" size={14} />;
    } else if (status === 'incoming') {
      return <FiArrowDownLeft className="text-blue-400" size={14} />;
    } else {
      return <FiPhoneMissed className="text-white/40" size={14} />;
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center select-none">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Call Logs</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">View and manage your voice and video call logs</p>
          </div>
          
          <button 
            onClick={() => toast.success('Select a contact from your chats to start a live call.')}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <FiPlus size={18} /> New Call
          </button>

        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><FiSearch size={18} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search call logs..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-blue-500/40 outline-none placeholder:text-slate-500 transition-colors"
            />

          </div>

          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
            {['all', 'missed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-1.5 px-4 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === f 
                    ? 'bg-slate-900 border border-white/5 text-blue-400' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f} Calls
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Call History Content */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar z-10">
        {loading ? (
          // Skeleton loaders
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between animate-pulse animate-duration-1000 relative overflow-hidden shimmer-wrapper">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-900 rounded-full" />
                  <div className="space-y-2">
                    <div className="w-24 h-3 bg-slate-900 rounded" />
                    <div className="w-32 h-2.5 bg-slate-900 rounded" />
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-900 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredCalls.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <AnimatePresence>
              {filteredCalls.map((call) => (
                <motion.div
                  key={call.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between transition-all group hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar */}
                    <div className="relative select-none shrink-0">
                      <img src={call.avatar} alt={call.name} className="w-11 h-11 rounded-full border border-white/5" />
                      <div className={`absolute bottom-0 right-0 p-1 rounded-full border border-slate-950 bg-slate-900`}>
                        {getCallDirectionIcon(call.status)}
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 font-display flex items-center gap-1.5">
                        {call.name}
                        {call.missed && <span className="py-0.5 px-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] rounded-md font-semibold select-none">Missed</span>}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <FiClock size={11} />
                        <span>{call.date}</span>
                        <span>•</span>
                        <span className="capitalize">{call.type} Call</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => initiateCall(call.userId, call.name, call.avatar, 'voice')}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 border border-white/5 active:scale-90 transition-all cursor-pointer"
                      title="Audio Call"
                    >
                      <FiPhone size={16} />
                    </button>
                    <button
                      onClick={() => initiateCall(call.userId, call.name, call.avatar, 'video')}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 border border-white/5 active:scale-90 transition-all cursor-pointer"
                      title="Video Call"
                    >
                      <FiVideo size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-12 h-12 bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center mb-4 text-slate-600">
              <FiPhone size={26} />
            </div>
            <h4 className="text-sm font-semibold text-slate-400">No calls found</h4>
            <p className="text-slate-600 text-xs mt-1 max-w-[200px] leading-relaxed">
              {searchQuery ? "Try searching for a different user or adjust filters." : "Your outgoing and incoming calls log will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Footer statistics */}
      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Call history logs are stored securely on this endpoint device.
      </div>
    </div>
  );
};

export default CallsView;
