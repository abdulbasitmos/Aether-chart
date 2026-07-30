import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPackage, FiGrid, FiPlus, FiEdit3, FiTrash2, FiX, FiSearch,
  FiCheck, FiBarChart2, FiDollarSign, FiTag, FiImage, FiCamera,
  FiDownload, FiAlertCircle, FiInbox, FiLayers, FiArchive,
  FiClock, FiEye, FiStar, FiRefreshCw, FiBox, FiTrendingUp,
  FiUsers, FiUserPlus, FiShield, FiUser, FiCopy, FiActivity,
  FiMail, FiSend, FiSettings, FiChevronDown, FiKey, FiAlertOctagon
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

/* ── Role system ─────────────────────────────────────────── */
const ROLES = [
  { value: 'admin',   label: 'Admin',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: 'Full access to all workshop features' },
  { value: 'manager', label: 'Manager', color: 'text-blue-400   bg-blue-500/10   border-blue-500/30',   desc: 'Can add/edit products and manage inventory' },
  { value: 'editor',  label: 'Editor',  color: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/30',   desc: 'Can add and edit products only' },
  { value: 'viewer',  label: 'Viewer',  color: 'text-slate-400  bg-slate-700/30  border-white/10',       desc: 'Read-only access to workshop' },
];

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]));

const canEdit   = role => ['admin','manager','editor'].includes(role);
const canManage = role => ['admin','manager'].includes(role);
const isAdmin   = role => role === 'admin';

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft',     color: 'text-slate-400  bg-slate-800       border-slate-700' },
  { value: 'published', label: 'Published', color: 'text-blue-400   bg-blue-500/10     border-blue-500/30' },
  { value: 'archived',  label: 'Archived',  color: 'text-slate-500  bg-slate-800       border-slate-700' },
];

/* ── Micro components ─────────────────────────────────────── */
const Input = ({ label, value, onChange, placeholder, type='text', required, step, className='' }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">{label}</label>}
    <input type={type} value={value} onChange={onChange} required={required} step={step} placeholder={placeholder}
      className={`w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500 ${className}`} />
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, rows=2 }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500 resize-none" />
  </div>
);

const Empty = ({ icon, message, sub }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center select-none">
    <div className="p-3 rounded-full bg-[#0f1729] border border-white/5 mb-3">{icon || <FiInbox size={22} className="text-slate-600" />}</div>
    <p className="text-xs text-slate-400 font-medium">{message}</p>
    {sub && <p className="text-[9px] text-slate-500 mt-1">{sub}</p>}
  </div>
);

const RoleBadge = ({ role }) => {
  const r = ROLE_MAP[role] || ROLES[3];
  return <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${r.color}`}>{r.label.toUpperCase()}</span>;
};

/* ── Stat card ───────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color='text-blue-400', sub }) => (
  <div className="p-4 rounded-2xl border border-white/5 bg-[#0f1729] hover:border-blue-500/20 transition-all group">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <Icon size={15} className={`${color} group-hover:scale-110 transition-transform`} />
    </div>
    <span className="text-2xl font-black text-white font-display block">{value ?? '—'}</span>
    {sub && <span className="text-[9px] text-slate-500 mt-1 block">{sub}</span>}
  </div>
);

/* ─────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                             */
/* ─────────────────────────────────────────────────────────── */
const BusinessWorkshop = ({ business: initialBusiness }) => {
  const { user } = useAuth();

  /* ── Tabs ──────────────────────────────────────────────── */
  const [wsTab, setWsTab] = useState('catalog');

  /* ── Products ──────────────────────────────────────────── */
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearch]  = useState('');
  const [statusFilter, setFilter] = useState('all');
  const [selectedIds, setSelected]= useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [stats, setStats]         = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  /* ── Team / Members ────────────────────────────────────── */
  const [members, setMembers]       = useState([]);
  const [myRole, setMyRole]         = useState('admin'); // derived from business.members
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting]     = useState(false);

  /* ── Activity log (local) ──────────────────────────────── */
  const [activityLog, setActivityLog] = useState([]);

  /* ── Product form ──────────────────────────────────────── */
  const [form, setForm] = useState({
    name:'', description:'', price:'', category:'', image:'',
    sku:'', stock:0, status:'draft', weight:'', dimensions:'', tags:''
  });
  const [variantForm, setVariantForm] = useState({ name:'', value:'', price:'', stock:0 });

  /* ── Fetch data ────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const [prodRes, statsRes] = await Promise.all([
        axios.get(`${API}/products`,        { headers: headers() }),
        axios.get(`${API}/workshop-stats`,  { headers: headers() }),
      ]);
      setProducts(prodRes.data  || []);
      setStats(statsRes.data);
    } catch (err) {
      console.warn('Workshop fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/team`, { headers: headers() });
      setMembers(res.data || []);
      // Derive own role
      const me = (res.data || []).find(m => m.userId === user?._id || m.userId === user?.id);
      if (me) setMyRole(me.role);
      else setMyRole('admin'); // owner
    } catch {
      // No team endpoint yet — owner has full admin
      setMyRole('admin');
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    fetchMembers();
  }, [fetchData, fetchMembers]);

  /* ── Log activity (local helper) ──────────────────────── */
  const logActivity = (msg, icon = '📦') => {
    setActivityLog(prev => [
      { id: Date.now(), icon, msg, time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) },
      ...prev.slice(0, 19)
    ]);
  };

  /* ── Form helpers ──────────────────────────────────────── */
  const resetForm = () => {
    setForm({ name:'', description:'', price:'', category:'', image:'', sku:'', stock:0, status:'draft', weight:'', dimensions:'', tags:'' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { toast.error('Name and price required'); return; }
    try {
      const payload = {
        name: form.name, description: form.description,
        price: parseFloat(form.price), currency: 'USD',
        image: form.image, category: form.category,
        sku: form.sku, stock: parseInt(form.stock)||0,
        status: form.status, weight: form.weight,
        dimensions: form.dimensions,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      if (editId) {
        await axios.put(`${API}/products/${editId}`, payload, { headers: headers() });
        toast.success('Product updated');
        logActivity(`Updated product "${form.name}"`, '✏️');
      } else {
        await axios.post(`${API}/products`, payload, { headers: headers() });
        toast.success('Product added to catalog');
        logActivity(`Added product "${form.name}"`, '➕');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async id => {
    const p = products.find(x => x._id === id);
    try {
      await axios.delete(`${API}/products/${id}`, { headers: headers() });
      toast.success('Product deleted');
      logActivity(`Deleted product "${p?.name}"`, '🗑️');
      setSelectedProduct(null);
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const handleBatchStatus = async status => {
    if (!selectedIds.length) { toast.error('Select products first'); return; }
    try {
      await axios.put(`${API}/products/batch-status`, { productIds: selectedIds, status }, { headers: headers() });
      toast.success(`${selectedIds.length} products → ${status}`);
      logActivity(`Batch status set to "${status}" for ${selectedIds.length} products`, '⚡');
      setSelected([]);
      fetchData();
    } catch { toast.error('Batch update failed'); }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) { toast.error('Select products first'); return; }
    try {
      await axios.delete(`${API}/products/batch`, { data: { productIds: selectedIds }, headers: headers() });
      toast.success(`${selectedIds.length} products deleted`);
      logActivity(`Deleted ${selectedIds.length} products in batch`, '🗑️');
      setSelected([]);
      fetchData();
    } catch { toast.error('Batch delete failed'); }
  };

  const handleStockUpdate = async (productId, stock) => {
    try {
      await axios.put(`${API}/products/${productId}/stock`, { stock: parseInt(stock)||0 }, { headers: headers() });
      toast.success('Stock updated');
      logActivity(`Stock updated for product`, '📦');
      fetchData();
    } catch { toast.error('Stock update failed'); }
  };

  const handleAddVariant = async productId => {
    if (!variantForm.name || !variantForm.value) { toast.error('Name & value required'); return; }
    try {
      await axios.post(`${API}/products/${productId}/variants`,
        { name: variantForm.name, value: variantForm.value, price: parseFloat(variantForm.price)||0, stock: parseInt(variantForm.stock)||0 },
        { headers: headers() }
      );
      toast.success('Variant added');
      setVariantForm({ name:'', value:'', price:'', stock:0 });
      fetchData();
    } catch { toast.error('Variant add failed'); }
  };

  const handleDeleteVariant = async (productId, variantId) => {
    try {
      await axios.delete(`${API}/products/${productId}/variants/${variantId}`, { headers: headers() });
      toast.success('Variant deleted');
      fetchData();
    } catch { toast.error('Variant delete failed'); }
  };

  const handleAddImages = async (productId, images) => {
    try {
      await axios.put(`${API}/products/${productId}/images`, { images }, { headers: headers() });
      toast.success('Images updated');
      fetchData();
    } catch { toast.error('Image update failed'); }
  };

  const handleGenerateQR = async productId => {
    try {
      await axios.post(`${API}/products/${productId}/qr`, {}, { headers: headers() });
      toast.success('QR code generated');
      logActivity('Generated QR code for product', '🔲');
      fetchData();
    } catch { toast.error('QR generation failed'); }
  };

  /* ── Team management ─────────────────────────────────── */
  const handleInviteMember = async e => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      await axios.post(`${API}/team/invite`,
        { username: inviteUsername.trim(), role: inviteRole },
        { headers: headers() }
      );
      toast.success(`Invited @${inviteUsername} as ${inviteRole}`);
      logActivity(`Invited @${inviteUsername} with role "${inviteRole}"`, '👤');
      setInviteUsername('');
      setInviteRole('viewer');
      setShowInvite(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId, role) => {
    try {
      await axios.put(`${API}/team/${memberId}/role`, { role }, { headers: headers() });
      toast.success('Role updated');
      logActivity(`Updated member role to "${role}"`, '🔑');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Role update failed');
    }
  };

  const handleRemoveMember = async memberId => {
    try {
      await axios.delete(`${API}/team/${memberId}`, { headers: headers() });
      toast.success('Member removed');
      logActivity('Removed a team member', '🚫');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Remove failed');
    }
  };

  /* ── Helpers ─────────────────────────────────────────── */
  const fmt   = p => { const n = parseFloat(p); return isNaN(n) ? '—' : `$${n.toFixed(2)}`; };
  const toggleSelect    = id => setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleSelectAll = () => setSelected(prev => prev.length === filteredProducts.length ? [] : filteredProducts.map(p => p._id));

  const filteredProducts = products.filter(p => {
    const matchS = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) || (p.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchF = statusFilter === 'all' || p.status === statusFilter;
    return matchS && matchF;
  });

  const product = selectedProduct ? products.find(p => p._id === selectedProduct) : null;

  /* ── Tab config ──────────────────────────────────────── */
  const WS_TABS = [
    { key:'catalog',   label:'Catalog',    icon:<FiGrid size={13} /> },
    { key:'inventory', label:'Inventory',  icon:<FiBox size={13} /> },
    { key:'variants',  label:'Variants',   icon:<FiLayers size={13} /> },
    { key:'media',     label:'Media',      icon:<FiImage size={13} /> },
    { key:'sales',     label:'Analytics',  icon:<FiTrendingUp size={13} /> },
    { key:'qr',        label:'QR Codes',   icon:<FiCopy size={13} /> },
    { key:'team',      label:'Team',       icon:<FiUsers size={13} />, badge: members.length },
    { key:'activity',  label:'Activity',   icon:<FiActivity size={13} />, badge: activityLog.length || null },
  ];

  /* ── Stat cards ──────────────────────────────────────── */
  const statCards = [
    { label:'Products',  value:stats?.total       || 0,  icon:FiPackage,    color:'text-blue-400'  },
    { label:'Published', value:stats?.published    || 0,  icon:FiCheck,      color:'text-blue-400'  },
    { label:'Drafts',    value:stats?.drafts       || 0,  icon:FiClock,      color:'text-slate-400' },
    { label:'Low Stock', value:stats?.lowStock     || 0,  icon:FiAlertCircle,color:stats?.lowStock > 0 ? 'text-amber-400':'text-slate-400' },
    { label:'Inquiries', value:stats?.newInquiries || 0,  icon:FiMail,       color:stats?.newInquiries > 0 ? 'text-blue-400':'text-slate-400' },
    { label:'Team',      value:members.length || '—',     icon:FiUsers,      color:'text-purple-400' },
  ];

  /* ══════════════════════════════════════════════════════ */
  /*  TAB RENDERERS                                         */
  /* ══════════════════════════════════════════════════════ */

  /* ── CATALOG ─────────────────────────────────────────── */
  const renderCatalog = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={searchQuery} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, tag…"
            className="w-full pl-9 pr-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500" />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={statusFilter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-[10px] text-slate-300 outline-none cursor-pointer">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          {canEdit(myRole) && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
              <FiPlus size={12} /> ADD PRODUCT
            </button>
          )}
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.length > 0 && canManage(myRole) && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-blue-300 font-medium">{selectedIds.length} selected</span>
          <button onClick={() => handleBatchStatus('published')} className="py-1 px-3 bg-blue-600 text-white text-[9px] font-bold rounded-lg hover:bg-blue-700 transition-all cursor-pointer">Publish</button>
          <button onClick={() => handleBatchStatus('draft')}     className="py-1 px-3 bg-[#0f1729] border border-white/10 text-slate-300 text-[9px] font-bold rounded-lg cursor-pointer">Draft</button>
          <button onClick={() => handleBatchStatus('archived')}  className="py-1 px-3 bg-[#0f1729] border border-white/10 text-slate-300 text-[9px] font-bold rounded-lg cursor-pointer">Archive</button>
          <button onClick={handleBatchDelete}                     className="py-1 px-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-bold rounded-lg cursor-pointer">Delete</button>
          <button onClick={() => setSelected([])}                 className="py-1 px-3 text-slate-500 text-[9px] hover:text-white cursor-pointer">Clear</button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && canEdit(myRole) && (
        <form onSubmit={handleSubmit} className="p-5 bg-[#0a0e1a] border border-blue-500/20 rounded-2xl space-y-4 shadow-xl shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              {editId ? <FiEdit3 size={13} className="text-blue-400" /> : <FiPlus size={13} className="text-blue-400" />}
              {editId ? 'Edit Product' : 'New Product'}
            </h4>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"><FiX size={13} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Product Name *" value={form.name}        onChange={e => setForm(p => ({ ...p, name:        e.target.value }))} placeholder="e.g. Wireless Headphones" required />
            <Input label="Price *"        type="number" step="0.01" value={form.price}  onChange={e => setForm(p => ({ ...p, price:       e.target.value }))} placeholder="29.99" required />
            <Input label="SKU"            value={form.sku}         onChange={e => setForm(p => ({ ...p, sku:         e.target.value }))} placeholder="WH-001" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input label="Category" value={form.category}   onChange={e => setForm(p => ({ ...p, category:   e.target.value }))} placeholder="Electronics" />
            <Input label="Stock Qty" type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock:      e.target.value }))} placeholder="0" />
            <Input label="Weight (kg)" value={form.weight}  onChange={e => setForm(p => ({ ...p, weight:     e.target.value }))} placeholder="0.5" />
            <div className="space-y-1">
              <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <Input label="Image URL or Upload" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://…/product.jpg" />
          <Input label="Tags (comma separated)" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="electronics, wireless, audio" />
          <TextArea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief product description…" />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10">
            {editId ? 'UPDATE PRODUCT' : 'ADD TO CATALOG'}
          </button>
        </form>
      )}

      {/* Product list */}
      <div className="space-y-2">
        {filteredProducts.length > 0 ? (
          <>
            {/* Select-all row */}
            <div className="flex items-center gap-2 px-1 mb-1">
              <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-white/10 bg-[#0f1729] text-blue-600 cursor-pointer" />
              <span className="text-[9px] text-slate-500 font-medium">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredProducts.map(p => (
              <div key={p._id}
                className="p-4 bg-[#0f1729] border border-white/5 hover:border-blue-500/20 rounded-2xl flex items-center gap-4 group transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/5"
                onClick={() => setSelectedProduct(p._id)}>
                <div onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(p._id)} onChange={() => toggleSelect(p._id)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0f1729] text-blue-600 cursor-pointer" />
                </div>
                {p.image
                  ? <img src={p.image} alt="" className="w-12 h-12 rounded-xl border border-white/5 bg-[#0f1729] object-cover shrink-0" onError={e => e.target.style.display='none'} />
                  : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-white/5 flex items-center justify-center shrink-0"><FiPackage size={16} className="text-blue-400/50" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{p.name}</h4>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_OPTIONS.find(s => s.value === (p.status||'draft'))?.color || STATUS_OPTIONS[0].color}`}>
                      {(p.status||'draft').toUpperCase()}
                    </span>
                    {p.category && <span className="text-[8px] text-slate-500 bg-[#0a0e1a] px-1.5 py-0.5 rounded border border-white/5">{p.category}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-bold text-blue-400">{fmt(p.price)}</span>
                    {p.sku && <span className="text-[8px] text-slate-600">SKU: {p.sku}</span>}
                    {p.stock !== undefined && (
                      <span className={`text-[9px] font-medium ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {p.stock === 0 ? '⚠ Out of stock' : `Stock: ${p.stock}`}
                      </span>
                    )}
                    {(p.tags||[]).slice(0,3).map(t => (
                      <span key={t} className="text-[8px] text-blue-400/60 bg-blue-500/5 px-1.5 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                </div>
                {canEdit(myRole) && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditId(p._id); setForm({ name:p.name, description:p.description||'', price:p.price?.toString()||'', category:p.category||'', image:p.image||'', sku:p.sku||'', stock:p.stock||0, status:p.status||'draft', weight:p.weight||'', dimensions:p.dimensions||'', tags:(p.tags||[]).join(', ') }); setShowForm(true); }}
                      className="p-1.5 bg-[#0a0e1a] border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                      <FiEdit3 size={11} />
                    </button>
                    <button onClick={() => handleDelete(p._id)}
                      className="p-1.5 bg-[#0a0e1a] border border-white/5 hover:border-red-500/30 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer">
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          !showForm && <Empty icon={<FiPackage size={22} className="text-slate-600" />} message="No products found" sub="Add your first product or adjust filters" />
        )}
      </div>
    </div>
  );

  /* ── INVENTORY ───────────────────────────────────────── */
  const renderInventory = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FiBox}         label="Total Stock"    value={stats?.totalStock  || 0} />
        <StatCard icon={FiAlertCircle} label="Low Stock"      value={stats?.lowStock    || 0} color={stats?.lowStock > 0 ? 'text-amber-400' : 'text-slate-400'} />
        <StatCard icon={FiAlertOctagon} label="Out of Stock"  value={stats?.outOfStock  || 0} color={stats?.outOfStock > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatCard icon={FiBarChart2}   label="Categories"     value={[...new Set(products.map(p => p.category).filter(Boolean))].length} color="text-cyan-400" />
      </div>

      {/* Category breakdown */}
      {products.length > 0 && (
        <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
          <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Category Breakdown</h4>
          {[...new Set(products.map(p => p.category || 'Uncategorized'))].map(cat => {
            const catProducts = products.filter(p => (p.category || 'Uncategorized') === cat);
            const totalStock = catProducts.reduce((s, p) => s + (p.stock || 0), 0);
            const pct = Math.min(100, (catProducts.length / products.length) * 100);
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">{cat}</span>
                  <span className="text-slate-400">{catProducts.length} products · {totalStock} units</span>
                </div>
                <div className="h-1.5 bg-[#0a0e1a] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock adjustment table */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">Adjust Stock</h4>
        {products.filter(p => p.stock !== undefined).length > 0
          ? products.filter(p => p.stock !== undefined).map(p => (
              <div key={p._id} className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200">{p.name}</h4>
                  {p.sku && <span className="text-[8px] text-slate-600">SKU: {p.sku}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold mr-2 ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-blue-400'}`}>
                    {p.stock} in stock
                  </span>
                  {canManage(myRole) && (
                    <input type="number" min="0" defaultValue={p.stock||0}
                      onBlur={e => { const v = parseInt(e.target.value); if (v !== p.stock) handleStockUpdate(p._id, v); }}
                      className="w-20 px-2 py-1.5 bg-[#0a0e1a] border border-white/10 rounded-lg text-xs text-white text-center outline-none focus:border-blue-500/40" />
                  )}
                </div>
              </div>
            ))
          : <Empty icon={<FiBox size={22} className="text-slate-600" />} message="No products with stock tracking" sub="Add stock quantity when creating products" />
        }
      </div>
    </div>
  );

  /* ── VARIANTS ─────────────────────────────────────────── */
  const renderVariants = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Select Product</label>
        <select value={selectedProduct||''} onChange={e => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
          <option value="">Choose a product</option>
          {products.filter(p => p._id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      {product && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#0a0e1a] border border-blue-500/20 rounded-xl">
            <FiLayers size={14} className="text-blue-400" />
            <span className="text-xs text-slate-300">Managing variants for <strong className="text-white">{product.name}</strong></span>
          </div>
          {canEdit(myRole) && (
            <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Add Variant</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input label="Name"  value={variantForm.name}  onChange={e => setVariantForm(p => ({ ...p, name:  e.target.value }))} placeholder="Size" />
                <Input label="Value" value={variantForm.value} onChange={e => setVariantForm(p => ({ ...p, value: e.target.value }))} placeholder="Large" />
                <Input label="Price Add." type="number" step="0.01" value={variantForm.price} onChange={e => setVariantForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
                <Input label="Stock" type="number" value={variantForm.stock} onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))} placeholder="10" />
              </div>
              <button onClick={() => handleAddVariant(product._id)}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded-lg transition-all cursor-pointer">
                ADD VARIANT
              </button>
            </div>
          )}
          {product.variants?.length > 0
            ? <div className="space-y-2">
                {product.variants.map(v => (
                  <div key={v._id} className="p-3 bg-[#0f1729] border border-white/5 rounded-xl flex items-center gap-3">
                    <FiLayers size={13} className="text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-300 font-medium flex-1">{v.name}: <strong className="text-white">{v.value}</strong></span>
                    {v.price > 0 && <span className="text-[10px] text-blue-400 font-bold">+{fmt(v.price)}</span>}
                    <span className="text-[9px] text-slate-500">Stock: {v.stock||0}</span>
                    {canEdit(myRole) && (
                      <button onClick={() => handleDeleteVariant(product._id, v._id)}
                        className="ml-auto p-1 text-slate-500 hover:text-red-400 transition-all cursor-pointer">
                        <FiTrash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            : <Empty icon={<FiLayers size={20} className="text-slate-600" />} message="No variants yet" sub="Add size, color, or other product options" />
          }
        </div>
      )}
      {!product && <Empty icon={<FiLayers size={22} className="text-slate-600" />} message="Select a product to manage variants" />}
    </div>
  );

  /* ── MEDIA ────────────────────────────────────────────── */
  const renderMedia = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Select Product</label>
        <select value={selectedProduct||''} onChange={e => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
          <option value="">Choose a product</option>
          {products.filter(p => p._id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      {product ? (
        <div className="space-y-3">
          <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl">
            <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-3">Product Gallery — {product.name}</h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {(product.images?.length > 0 ? product.images : product.image ? [product.image] : []).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl border border-white/5 overflow-hidden bg-[#080c14] group relative">
                  <img src={img} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <FiEye size={14} className="text-white" />
                  </div>
                </div>
              ))}
              {canEdit(myRole) && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/30 flex flex-col items-center justify-center cursor-pointer transition-all bg-[#080c14] gap-1">
                  <FiCamera size={16} className="text-slate-500" />
                  <span className="text-[8px] text-slate-500">Upload</span>
                  <input type="file" accept="image/*" className="hidden" multiple
                    onChange={async e => {
                      const files = Array.from(e.target.files);
                      const urls = files.map(f => URL.createObjectURL(f));
                      const existing = product.images || (product.image ? [product.image] : []);
                      await handleAddImages(product._id, [...existing, ...urls]);
                    }} />
                </label>
              )}
            </div>
            {(product.images?.length || 0) === 0 && !product.image && (
              <p className="text-[10px] text-slate-500 mt-2">No images uploaded yet. Upload images to display them in the public catalog.</p>
            )}
          </div>
        </div>
      ) : (
        <Empty icon={<FiImage size={22} className="text-slate-600" />} message="Select a product to manage its gallery" />
      )}
    </div>
  );

  /* ── ANALYTICS (Sales) ───────────────────────────────── */
  const renderSales = () => {
    const totalValue = products.filter(p => p.status === 'published').reduce((s, p) => s + (parseFloat(p.price) || 0) * (p.stock || 0), 0);
    const avgPrice   = products.length ? products.reduce((s, p) => s + (parseFloat(p.price)||0), 0) / products.length : 0;
    const topProducts = [...products].sort((a, b) => (parseFloat(b.price)||0) - (parseFloat(a.price)||0)).slice(0, 5);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={FiDollarSign}  label="Catalog Value"   value={`$${totalValue.toFixed(0)}`}  color="text-blue-400"   sub="Published × stock" />
          <StatCard icon={FiTrendingUp}  label="Avg Price"       value={`$${avgPrice.toFixed(2)}`}    color="text-cyan-400"   sub="Across all products" />
          <StatCard icon={FiMail}        label="Inquiries"       value={stats?.newInquiries || 0}      color="text-purple-400" sub="Pending responses" />
        </div>

        {/* Top products by price */}
        <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
          <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <FiStar size={12} /> Top Products by Value
          </h4>
          {topProducts.length > 0 ? topProducts.map((p, i) => (
            <div key={p._id} className="flex items-center gap-3">
              <span className="text-[10px] text-slate-600 w-4 shrink-0 font-bold">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-300 truncate font-medium">{p.name}</p>
                <div className="h-1 bg-[#0a0e1a] rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                    style={{ width: `${(parseFloat(p.price)||0) / (parseFloat(topProducts[0]?.price)||1) * 100}%` }} />
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-400 shrink-0">{fmt(p.price)}</span>
            </div>
          )) : <p className="text-[10px] text-slate-500">No products added yet</p>}
        </div>

        {/* Status distribution */}
        <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
          <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Status Distribution</h4>
          {['published','draft','archived'].map(s => {
            const count = products.filter(p => (p.status||'draft') === s).length;
            const pct = products.length ? (count/products.length*100) : 0;
            const colors = { published:'from-blue-600 to-blue-400', draft:'from-slate-600 to-slate-500', archived:'from-slate-700 to-slate-600' };
            return (
              <div key={s} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300 capitalize">{s}</span>
                  <span className="text-slate-400">{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 bg-[#0a0e1a] rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${colors[s]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── QR ──────────────────────────────────────────────── */
  const renderQR = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Select Product</label>
        <select value={selectedProduct||''} onChange={e => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
          <option value="">Choose a product</option>
          {products.filter(p => p._id).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      {product ? (
        <div className="p-6 bg-[#0f1729] border border-white/5 rounded-2xl text-center space-y-4">
          {product.qrCode ? (
            <>
              <div className="p-4 bg-white rounded-2xl w-44 h-44 mx-auto flex items-center justify-center">
                <img src={product.qrCode} alt="QR Code" className="w-full h-full object-contain" />
              </div>
              <p className="text-[10px] text-slate-400">Scan to view <strong className="text-white">{product.name}</strong> product page</p>
              <a href={product.qrCode} download className="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                <FiDownload size={13} /> DOWNLOAD QR
              </a>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center">
                <FiCopy size={28} className="text-slate-600" />
              </div>
              <p className="text-xs text-slate-400">No QR code generated yet for <strong className="text-white">{product.name}</strong></p>
              {canManage(myRole) && (
                <button onClick={() => handleGenerateQR(product._id)}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                  GENERATE QR CODE
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <Empty icon={<FiCopy size={22} className="text-slate-600" />} message="Select a product to manage its QR code" />
      )}
    </div>
  );

  /* ── TEAM ────────────────────────────────────────────── */
  const renderTeam = () => (
    <div className="space-y-4">
      {/* Header + invite */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white">Workshop Team</h4>
          <p className="text-[9px] text-slate-400 mt-0.5">Manage who has access to this workshop and their roles</p>
        </div>
        {isAdmin(myRole) && (
          <button onClick={() => setShowInvite(v => !v)}
            className="flex items-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/20">
            <FiUserPlus size={12} /> INVITE
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && isAdmin(myRole) && (
        <form onSubmit={handleInviteMember} className="p-4 bg-[#0a0e1a] border border-blue-500/20 rounded-2xl space-y-3">
          <h5 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <FiUserPlus size={11} /> Invite Team Member
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input label="Username" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="@username" required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-blue-300 font-bold uppercase tracking-wider block">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none cursor-pointer">
                {ROLES.filter(r => r.value !== 'admin').map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Role descriptions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLES.map(r => (
              <div key={r.value} className={`p-2 rounded-lg border ${inviteRole === r.value ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-[#0f1729]'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <RoleBadge role={r.value} />
                </div>
                <p className="text-[8px] text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={inviting}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
              {inviting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={12} />}
              {inviting ? 'Sending…' : 'SEND INVITE'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)}
              className="px-4 py-2 bg-[#0f1729] border border-white/10 text-slate-300 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROLES.map(r => (
          <div key={r.value} className="p-3 rounded-xl bg-[#0f1729] border border-white/5">
            <RoleBadge role={r.value} />
            <p className="text-[8px] text-slate-500 mt-1.5">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {/* Owner card */}
        <div className="p-4 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-blue-500/15 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initialBusiness?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{initialBusiness?.name || 'Business Owner'}</p>
            <p className="text-[9px] text-slate-400">Account Owner</p>
          </div>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full border text-purple-400 bg-purple-500/10 border-purple-500/30">OWNER</span>
        </div>

        {members.length > 0 ? members.map(m => (
          <div key={m._id || m.userId} className="p-4 bg-[#0f1729] border border-white/5 hover:border-white/10 rounded-2xl flex items-center gap-3 transition-all group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {m.name?.charAt(0)?.toUpperCase() || m.username?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{m.name || m.username}</p>
              <p className="text-[9px] text-slate-500">@{m.username}</p>
            </div>
            <RoleBadge role={m.role} />
            {isAdmin(myRole) && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <select
                  value={m.role}
                  onChange={e => handleChangeRole(m._id || m.userId, e.target.value)}
                  className="px-2 py-1 bg-[#0a0e1a] border border-white/10 rounded-lg text-[9px] text-slate-300 outline-none cursor-pointer">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button onClick={() => handleRemoveMember(m._id || m.userId)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer">
                  <FiTrash2 size={11} />
                </button>
              </div>
            )}
          </div>
        )) : (
          <div className="p-6 border border-dashed border-white/5 rounded-2xl text-center space-y-2">
            <FiUsers size={22} className="text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No team members yet</p>
            <p className="text-[9px] text-slate-500">Invite colleagues to collaborate on your workshop</p>
          </div>
        )}
      </div>
    </div>
  );

  /* ── ACTIVITY ────────────────────────────────────────── */
  const renderActivity = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white">Workshop Activity Log</h4>
        {activityLog.length > 0 && (
          <button onClick={() => setActivityLog([])}
            className="text-[9px] text-slate-500 hover:text-red-400 transition-all cursor-pointer">Clear</button>
        )}
      </div>
      {activityLog.length > 0 ? (
        <div className="space-y-2">
          {activityLog.map(log => (
            <div key={log.id} className="p-3 bg-[#0f1729] border border-white/5 rounded-xl flex items-start gap-3">
              <span className="text-base shrink-0">{log.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-300">{log.msg}</p>
                <p className="text-[8px] text-slate-600 mt-0.5">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<FiActivity size={22} className="text-slate-600" />}
          message="No activity yet"
          sub="Actions like adding products, updating stock, or inviting team will show here" />
      )}

      {/* Recent products added */}
      {products.length > 0 && (
        <div className="p-4 bg-[#0f1729] border border-white/5 rounded-2xl space-y-3">
          <h5 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Recent Products</h5>
          {[...products].reverse().slice(0, 5).map(p => (
            <div key={p._id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0a0e1a] border border-white/5 flex items-center justify-center shrink-0">
                {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover rounded-lg" onError={e => e.target.style.display='none'} /> : <FiPackage size={13} className="text-slate-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-300 font-medium truncate">{p.name}</p>
                <p className="text-[8px] text-slate-500">{fmt(p.price)} · {p.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Router ──────────────────────────────────────────── */
  const renderTabContent = () => {
    switch (wsTab) {
      case 'catalog':   return renderCatalog();
      case 'inventory': return renderInventory();
      case 'variants':  return renderVariants();
      case 'media':     return renderMedia();
      case 'sales':     return renderSales();
      case 'qr':        return renderQR();
      case 'team':      return renderTeam();
      case 'activity':  return renderActivity();
      default:          return renderCatalog();
    }
  };

  /* ─────────────────────────────────────────────────────── */
  /*  RENDER                                                 */
  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white font-display flex items-center gap-2">
            <FiPackage size={15} className="text-blue-400" /> Product Workshop
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400">{(ROLE_MAP[myRole]?.label || 'Owner').toUpperCase()}</span>
          </h3>
          <p className="text-[9px] text-slate-400 mt-0.5">Manage products, team, inventory and analytics for your business</p>
        </div>
        <button onClick={fetchData}
          className="p-2 bg-[#0f1729] border border-white/5 rounded-lg text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all cursor-pointer" title="Refresh">
          <FiRefreshCw size={13} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statCards.map(s => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#0b0f19] p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar gap-0.5">
        {WS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setWsTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              wsTab === tab.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}>
            {tab.icon} {tab.label}
            {tab.badge > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold ${wsTab === tab.key ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading workshop…</span>
          </div>
        ) : renderTabContent()}
      </div>
    </div>
  );
};

export default BusinessWorkshop;
