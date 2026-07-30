import React, { useState, useEffect, useRef } from 'react';
import {
  FiBarChart2, FiPackage, FiGrid, FiCalendar, FiClock, FiSettings,
  FiPlus, FiEdit3, FiTrash2, FiCheck, FiX, FiArrowLeft, FiAlertCircle,
  FiUser, FiPhone, FiMail, FiMapPin, FiStar, FiDollarSign, FiClock as FiClockIcon,
  FiSun, FiMoon, FiToggleLeft, FiActivity, FiRefreshCw, FiMinus, FiPlusCircle,
  FiCheckCircle, FiXCircle, FiChevronRight, FiChevronLeft, FiInfo, FiTag, FiInbox, FiBriefcase,
  FiMessageSquare, FiUsers, FiSend, FiUploadCloud, FiImage
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';
import LocationPicker from './LocationPicker';
import BusinessProfileMap from './BusinessProfileMap';
import BusinessQuickReplies from './BusinessQuickReplies';
import BusinessStaff from './BusinessStaff';
import BusinessAnalytics from './BusinessAnalytics';
import BusinessBroadcast from './BusinessBroadcast';
import BusinessWorkshop from './BusinessWorkshop';
import BusinessSetupWizard from './BusinessSetupWizard';

const API = '/api/business';
const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` });

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'closed', label: 'Closed', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'busy', label: 'Busy', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'on_break', label: 'On Break', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'holiday', label: 'Holiday', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
];

const TABS = [
  { key: 'overview', label: 'Overview', icon: <FiBarChart2 size={16} /> },
  { key: 'workshop', label: 'Store (Inventory)', icon: <FiPackage size={16} /> },
  { key: 'workshops-mgt', label: 'Workshops', icon: <FiUsers size={16} /> },
  { key: 'events-mgt', label: 'Events', icon: <FiCalendar size={16} /> },
  { key: 'products', label: 'Products', icon: <FiTag size={16} /> },
  { key: 'services', label: 'Services', icon: <FiGrid size={16} /> },
  { key: 'appointments', label: 'Appointments', icon: <FiCalendar size={16} /> },
  { key: 'availability', label: 'Availability', icon: <FiClock size={16} /> },
  { key: 'quick-replies', label: 'Quick Replies', icon: <FiMessageSquare size={16} /> },
  { key: 'staff', label: 'Staff', icon: <FiUsers size={16} /> },
  { key: 'analytics', label: 'Analytics', icon: <FiBarChart2 size={16} /> },
  { key: 'broadcast', label: 'Broadcast', icon: <FiSend size={16} /> },
  { key: 'settings', label: 'Settings', icon: <FiSettings size={16} /> },
];

const InputField = ({ label, value, onChange, placeholder, type = 'text', required, maxLength }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      maxLength={maxLength}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500"
    />
  </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 2 }) => (
  <div className="space-y-1">
    {label && <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white focus:border-blue-500/40 outline-none placeholder:text-slate-500 resize-none"
    />
  </div>
);

const EmptyState = ({ icon, message, sub }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center select-none">
    <div className="p-3 rounded-full bg-slate-900 border border-white/5 mb-3">
      {icon || <FiInbox size={22} className="text-slate-600" />}
    </div>
    <p className="text-xs text-slate-500 font-medium">{message}</p>
    {sub && <p className="text-[9px] text-slate-600 mt-1">{sub}</p>}
  </div>
);

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const [registerForm, setRegisterForm] = useState({ businessName: '', category: '', description: '', phone: '', email: '', website: '', address: '', openingHours: '09:00', closingHours: '18:00', workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] });

  const [products, setProducts] = useState([]);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', imageUrl: '', category: '' });
  const productImageRef = useRef(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [productImageUploading, setProductImageUploading] = useState(false);

  // Handle product image file selection → preview + upload to Cloudinary
  const handleProductImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (ev) => setProductImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    setProductImageUploading(true);
    try {
      const base64 = await new Promise((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.readAsDataURL(file);
      });
      const token = sessionStorage.getItem('aether_token');
      const response = await axios.post('/api/upload', {
        fileData: base64,
        fileName: file.name,
        mimeType: file.type
      }, { headers: { Authorization: `Bearer ${token}` } });
      const uploadedUrl = response.data.url;
      setProductForm(p => ({ ...p, imageUrl: uploadedUrl }));
      setProductImagePreview(uploadedUrl);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Image upload failed');
      setProductImagePreview('');
      setProductForm(p => ({ ...p, imageUrl: '' }));
    } finally {
      setProductImageUploading(false);
    }
  };

  const [services, setServices] = useState([]);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', duration: '', price: '' });

  const [appointments, setAppointments] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [workshopFormOpen, setWorkshopFormOpen] = useState(false);
  const [editWorkshopId, setEditWorkshopId] = useState(null);
  const [workshopForm, setWorkshopForm] = useState({ title: '', description: '', instructor: '', date: '', time: '', duration: 60, price: 0, capacity: 20, imageUrl: '', status: 'upcoming' });

  const [events, setEvents] = useState([]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editEventId, setEditEventId] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: '', time: '', location: 'Online', price: 0, capacity: 100, imageUrl: '' });

  const [availabilityStatus, setAvailabilityStatus] = useState('open');

  const [settingsForm, setSettingsForm] = useState({
    businessName: '', category: '', description: '', email: '', phone: '', website: '', address: '', autoReplyMessage: '', logo: '', coverImage: '', location: null
  });

  useEffect(() => {
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile`, { headers: headers() });
      const data = res.data;
      setBusiness(data);
      setAvailabilityStatus(data.availabilityStatus || 'open');
      setSettingsForm({
        businessName: data.businessName || '',
        category: data.category || '',
        description: data.description || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        autoReplyMessage: data.autoReplyMessage || '',
        logo: data.logo || '',
        coverImage: data.coverImage || '',
        location: data.location || null,
      });
      fetchProducts();
      fetchServices();
      fetchAppointments();
      fetchWorkshops();
      fetchEvents();
      if (!data.businessName?.trim() || !data.description?.trim()) {
        setNeedsSetup(true);
      } else {
        setNeedsSetup(false);
      }
      setShowRegister(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setShowRegister(true);
      } else if (err.response?.status !== 401) {
        console.warn('Failed to fetch business profile:', err);
        setFetchError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    try {
      const res = await axios.post(`${API}/register`, registerForm, { headers: headers() });
      toast.success('Business profile created!');
      fetchBusinessProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create business profile');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products`, { headers: headers() });
      setProducts(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch products:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API}/services`, { headers: headers() });
      setServices(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch services:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${API}/appointments`, { headers: headers() });
      setAppointments(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch appointments:', err);
    }
  };

  const fetchWorkshops = async () => {
    try {
      const res = await axios.get(`${API}/workshops`, { headers: headers() });
      setWorkshops(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch workshops:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`, { headers: headers() });
      setEvents(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch events:', err);
    }
  };

  const resetWorkshopForm = () => {
    setWorkshopForm({ title: '', description: '', instructor: '', date: '', time: '', duration: 60, price: 0, capacity: 20, imageUrl: '', status: 'upcoming' });
    setEditWorkshopId(null);
    setWorkshopFormOpen(false);
  };

  const handleWorkshopSubmit = async (e) => {
    e.preventDefault();
    if (!workshopForm.title.trim() || !workshopForm.date || !workshopForm.time) {
      toast.error('Title, date and time are required');
      return;
    }
    try {
      const payload = {
        title: workshopForm.title,
        description: workshopForm.description,
        instructor: workshopForm.instructor,
        date: workshopForm.date,
        time: workshopForm.time,
        duration: parseInt(workshopForm.duration) || 60,
        price: parseFloat(workshopForm.price) || 0,
        capacity: parseInt(workshopForm.capacity) || 20,
        imageUrl: workshopForm.imageUrl,
        status: workshopForm.status
      };
      if (editWorkshopId) {
        await axios.put(`${API}/workshops/${editWorkshopId}`, payload, { headers: headers() });
        toast.success('Workshop updated');
      } else {
        await axios.post(`${API}/workshops`, payload, { headers: headers() });
        toast.success('Workshop added');
      }
      resetWorkshopForm();
      fetchWorkshops();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save workshop');
    }
  };

  const handleEditWorkshop = (ws) => {
    setWorkshopForm({
      title: ws.title || '',
      description: ws.description || '',
      instructor: ws.instructor || '',
      date: ws.date ? new Date(ws.date).toISOString().split('T')[0] : '',
      time: ws.time || '',
      duration: ws.duration || 60,
      price: ws.price || 0,
      capacity: ws.capacity || 20,
      imageUrl: ws.imageUrl || '',
      status: ws.status || 'upcoming'
    });
    setEditWorkshopId(ws._id);
    setWorkshopFormOpen(true);
  };

  const handleDeleteWorkshop = async (id) => {
    try {
      await axios.delete(`${API}/workshops/${id}`, { headers: headers() });
      toast.success('Workshop deleted');
      fetchWorkshops();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete workshop');
    }
  };

  const resetEventForm = () => {
    setEventForm({ title: '', description: '', date: '', time: '', location: 'Online', price: 0, capacity: 100, imageUrl: '' });
    setEditEventId(null);
    setEventFormOpen(false);
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.time) {
      toast.error('Title, date and time are required');
      return;
    }
    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        time: eventForm.time,
        location: eventForm.location,
        price: parseFloat(eventForm.price) || 0,
        capacity: parseInt(eventForm.capacity) || 100,
        imageUrl: eventForm.imageUrl
      };
      if (editEventId) {
        await axios.put(`${API}/events/${editEventId}`, payload, { headers: headers() });
        toast.success('Event updated');
      } else {
        await axios.post(`${API}/events`, payload, { headers: headers() });
        toast.success('Event added');
      }
      resetEventForm();
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event');
    }
  };

  const handleEditEvent = (ev) => {
    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : '',
      time: ev.time || '',
      location: ev.location || 'Online',
      price: ev.price || 0,
      capacity: ev.capacity || 100,
      imageUrl: ev.imageUrl || ''
    });
    setEditEventId(ev._id);
    setEventFormOpen(true);
  };

  const handleDeleteEvent = async (id) => {
    try {
      await axios.delete(`${API}/events/${id}`, { headers: headers() });
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', imageUrl: '', category: '' });
    setProductImagePreview('');
    setProductImageUploading(false);
    if (productImageRef.current) productImageRef.current.value = '';
    setEditProductId(null);
    setProductFormOpen(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      toast.error('Product name and price are required');
      return;
    }
    try {
      const payload = { name: productForm.name, description: productForm.description, price: parseFloat(productForm.price), currency: 'USD', image: productForm.imageUrl, category: productForm.category };
      if (editProductId) {
        await axios.put(`${API}/products/${editProductId}`, payload, { headers: headers() });
        toast.success('Product updated');
      } else {
        await axios.post(`${API}/products`, payload, { headers: headers() });
        toast.success('Product added');
      }
      resetProductForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleEditProduct = (product) => {
    setProductImagePreview(product.image || '');
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      imageUrl: product.image || '',
      category: product.category || '',
    });
    setEditProductId(product._id);
    setProductFormOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`${API}/products/${id}`, { headers: headers() });
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const resetServiceForm = () => {
    setServiceForm({ name: '', description: '', duration: '', price: '' });
    setEditServiceId(null);
    setServiceFormOpen(false);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.price) {
      toast.error('Service name and price are required');
      return;
    }
    try {
      const payload = { name: serviceForm.name, description: serviceForm.description, duration: parseInt(serviceForm.duration) || 60, price: parseFloat(serviceForm.price), currency: 'USD' };
      if (editServiceId) {
        await axios.put(`${API}/services/${editServiceId}`, payload, { headers: headers() });
        toast.success('Service updated');
      } else {
        await axios.post(`${API}/services`, payload, { headers: headers() });
        toast.success('Service added');
      }
      resetServiceForm();
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save service');
    }
  };

  const handleEditService = (service) => {
    setServiceForm({
      name: service.name || '',
      description: service.description || '',
      duration: service.duration?.toString() || '',
      price: service.price?.toString() || '',
    });
    setEditServiceId(service._id);
    setServiceFormOpen(true);
  };

  const handleDeleteService = async (id) => {
    try {
      await axios.delete(`${API}/services/${id}`, { headers: headers() });
      toast.success('Service deleted');
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete service');
    }
  };

  const handleAppointmentAction = async (id, newStatus) => {
    try {
      await axios.put(`${API}/appointments/${id}`, { status: newStatus }, { headers: headers() });
      toast.success(`Appointment ${newStatus}`);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${newStatus} appointment`);
    }
  };

  const handleAvailabilitySave = async () => {
    try {
      await axios.put(`${API}/availability`, { status: availabilityStatus }, { headers: headers() });
      toast.success('Availability status saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save availability');
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    if (!settingsForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    try {
      const location = settingsForm.location?.lat && settingsForm.location?.lng
        ? { type: 'Point', coordinates: [settingsForm.location.lng, settingsForm.location.lat] }
        : undefined;
      await axios.put(`${API}/profile`, { ...settingsForm, location }, { headers: headers() });
      toast.success('Business profile updated');
      fetchBusinessProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update business profile');
    }
  };

  const toggleWorkingDay = (day) => {
    setRegisterForm(prev => {
      const days = prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: days };
    });
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return isNaN(num) ? '\u2014' : `$${num.toFixed(2)}`;
  };

  const renderRegisterForm = () => (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <FiBriefcase size={28} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold font-display text-white">Create Your Business Profile</h3>
        <p className="text-[10px] text-slate-500">Set up your business dashboard to manage products, services, and appointments</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-white font-display">Business Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Business Name *" value={registerForm.businessName} onChange={(e) => setRegisterForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Your Business Name" required />
            <InputField label="Category" value={registerForm.category} onChange={(e) => setRegisterForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Retail, Salon" />
          </div>
          <TextAreaField label="Description" value={registerForm.description} onChange={(e) => setRegisterForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your business..." rows={2} />
        </div>

        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-white font-display">Contact Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Phone" value={registerForm.phone} onChange={(e) => setRegisterForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 123 4567" />
            <InputField label="Email" type="email" value={registerForm.email} onChange={(e) => setRegisterForm(p => ({ ...p, email: e.target.value }))} placeholder="contact@business.com" />
          </div>
          <InputField label="Address" value={registerForm.address} onChange={(e) => setRegisterForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" />
        </div>

        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-white font-display">Working Hours</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Opening Time" type="time" value={registerForm.openingHours} onChange={(e) => setRegisterForm(p => ({ ...p, openingHours: e.target.value }))} />
            <InputField label="Closing Time" type="time" value={registerForm.closingHours} onChange={(e) => setRegisterForm(p => ({ ...p, closingHours: e.target.value }))} />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`px-3 py-1.5 text-[9px] font-bold rounded-lg border cursor-pointer transition-all ${
                    registerForm.workingDays.includes(day)
                      ? 'bg-blue-600 text-slate-950 border-blue-600'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/10'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-2.5 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
          CREATE BUSINESS PROFILE
        </button>
      </form>
    </div>
  );

  const renderOverview = () => {
    const stats = [
      { label: 'Products', value: products.length, icon: <FiPackage size={18} /> },
      { label: 'Services', value: services.length, icon: <FiGrid size={18} /> },
      { label: 'Appointments', value: appointments.length, icon: <FiCalendar size={18} /> },
      { label: 'Pending', value: appointments.filter(a => !a.status || a.status === 'pending').length, icon: <FiClock size={18} /> },
    ];

    return (
      <div className="space-y-6">
        {business && (
          <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                {business.logo ? (
                  <img src={business.logo} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <FiBarChart2 size={22} className="text-blue-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">{business.businessName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {STATUS_OPTIONS.filter(s => s.value === (business.availabilityStatus || 'open')).map(s => (
                    <span key={s.value} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                  ))}
                  {business.category && <span className="text-[9px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-white/5">{business.category}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-white/5 bg-[#131b2e]/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</span>
                <span className="text-blue-400/60">{stat.icon}</span>
              </div>
              <span className="text-2xl font-bold font-display text-white">{stat.value}</span>
            </div>
          ))}
        </div>

        {(business?.location?.coordinates?.length >= 2) && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Location</h3>
            <BusinessProfileMap location={business.location} placeName={business.address || ''} />
          </div>
        )}
      </div>
    );
  };

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Products ({products.length})</h3>
        <button
          onClick={() => { resetProductForm(); setProductFormOpen(true); }}
          className="py-1.5 px-3 bg-blue-600 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
        >
          <FiPlus size={12} /> ADD PRODUCT
        </button>
      </div>

      {productFormOpen && (
        <form onSubmit={handleProductSubmit} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">{editProductId ? 'Edit Product' : 'New Product'}</h4>
            <button type="button" onClick={resetProductForm} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Product Name *" value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wireless Headphones" required />
            <InputField label="Price *" type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} placeholder="29.99" required />

            {/* ── Product Image File Picker ── */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Product Image</label>
              <input ref={productImageRef} type="file" accept="image/*" className="hidden" onChange={handleProductImageSelect} />
              {productImagePreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  {productImageUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-[10px] text-blue-300 font-semibold">Uploading...</span>
                    </div>
                  )}
                  {!productImageUploading && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button type="button" onClick={() => productImageRef.current?.click()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1">
                        <FiImage size={11} /> Change
                      </button>
                      <button type="button" onClick={() => { setProductImagePreview(''); setProductForm(p => ({ ...p, imageUrl: '' })); if (productImageRef.current) productImageRef.current.value = ''; }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1">
                        <FiX size={11} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => productImageRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-400 transition-all cursor-pointer group bg-white/[0.01] hover:bg-blue-500/[0.03]">
                  <FiUploadCloud size={22} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold">Click to upload product image</span>
                  <span className="text-[9px] opacity-60">PNG, JPG, WEBP up to 10 MB</span>
                </button>
              )}
            </div>

            <InputField label="Category" value={productForm.category} onChange={(e) => setProductForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Electronics" />
          </div>
          <TextAreaField label="Description" value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief product description..." />
          <button type="submit" className="w-full py-2 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
            {editProductId ? 'UPDATE PRODUCT' : 'ADD PRODUCT'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product._id} className="p-4 bg-[#131b2e]/60 border border-white/5 hover:border-blue-500/10 rounded-2xl flex items-center gap-4 group transition-all">
              {product.image ? (
                <img src={product.image} alt="" className="w-12 h-12 rounded-xl border border-white/5 bg-slate-900 object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                  <FiPackage size={16} className="text-slate-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{product.name}</h4>
                  {product.category && <span className="text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 shrink-0">{product.category}</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{product.description || 'No description'}</p>
                <span className="text-[10px] font-bold text-blue-400 mt-1 inline-block">{formatPrice(product.price)}</span>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button onClick={() => handleEditProduct(product)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                  <FiEdit3 size={12} />
                </button>
                <button onClick={() => handleDeleteProduct(product._id)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        ) : (
          !productFormOpen && <EmptyState icon={<FiPackage size={22} className="text-slate-600" />} message="No products yet" sub="Click 'Add Product' to list your first item" />
        )}
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Services ({services.length})</h3>
        <button
          onClick={() => { resetServiceForm(); setServiceFormOpen(true); }}
          className="py-1.5 px-3 bg-blue-600 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
        >
          <FiPlus size={12} /> ADD SERVICE
        </button>
      </div>

      {serviceFormOpen && (
        <form onSubmit={handleServiceSubmit} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">{editServiceId ? 'Edit Service' : 'New Service'}</h4>
            <button type="button" onClick={resetServiceForm} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="Service Name *" value={serviceForm.name} onChange={(e) => setServiceForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Haircut" required />
            <InputField label="Duration (min)" type="number" value={serviceForm.duration} onChange={(e) => setServiceForm(p => ({ ...p, duration: e.target.value }))} placeholder="60" />
            <InputField label="Price *" type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm(p => ({ ...p, price: e.target.value }))} placeholder="49.99" required />
          </div>
          <TextAreaField label="Description" value={serviceForm.description} onChange={(e) => setServiceForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief service description..." />
          <button type="submit" className="w-full py-2 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
            {editServiceId ? 'UPDATE SERVICE' : 'ADD SERVICE'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {services.length > 0 ? (
          services.map((service) => (
            <div key={service._id} className="p-4 bg-[#131b2e]/60 border border-white/5 hover:border-blue-500/10 rounded-2xl flex items-center gap-4 group transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-600/5 border border-blue-600/10 flex items-center justify-center shrink-0">
                <FiGrid size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{service.name}</h4>
                  {service.duration && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon size={9} /> {service.duration} min</span>}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{service.description || 'No description'}</p>
                <span className="text-[10px] font-bold text-blue-400 mt-1 inline-block">{formatPrice(service.price)}</span>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button onClick={() => handleEditService(service)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                  <FiEdit3 size={12} />
                </button>
                <button onClick={() => handleDeleteService(service._id)} className="p-1.5 bg-slate-900 border border-white/5 hover:border-blue-500/30 rounded-lg text-slate-400 hover:text-blue-400 transition-all cursor-pointer">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        ) : (
          !serviceFormOpen && <EmptyState icon={<FiGrid size={22} className="text-slate-600" />} message="No services yet" sub="Click 'Add Service' to list your first offering" />
        )}
      </div>
    </div>
  );

  const renderAppointments = () => {
    const statusColors = {
      confirmed: 'text-blue-400 bg-blue-600/10 border-blue-500/30',
      completed: 'text-slate-400 bg-slate-900 border-white/5',
      cancelled: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      declined: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      pending: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Appointments ({appointments.length})</h3>
        </div>

        <div className="space-y-2">
          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <div key={apt._id} className="p-4 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-3 group transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                      <FiUser size={14} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{apt.customerName || 'Unknown Customer'}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {apt.customerEmail && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiMail size={8} /> {apt.customerEmail}</span>}
                        {apt.customerPhone && <span className="text-[9px] text-slate-500 flex items-center gap-1"><FiPhone size={8} /> {apt.customerPhone}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors[apt.status] || statusColors.pending}`}>
                    {(apt.status || 'pending').toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                  {apt.service && <span className="flex items-center gap-1"><FiGrid size={10} /> {apt.service}</span>}
                  {apt.date && <span className="flex items-center gap-1"><FiCalendar size={10} /> {new Date(apt.date).toLocaleDateString()}</span>}
                  {apt.time && <span className="flex items-center gap-1"><FiClock size={10} /> {apt.time}</span>}
                </div>

                {apt.notes && <p className="text-[9px] text-slate-500 italic bg-slate-900/50 p-2 rounded-lg border border-white/5">{apt.notes}</p>}

                {(!apt.status || apt.status === 'pending') && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleAppointmentAction(apt._id, 'confirmed')} className="py-1.5 px-3 bg-blue-600 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1">
                      <FiCheckCircle size={11} /> ACCEPT
                    </button>
                    <button onClick={() => handleAppointmentAction(apt._id, 'declined')} className="py-1.5 px-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-[9px] rounded-lg hover:bg-blue-500/20 transition-all cursor-pointer flex items-center gap-1">
                      <FiXCircle size={11} /> DECLINE
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState icon={<FiCalendar size={22} className="text-slate-600" />} message="No appointments yet" sub="Appointments from customers will appear here" />
          )}
        </div>
      </div>
    );
  };

  const renderAvailability = () => (
    <div className="space-y-6">
      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Business Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAvailabilityStatus(opt.value)}
              className={`py-1.5 px-3.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                availabilityStatus === opt.value
                  ? opt.color + ' ring-1 ring-blue-600/30'
                  : 'text-slate-500 bg-slate-900 border-white/5 hover:border-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={handleAvailabilitySave} className="w-full py-2 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
          SAVE STATUS
        </button>
      </div>

      {business && (
        <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Working Hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-slate-400">
            <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-500 block">Opening Time</span>
              <span className="text-sm font-bold text-slate-200">{business.openingHours || '-'}</span>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-500 block">Closing Time</span>
              <span className="text-sm font-bold text-slate-200">{business.closingHours || '-'}</span>
            </div>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block mb-2">Working Days</span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map(day => (
                <span key={day} className={`text-[9px] px-2 py-1 rounded-lg border ${(business.workingDays || []).includes(day) ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-600'}`}>
                  {day.substring(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <form onSubmit={handleSettingsSave} className="max-w-2xl space-y-4">
      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-white font-display">Business Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Business Name *" value={settingsForm.businessName} onChange={(e) => setSettingsForm(p => ({ ...p, businessName: e.target.value }))} placeholder="Your Business Name" required />
          <InputField label="Category" value={settingsForm.category} onChange={(e) => setSettingsForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Retail, Salon, Consulting" />
        </div>
        <TextAreaField label="Description" value={settingsForm.description} onChange={(e) => setSettingsForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your business..." rows={3} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Logo URL" value={settingsForm.logo} onChange={(e) => setSettingsForm(p => ({ ...p, logo: e.target.value }))} placeholder="https://example.com/logo.png" />
          <InputField label="Cover Image URL" value={settingsForm.coverImage} onChange={(e) => setSettingsForm(p => ({ ...p, coverImage: e.target.value }))} placeholder="https://example.com/cover.png" />
        </div>
      </div>

      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-white font-display">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Email" type="email" value={settingsForm.email} onChange={(e) => setSettingsForm(p => ({ ...p, email: e.target.value }))} placeholder="contact@business.com" />
          <InputField label="Phone" value={settingsForm.phone} onChange={(e) => setSettingsForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 123 4567" />
        </div>
        <InputField label="Website" value={settingsForm.website} onChange={(e) => setSettingsForm(p => ({ ...p, website: e.target.value }))} placeholder="https://business.com" />
        <InputField label="Address" value={settingsForm.address} onChange={(e) => setSettingsForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" />
        <div className="space-y-1">
          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Location</label>
          <LocationPicker value={settingsForm.location} onChange={(location) => setSettingsForm(p => ({ ...p, location }))} placeholder="Search or click the map to set location" />
        </div>
      </div>

      <div className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-white font-display">Auto-Reply Settings</h3>
        <TextAreaField label="Auto-Reply Message" value={settingsForm.autoReplyMessage} onChange={(e) => setSettingsForm(p => ({ ...p, autoReplyMessage: e.target.value }))} placeholder="Thank you for contacting us! We'll get back to you shortly." rows={2} />
      </div>

      <button type="submit" className="w-full py-2.5 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
        SAVE SETTINGS
      </button>
    </form>
  );

  const renderWorkshop = () => <BusinessWorkshop business={business} />;

  const renderWorkshopsMgt = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Manage Workshops ({workshops.length})</h3>
        <button
          onClick={() => { resetWorkshopForm(); setWorkshopFormOpen(true); }}
          className="py-1.5 px-3 bg-blue-600 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
        >
          <FiPlus size={12} /> ADD WORKSHOP
        </button>
      </div>

      {workshopFormOpen && (
        <form onSubmit={handleWorkshopSubmit} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">{editWorkshopId ? 'Edit Workshop' : 'New Workshop'}</h4>
            <button type="button" onClick={resetWorkshopForm} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Workshop Title *" value={workshopForm.title} onChange={(e) => setWorkshopForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Masterclass in Coding" required />
            <InputField label="Instructor" value={workshopForm.instructor} onChange={(e) => setWorkshopForm(p => ({ ...p, instructor: e.target.value }))} placeholder="Instructor Name" />
            <InputField label="Date *" type="date" value={workshopForm.date} onChange={(e) => setWorkshopForm(p => ({ ...p, date: e.target.value }))} required />
            <InputField label="Time *" type="time" value={workshopForm.time} onChange={(e) => setWorkshopForm(p => ({ ...p, time: e.target.value }))} required />
            <InputField label="Duration (minutes)" type="number" value={workshopForm.duration} onChange={(e) => setWorkshopForm(p => ({ ...p, duration: e.target.value }))} placeholder="60" />
            <InputField label="Price (USD)" type="number" step="0.01" value={workshopForm.price} onChange={(e) => setWorkshopForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00 (Free)" />
            <InputField label="Capacity (Attendees)" type="number" value={workshopForm.capacity} onChange={(e) => setWorkshopForm(p => ({ ...p, capacity: e.target.value }))} placeholder="20" />
            <InputField label="Image URL" value={workshopForm.imageUrl} onChange={(e) => setWorkshopForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://example.com/image.jpg" />
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Status</label>
              <select
                value={workshopForm.status}
                onChange={e => setWorkshopForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-blue-500/40"
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <TextAreaField label="Description" value={workshopForm.description} onChange={(e) => setWorkshopForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the workshop details..." />
          <button type="submit" className="w-full py-2 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
            {editWorkshopId ? 'UPDATE WORKSHOP' : 'CREATE WORKSHOP'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {workshops.length > 0 ? (
          workshops.map(ws => (
            <div key={ws._id} className="p-4 bg-[#131b2e]/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {ws.imageUrl ? (
                  <img src={ws.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0 bg-slate-900" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 text-blue-400">
                    <FiUsers size={16} />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{ws.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ws.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 mt-1">
                    <span>Date: {new Date(ws.date).toLocaleDateString()}</span>
                    <span>Time: {ws.time}</span>
                    <span>Fee: {ws.price > 0 ? `$${ws.price}` : 'Free'}</span>
                    <span className="text-blue-400">Attendees: {ws.attendees?.length || 0} / {ws.capacity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 justify-end">
                <button
                  onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/workshops/${ws._id}/invite-link`, {}, { headers: headers() });
                      await navigator.clipboard.writeText(res.data.inviteLink);
                      toast.success('Workshop invite link copied to clipboard!');
                      fetchWorkshops();
                    } catch (err) {
                      toast.error('Failed to generate invite link');
                    }
                  }}
                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="Copy Workshop Invite Link"
                >
                  <FiCopy size={12} /> Link
                </button>
                <button onClick={() => handleEditWorkshop(ws)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer">
                  <FiEdit3 size={12} />
                </button>
                <button onClick={() => handleDeleteWorkshop(ws._id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>

          ))
        ) : (
          <EmptyState icon={<FiUsers size={22} className="text-slate-600" />} message="No workshops created yet" sub="Create classes or webinars for your customers" />
        )}
      </div>
    </div>
  );

  const renderEventsMgt = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Manage Events ({events.length})</h3>
        <button
          onClick={() => { resetEventForm(); setEventFormOpen(true); }}
          className="py-1.5 px-3 bg-blue-600 text-slate-950 font-bold text-[9px] rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
        >
          <FiPlus size={12} /> ADD EVENT
        </button>
      </div>

      {eventFormOpen && (
        <form onSubmit={handleEventSubmit} className="p-5 bg-[#131b2e]/60 border border-white/5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">{editEventId ? 'Edit Event' : 'New Event'}</h4>
            <button type="button" onClick={resetEventForm} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
              <FiX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Event Title *" value={eventForm.title} onChange={(e) => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Grand Opening" required />
            <InputField label="Location" value={eventForm.location} onChange={(e) => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="Online or Address" />
            <InputField label="Date *" type="date" value={eventForm.date} onChange={(e) => setEventForm(p => ({ ...p, date: e.target.value }))} required />
            <InputField label="Time *" type="time" value={eventForm.time} onChange={(e) => setEventForm(p => ({ ...p, time: e.target.value }))} required />
            <InputField label="Ticket Price" type="number" step="0.01" value={eventForm.price} onChange={(e) => setEventForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00 (Free)" />
            <InputField label="Capacity" type="number" value={eventForm.capacity} onChange={(e) => setEventForm(p => ({ ...p, capacity: e.target.value }))} placeholder="100" />
            <InputField label="Image URL" value={eventForm.imageUrl} onChange={(e) => setEventForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://example.com/image.jpg" />
          </div>
          <TextAreaField label="Description" value={eventForm.description} onChange={(e) => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief event description..." />
          <button type="submit" className="w-full py-2 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
            {editEventId ? 'UPDATE EVENT' : 'CREATE EVENT'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {events.length > 0 ? (
          events.map(ev => (
            <div key={ev._id} className="p-4 bg-[#131b2e]/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {ev.imageUrl ? (
                  <img src={ev.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0 bg-slate-900" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 text-purple-400">
                    <FiCalendar size={16} />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{ev.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ev.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 mt-1">
                    <span>Date: {new Date(ev.date).toLocaleDateString()}</span>
                    <span>Time: {ev.time}</span>
                    <span>Location: {ev.location}</span>
                    <span className="text-purple-400">RSVPs: {ev.rsvps?.length || 0} / {ev.capacity}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 justify-end">
                <button onClick={() => handleEditEvent(ev)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer">
                  <FiEdit3 size={12} />
                </button>
                <button onClick={() => handleDeleteEvent(ev._id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon={<FiCalendar size={22} className="text-slate-600" />} message="No events created yet" sub="Create events or special promotions for your business" />
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'workshop': return renderWorkshop();
      case 'workshops-mgt': return renderWorkshopsMgt();
      case 'events-mgt': return renderEventsMgt();
      case 'products': return renderProducts();
      case 'services': return renderServices();
      case 'appointments': return renderAppointments();
      case 'availability': return renderAvailability();
      case 'quick-replies': return <BusinessQuickReplies />;
      case 'staff': return <BusinessStaff />;
      case 'analytics': return <BusinessAnalytics />;
      case 'broadcast': return <BusinessBroadcast />;
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  if (needsSetup) {
    return <BusinessSetupWizard onComplete={() => { setNeedsSetup(false); fetchBusinessProfile(); }} />;
  }

  if (showRegister) {
    return (
      <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
        <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10">
          <h2 className="text-lg font-bold font-display text-white">Business Dashboard</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Create your business profile to get started</p>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
          {renderRegisterForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex flex-col gap-4 select-none">
        <div>
          <h2 className="text-lg font-bold font-display text-white">Business Dashboard</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Manage your products, services, appointments and availability</p>
        </div>

        <div className="flex bg-[#0b0f19] p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 z-10">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-xs text-slate-400 ml-3">Loading business data...</span>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiAlertCircle size={32} className="text-blue-400 mb-3" />
              <p className="text-sm text-slate-300 font-medium">Failed to load business data</p>
              <p className="text-[10px] text-slate-500 mt-1 mb-4">Check your connection and try again</p>
              <button onClick={() => { setLoading(true); setFetchError(false); fetchBusinessProfile(); }} className="py-2 px-4 bg-blue-600 text-slate-950 font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer">
                RETRY
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;
