import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { 
  FiFolder, FiImage, FiFileText, FiLink, FiDownload, 
  FiPlay, FiLayers, FiSearch, FiVideo, FiLock, FiUnlock,
  FiTrash2, FiHeart, FiCpu, FiPlus, FiGrid, FiList, FiCloud, FiX, FiCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const MediaGalleryView = () => {
  const { chats } = useChat();

  // Vault sections: 'dashboard' | 'gallery' | 'albums' | 'vault' | 'trash' | 'ai'
  const [activeSection, setActiveSection] = useState('dashboard');
  const [galleryTab, setGalleryTab] = useState('images'); // 'images' | 'videos' | 'documents' | 'audio'
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for vault files
  const [files, setFiles] = useState([
    { id: '1', type: 'images', name: 'UI_Mockup_Wireframe.png', size: '2.4 MB', url: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', timestamp: '10:30 AM', favorite: true, hidden: false, deleted: false, blurry: false, duplicate: false },
    { id: '2', type: 'images', name: 'Dark_Mode_Draft.png', size: '1.8 MB', url: 'linear-gradient(to right, #111827, #1E3A8A)', timestamp: '11:10 AM', favorite: false, hidden: false, deleted: false, blurry: true, duplicate: false },
    { id: '3', type: 'images', name: 'Stoic_Reflections.png', size: '1.2 MB', url: 'linear-gradient(to right, #243b55, #141e30)', timestamp: 'Yesterday', favorite: false, hidden: false, deleted: false, blurry: false, duplicate: true },
    { id: '4', type: 'images', name: 'Duplicate_Stoic.png', size: '1.2 MB', url: 'linear-gradient(to right, #243b55, #141e30)', timestamp: 'Yesterday', favorite: false, hidden: false, deleted: false, blurry: false, duplicate: true },
    { id: '5', type: 'videos', name: 'Demo_recording.mp4', size: '14.2 MB', duration: '1:45', timestamp: 'June 28', favorite: true, hidden: false, deleted: false, blurry: false, duplicate: false },
    { id: '6', type: 'documents', name: 'Aether_Architecture.pdf', size: '4.2 MB', typeStr: 'PDF', timestamp: '11:15 AM', favorite: false, hidden: false, deleted: false, blurry: false, duplicate: false },
    { id: '7', type: 'documents', name: 'Requirements.docx', size: '840 KB', typeStr: 'DOCX', timestamp: 'June 22', favorite: false, hidden: false, deleted: false, blurry: false, duplicate: false },
    { id: '8', type: 'documents', name: 'SourceCode.zip', size: '15.4 MB', typeStr: 'ZIP', timestamp: 'June 18', favorite: false, hidden: true, deleted: false, blurry: false, duplicate: false },
    { id: '9', type: 'audio', name: 'voice_memo.mp3', size: '1.8 MB', duration: '0:45', timestamp: '9:06 AM', favorite: false, hidden: false, deleted: false, blurry: false, duplicate: false }
  ]);

  // Hidden Vault password lock screen
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Local Albums State
  const [albums, setAlbums] = useState([
    { id: 'alb_1', name: 'Design Mockups', count: 3, cover: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
    { id: 'alb_2', name: 'Product Deliverables', count: 2, cover: 'linear-gradient(to right, #243b55, #141e30)' }
  ]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showAlbumModal, setShowAlbumModal] = useState(false);

  // Uploader center references
  const fileUploaderRef = useRef(null);

  const toggleFavorite = (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, favorite: !f.favorite } : f));
    toast.success('Favorite status updated');
  };

  const toggleHideFile = (id) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        const nextState = !f.hidden;
        toast(nextState ? 'Moved to Hidden Vault' : 'Restored to Gallery', { icon: '🔒' });
        return { ...f, hidden: nextState };
      }
      return f;
    }));
  };

  const handleDeleteFile = (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, deleted: true } : f));
    toast.success('Moved to Trash bin');
  };

  const handleRestoreFile = (id) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, deleted: false } : f));
    toast.success('Restored to active gallery');
  };

  const handlePermanentDelete = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast.success('Deleted permanently');
  };

  const handleUploadFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newF = {
        id: 'new_' + Date.now(),
        type: file.type.startsWith('image') ? 'images' : file.type.startsWith('video') ? 'videos' : 'documents',
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        url: event.target.result,
        timestamp: 'Just now',
        favorite: false,
        hidden: false,
        deleted: false,
        blurry: false,
        duplicate: false
      };
      setFiles(prev => [newF, ...prev]);
      toast.success(`${file.name} uploaded to Vault!`);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAlbumSubmit = (e) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    const newAlb = {
      id: 'alb_' + Date.now(),
      name: newAlbumName,
      count: 0,
      cover: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
    };
    setAlbums(prev => [...prev, newAlb]);
    setNewAlbumName('');
    setShowAlbumModal(false);
    toast.success(`Album "${newAlbumName}" created!`);
  };

  const handleVerifyPinCode = (e) => {
    e.preventDefault();
    if (pinInput === '1234') {
      setVaultUnlocked(true);
      setPinInput('');
      toast.success('Secure Vault Unlocked', { icon: '🔓' });
    } else {
      toast.error('Passcode mismatch. Try again.');
      setPinInput('');
    }
  };

  // Filters computed lists
  const visibleFiles = files.filter(f => !f.deleted && !f.hidden);
  
  const filteredGalleryFiles = visibleFiles.filter(f => {
    const matchesTab = f.type === galleryTab;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const hiddenFiles = files.filter(f => !f.deleted && f.hidden);
  const deletedFiles = files.filter(f => f.deleted);
  const favoriteFiles = visibleFiles.filter(f => f.favorite);

  // AI lists
  const blurryFiles = visibleFiles.filter(f => f.blurry);
  const duplicateFiles = visibleFiles.filter(f => f.duplicate);

  return (
    <div className="flex-1 h-full bg-[#080c14] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.01) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />

      {/* 1. Header Area */}
      <div className="p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-15 flex flex-col gap-4 select-none">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold font-display text-white">Media Vault</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Protect, categorize, and organize files shared in your chat nodes</p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => fileUploaderRef.current?.click()}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-emerald-500/10"
            >
              <FiPlus size={12} /> Upload File
            </button>
            <input 
              type="file" 
              ref={fileUploaderRef} 
              onChange={handleUploadFileSelect} 
              className="hidden" 
            />
          </div>
        </div>

        {/* Categories / Navigation bar */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {[
            { id: 'dashboard', label: 'Vault Dashboard' },
            { id: 'gallery', label: 'Secure Gallery' },
            { id: 'albums', label: 'Albums' },
            { id: 'vault', label: 'Hidden Vault 🔒' },
            { id: 'trash', label: 'Trash Bin 🗑️' },
            { id: 'ai', label: 'AI Insights 🤖' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-1.5 px-3 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                activeSection === section.id
                  ? 'bg-slate-900 border border-white/5 text-emerald-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Content Frame */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        
        {/* SECTION: DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Storage Card dashboard */}
            <div className="p-5 bg-white/[0.01] border border-white/5 rounded-3xl grid grid-cols-2 sm:grid-cols-4 gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 filter blur-2xl rounded-full pointer-events-none" />
              {[
                { title: 'Used Storage', val: '1.34 GB', desc: 'Secure folder' },
                { title: 'Images indexed', val: visibleFiles.filter(f => f.type === 'images').length, desc: 'Active gallery' },
                { title: 'Favorites', val: favoriteFiles.length, desc: 'Starred files' },
                { title: 'Backup status', val: 'Active', desc: 'Cloud synced' }
              ].map((card, i) => (
                <div key={i} className="space-y-1 select-none">
                  <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">{card.title}</span>
                  <h4 className="text-base font-bold text-slate-200 font-display leading-none">{card.val}</h4>
                  <p className="text-[8px] text-slate-600 font-semibold">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Favorite Media carousel list */}
            <div className="space-y-3">
              <h4 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1">Favorite Assets</h4>
              
              {favoriteFiles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {favoriteFiles.map(file => (
                    <div key={file.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="min-w-0">
                        <h5 className="text-[11px] font-bold text-slate-300 truncate">{file.name}</h5>
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{file.size}</p>
                      </div>
                      <button 
                        onClick={() => toggleFavorite(file.id)}
                        className="text-rose-500 hover:text-slate-500 cursor-pointer"
                      >
                        <FiHeart size={12} fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">
                  No files starred as favorite yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: SECURE GALLERY */}
        {activeSection === 'gallery' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Inner subtab filters row & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between select-none">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
                {[
                  { id: 'images', icon: <FiImage size={12} />, label: 'Images' },
                  { id: 'videos', icon: <FiVideo size={12} />, label: 'Videos' },
                  { id: 'documents', icon: <FiFileText size={12} />, label: 'Documents' },
                  { id: 'audio', icon: <FiPlay size={12} />, label: 'Audio' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setGalleryTab(tab.id)}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                      galleryTab === tab.id
                        ? 'bg-slate-900 border border-white/5 text-emerald-400 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-48 shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><FiSearch size={12} /></span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gallery..."
                  className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-white/5 rounded-xl text-[10px] text-slate-200 focus:border-emerald-500/25 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Files Grid view */}
            {filteredGalleryFiles.length > 0 ? (
              <div className={galleryTab === 'images' ? 'grid grid-cols-2 sm:grid-cols-4 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                {filteredGalleryFiles.map(file => (
                  <div key={file.id} className="group relative">
                    
                    {/* Image Cards */}
                    {file.type === 'images' && (
                      <div 
                        className="aspect-square rounded-2xl border border-white/5 overflow-hidden relative cursor-pointer hover:scale-[1.02] active:scale-98 transition-all"
                        style={{ background: file.url?.startsWith('data:') ? `url(${file.url}) center/cover` : file.url }}
                      >
                        <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-2 right-2 flex gap-1 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(file.id); }}
                            className="p-1 bg-slate-950/80 rounded-md text-slate-400 hover:text-rose-400"
                          >
                            <FiHeart size={10} fill={file.favorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHideFile(file.id); }}
                            className="p-1 bg-slate-950/80 rounded-md text-slate-400 hover:text-emerald-400"
                          >
                            <FiLock size={10} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                            className="p-1 bg-slate-950/80 rounded-md text-slate-400 hover:text-rose-500"
                          >
                            <FiTrash2 size={10} />
                          </button>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950/80 to-transparent">
                          <p className="text-[10px] font-bold text-white truncate">{file.name}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">{file.timestamp} • {file.size}</p>
                        </div>
                      </div>
                    )}

                    {/* File/Doc/Video list layouts */}
                    {file.type !== 'images' && (
                      <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-colors text-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-900 text-slate-400 border border-white/5 rounded-xl">
                            {file.type === 'videos' ? <FiVideo size={13} /> : <FiFileText size={13} />}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-200">{file.name}</h5>
                            <p className="text-[9px] text-slate-500 mt-0.5">{file.size} • {file.timestamp}</p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 select-none">
                          <button
                            onClick={() => toggleFavorite(file.id)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-500 hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <FiHeart size={11} fill={file.favorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => toggleHideFile(file.id)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-500 hover:text-emerald-400 rounded-lg cursor-pointer"
                            title="Hide"
                          >
                            <FiLock size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-white/5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">
                No matching media files indexed in gallery.
              </div>
            )}
          </div>
        )}

        {/* SECTION: ALBUMS */}
        {activeSection === 'albums' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Albums Directory</h3>
              <button 
                onClick={() => setShowAlbumModal(true)}
                className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <FiPlus size={11} /> Create Album
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {albums.map(alb => (
                <div key={alb.id} className="group cursor-pointer space-y-2 select-none">
                  <div 
                    className="aspect-video rounded-2xl border border-white/5 hover:border-white/15 transition-all"
                    style={{ background: alb.cover }}
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{alb.name}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5">{alb.count} assets</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: HIDDEN VAULT */}
        {activeSection === 'vault' && (
          <div className="max-w-md mx-auto">
            {!vaultUnlocked ? (
              <form onSubmit={handleVerifyPinCode} className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl space-y-4 text-center select-none">
                <FiLock className="mx-auto text-emerald-400 animate-pulse" size={24} />
                <div>
                  <h4 className="text-sm font-bold text-slate-200 font-display">Decryption Passcode Required</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Enter security credentials to open hidden vault folder. Default bypass PIN is 1234.</p>
                </div>
                <input
                  type="password"
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 4-digit PIN..."
                  className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-center text-xs text-slate-200 outline-none tracking-widest focus:border-emerald-500/20"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Decrypt Folder
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center select-none">
                  <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><FiUnlock /> Secure Vault Contents</h4>
                  <button 
                    onClick={() => { setVaultUnlocked(false); toast.success('Vault folder locked'); }}
                    className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-lg text-[9px] font-semibold cursor-pointer active:scale-95 transition-all"
                  >
                    Lock Folder
                  </button>
                </div>

                <div className="space-y-2.5">
                  {hiddenFiles.length > 0 ? (
                    hiddenFiles.map(file => (
                      <div key={file.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-950 border border-white/5 text-[#2563EB] rounded-lg select-none">
                            ZIP
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-200">{file.name}</h5>
                            <p className="text-[9px] text-slate-500 mt-0.5">{file.size}</p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 select-none">
                          <button
                            onClick={() => toggleHideFile(file.id)}
                            className="p-1 px-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-[9px] text-slate-400 hover:text-white rounded-lg cursor-pointer"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(file.id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-white/5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                          >
                            <FiTrash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-600 text-xs italic border border-dashed border-white/5 rounded-2xl">
                      Secure folder is empty.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION: TRASH BIN */}
        {activeSection === 'trash' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Recently Deleted (Permanently purge in 30 days)</h3>
              {deletedFiles.length > 0 && (
                <button
                  onClick={() => {
                    setFiles(prev => prev.filter(f => !f.deleted));
                    toast.success('Trash emptied');
                  }}
                  className="py-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-[9px] font-bold cursor-pointer active:scale-95 transition-all"
                >
                  Empty Trash
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {deletedFiles.length > 0 ? (
                deletedFiles.map(file => (
                  <div key={file.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <h5 className="font-bold text-slate-200">{file.name}</h5>
                      <p className="text-[9px] text-slate-500 mt-0.5">{file.size}</p>
                    </div>

                    <div className="flex gap-1.5 select-none">
                      <button
                        onClick={() => handleRestoreFile(file.id)}
                        className="py-1 px-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-[9px] font-semibold text-slate-400 hover:text-white rounded-lg cursor-pointer"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(file.id)}
                        className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-white/5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                      >
                        <FiTrash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-600 text-xs italic bg-white/[0.005] border border-dashed border-white/5 rounded-2xl">
                  Trash bin is empty.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: AI ORGANIZER */}
        {activeSection === 'ai' && (
          <div className="space-y-6 max-w-2xl mx-auto font-sans text-xs">
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <FiCpu className="text-emerald-400 animate-spin-slow" size={16} />
                <h4 className="text-sm font-bold text-slate-200 font-display">Aether Neural Photo Scan</h4>
              </div>
              <p className="text-slate-500 leading-normal">Our integrated AI models automatically analyze indices in your gallery to detect blurry screenshots, duplicated elements, or low-resolution duplicates.</p>
            </div>

            {/* Blurry files check */}
            <div className="space-y-3">
              <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Detected Blurry screenshots ({blurryFiles.length})</h5>
              {blurryFiles.length > 0 ? (
                <div className="space-y-2">
                  {blurryFiles.map(file => (
                    <div key={file.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <h6 className="font-bold text-slate-200">{file.name}</h6>
                        <p className="text-[9px] text-amber-500 mt-0.5">Low focus quality detected</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="py-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[9px] font-bold cursor-pointer"
                      >
                        Purge File
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-600 text-xs italic border border-dashed border-white/5 rounded-xl">
                  Focus quality audit healthy.
                </div>
              )}
            </div>

            {/* Duplicate files check */}
            <div className="space-y-3">
              <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Duplicate Elements identified ({duplicateFiles.length})</h5>
              {duplicateFiles.length > 0 ? (
                <div className="space-y-2">
                  {duplicateFiles.map(file => (
                    <div key={file.id} className="p-3 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <h6 className="font-bold text-slate-200">{file.name}</h6>
                        <p className="text-[9px] text-slate-500 mt-0.5">{file.size} • Duplicate matches found</p>
                      </div>
                      <button
                        onClick={() => handlePermanentDelete(file.id)}
                        className="py-1 px-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-lg text-[9px] font-semibold cursor-pointer"
                      >
                        Delete Duplicate
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-600 text-xs italic border border-dashed border-white/5 rounded-xl">
                  No duplicate file fragments matched.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* CREATE ALBUM MODAL */}
      <AnimatePresence>
        {showAlbumModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111827] border border-white/5 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <div className="flex justify-between items-center select-none mb-4">
                <h3 className="text-sm font-bold font-display text-white">Create Album</h3>
                <button 
                  onClick={() => setShowAlbumModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <FiX size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateAlbumSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Album Name</label>
                  <input
                    type="text"
                    required
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="e.g. Work Assets"
                    className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Initialize Album
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 border-t border-white/5 bg-slate-950/80 text-center select-none text-[9px] text-slate-600 shrink-0">
        Media documents are cached locally to support rapid offline browsing.
      </div>
    </div>
  );
};

export default MediaGalleryView;
