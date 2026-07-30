import React, { useState, useCallback } from 'react';
import { FiSmartphone, FiMonitor } from 'react-icons/fi';

const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 812;
const HEADER_HEIGHT = 44;
const BOTTOM_BAR_HEIGHT = 34;

const MobileSimulator = ({ children }) => {
  const [orientation, setOrientation] = useState('portrait');

  const isPortrait = orientation === 'portrait';
  const viewWidth = isPortrait ? PHONE_WIDTH : PHONE_HEIGHT;
  const viewHeight = isPortrait ? PHONE_HEIGHT : PHONE_WIDTH;

  const scale = Math.min(
    window.innerWidth / (viewWidth + 40),
    window.innerHeight / (viewHeight + 60),
    1
  );

  const toggleOrientation = useCallback(() => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
        <button
          onClick={toggleOrientation}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {isPortrait ? 'Rotate ↔' : 'Rotate ↔'}
        </button>
        <button
          onClick={() => document.body.classList.remove('mobile-sim-active')}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <FiMonitor size={12} /> Desktop
        </button>
      </div>

      <div
        className="bg-black rounded-[40px] p-3 shadow-2xl"
        style={{
          width: viewWidth + 32,
          height: viewHeight + 64,
        }}
      >
        <div className="bg-black rounded-[36px] overflow-hidden relative" style={{ width: viewWidth, height: viewHeight }}>
          <div className="absolute top-0 left-0 right-0 h-[30px] bg-black z-10 flex items-center justify-center">
            <div className="w-20 h-5 bg-black rounded-full" />
          </div>

          <div
            className="overflow-hidden bg-white"
            style={{
              width: viewWidth,
              height: viewHeight - HEADER_HEIGHT - BOTTOM_BAR_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <div style={{ width: PHONE_WIDTH, minHeight: PHONE_HEIGHT }}>
              {children}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
            <div className="w-28 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSimulator;