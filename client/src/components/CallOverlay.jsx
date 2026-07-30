import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../contexts/ChatContext';
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiPhoneCall, 
  FiTv, FiUsers, FiVolume2, FiTrendingUp, FiAlertCircle 
} from 'react-icons/fi';

const CallOverlay = () => {
  const { 
    activeCall, 
    callDuration, 
    isMuted, 
    isCameraOn, 
    isScreenSharing, 
    signalStrength,
    setIsMuted,
    setIsCameraOn,
    setIsScreenSharing,
    acceptCall,
    declineCall,
    endCall,
    localStreamRef,
    remoteStreamRef
  } = useChat();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [activeCall, localStreamRef.current]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [activeCall, remoteStreamRef.current]);

  if (!activeCall) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isRingingIncoming = activeCall.direction === 'incoming' && activeCall.status === 'ringing';
  const isRingingOutgoing = activeCall.direction === 'outgoing' && activeCall.status === 'ringing';
  const isConnected = activeCall.status === 'connected';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 md:p-8"
      >
        <div className="relative w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden glass border border-white/5 flex flex-col justify-between p-8">
          
          {/* Top Panel: Call type, Signal and Secure lock info */}
          <div className="flex justify-between items-center z-10 select-none">
            <div className="flex items-center gap-2 bg-slate-900/50 py-1.5 px-3 rounded-full border border-white/5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{activeCall.type === 'video' ? 'Secure Video Session' : 'Encrypted Audio Call'}</span>
            </div>

            
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {isConnected && (
                <div className="flex items-center gap-1">
                  <FiTrendingUp className={`${
                    signalStrength === 'strong' ? 'text-blue-400' : signalStrength === 'fair' ? 'text-blue-400' : 'text-blue-500'
                  }`} />
                  <span className="capitalize">{signalStrength}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Visual Section */}
          <div className="flex-1 flex flex-col items-center justify-center z-10 py-6">
            
            {/* If Video Call & Connected: Show real streams */}
            {activeCall.type === 'video' && isConnected ? (
              <div className="relative w-full h-full max-h-[450px] bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                {/* Remote video stream (full background) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Fallback remote avatar when no remote stream */}
                {(!remoteStreamRef.current) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-slate-900/60 to-blue-950/20 flex flex-col items-center justify-center p-6 text-center">
                    <img 
                      src={activeCall.avatar} 
                      alt={activeCall.name} 
                      className="w-24 h-24 rounded-full mb-4 border border-white/10 shadow-2xl animate-pulse" 
                    />
                    <h3 className="text-xl font-bold font-display text-white">{activeCall.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Connecting...</p>
                  </div>
                )}
                {/* Local camera preview (draggable PIP) */}
                {isCameraOn && (
                  <motion.div 
                    drag
                    dragConstraints={{ left: -150, right: 150, top: -100, bottom: 100 }}
                    className="absolute bottom-4 right-4 w-32 h-44 rounded-xl overflow-hidden border border-blue-500/30 bg-slate-950 shadow-2xl z-20 cursor-grab active:cursor-grabbing"
                  >

                    {isScreenSharing ? (
                      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 text-[10px] p-2 text-center">
                        <FiTv className="text-blue-400 mb-1" />
                        Sharing Screen
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              // Voice Call Visual or Ringing Layout
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  {isRingingIncoming || isRingingOutgoing ? (
                    <div className="absolute -inset-4 border border-blue-500/20 rounded-full animate-pulse" />
                  ) : (
                    <div className="absolute -inset-4 border border-blue-500/10 rounded-full animate-pulse" />
                  )}

                  {isConnected && activeCall.type === 'audio' && remoteStreamRef.current ? (
                    <div className="w-28 h-28 rounded-full border border-blue-500/30 bg-slate-800 flex items-center justify-center shadow-2xl relative z-10">
                      <FiVolume2 size={36} className="text-blue-400 animate-pulse" />
                    </div>

                  ) : (
                    <img 
                      src={activeCall.avatar} 
                      alt={activeCall.name} 
                      className="w-28 h-28 rounded-full border border-white/5 shadow-2xl relative z-10" 
                    />
                  )}
                </div>

                <h2 className="text-2xl font-bold font-display text-white mb-2">{activeCall.name}</h2>
                
                {isRingingIncoming && (
                  <p className="text-blue-400 font-semibold tracking-wider text-xs uppercase animate-pulse">
                    Incoming Call...
                  </p>
                )}
                {isRingingOutgoing && (
                  <p className="text-slate-400 text-xs tracking-widest uppercase animate-pulse">
                    Ringing...
                  </p>
                )}
                {isConnected && (
                  <div className="flex flex-col items-center">
                    <p className="text-blue-400 font-display font-medium text-lg tabular-nums">
                      {formatTime(callDuration)}
                    </p>
                    <div className="mt-4 flex gap-1.5 items-center justify-center bg-white/[0.02] border border-white/5 py-1 px-3 rounded-full text-[10px] text-slate-500">
                      <FiUsers size={10} />
                      <span>Direct Connection</span>
                    </div>
                    {/* Audio-only: show local waveform for mic activity */}
                    {activeCall.type === 'audio' && (
                      <div className="mt-6 flex items-center gap-1">
                        {[0.3, 0.7, 0.9, 0.7, 0.4, 0.2, 0.5, 0.8].map((val, i) => (
                          <div key={i} className="w-1 bg-blue-500/60 rounded-full animate-pulse" style={{ height: `${16 * val}px` }} />
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

          </div>

          {/* Bottom Panel: Call Actions Bar */}
          <div className="flex flex-col items-center gap-4 z-10">
            {isRingingIncoming ? (
              <div className="flex gap-8 justify-center w-full">
                <button
                  onClick={declineCall}
                  className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 cursor-pointer animate-ring-red"
                >
                  <FiPhoneOff size={22} />
                </button>
                
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 cursor-pointer animate-pulse"
                >
                  <FiPhoneCall size={22} />
                </button>

              </div>
            ) : (
              <div className="flex items-center gap-4 md:gap-6 bg-slate-900/60 py-4 px-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    isMuted 
                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                      : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <FiMicOff size={18} /> : <FiMic size={18} />}
                </button>

                {activeCall.type === 'video' && (
                  <button
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                      !isCameraOn 
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                        : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                    title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                  >
                    {isCameraOn ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
                  </button>
                )}

                {activeCall.type === 'video' && (
                  <button
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                      isScreenSharing 
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                        : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                    title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  >

                    <FiTv size={18} />
                  </button>
                )}

                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 flex items-center justify-center text-white cursor-pointer shadow-lg shadow-blue-600/10"
                  title="End Call"
                >
                  <FiPhoneOff size={18} />
                </button>
              </div>
            )}

            {isConnected && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <FiAlertCircle size={10} />
                <span>{localStreamRef.current ? 'Real media active' : 'Audio-only'}</span>
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallOverlay;