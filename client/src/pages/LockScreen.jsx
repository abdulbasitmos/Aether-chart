import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { FiLock, FiUserCheck, FiTarget } from 'react-icons/fi';

const LockScreen = () => {
  const { user, unlockApp, lockMethod } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [time, setTime] = useState(new Date());
  const [scanning, setScanning] = useState(false);

  // Time & Date Header
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        // Trigger verification
        setTimeout(() => {
          const success = unlockApp(nextPin);
          if (!success) {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 800);
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const simulateBiometric = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      unlockApp(user?.security?.pin || '1234'); // Simulate successful FaceID / Fingerprint matching
    }, 2000);
  };

  return (
    <div className="relative h-screen w-screen flex flex-col justify-between items-center p-8 bg-[var(--bg-app)] overflow-hidden">
      {/* Background Graphic Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full filter blur-3xl" />

      {/* Top Section: Date & Time */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mt-12 z-10 select-none"
      >
        <h1 className="text-6xl font-light font-display tracking-tight text-[var(--text-primary)] drop-shadow-md">
          {formattedTime}
        </h1>
        <p className="text-[var(--text-secondary)] font-medium mt-2 text-sm tracking-wide uppercase">
          {formattedDate}
        </p>
      </motion.div>

      {/* Middle Section: Avatar / Locker */}
      <div className="flex flex-col items-center z-10 w-full max-w-sm px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6"
        >
          <img 
            src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Lock'} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full border-2 border-emerald-500/30 p-1 shadow-2xl" 
          />
          <div className="absolute bottom-0 right-0 p-2 bg-[var(--bg-hover)] border border-emerald-500/40 rounded-full shadow-lg text-emerald-500">
            {lockMethod === 'faceid' ? <FiUserCheck size={16} /> : <FiLock size={16} />}
          </div>
        </motion.div>

        <h2 className="text-xl font-semibold font-display text-[var(--text-primary)] mb-1">{user?.name || 'Aether User'}</h2>
        <p className="text-[var(--text-secondary)] text-xs mb-6">Enter credentials to unlock Aether</p>

        {/* PIN Indicators */}
        {lockMethod === 'pin' && (
          <motion.div 
            animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-4 justify-center mb-8"
          >
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  error 
                    ? 'border-rose-500 bg-rose-500' 
                    : pin.length > idx 
                      ? 'border-emerald-400 bg-emerald-400' 
                      : 'border-slate-600 bg-transparent'
                }`}
              />
            ))}
          </motion.div>
        )}

        {/* Biometric Scan Simulator */}
        {lockMethod !== 'pin' && (
          <div className="flex flex-col items-center mb-6">
            <AnimatePresence mode="wait">
              {scanning ? (
                <motion.div 
                  key="scanning"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-28 h-28 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                    <motion.div 
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 border border-emerald-500/50 rounded-full animate-ring-emerald"
                    />
                    <FiTarget className="text-emerald-400 text-3xl animate-pulse" />
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold tracking-widest animate-pulse uppercase">
                    Analyzing biometrics...
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="ready"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <button 
                    onClick={simulateBiometric}
                    className="w-28 h-28 border border-white/10 rounded-full hover:border-emerald-500/30 flex items-center justify-center mb-4 hover:shadow-2xl transition-all duration-300 bg-slate-900/50 group"
                  >
                    <FiUserCheck className="text-slate-400 text-3xl group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" />
                  </button>
                  <p className="text-xs text-slate-400 font-medium">
                    Tap to trigger FaceID / Fingerprint scan
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Link to bypass/switch to PIN */}
            <button 
              onClick={simulateBiometric} 
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 mt-6 cursor-pointer"
            >
              Alternative authentication
            </button>
          </div>
        )}
      </div>

      {/* Bottom Section: PIN Pad */}
      {lockMethod === 'pin' && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-3 gap-y-4 gap-x-8 max-w-[260px] mb-12 z-10 font-display text-xl"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-14 h-14 rounded-full border border-[var(--border-color)] bg-white/[0.02] active:bg-white/15 hover:border-[var(--border-color)] flex items-center justify-center hover:shadow-lg transition-all duration-150 text-[var(--text-primary)] font-medium cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={simulateBiometric}
            className="w-14 h-14 rounded-full flex items-center justify-center hover:bg-white/[0.03] text-[var(--text-muted)] transition-all duration-150 cursor-pointer"
          >
            <FiTarget size={20} />
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-14 h-14 rounded-full border border-[var(--border-color)] bg-white/[0.02] active:bg-white/15 hover:border-[var(--border-color)] flex items-center justify-center transition-all duration-150 text-[var(--text-primary)] font-medium cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-14 h-14 rounded-full flex items-center justify-center hover:bg-white/[0.03] text-[var(--text-muted)] transition-all duration-150 active:scale-95 cursor-pointer"
          >
            &larr;
          </button>
        </motion.div>
      )}

    </div>
  );
};

export default LockScreen;
