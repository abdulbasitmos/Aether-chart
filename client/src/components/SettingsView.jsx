import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiSettings, FiLock, FiBell, FiMessageSquare, FiSliders, 
  FiGlobe, FiHelpCircle, FiInfo, FiCheck, FiShield, FiMoon,
  FiTrash2, FiSmartphone, FiLink, FiFolder, FiCpu,
  FiDatabase, FiDownload, FiTerminal, FiAlertTriangle, FiUser, FiActivity, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

const SettingsView = () => {
  const { user, updateTheme, updatePrivacy, updateSecurity, updateProfile, updateNotifications, updateChatPrefs, updateAiPrefs, updateAccessibilityPrefs, logout, deleteAccount, accountType, upgradeAccount, isSupport } = useAuth();
  const navigate = useNavigate();
  const { chats, clearChatHistory, clearAllChatHistory } = useChat();
  const userTheme = user?.themePreference || user?.theme || {};
  const userSecurity = user?.securitySettings || user?.security || {};
  const userNotifications = user?.notifications || {};
  const userPrivacy = user?.privacySettings || user?.privacy || {};
  const userChatPrefs = user?.chatPrefs || {};
  const userAiPrefs = user?.aiPrefs || {};
  const userA11yPrefs = user?.accessibilityPrefs || {};

  const [activeSubTab, setActiveSubTab] = useState('profile'); // tab list id

  // Layout Spacing state
  const [layoutSpacing, setLayoutSpacing] = useState(() => {
    const saved = localStorage.getItem('aether_layout_spacing');
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleSpacingChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLayoutSpacing(val);
    localStorage.setItem('aether_layout_spacing', val);
    document.documentElement.style.setProperty('--layout-component-spacing', `${val}px`);
  };

  // Profile Form States
  const [profName, setProfName] = useState(user?.name || '');
  const [profUsername, setProfUsername] = useState(user?.username || '');
  const [profBio, setProfBio] = useState(user?.bio || 'Available');
  const [profWebsite, setProfWebsite] = useState(user?.website || '');
  const [profLocation, setProfLocation] = useState(user?.location || '');
  const [profAvatar, setProfAvatar] = useState(user?.avatar || '');

  // Mock Devices State
  const [devices, setDevices] = useState([
    { id: 'dev_1', name: 'MacBook Pro 16"', browser: 'Chrome 125', os: 'macOS Sonoma', ip: '192.168.1.45', location: 'London, UK', active: 'Current Session', current: true },
    { id: 'dev_2', name: 'iPhone 15 Pro Max', browser: 'Aether Mobile App', os: 'iOS 17.5', ip: '192.168.1.102', location: 'London, UK', active: '2 hours ago', current: false },
    { id: 'dev_3', name: 'Linux workstation', browser: 'Firefox Developer Edition', os: 'Ubuntu 24.04', ip: '10.0.0.125', location: 'Dublin, IE', active: '3 days ago', current: false }
  ]);

  // Connected Accounts State
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: true,
    github: false,
    microsoft: false,
    apple: false
  });

  // Storage Manager State
  const [cacheSize, setCacheSize] = useState('142.8 MB');
  const [mediaSize, setMediaSize] = useState('1.2 GB');

  // Support Tickets State
  const [userTickets, setUserTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('Account / General Issue');
  const [ticketMessage, setTicketMessage] = useState('');

  const fetchUserTickets = async () => {
    setLoadingTickets(true);
    try {
      const token = sessionStorage.getItem('aether_token') || localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/support/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUserTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'help') {
      fetchUserTickets();
    }
  }, [activeSubTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveSubTab(tab);
      const type = params.get('type');
      if (tab === 'upgrade' && (type === 'business' || type === 'organization')) {
        handleOpenUpgradeModal(type);
      }
    }
  }, [window.location.search]);

  const handleSendSupportTicket = async (e) => {
    e?.preventDefault();
    if (!ticketMessage.trim()) return toast.error('Please describe your issue');
    try {
      const token = sessionStorage.getItem('aether_token') || localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: ticketSubject, message: ticketMessage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Support ticket submitted successfully!');
      setTicketMessage('');
      fetchUserTickets();
    } catch (err) {
      toast.error(err.message || 'Failed to send ticket');
    }
  };

  // Danger Zone confirmation
  const [dangerConfirmPassword, setDangerConfirmPassword] = useState('');
  const [showDangerDialog, setShowDangerDialog] = useState(false);

  // PIN state
  const [newPin, setNewPin] = useState('');

  // Grok key state
  const [grokKey, setGrokKey] = useState(() => {
    return localStorage.getItem('aether_grok_key') || '';
  });

  // Developer panel logs
  const [socketLatency, setSocketLatency] = useState(14);
  const [apiLogs, setApiLogs] = useState([
    { method: 'GET', path: '/api/auth/profile', status: 200, time: '16:51:02' },
    { method: 'GET', path: '/api/chats', status: 200, time: '16:51:03' },
    { method: 'GET', path: '/api/status', status: 200, time: '16:51:04' },
    { method: 'POST', path: '/api/channels/123/follow', status: 200, time: '16:52:10' }
  ]);

  // Account Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetType, setUpgradeTargetType] = useState('business');
  const [upgradeForm, setUpgradeForm] = useState({
    businessName: '',
    officialEmail: '',
    phone: '',
    category: 'Technology',
    registrationId: '',
    address: '',
    description: ''
  });

  const handleOpenUpgradeModal = (type) => {
    setUpgradeTargetType(type);
    setUpgradeForm({
      businessName: user?.name ? `${user.name} Corp` : '',
      officialEmail: user?.email || '',
      phone: user?.phone || '',
      category: 'Technology',
      registrationId: 'REG-' + Math.floor(100000 + Math.random() * 900000),
      address: user?.location || 'Headquarters',
      description: 'Official enterprise account application for team operations & service catalog management.'
    });
    setShowUpgradeModal(true);
  };

  const handleSubmitUpgradeForm = async (e) => {
    e.preventDefault();
    if (!upgradeForm.businessName.trim() || !upgradeForm.officialEmail.trim()) {
      toast.error('Business Name and Official Email are required.');
      return;
    }
    await upgradeAccount(upgradeTargetType, upgradeForm);
    setShowUpgradeModal(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSocketLatency(Math.floor(Math.random() * 8) + 11);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: profName,
        username: profUsername,
        bio: profBio,
        website: profWebsite,
        location: profLocation,
        avatar: profAvatar
      });
      toast.success('Profile settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile.');
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfAvatar(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeviceSignOut = (id) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    toast.success('Session terminated successfully.');
  };

  const toggleAccountLink = (provider) => {
    setConnectedAccounts(prev => {
      const updated = { ...prev, [provider]: !prev[provider] };
      toast.success(updated[provider] ? `Linked ${provider} account` : `Unlinked ${provider} account`);
      return updated;
    });
  };

  const handleClearCache = () => {
    setCacheSize('0.0 KB');
    toast.success('System cache flushed.');
  };

  const handleDeleteAccount = async () => {
    if (dangerConfirmPassword !== 'delete-confirm') {
      toast.error('Verification code mismatch. Type "delete-confirm" to confirm.');
      return;
    }
    await deleteAccount();
  };

  const settingsTabs = [
    { id: 'profile', icon: <FiUser size={18} />, label: 'My Profile' },
    { id: 'appearance', icon: <FiSliders size={18} />, label: 'Appearance' },
    { id: 'chats', icon: <FiMessageSquare size={18} />, label: 'Chats Config' },
    { id: 'notifications', icon: <FiBell size={18} />, label: 'Notifications' },
    { id: 'privacy', icon: <FiLock size={18} />, label: 'Privacy & Security' },
    { id: 'account', icon: <FiShield size={18} />, label: '2FA & PIN Lock' },
    { id: 'upgrade', icon: <FiUser size={18} />, label: 'Account Type' },
    { id: 'devices', icon: <FiSmartphone size={18} />, label: 'Active Devices' },
    { id: 'accounts', icon: <FiLink size={18} />, label: 'Connected Accounts' },
    { id: 'storage', icon: <FiFolder size={18} />, label: 'Storage Manager' },
    { id: 'ai', icon: <FiCpu size={18} />, label: 'AI Settings' },
    { id: 'accessibility', icon: <FiSliders size={18} />, label: 'Accessibility' },
    { id: 'language', icon: <FiGlobe size={18} />, label: 'Language & Region' },
    { id: 'developer', icon: <FiTerminal size={18} />, label: 'Developer Monitor' },
    { id: 'help', icon: <FiHelpCircle size={18} />, label: 'Help Center' },
    { id: 'about', icon: <FiInfo size={18} />, label: 'About App' },
    { id: 'danger', icon: <FiAlertTriangle size={18} />, label: 'Danger Zone' }
  ];

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(${userTheme.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.01)'} 1.5px, transparent 1.5px)`, backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-15 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold font-display text-white">Aether Dashboard Control Panel</h2>
          <p className="text-[10px] text-slate-300 mt-0.5 font-medium">Control profile details, appearance themes, security configurations, and live developer diagnostics</p>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* Left Sub-navigation */}
        <div className="w-1/3 border-r border-white/5 overflow-y-auto no-scrollbar p-4 space-y-1.5 shrink-0 select-none bg-slate-950/20">
          <h3 className="text-[10px] text-slate-300 font-bold uppercase tracking-wider px-1 mb-2 select-none">System categories</h3>
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`w-full p-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer border transition-all text-xs font-semibold ${
                activeSubTab === tab.id 
                  ? 'bg-slate-900 border-white/5 text-emerald-400 shadow-md font-bold' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Active pane detail */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 max-w-xl mx-auto"
            >
              
              {/* TAB: PROFILE SETTINGS */}
              {activeSubTab === 'profile' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-white font-display">Profile Settings</h3>
                  
                  <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                    {/* Avatar Upload Preview */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-full border border-white/10 overflow-hidden bg-slate-900 shrink-0">
                        {profAvatar ? (
                          <img src={profAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-300 font-bold uppercase">Avatar</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          id="settings-avatar-input" 
                          onChange={handleAvatarUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('settings-avatar-input')?.click()}
                          className="py-1 px-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] font-bold text-slate-300 rounded-lg active:scale-95 transition-all cursor-pointer"
                        >
                          Change Photo
                        </button>
                        <p className="text-[9px] text-slate-400">Supports PNG or JPG under 2MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Display Name</label>
                        <input
                          type="text"
                          required
                          value={profName}
                          onChange={(e) => setProfName(e.target.value)}
                          className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Username</label>
                        <input
                          type="text"
                          required
                          value={profUsername}
                          onChange={(e) => setProfUsername(e.target.value)}
                          className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 font-sans">
                      <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Bio</label>
                      <input
                        type="text"
                        value={profBio}
                        onChange={(e) => setProfBio(e.target.value)}
                        className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Website</label>
                        <input
                          type="text"
                          value={profWebsite}
                          onChange={(e) => setProfWebsite(e.target.value)}
                          className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Location</label>
                        <input
                          type="text"
                          value={profLocation}
                          onChange={(e) => setProfLocation(e.target.value)}
                          className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="py-2 px-5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                </div>
              )}
              
              {/* TAB: APPEARANCE */}
              {activeSubTab === 'appearance' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-white font-display">Appearance Customization</h3>
                  
                  {/* System mode (light/dark) */}
                  <div className="space-y-2.5">
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">System Theme Mode</label>
                    <div className="flex gap-3">
                      {['dark', 'light'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateTheme({ mode })}
                          className={`flex-1 py-2 rounded-xl border text-xs font-semibold uppercase transition-all cursor-pointer ${
                            userTheme.mode === mode 
                              ? 'bg-slate-900 border-white/10 text-emerald-400 shadow-lg' 
                              : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Theme color */}
                  <div className="space-y-2.5">
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Accent Primary Color</label>
                    <div className="flex gap-3">
                      {[
                        { id: 'emerald', bg: 'bg-emerald-500', name: 'Emerald' },
                        { id: 'sapphire', bg: 'bg-emerald-500', name: 'Sapphire' },
                        { id: 'amethyst', bg: 'bg-emerald-600', name: 'Amethyst' },
                        { id: 'rose', bg: 'bg-rose-500', name: 'Rose' }
                      ].map((color) => (
                        <button
                          key={color.id}
                          onClick={() => updateTheme({ primaryColor: color.id })}
                          className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:scale-102 ${
                            userTheme.primaryColor === color.id 
                              ? 'bg-slate-900 border-emerald-500/20 text-white' 
                              : 'bg-transparent border-white/5 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Wallpaper selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Chat Wallpaper Pattern</label>
                    <select
                      value={userTheme.chatWallpaper || 'grid'}
                      onChange={(e) => updateTheme({ chatWallpaper: e.target.value })}
                      className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none"
                    >
                      <option value="grid">Geometric Grid</option>
                      <option value="dots">Minimal Dots</option>
                      <option value="solid">Plain Canvas</option>
                      <option value="neon">Neon Mesh Glow</option>
                    </select>
                  </div>

                  {/* Font Size scaling */}
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">App Font Size</label>
                    <select
                      value={userTheme.fontSize || 'medium'}
                      onChange={(e) => updateTheme({ fontSize: e.target.value })}
                      className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none"
                    >
                      <option value="small">Small (14px)</option>
                      <option value="medium">Medium (16px - Default)</option>
                      <option value="large">Large (18px)</option>
                    </select>
                  </div>

                  {/* Bubble corner style */}
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Message Bubble Style</label>
                    <select
                      value={userTheme.bubbleStyle || 'rounded'}
                      onChange={(e) => updateTheme({ bubbleStyle: e.target.value })}
                      className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none"
                    >
                      <option value="rounded">Classic Rounded</option>
                      <option value="sharp">Symmetric Sharp</option>
                      <option value="playful">Organic Playful</option>
                    </select>
                  </div>

                  {/* Layout Spacing Control */}
                  <div className="space-y-2.5 p-3.5 bg-slate-900/30 border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                        Layout Padding Spacing
                      </label>
                      <span className="text-[10px] text-emerald-400 font-bold">{layoutSpacing}px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-300 font-medium">0px</span>
                      <input
                        type="range"
                        min="0"
                        max="32"
                        step="4"
                        value={layoutSpacing}
                        onChange={handleSpacingChange}
                        className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                      />
                      <span className="text-[10px] text-slate-300 font-medium">32px</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">Adjust the spacing between the sidebar and the main content panels (float effect).</p>
                  </div>
                </div>
              )}

              {/* TAB: CHAT CONFIG */}
              {activeSubTab === 'chats' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-white font-display">Chats Configurations</h3>
                  
                  <div className="space-y-3.5 font-sans">
                    <div className="flex justify-between items-center text-xs py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Enter key to send message</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Pressing Enter will send message instead of inserting breakline</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userChatPrefs.enterToSend !== false}
                        onChange={(e) => updateChatPrefs({ enterToSend: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Auto-Download Media</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Automatically load incoming images and attachments on connection</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userChatPrefs.autoDownloadMedia !== false}
                        onChange={(e) => updateChatPrefs({ autoDownloadMedia: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Disappearing Messages Default</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Start new conversations with disappearing messages active</p>
                      </div>
                      <select
                        value={userChatPrefs.disappearingMessagesDefault || 'off'}
                        onChange={(e) => updateChatPrefs({ disappearingMessagesDefault: e.target.value })}
                        className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-[10px] text-slate-300 outline-none"
                      >
                        <option value="off">Off</option>
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                        <option value="90d">90 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 font-display">Backups & Recovery</h4>
                    <p className="text-[10px] text-slate-300">Back up chats data to local client indexes.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toast.success('Local backup created successfully!', { icon: '📦' })}
                        className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] text-slate-200 font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        Backup Chats
                      </button>
                      <button 
                        onClick={() => toast.success('Restored previous backup file', { icon: '🔄' })}
                        className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] text-slate-200 font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        Restore Backup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: NOTIFICATIONS */}
              {activeSubTab === 'notifications' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Notification Settings</h3>

                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center text-xs py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Preview message text in banner toasts</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Display incoming message text preview in popup banners</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userNotifications.showPreview !== false}
                        onChange={(e) => updateNotifications({ showPreview: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3 py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Sound Notifications</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Play dynamic audio alerts for incoming texts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userNotifications.soundEnabled !== false}
                        onChange={(e) => updateNotifications({ soundEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3 py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Do Not Disturb Mode</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Mute all incoming notification triggers</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userNotifications.doNotDisturb === true}
                        onChange={(e) => updateNotifications({ doNotDisturb: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PRIVACY */}
              {activeSubTab === 'privacy' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Privacy Controls</h3>

                  <div className="space-y-3.5 font-sans">
                    <div className="flex justify-between items-center text-xs py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Show Last Seen status</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Allow other endpoints to see your active signals</p>
                      </div>
                      <select 
                        value={userPrivacy.lastSeen || 'everyone'}
                        onChange={(e) => updatePrivacy({ lastSeen: e.target.value })}
                        className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-xs text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="contacts">My Contacts</option>
                        <option value="nobody">Nobody</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Read Receipts checkmarks</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Send double-blue ticks when reading synchronized texts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userPrivacy.readReceipts !== false}
                        onChange={(e) => updatePrivacy({ readReceipts: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1">
                      <div>
                        <h4 className="font-semibold text-slate-300">Profile Photo Visibility</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Configure who can see your avatar photo</p>
                      </div>
                      <select 
                        value={userPrivacy.profilePhoto || 'everyone'}
                        onChange={(e) => updatePrivacy({ profilePhoto: e.target.value })}
                        className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-[10px] text-slate-300 outline-none cursor-pointer"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="contacts">My Contacts</option>
                        <option value="nobody">Only Me</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SECURITY & 2FA */}
              {activeSubTab === 'account' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Account Security & PIN</h3>
                  
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3.5 font-sans">
                    <div className="flex justify-between items-center text-xs py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Two-Factor Authentication (2FA)</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Require OTP verification key during logins</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userSecurity.twoFactor || false}
                        onChange={(e) => updateSecurity({ twoFactor: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Biometric FaceID Unlock</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Enable biometric dashboard authentication protection</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userSecurity.faceId || false}
                        onChange={(e) => updateSecurity({ faceId: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3.5 py-1.5">
                      <div>
                        <h4 className="font-semibold text-slate-300">Four digit PIN Lock</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">Prompt security validation PIN during launch sessions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={userSecurity.pinLock || false}
                        onChange={(e) => updateSecurity({ pinLock: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 font-sans">
                    <h4 className="text-xs font-bold text-slate-300">Set Security PIN</h4>
                    <p className="text-[10px] text-slate-300">Enter a 4-digit PIN code for app lock verification</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="password"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 4-digit PIN"
                        className="flex-1 bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500/40 outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newPin.length !== 4) {
                            toast.error('PIN must be 4 digits');
                            return;
                          }
                          updateSecurity({ pin: newPin });
                          setNewPin('');
                        }}
                        className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACCOUNT TYPE / UPGRADE */}
              {activeSubTab === 'upgrade' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Account Type</h3>
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-300">Current Account</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5 capitalize">{accountType}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${
                        accountType === 'business' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        accountType === 'organization' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>{accountType}</span>
                    </div>
                  </div>

                  {accountType === 'personal' && (
                    <>
                      <div className="p-4 bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 font-sans">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Upgrade & Verification Required</h4>
                            <p className="text-[10px] text-slate-300 mt-0.5">Personal accounts must complete official registration details to transition account tier.</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded">Required</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 font-sans">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">Upgrade to Business Account</h4>
                        <p className="text-[10px] text-slate-300">Unlock official business catalog, customer appointment scheduling, and automated staff quick-replies.</p>
                        <button
                          onClick={() => handleOpenUpgradeModal('business')}
                          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-2"
                        >
                          Fill Application Form & Upgrade to Business &rarr;
                        </button>
                      </div>

                      <div className="p-4 bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 font-sans">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">Upgrade to Organization Account</h4>
                        <p className="text-[10px] text-slate-300">Create multi-department workspaces, team member analytics, project task boards, and channel broadcasts.</p>
                        <button
                          onClick={() => handleOpenUpgradeModal('organization')}
                          className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-md shadow-purple-500/20 flex items-center gap-2"
                        >
                          Fill Application Form & Upgrade to Organization &rarr;
                        </button>
                      </div>
                    </>
                  )}

                  {accountType !== 'personal' && (
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 font-sans">
                      <h4 className="text-xs font-bold text-slate-300">Downgrade to Personal</h4>
                      <p className="text-[10px] text-slate-300">Revert to a personal account. Business and Organization features will be hidden.</p>
                      <button
                        onClick={() => upgradeAccount('personal')}
                        className="py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        Downgrade to Personal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ACTIVE DEVICES */}
              {activeSubTab === 'devices' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="text-sm font-bold text-white font-display">Logged-in Sessions</h3>
                    <button
                      onClick={() => {
                        setDevices(devices.filter(d => d.current));
                        toast.success('Terminated other active sessions.');
                      }}
                      className="py-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[9px] font-bold border border-rose-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      Sign Out Other Devices
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {devices.map(dev => (
                      <div key={dev.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between gap-4 font-sans text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-slate-950 border border-white/5 text-slate-400 rounded-xl">
                            <FiSmartphone size={14} className={dev.current ? 'text-emerald-400 animate-pulse' : ''} />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                              {dev.name} 
                              {dev.current && <span className="text-[8px] bg-emerald-500/15 text-emerald-400 py-0.5 px-1 rounded uppercase tracking-wider">Current</span>}
                            </h5>
                            <p className="text-[10px] text-slate-300 mt-0.5 font-semibold">{dev.browser} • {dev.ip} • {dev.location}</p>
                          </div>
                        </div>

                        {!dev.current && (
                          <button
                            onClick={() => handleDeviceSignOut(dev.id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg border border-white/5 cursor-pointer"
                            title="Sign Out Device"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: CONNECTED ACCOUNTS */}
              {activeSubTab === 'accounts' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Linked Services</h3>
                  
                  <div className="space-y-2.5 font-sans text-xs">
                    {[
                      { id: 'google', label: 'Google Suite', desc: 'Sync calendars and contacts directory info' },
                      { id: 'github', label: 'GitHub Developers', desc: 'Sync repository boards and codes' },
                      { id: 'microsoft', label: 'Microsoft Azure', desc: 'Sync Outlook alerts and active feeds' },
                      { id: 'apple', label: 'Apple iCloud', desc: 'Sync contacts book and backup targets' }
                    ].map(prov => (
                      <div key={prov.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                        <div>
                          <h5 className="font-bold text-slate-200">{prov.label}</h5>
                          <p className="text-[10px] text-slate-300 mt-0.5">{prov.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleAccountLink(prov.id)}
                          className={`py-1 px-3 rounded-lg text-[9px] font-bold active:scale-95 transition-all cursor-pointer border ${
                            connectedAccounts[prov.id]
                              ? 'bg-[#2563EB]/15 border-[#2563EB]/25 text-[#2563EB]'
                              : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {connectedAccounts[prov.id] ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: STORAGE MANAGER */}
              {activeSubTab === 'storage' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Storage Management</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Client System Cache</span>
                      <h4 className="text-lg font-bold text-slate-200 font-display leading-none">{cacheSize}</h4>
                      <button
                        onClick={handleClearCache}
                        className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-white/5 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer mt-2"
                      >
                        Flush Cache
                      </button>
                    </div>

                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Broadcaster Attachments</span>
                      <h4 className="text-lg font-bold text-slate-200 font-display leading-none">{mediaSize}</h4>
                      <button
                        onClick={() => {
                          setMediaSize('0.0 KB');
                          toast.success('Attachments cleared.');
                        }}
                        className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-white/5 text-[9px] font-bold text-slate-400 hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer mt-2"
                      >
                        Clear Media
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AI SETTINGS */}
              {activeSubTab === 'ai' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">AI Assistant Preferences</h3>

                  <div className="space-y-3.5 font-sans text-xs">
                    {[
                      { id: 'smartReplies', label: 'Suggest contextual smart replies', def: true },
                      { id: 'autoTranslate', label: 'Auto-Translate incoming foreign texts', def: false },
                      { id: 'discussionSummary', label: 'Support workspace discussion summaries', def: true }
                    ].map(opt => (
                      <div key={opt.id} className="flex justify-between items-center py-1">
                        <div>
                          <h4 className="font-semibold text-slate-300">{opt.label}</h4>
                        </div>
                        <input
                          type="checkbox"
                          checked={userAiPrefs[opt.id] !== undefined ? userAiPrefs[opt.id] : opt.def}
                          onChange={(e) => updateAiPrefs({ [opt.id]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Grok API Key Config */}
                  <div className="space-y-3 pt-4 border-t border-white/5 font-sans">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                        xAI Grok API Key
                      </label>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        grokKey && grokKey.length >= 15
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {grokKey && grokKey.length >= 15 ? '✓ Key Configured' : '⚠ Using Server Key'}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={grokKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGrokKey(val);
                        localStorage.setItem('aether_grok_key', val);
                      }}
                      placeholder="Paste your xAI Grok API key here (gsk_...)"
                      className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!grokKey || grokKey.length < 15) { toast.error('Please enter a valid Grok API key first.'); return; }
                          const t = toast.loading('Testing connection to xAI Grok...');
                          try {
                            const res = await fetch('https://api.xai.com/v1/chat/completions', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grokKey}` },
                              body: JSON.stringify({ messages: [{ role: 'user', content: 'Say "OK" only.' }], model: 'grok-beta', max_tokens: 5 })
                            });
                            if (res.ok) { toast.success('✅ Grok API connected successfully!', { id: t }); }
                            else { const e = await res.text(); toast.error(`❌ API Error: ${res.status}`, { id: t }); }
                          } catch(e) { toast.error('❌ Network error — check your key or internet.', { id: t }); }
                        }}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Test Connection
                      </button>
                      {grokKey && (
                        <button
                          type="button"
                          onClick={() => { setGrokKey(''); localStorage.removeItem('aether_grok_key'); toast.success('Key removed — using server key.'); }}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Clear Key
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Your personal xAI Grok key is stored locally in your browser and used directly for AI responses. Get yours from <span className="text-emerald-400 font-semibold">console.x.ai</span>. Leave blank to use the server's configured key.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB: ACCESSIBILITY */}
              {activeSubTab === 'accessibility' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Accessibility Customization</h3>

                  <div className="space-y-3.5 font-sans text-xs">
                    {[
                      { id: 'highContrast', label: 'High contrast borders mode', def: false },
                      { id: 'reduceMotion', label: 'Reduce motion animations', def: false },
                      { id: 'screenReaderLabels', label: 'Screen reader accessibility labels', def: true }
                    ].map(opt => (
                      <div key={opt.id} className="flex justify-between items-center py-1">
                        <div>
                          <h4 className="font-semibold text-slate-300">{opt.label}</h4>
                        </div>
                        <input
                          type="checkbox"
                          checked={userA11yPrefs[opt.id] !== undefined ? userA11yPrefs[opt.id] : opt.def}
                          onChange={(e) => updateAccessibilityPrefs({ [opt.id]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: LANGUAGE */}
              {activeSubTab === 'language' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">Language & Region</h3>
                  <select 
                    value={userTheme.language || 'en'}
                    onChange={(e) => {
                      updateTheme({ language: e.target.value });
                      toast.success('Language preference saved.');
                    }}
                    className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:border-emerald-500/20 outline-none cursor-pointer"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ja">日本語 (JP)</option>
                  </select>
                </div>
              )}

              {/* TAB: DEVELOPER MONITOR */}
              {activeSubTab === 'developer' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white font-display">Developer Tools</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-300 font-bold uppercase select-none">Socket Connected</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Socket Latency</span>
                      <h4 className="text-base font-bold text-slate-200 font-display leading-none font-mono">{socketLatency} ms</h4>
                    </div>

                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">Diagnostics Ping</span>
                      <h4 className="text-base font-bold text-emerald-400 font-display leading-none font-mono">Healthy</h4>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <h4 className="text-[10px] text-slate-300 font-bold uppercase tracking-wider select-none">API Request Logs</h4>
                    <div className="p-3 bg-slate-950 border border-white/5 rounded-xl font-mono text-[9px] text-slate-400 h-32 overflow-y-auto no-scrollbar space-y-1.5">
                      {apiLogs.map((log, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span><span className="text-emerald-400 font-bold">{log.method}</span> {log.path}</span>
                          <span className="text-slate-600 font-semibold">{log.status} • {log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: HELP */}
              {activeSubTab === 'help' && (
                <div className="space-y-6 font-sans text-xs text-slate-300 leading-relaxed">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      <FiHelpCircle className="text-blue-400" size={16} /> Account & Support Help Desk
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Encountering an account issue or technical problem? Submit a support ticket directly to our support agents.
                    </p>
                  </div>

                  {/* Submit Ticket Form */}
                  <form onSubmit={handleSendSupportTicket} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Report an Issue</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Category / Issue Subject</label>
                      <select
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-blue-500/40 outline-none cursor-pointer"
                      >
                        <option value="Account / General Issue">Account / General Issue</option>
                        <option value="Billing & Verification">Billing & Verification</option>
                        <option value="Chat & Messaging Bug">Chat & Messaging Bug</option>
                        <option value="Privacy & Security Concern">Privacy & Security Concern</option>
                        <option value="Other Technical Problem">Other Technical Problem</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Message Details</label>
                      <textarea
                        rows={3}
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Describe your issue or question in detail..."
                        className="w-full bg-[#0f1729] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-blue-500/40 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-98 transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <FiMessageSquare size={14} /> Submit Ticket to Support Team
                    </button>
                  </form>

                  {/* User Tickets History */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">My Support Tickets</h4>
                      <button
                        type="button"
                        onClick={fetchUserTickets}
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Refresh
                      </button>
                    </div>

                    {loadingTickets ? (
                      <p className="text-slate-500 text-center py-4 text-[11px]">Loading support history...</p>
                    ) : userTickets.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 text-center text-slate-500 text-[11px]">
                        You haven't submitted any support tickets yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                        {userTickets.map((t) => (
                          <div key={t._id} className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200 text-xs">{t.subject || 'Support Ticket'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.resolved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                {t.resolved ? 'Resolved' : 'Pending Support Reply'}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-white/5">{t.message}</p>
                            
                            {/* Support Replies */}
                            {t.replies && t.replies.length > 0 && (
                              <div className="space-y-1.5 pl-3 border-l-2 border-blue-500/40 mt-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase">Support Team Response:</span>
                                {t.replies.map((r, idx) => (
                                  <div key={idx} className="bg-blue-500/10 p-2 rounded-lg text-slate-200 text-[11px]">
                                    <div className="flex justify-between text-[9px] text-blue-300 font-semibold mb-0.5">
                                      <span>{r.supportId?.name || 'Support Agent'}</span>
                                      <span>{new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </div>
                                    <p>{r.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: ABOUT */}
              {activeSubTab === 'about' && (
                <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
                  <h3 className="text-sm font-bold text-white font-display">About unified dashboard</h3>
                  <p><b>App Name:</b> AetherChat Desktop client</p>
                  <p><b>Version:</b> 1.0.0 (Real-time Sockets Enabled)</p>
                  <p><b>Protocols:</b> Secure TLS & WebSockets Sync</p>
                  <p className="text-[10px] text-slate-300">Copyright © 2026 Aether Syndicate. All rights reserved.</p>
                </div>
              )}

              {/* TAB: DANGER ZONE */}
              {activeSubTab === 'danger' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-rose-500 font-display flex items-center gap-1.5"><FiAlertTriangle /> Danger Zone</h3>
                  <p className="text-xs text-slate-300 font-sans">Performing these actions will permanently remove settings configurations or delete account documents from Aether.</p>

                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] text-rose-400 font-bold uppercase tracking-wider">Type "delete-confirm" to verify deactivation</label>
                      <input
                        type="text"
                        value={dangerConfirmPassword}
                        onChange={(e) => setDangerConfirmPassword(e.target.value)}
                        placeholder="Type delete-confirm..."
                        className="w-full bg-slate-950 border border-rose-500/15 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-rose-500/30 outline-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-500/10"
                      >
                        Delete My Account
                      </button>
                      <button
                        onClick={() => {
                          clearAllChatHistory();
                        }}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        Clear All History
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Local preferences are persisted securely within this browser environment.
      </div>

      {/* Account Verification & Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Account Verification & Upgrade Application
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  Complete official details to convert your Personal account to {upgradeTargetType.toUpperCase()} tier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitUpgradeForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {upgradeTargetType === 'business' ? 'Business Entity Name *' : 'Organization Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={upgradeForm.businessName}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="e.g. Acme Innovations Corp"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Official Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={upgradeForm.officialEmail}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, officialEmail: e.target.value }))}
                    placeholder="contact@company.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    value={upgradeForm.phone}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-1234"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Industry / Sector
                  </label>
                  <select
                    value={upgradeForm.category}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Technology">Technology & Software</option>
                    <option value="E-Commerce">E-Commerce & Retail</option>
                    <option value="Finance">Finance & Banking</option>
                    <option value="Healthcare">Healthcare & Life Sciences</option>
                    <option value="Education">Education & Training</option>
                    <option value="Services">Professional Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tax ID / Registration No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={upgradeForm.registrationId}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, registrationId: e.target.value }))}
                    placeholder="REG-948192"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Operating Location
                  </label>
                  <input
                    type="text"
                    value={upgradeForm.address}
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="City, Country"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Company / Organization Overview
                </label>
                <textarea
                  rows={3}
                  value={upgradeForm.description}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a brief summary of your enterprise operations..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Submit & Verify Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

