import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiPlus, FiX, FiTrash2, FiCheckSquare, FiClock, FiUsers, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = '/api/organizations';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } });

const OrgPolls = ({ organizationId, canManage }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('active');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiry, setExpiry] = useState('');
  const [votedPolls, setVotedPolls] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`org_polls_voted_${organizationId}`) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => { fetchPolls(); }, [organizationId]);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/polls`, getAuthHeaders());
      setPolls(res.data || []);
    } catch {
      // Fallback to localStorage if API doesn't exist
      try {
        const stored = JSON.parse(localStorage.getItem(`org_polls_${organizationId}`) || '[]');
        setPolls(stored);
      } catch { setPolls([]); }
    }
    finally { setLoading(false); }
  };

  const savePollsLocally = (updated) => {
    setPolls(updated);
    localStorage.setItem(`org_polls_${organizationId}`, JSON.stringify(updated));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (!question.trim()) { toast.error('Question is required'); return; }
    if (validOptions.length < 2) { toast.error('At least 2 options are required'); return; }

    const newPoll = {
      _id: Date.now().toString(),
      question: question.trim(),
      options: validOptions.map(o => ({ text: o.trim(), votes: 0, voters: [] })),
      expiry: expiry || null,
      createdAt: new Date().toISOString(),
      totalVotes: 0,
    };

    try {
      await axios.post(`${API_BASE}/${organizationId}/polls`, {
        question: newPoll.question,
        options: validOptions,
        expiry: expiry || undefined,
      }, getAuthHeaders());
      toast.success('Poll created');
      fetchPolls();
    } catch {
      // Fallback to local
      savePollsLocally([newPoll, ...polls]);
      toast.success('Poll created');
    }

    setQuestion('');
    setOptions(['', '']);
    setExpiry('');
    setShowForm(false);
  };

  const handleVote = async (pollId, optionIndex) => {
    if (votedPolls[pollId] !== undefined) { toast.error('You already voted on this poll'); return; }

    try {
      await axios.post(`${API_BASE}/${organizationId}/polls/${pollId}/vote`, { optionIndex }, getAuthHeaders());
      toast.success('Vote cast!');
      fetchPolls();
    } catch {
      // Fallback: local vote
      const updated = polls.map(p => {
        if (p._id !== pollId) return p;
        const newOpts = p.options.map((opt, i) =>
          i === optionIndex ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        );
        return { ...p, options: newOpts, totalVotes: (p.totalVotes || 0) + 1 };
      });
      savePollsLocally(updated);
      toast.success('Vote cast!');
    }

    const newVoted = { ...votedPolls, [pollId]: optionIndex };
    setVotedPolls(newVoted);
    localStorage.setItem(`org_polls_voted_${organizationId}`, JSON.stringify(newVoted));
  };

  const handleDelete = (pollId) => {
    savePollsLocally(polls.filter(p => p._id !== pollId));
    toast.success('Poll deleted');
  };

  const isExpired = (expiry) => expiry && new Date(expiry) < new Date();

  const filtered = filter === 'active'
    ? polls.filter(p => !isExpired(p.expiry))
    : polls.filter(p => isExpired(p.expiry));

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Polls ({polls.length})</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchPolls} className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer">
            <FiRefreshCw size={11} />
          </button>
          {canManage && (
            <button onClick={() => setShowForm(true)} className="py-1 px-2 bg-emerald-500 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-400 transition-all">
              <FiPlus size={10} /> New Poll
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {['active', 'expired'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-all capitalize ${
              filter === tab ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {tab} ({tab === 'active' ? polls.filter(p => !isExpired(p.expiry)).length : polls.filter(p => isExpired(p.expiry)).length})
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-white/[0.01] border border-emerald-500/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Create Poll</h4>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"><FiX size={14} /></button>
          </div>
          <input
            type="text"
            required
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
          />
          <div className="space-y-2">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Options (min 2)</label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 bg-slate-900 border border-white/5 rounded-xl py-1.5 px-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"><FiX size={11} /></button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" onClick={() => setOptions([...options, ''])} className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer flex items-center gap-1">
                <FiPlus size={10} /> Add option
              </button>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Expiry (optional)</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900 border border-white/5 rounded-xl py-1.5 px-2.5 text-xs text-slate-200 outline-none" />
          </div>
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-emerald-400 transition-all">CREATE POLL</button>
        </form>
      )}

      {/* Poll list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">
            No {filter} polls.
          </div>
        ) : filtered.map(poll => {
          const total = poll.totalVotes || poll.options?.reduce((s, o) => s + (o.votes || 0), 0) || 0;
          const expired = isExpired(poll.expiry);
          const myVote = votedPolls[poll._id];
          const hasVoted = myVote !== undefined;

          return (
            <div key={poll._id} className="p-4 bg-slate-900/20 border border-white/5 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold text-slate-200">{poll.question}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {expired && <span className="text-[8px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">ENDED</span>}
                  {canManage && (
                    <button onClick={() => handleDelete(poll._id)} className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"><FiTrash2 size={11} /></button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(poll.options || []).map((opt, i) => {
                  const votes = opt.votes || 0;
                  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                  const isMyVote = myVote === i;
                  const canVote = !hasVoted && !expired;
                  return (
                    <button
                      key={i}
                      onClick={() => canVote && handleVote(poll._id, i)}
                      disabled={!canVote}
                      className={`w-full text-left transition-all ${canVote ? 'cursor-pointer hover:border-emerald-500/40' : 'cursor-default'}`}
                    >
                      <div className={`relative p-2.5 rounded-xl border overflow-hidden ${isMyVote ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-slate-950/30'}`}>
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-xl transition-all" style={{ width: (hasVoted || expired) ? `${pct}%` : '0%' }} />
                        <div className="relative flex items-center justify-between text-[10px]">
                          <span className={isMyVote ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{opt.text || opt}</span>
                          {(hasVoted || expired) && <span className={`font-bold ${isMyVote ? 'text-emerald-400' : 'text-slate-500'}`}>{pct}% ({votes})</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-500">
                <span className="flex items-center gap-1"><FiUsers size={9} />{total} votes</span>
                {poll.expiry && (
                  <span className="flex items-center gap-1">
                    <FiClock size={9} />
                    {expired ? 'Ended' : 'Ends'} {new Date(poll.expiry).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrgPolls;
