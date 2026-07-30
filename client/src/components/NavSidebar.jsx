import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiMessageSquare, FiPhone, FiSettings, FiLogOut,
  FiLayers, FiCheckSquare, FiCheck, FiLock, FiUser, FiCpu, FiBriefcase,
  FiShield, FiHelpCircle, FiCalendar, FiRss
} from 'react-icons/fi';


import toast from 'react-hot-toast';
import IdentitySwitcher from './IdentitySwitcher';
import appLogo from '../assets/logo.svg';

const NavSidebar = () => {
  const navigate = useNavigate();
  const { chats, activeTab, setActiveTab, setChatFilter } = useChat();
  const { user, logout, lockAppManual, t, accountType, isSupport, activeIdentity, setActiveIdentity, currentProfileAvatar } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = chats ? chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0) : 0;

  return (
    <div className="w-[72px] h-full border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col justify-between items-center py-5 select-none shrink-0 shadow-sm z-20">
      
      {/* Top Section: Logo */}
      <div className="mb-6 shrink-0 flex items-center justify-center relative group">
        <div className="absolute inset-0 bg-blue-500/25 rounded-full blur-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <img 
          src={appLogo} 
          alt="AetherChat Logo" 
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 object-cover shadow-md transition-all duration-300 group-hover:scale-105 cursor-pointer" 
        />
      </div>

      {/* Middle: Scrollable list of tabs */}
      <div className="flex-1 w-full flex flex-col items-center gap-4 overflow-y-auto no-scrollbar py-2">
        
        {/* Main Action Tabs */}
        {[
          { 
            id: 'chats', 
            icon: <FiMessageSquare size={22} />, 
            label: t('chats'),
            badge: unreadCount > 0 ? unreadCount : '',
            badgeType: 'count'
          },
          { 
            id: 'calls', 
            icon: <FiPhone size={22} />, 
            label: t('calls') 
          },
          { 
            id: 'status', 
            icon: (
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-none stroke-current" strokeWidth="2.5">
                <path d="M12 2a10 10 0 1 0 10 10M12 2a10 10 0 0 1 8.5 5M12 2a10 10 0 0 0-8.5 5" strokeDasharray="4 2" />
              </svg>
            ), 
            label: t('stories'),
            badge: true,
            badgeType: 'dot'
          },
          { 
            id: 'channels', 
            icon: (
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-none stroke-current" strokeWidth="2.5">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <circle cx="12" cy="12" r="1.5" className="fill-current" />
              </svg>
            ), 
            label: t('channels'),
            badge: true,
            badgeType: 'dot'
          },
          { 
            id: 'tasks', 
            icon: <FiCheckSquare size={22} />, 
            label: t('tasks') 
          },
          {
            id: 'feed',
            icon: <FiRss size={22} />,
            label: 'Feed'
          },
          {
            id: 'my-events',
            icon: <FiCalendar size={22} />,
            label: 'Events'
          },

          ...(accountType === 'business' ? [
            { 
              id: 'business', 
              icon: <FiBriefcase size={20} />, 
              label: 'Business' 
            }
          ] : []),
          ...(accountType === 'organization' ? [
            { 
              id: 'organizations', 
              icon: <FiLayers size={20} />, 
              label: 'Organizations' 
            }
          ] : []),
          ...(isSupport ? [
            { 
              id: 'support', 
              icon: <FiShield size={20} />, 
              label: 'Support' 
            }
          ] : [])
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                navigate(`/${tab.id}`);
                if (tab.id === 'chats') setChatFilter('all');
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-all duration-300 cursor-pointer shrink-0 hover:scale-105 active:scale-95 group ${
                isActive ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25' : 'text-slate-500 dark:text-white/50 hover:text-white dark:hover:text-white hover:bg-blue-600/20 dark:hover:bg-blue-600/20'
              }`}
              title={tab.label}
            >
              <span className="z-10 transition-transform duration-200 group-hover:scale-105">{tab.icon}</span>
              {tab.badge && tab.badgeType === 'count' && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[10px] px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#202C33] shadow-md z-20">
                  {tab.badge}
                </span>
              )}
              {tab.badge && tab.badgeType === 'dot' && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-[#202C33] z-20" />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-8 border-t border-slate-200 dark:border-white/5 my-1.5 shrink-0" />

        {/* Middle utilities: Archive & Aether AI */}
        {[
          {
            id: 'archive',
            icon: (
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-none stroke-current" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                <path d="M10 12h4" />
              </svg>
            ),
            label: 'Archived Chats',
            onClick: () => {
              setChatFilter('archived');
              setActiveTab('chats');
              navigate('/chats');
              toast.success('Viewing archived chats');
            }
          },
          {
            id: 'ai',
            icon: (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center relative overflow-hidden shadow-sm">
                <FiCpu className="text-[11px] text-white z-10 animate-spin-slow" />
              </div>
            ),
            label: 'Aether AI',
            onClick: () => {
              setActiveTab('ai');
              navigate('/ai');
              toast.success('Connected to secure AI core', { icon: '✨' });
            }
          },
          {
            id: 'help',
            icon: <FiHelpCircle size={22} />,
            label: 'Help & Support',
            onClick: () => {
              setActiveTab('settings');
              navigate('/settings');
              toast.success('Opening Help & Support Center', { icon: '🎧' });
            }
          }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-all duration-300 cursor-pointer shrink-0 hover:scale-105 active:scale-95 group ${
                isActive ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25' : 'text-slate-500 dark:text-white/50 hover:text-white dark:hover:text-white hover:bg-blue-600/20 dark:hover:bg-blue-600/20'
              }`}
              title={tab.label}
            >
              <span className="z-10 transition-transform duration-200 group-hover:scale-105">{tab.icon}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-3 items-center mt-auto shrink-0 w-full relative">

        {/* Divider */}
        <div className="w-8 border-t border-white/5 my-1 shrink-0" />

        {/* Interactive Profile avatar with dropdown context menu */}
        <div className="relative shrink-0 mb-2">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="relative w-10 h-10 rounded-full border-2 border-white/10 p-0.5 hover:scale-105 hover:border-[#2563EB] transition-all cursor-pointer overflow-hidden flex items-center justify-center shadow-lg"
            title="Profile Control"
          >
            {currentProfileAvatar ? (
              <img src={currentProfileAvatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-850 flex items-center justify-center text-xs font-bold text-slate-400 rounded-full">
                {(activeIdentity.data?.businessName || activeIdentity.data?.name || user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* Profile Dropdown context menu */}
          {showProfileMenu && (
            <div className="absolute bottom-12 left-2 z-50 bg-white dark:bg-[#202C33] border border-slate-200 dark:border-white/10 rounded-2xl p-2 w-48 shadow-2xl flex flex-col text-left backdrop-blur-xl">
              <button 
                onClick={() => {
                  navigate('/profile');
                  setActiveTab('profile');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-100 dark:hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-black dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FiUser size={16} className="text-[#2563EB]" /> View Profile
              </button>
              <button 
                onClick={() => {
                  navigate('/settings');
                  setActiveTab('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-100 dark:hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-black dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FiSettings size={16} className="text-blue-400" /> Settings
              </button>
              <button 
                onClick={() => {
                  navigate('/settings');
                  setActiveTab('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-100 dark:hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-black dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FiHelpCircle size={16} className="text-blue-400" /> Help & Support
              </button>
              {((user?.securitySettings?.pinLock || user?.security?.pinLock) || (user?.securitySettings?.faceId || user?.security?.faceId)) && (
                <button 
                  onClick={() => {
                    lockAppManual();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left py-2 px-3 hover:bg-slate-100 dark:hover:bg-[#2A3942]/60 rounded-lg text-[13px] text-black dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FiLock size={16} className="text-blue-400" /> Lock Terminal
                </button>
              )}
              <div className="border-t border-slate-200 dark:border-[#2A3942] my-1" />
              <button 
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left py-2 px-3 hover:bg-blue-500/10 rounded-lg text-[13px] text-black dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FiLogOut size={16} className="text-black dark:text-white" /> Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Identity Switcher integrated at bottom */}
        <div className="relative shrink-0 mb-2">
          <IdentitySwitcher 
            user={user}
            activeIdentity={activeIdentity}
            onSwitch={(identity) => {
              setActiveIdentity(identity);
              sessionStorage.setItem('aether_active_identity', JSON.stringify(identity));
              if (identity.type === 'business') {
                setActiveTab('business');
                navigate('/business');
              } else if (identity.type === 'organization') {
                setActiveTab('organizations');
                navigate(`/organizations/${identity.id}`);
              } else {
                if (activeTab === 'business' || activeTab === 'organizations') {
                  setActiveTab('chats');
                  navigate('/chats');
                }
              }
              toast.success(`Switched to ${identity.data?.name || identity.data?.businessName || 'Personal'}`, { icon: '🔄' });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NavSidebar;
