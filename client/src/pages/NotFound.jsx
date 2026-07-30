import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiAlertCircle } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center p-6 bg-[#030712] relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/5 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-600/5 rounded-full filter blur-3xl" />

      <div className="text-center z-10 flex flex-col items-center max-w-sm">
        <div className="w-16 h-16 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mb-6 text-slate-400">
          <FiAlertCircle size={32} className="animate-bounce" />
        </div>
        
        <h1 className="text-6xl font-extrabold font-display text-white tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-slate-300 mt-3 font-display">Page Not Found</h2>
        <p className="text-slate-500 text-xs mt-2 mb-8 leading-relaxed">
          The node you are trying to access does not exist or has been encrypted. Please verify the URL.
        </p>

        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer text-sm"
        >
          <FiHome size={16} /> Return Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
