import React, { useState, useEffect } from 'react';
import { FiFile, FiLink, FiVideo, FiImage, FiPlus, FiX, FiTrash2, FiExternalLink, FiSearch, FiFolder } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = '/api/organizations';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } });

const TYPE_CONFIG = {
  Document: { icon: <FiFile size={16} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  Link:     { icon: <FiLink size={16} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  Video:    { icon: <FiVideo size={16} />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  Image:    { icon: <FiImage size={16} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

const defaultForm = { title: '', url: '', type: 'Link', description: '', tags: '' };

const OrgDocuments = ({ organizationId, canManage }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => { fetchDocs(); }, [organizationId]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/files`, getAuthHeaders());
      setDocs(res.data || []);
    } catch {
      try {
        const stored = JSON.parse(localStorage.getItem(`org_docs_${organizationId}`) || '[]');
        setDocs(stored);
      } catch { setDocs([]); }
    }
    finally { setLoading(false); }
  };

  const saveDocsLocally = (updated) => {
    setDocs(updated);
    localStorage.setItem(`org_docs_${organizationId}`, JSON.stringify(updated));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.url.trim()) { toast.error('URL is required'); return; }

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const newDoc = {
      _id: Date.now().toString(),
      title: form.title.trim(),
      url: form.url.trim(),
      type: form.type,
      description: form.description.trim(),
      tags,
      addedBy: 'You',
      createdAt: new Date().toISOString(),
    };

    try {
      await axios.post(`${API_BASE}/${organizationId}/files`, {
        name: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        description: form.description.trim(),
        tags,
      }, getAuthHeaders());
      toast.success('Resource added');
      fetchDocs();
    } catch {
      saveDocsLocally([newDoc, ...docs]);
      toast.success('Resource added');
    }

    setForm(defaultForm);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    saveDocsLocally(docs.filter(d => d._id !== id));
    toast.success('Resource removed');
  };

  const filtered = docs.filter(d => {
    const matchesSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || d.type === typeFilter || d.fileType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Resources & Documents ({docs.length})</h3>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="py-1 px-2 bg-emerald-500 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-400 transition-all">
            <FiPlus size={10} /> Add Resource
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:border-emerald-500/20 outline-none placeholder:text-slate-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500/20"
        >
          {['All', 'Document', 'Link', 'Video', 'Image'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-white/[0.01] border border-emerald-500/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Add Resource</h4>
            <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm); }} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"><FiX size={14} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title *" className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none focus:border-emerald-500/20">
              {['Document', 'Link', 'Video', 'Image'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <input required type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="URL (https://...) *" className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
          <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
          <input type="text" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma-separated, e.g. design, onboarding)" className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-emerald-400 transition-all">ADD RESOURCE</button>
        </form>
      )}

      {/* Doc list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">
          <FiFolder size={20} className="mx-auto mb-2 text-slate-600" />
          {docs.length === 0 ? 'No resources yet. Add documents, links, and files for your team.' : 'No resources match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const docType = doc.type || doc.fileType || 'Link';
            const cfg = TYPE_CONFIG[docType] || TYPE_CONFIG.Link;
            const tags = doc.tags || [];
            return (
              <div key={doc._id} className="p-3 bg-slate-900/20 border border-white/5 hover:border-emerald-500/20 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-200 truncate">{doc.title || doc.name}</p>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${cfg.color}`}>{docType}</span>
                    </div>
                    {doc.description && <p className="text-[9px] text-slate-500 truncate mt-0.5">{doc.description}</p>}
                    {tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {tags.map((tag, i) => (
                          <span key={i} className="text-[8px] bg-slate-800 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[8px] text-slate-600 mt-1">
                      Added by {doc.addedBy || 'You'} · {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                      className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      <FiExternalLink size={12} />
                    </button>
                    {canManage && (
                      <button onClick={() => handleDelete(doc._id)} className="p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all cursor-pointer">
                        <FiTrash2 size={12} />
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

export default OrgDocuments;
