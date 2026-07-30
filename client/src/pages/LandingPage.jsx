import React from 'react';
import { motion } from 'framer-motion';
import {
  FiMessageSquare,
  FiPhoneCall,
  FiUsers,
  FiRadio,
  FiCpu,
  FiLock,
  FiArrowRight,
} from 'react-icons/fi';
import InstallPWA from '../components/InstallPWA';
import logoImg from '../assets/logo.svg';
import authIllustration from '../assets/auth_illustration.jpg';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    { icon: <FiMessageSquare className="w-4.5 h-4.5" />, label: 'Secure Messaging', desc: 'End-to-end encrypted chats.' },
    { icon: <FiPhoneCall className="w-4.5 h-4.5" />, label: 'Voice & Video Calls', desc: 'Crystal clear connection.' },
    { icon: <FiUsers className="w-4.5 h-4.5" />, label: 'Communities', desc: 'Collaborate in groups.' },
    { icon: <FiRadio className="w-4.5 h-4.5" />, label: 'Channels', desc: 'Broadcast announcements.' },
    { icon: <FiCpu className="w-4.5 h-4.5" />, label: 'AI Features', desc: 'Smart replies & workspace.' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] px-4 py-8 lg:p-12 selection:bg-[#2563EB]/20">
      
      {/* Structural layout card */}
      <div className="w-full max-w-6xl mx-auto bg-[var(--bg-sidebar)]/30 border-[var(--border-color)] rounded-3xl shadow-2xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left: Content panel */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="col-span-1 lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-between"
        >
          {/* Logo header */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar)] border-[var(--border-color)] flex items-center justify-center p-2 shadow-lg">
              <img src={logoImg} alt="AetherChat" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight font-display">AetherChat</span>
          </motion.div>

          {/* Main content body */}
          <div className="my-10 lg:my-0 space-y-6">
            <motion.h1 
              variants={itemVariants}
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--text-primary)] leading-tight tracking-tight font-[Outfit]"
            >
              Unified communication<br />
              <span className="text-[#2563EB]">without compromises.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-lg"
            >
              A secure, open, and feature-rich messaging workspace. Coordinate projects, chat with Aether AI, and make encrypted voice/video calls inside a unified interface.
            </motion.p>

            {/* Action Group */}
            <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onGetStarted}
                className="group flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-[var(--text-primary)] font-bold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-[#2563EB]/10"
              >
                Get Started
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center border-[var(--border-color)] hover:border-[var(--border-color)] hover:bg-[var(--bg-sidebar)]/80 text-[var(--text-primary)] font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
              >
                Sign in
              </button>
            </motion.div>

            {/* Feature lists */}
            <motion.div variants={itemVariants} className="pt-8 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.slice(0, 4).map((f, i) => (
                <div key={f.label} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-sidebar)] border-[var(--border-color)] flex items-center justify-center text-[#2563EB] shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">{f.label}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Install App Section */}
            <motion.div variants={itemVariants}>
              <InstallPWA />
            </motion.div>
          </div>

          {/* Trust indicators */}
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] pt-6 lg:pt-0"
          >
            <FiLock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>End-to-end encrypted and completely private.</span>
          </motion.div>
        </motion.div>

        {/* Right: Graphic illustration panel */}
        <div className="col-span-1 lg:col-span-6 bg-[var(--bg-sidebar)]/30 border-t lg:border-t-0 lg:border-l border-[var(--border-color)] flex flex-col justify-center items-center p-8 sm:p-12 relative overflow-hidden select-none">
          {/* Decorative subtle ambient circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#2563EB]/[0.02] rounded-full blur-[80px] pointer-events-none" />

          {/* Interactive display card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
            className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-[var(--border-color)] shadow-2xl group cursor-default"
          >
            <img 
              src={authIllustration} 
              alt="Security Communication Workspace" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
            />
            {/* Dark flat overlay */}
            <div className="absolute inset-0 bg-black/10" />

            {/* Overlay interactive tags */}
            <motion.div
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute bottom-5 left-5 bg-[var(--bg-hover)] backdrop-blur-md border-[var(--border-color)] rounded-xl p-3 shadow-lg max-w-[180px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-wide">SECURE LINK</span>
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] mt-1">Real-time OTP verification & encrypted key stores.</p>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
