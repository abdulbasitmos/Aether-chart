import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiChevronDown, FiEdit3, FiBriefcase, FiLayers, FiInfo } from 'react-icons/fi';

const IdentitySwitcher = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const isPersonal = user?.accountType === 'personal' || !user?.accountType;

  return (
    <div className="relative shrink-0 w-full px-2" ref={menuRef}>
      {/* Profile Card Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-blue-500/10 hover:border-blue-500/30 hover:bg-slate-800 transition-all duration-200 cursor-pointer text-left shadow-md group"
      >
        <div className="w-8 h-8 rounded-full border border-blue-500/20 overflow-hidden shrink-0 bg-slate-950 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile Avatar" className="w-full h-full object-cover" />
          ) : (
            <FiUser size={14} className="text-slate-400 dark:text-slate-100" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-slate-100 truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {user?.name || user?.username || 'Personal Account'}
          </div>
          <div className="text-[9px] text-slate-400 truncate leading-tight mt-0.5 uppercase font-bold tracking-wider">
            {user?.accountType ? `${user.accountType} Tier` : 'Personal Tier'}
          </div>
        </div>
        <FiChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu popover */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-slate-900 border border-blue-500/20 rounded-2xl p-2.5 shadow-2xl text-slate-100 backdrop-blur-xl">
          <div className="px-2 py-1.5 border-b border-blue-500/10 mb-2">
            <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider block">Account Settings</span>
            <span className="text-[11px] text-slate-300 font-medium">Manage or upgrade your account type</span>
          </div>

          <div className="space-y-1">
            {/* Update Profile Details */}
            <button
              onClick={() => handleAction('/profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-blue-500/10 text-black dark:text-slate-100 transition-all cursor-pointer font-bold text-xs border border-transparent hover:border-blue-500/20"
            >
              <FiEdit3 size={14} className="text-blue-500 dark:text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="leading-none text-left">Edit Profile Info</p>
                <p className="text-[8px] text-slate-400 mt-0.5 normal-case font-normal truncate">Change name, bio, phone, avatar</p>
              </div>
            </button>

            {/* Upgrade Form options (Visible only if user is Personal) */}
            {isPersonal ? (
              <>
                <button
                  onClick={() => handleAction('/settings?tab=upgrade&type=business')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-blue-500/10 text-slate-100 transition-all cursor-pointer font-bold text-xs border border-transparent hover:border-blue-500/20"
                >
                  <FiBriefcase size={14} className="text-blue-500 dark:text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-none text-left">Upgrade to Business</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 normal-case font-normal truncate">Fill verification form & upgrade</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAction('/settings?tab=upgrade&type=organization')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-blue-500/10 text-slate-100 transition-all cursor-pointer font-bold text-xs border border-transparent hover:border-blue-500/20"
                >
                  <FiLayers size={14} className="text-blue-500 dark:text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-none text-left">Upgrade to Organization</p>
                    <p className="text-[8px] text-slate-400 mt-0.5 normal-case font-normal truncate">Fill verification form & upgrade</p>
                  </div>
                </button>
              </>
            ) : (
              <div className="p-2 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2 select-none">
                <FiInfo size={13} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[9px] text-slate-400 leading-normal text-left">
                  Your account is upgraded to <strong>{user.accountType.toUpperCase()}</strong> tier. Fill a support ticket for further changes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentitySwitcher;
