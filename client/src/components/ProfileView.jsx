import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { messageCategory } from '../utils/messageSearch';
import { 
  FiUser, FiCamera, FiEdit3, FiPhone, FiInfo, FiMail, 
  FiFolder, FiImage, FiFileText, FiLink, FiCheck, FiHeart 
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ProfileView = () => {
  const { user, updateProfile } = useAuth();
  const { chats } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(user.avatar);
  
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      toast.error('Name and Username are required');
      return;
    }

    updateProfile({
      name,
      username,
      bio,
      phone,
      avatar
    });
    setIsEditing(false);
  };

  // Real shared-media metrics across all conversations.
  const { mediaCount, docsCount, linksCount } = useMemo(() => {
    let media = 0, docs = 0, links = 0;
    (chats || []).forEach((c) => {
      (c.messages || []).forEach((m) => {
        if (m.isDateDivider) return;
        const cat = messageCategory(m);
        if (cat === 'media') media++;
        else if (cat === 'doc') docs++;
        else if (cat === 'link') links++;
      });
    });
    return { mediaCount: media, docsCount: docs, linksCount: links };
  }, [chats]);

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-10 flex justify-between items-center select-none">
        <div>
          <h2 className="text-lg font-bold font-display text-white">Your Profile</h2>
          <p className="text-[10px] text-slate-300 mt-0.5">Manage your credentials, bio details, and check shared media metrics</p>
        </div>

        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`py-2 px-4 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border ${
            isEditing 
              ? 'bg-slate-900 border-white/5 text-emerald-400' 
              : 'bg-emerald-500 border-transparent text-slate-950 shadow-lg shadow-emerald-500/10'
          }`}
        >
          {isEditing ? 'Cancel Edit' : <><FiEdit3 size={12} /> Edit Profile</>}
        </button>
      </div>

      {/* Profile Details Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 z-10">
        
        {/* Cover Photo & Avatar Card */}
        <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-slate-950 flex flex-col">
          <div className="w-full h-32" style={{ background: user.coverImage }} />
          
          <div className="px-6 pb-6 pt-0 flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <div className="relative w-24 h-24 rounded-full border border-slate-950 border-4 p-0.5 bg-slate-900 overflow-hidden select-none shrink-0 group">
              <img src={avatar} alt="Profile Avatar" className="w-full h-full rounded-full object-cover" />
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                >
                  <FiCamera size={16} className="mb-0.5" />
                  <span>Upload</span>
                </div>
              )}
            </div>

            <div className="text-center sm:text-left min-w-0 flex-1">
              <h3 className="text-base font-bold font-display text-white">{user.name}</h3>
              <p className="text-[10px] text-slate-300 mt-0.5">@{user.username}</p>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* Details and Edit Forms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Public Identity Info Panel */}
          <div className="md:col-span-2 space-y-4">
            {isEditing ? (
              <form onSubmit={handleSave} className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4 font-sans">
                <h4 className="text-xs font-bold text-white font-display select-none">Edit Public Profile Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1.5">Display Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1.5">Username Handle</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-1.5">Bio Description</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2.5 h-16 bg-[#0f1729] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 outline-none resize-none font-sans transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2 px-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Save Profile Changes
                </button>
              </form>
            ) : (
              <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4 font-sans">
                <h4 className="text-xs font-bold text-white font-display select-none">Account Identity Info</h4>
                
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-slate-400"><FiUser size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase select-none">Full Name</p>
                      <p className="text-xs text-white font-medium">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-slate-400"><FiMail size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase select-none">Email Address</p>
                      <p className="text-xs text-white font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-slate-400"><FiPhone size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase select-none">Registered Phone</p>
                      <p className="text-xs text-white font-medium">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#0f1729] border border-white/10 rounded-xl text-slate-400"><FiInfo size={14} /></div>
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase select-none">Bio / Status</p>
                      <p className="text-xs text-white font-medium leading-relaxed">{user.bio || 'Available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media Count and Statistics Grid */}
          <div className="space-y-4">
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-white font-display select-none">Shared Media Analytics</h4>
              
              <div className="grid grid-cols-3 gap-2 text-center select-none">
                <div className="p-3 bg-[#0f1729] border border-white/10 rounded-xl">
                  <FiImage className="mx-auto text-emerald-400 mb-1" size={14} />
                  <p className="text-xs font-bold text-white font-display">{mediaCount}</p>
                  <p className="text-[8px] text-slate-500 uppercase mt-0.5">Images</p>
                </div>
                
                <div className="p-3 bg-[#0f1729] border border-white/10 rounded-xl">
                  <FiFileText className="mx-auto text-emerald-400 mb-1" size={14} />
                  <p className="text-xs font-bold text-white font-display">{docsCount}</p>
                  <p className="text-[8px] text-slate-500 uppercase mt-0.5">Docs</p>
                </div>

                <div className="p-3 bg-[#0f1729] border border-white/10 rounded-xl">
                  <FiLink className="mx-auto text-purple-400 mb-1" size={14} />
                  <p className="text-xs font-bold text-white font-display">{linksCount}</p>
                  <p className="text-[8px] text-slate-500 uppercase mt-0.5">Links</p>
                </div>
              </div>
            </div>

            {/* Profile QR Code block */}
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col items-center text-center space-y-2 select-none">
              <h5 className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Aether Credentials QR</h5>
              <div className="p-2.5 bg-white rounded-xl">
                <img src={user.qrCode} alt="Profile QR Code" className="w-20 h-20" />
              </div>
              <p className="text-[8px] text-slate-500 max-w-[150px] leading-relaxed">Let other users scan to download your contact profile key.</p>
            </div>
          </div>

        </div>

      </div>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600">
        Decentralized profile details remain encrypted on your local client instance.
      </div>
    </div>
  );
};

export default ProfileView;

