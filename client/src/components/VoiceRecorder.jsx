import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiTrash2, FiSend, FiPause, FiPlay } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const VoiceRecorder = ({ onCancel, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const animationRef = useRef(null);
  const timerRef = useRef(null);
  
  // Track all raw normalized volumes to downsample accurately at the end
  const fullWaveformHistoryRef = useRef([]);

  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100); // 100ms chunks
      setIsRecording(true);
      
      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      visualize();
    } catch (err) {
      console.error(err);
      toast.error('Microphone permission denied or not available.');
      onCancel();
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    // Throttle rendering to ~10 times a second for smoother visual bars
    let lastDrawTime = performance.now();

    const draw = (time) => {
      animationRef.current = requestAnimationFrame(draw);
      
      if (isPaused) return;

      if (time - lastDrawTime > 100) {
        lastDrawTime = time;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128); // Normalize 0 to 1
        
        fullWaveformHistoryRef.current.push(normalized);

        setWaveform(prev => {
          const newWave = [...prev, normalized];
          if (newWave.length > 30) return newWave.slice(newWave.length - 30);
          return newWave;
        });
      }
    };
    animationRef.current = requestAnimationFrame(draw);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Downsample the entire recording waveform history into 20 bars for the final UI
      const rawHistory = fullWaveformHistoryRef.current;
      const downsampledWaveform = [];
      const bucketSize = Math.max(1, Math.floor(rawHistory.length / 20));
      
      for (let i = 0; i < 20; i++) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < bucketSize; j++) {
          const idx = i * bucketSize + j;
          if (idx < rawHistory.length) {
            sum += rawHistory[idx];
            count++;
          }
        }
        downsampledWaveform.push(count > 0 ? (sum / count) : 0.05); // min 0.05 height
      }

      onSend(blob, formatTime(recordingTime), downsampledWaveform);
    };
    
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl w-full max-w-md border border-white/5"
    >
      <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors p-2 -ml-2 rounded-full hover:bg-white/5 cursor-pointer">
        <FiTrash2 size={20} />
      </button>

      <div className="flex items-center gap-3 flex-1">
        <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
        <span className="text-sm font-mono text-slate-200 min-w-[45px]">{formatTime(recordingTime)}</span>
        
        <div className="flex-1 flex items-center justify-end gap-[2px] h-8 px-1 overflow-hidden">
          {waveform.map((val, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-full transition-all duration-100 ${isPaused ? 'bg-slate-500' : 'bg-emerald-500'}`} 
              style={{ height: `${Math.max(10, val * 100)}%` }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isPaused ? (
          <button onClick={resumeRecording} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 hover:bg-slate-700 transition-colors cursor-pointer">
            <FiPlay size={16} fill="currentColor" />
          </button>
        ) : (
          <button onClick={pauseRecording} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-amber-500 hover:bg-slate-700 transition-colors cursor-pointer">
            <FiPause size={16} fill="currentColor" />
          </button>
        )}

        <button onClick={handleSend} className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 hover:bg-emerald-600 transition-colors transform hover:scale-105 cursor-pointer ml-1">
          <FiSend size={18} className="-ml-0.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default VoiceRecorder;
