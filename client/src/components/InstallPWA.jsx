import { useState, useEffect, useRef } from 'react';
import { FiDownload, FiSmartphone, FiChrome, FiMonitor } from 'react-icons/fi';

let deferredPromptGlobal = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPromptGlobal = e;
});

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(deferredPromptGlobal);
  const [isInstalled, setIsInstalled] = useState(false);
  const [status, setStatus] = useState('checking');
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      setStatus('installed');
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      deferredPromptGlobal = e;
      setPrompt(e);
      setStatus('ready');
    };
    window.addEventListener('beforeinstallprompt', handler);

    const mq = window.matchMedia('(display-mode: standalone)');
    const onInstall = (e) => {
      if (e.matches) {
        setIsInstalled(true);
        setStatus('installed');
      }
    };
    mq.addEventListener('change', onInstall);

    navigator.serviceWorker?.getRegistration?.()
      .then((reg) => {
        if (reg) setStatus(deferredPromptGlobal ? 'ready' : 'waiting');
        else setStatus('nosw');
      })
      .catch(() => setStatus('nosw'));

    const timer = setTimeout(() => {
      if (deferredPromptGlobal) {
        setPrompt(deferredPromptGlobal);
        setStatus('ready');
      } else {
        setStatus((s) => (s === 'checking' ? 'waiting' : s));
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      mq.removeEventListener('change', onInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    const p = promptRef.current || deferredPromptGlobal;
    if (!p) {
      setStatus('waiting');
      return;
    }
    p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setStatus('installed');
    } else {
      setStatus('dismissed');
    }
    deferredPromptGlobal = null;
    setPrompt(null);
  };

  if (isInstalled || status === 'installed') return null;

  const canInstall = !!(promptRef.current || deferredPromptGlobal);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#2563EB]/10 to-[#2563EB]/5 border border-[#2563EB]/20 p-5 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 flex items-center justify-center shrink-0">
          <FiSmartphone className="w-5 h-5 text-[#2563EB]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Get the App</h3>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Install AetherChat on your device for a faster, offline-ready experience.
          </p>
        </div>
      </div>

      {canInstall ? (
        <button
          onClick={handleInstall}
          className="mt-4 flex items-center justify-center gap-2 w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-bold text-sm px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#2563EB]/25"
        >
          <FiDownload className="w-4 h-4" />
          <span>Install AetherChat</span>
        </button>
      ) : status === 'waiting' || status === 'dismissed' ? (
        <div className="mt-4 space-y-2">
          <button
            onClick={handleInstall}
            className="flex items-center justify-center gap-2 w-full bg-[var(--bg-sidebar)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-sm px-5 py-3 rounded-xl transition-all cursor-pointer"
          >
            <FiDownload className="w-4 h-4" />
            <span>Ready to Install</span>
          </button>
          <p className="text-[11px] text-[var(--text-muted)] text-center">
            Make sure you are using Chrome or Edge, then click the button above.
          </p>
        </div>
      ) : isIOS || isSafari ? (
        <div className="mt-4 text-[12px] text-[var(--text-muted)] leading-relaxed bg-[var(--bg-sidebar)]/50 rounded-xl px-4 py-3 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2">
            <FiMonitor className="w-4 h-4 text-[#2563EB]" />
            <span className="font-semibold text-[var(--text-primary)] text-[13px]">Manual Install</span>
          </div>
          Open in <span className="font-semibold text-[var(--text-primary)]">Safari</span>, tap{' '}
          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--text-primary)]">
            <FiChrome className="w-3 h-3" /> Share
          </span>{' '}
          &gt; <span className="font-semibold text-[var(--text-primary)]">Add to Home Screen</span>
        </div>
      ) : (
        <div className="mt-4 text-[12px] text-[var(--text-muted)] leading-relaxed bg-[var(--bg-sidebar)]/50 rounded-xl px-4 py-3 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2">
            <FiMonitor className="w-4 h-4 text-[#2563EB]" />
            <span className="font-semibold text-[var(--text-primary)] text-[13px]">Install from Browser</span>
          </div>
          Open in <span className="font-semibold text-[var(--text-primary)]">Chrome/Edge</span>, look for the{' '}
          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--text-primary)]">
            <FiDownload className="w-3 h-3" /> Install
          </span>{' '}
          icon in the address bar.
        </div>
      )}
    </div>
  );
}
