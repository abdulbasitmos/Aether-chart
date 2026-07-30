import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiAlertCircle } from 'react-icons/fi';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPages from './pages/AuthPages';
import MainDashboard from './pages/MainDashboard';
import LockScreen from './pages/LockScreen';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, requiredType }) => {
  const { accountType } = useAuth();
  if (accountType === 'personal') {
    return <Navigate to="/settings" replace />;
  }
  if (requiredType && accountType !== requiredType) {
    return <Navigate to="/chats" replace />;
  }
  return children;
};

const SupportRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'support' && user.role !== 'admin')) {
    return <Navigate to="/chats" replace />;
  }
  return children;
};

const BannedNotice = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-[#080c14] p-8">
    <div className="max-w-md text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <FiAlertCircle size={28} className="text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-white font-display">Account Suspended</h1>
      <p className="text-sm text-slate-400">Your account has been suspended. Please contact support for assistance.</p>
      <div className="p-4 bg-[#0f1729] border border-white/5 rounded-xl">
        <p className="text-xs text-slate-300">support@aetherchat.io</p>
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, appLocked, authLoading, isBanned, user, isSupport } = useAuth();
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = React.useState(false);
  const [redirectDone, setRedirectDone] = React.useState(() => {
    return sessionStorage.getItem('aether_support_redirected') === 'true';
  });

  // Reset landing page state when user logs out
  React.useEffect(() => {
    if (!isAuthenticated) {
      setHasStarted(false);
    }
  }, [isAuthenticated]);

  // Auto-redirect support/admin users to /support
  React.useEffect(() => {
    if (!isAuthenticated) {
      setRedirectDone(false);
      sessionStorage.removeItem('aether_support_redirected');
      return;
    }
    if (isSupport && !appLocked && !redirectDone) {
      const path = window.location.pathname;
      if (path !== '/support') {
        navigate('/support', { replace: true });
        setRedirectDone(true);
        sessionStorage.setItem('aether_support_redirected', 'true');
      } else {
        setRedirectDone(true);
        sessionStorage.setItem('aether_support_redirected', 'true');
      }
    }
  }, [isAuthenticated, isSupport, appLocked, navigate, redirectDone]);

  // Show loading splash while checking auth on refresh
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)] font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, show landing page first, then auth flow
  if (!isAuthenticated) {
    if (!hasStarted) {
      return <LandingPage onGetStarted={() => setHasStarted(true)} />;
    }
    return <AuthPages onBack={() => setHasStarted(false)} />;
  }

  // If app is locked, force Lock screen
  if (appLocked) {
    return <LockScreen />;
  }

  // If user is banned, show suspension notice
  if (isBanned) {
    return <BannedNotice />;
  }

  // Main application routing
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />
      <Route path="/chats" element={<MainDashboard tab="chats" />} />
      <Route path="/chats/:chatId" element={<MainDashboard tab="chats" />} />
      <Route path="/calls" element={<MainDashboard tab="calls" />} />
      <Route path="/status" element={<MainDashboard tab="status" />} />
      <Route path="/channels" element={<MainDashboard tab="channels" />} />
      <Route path="/communities" element={<MainDashboard tab="communities" />} />
      <Route path="/settings" element={<MainDashboard tab="settings" />} />
      <Route path="/profile" element={<MainDashboard tab="profile" />} />
      <Route path="/notifications" element={<MainDashboard tab="notifications" />} />
      <Route path="/search" element={<MainDashboard tab="search" />} />
      <Route path="/add-contact" element={<MainDashboard tab="add-contact" />} />
      <Route path="/gallery" element={<MainDashboard tab="gallery" />} />
      <Route path="/tasks" element={<MainDashboard tab="tasks" />} />
      <Route path="/feed" element={<MainDashboard tab="feed" />} />
      <Route path="/my-events" element={<MainDashboard tab="my-events" />} />

      <Route path="/events/join/:token" element={<MainDashboard tab="my-events" />} />
      <Route path="/workshops/join/:token" element={<MainDashboard tab="my-events" />} />
      <Route path="/ai" element={<MainDashboard tab="ai" />} />
      <Route path="/business" element={<ProtectedRoute requiredType="business"><MainDashboard tab="business" /></ProtectedRoute>} />
      <Route path="/business/:id" element={<MainDashboard tab="business-view" />} />
      <Route path="/business/:id/book" element={<MainDashboard tab="business-book" />} />
      <Route path="/businesses" element={<MainDashboard tab="businesses" />} />
      <Route path="/organizations" element={<ProtectedRoute requiredType="organization"><MainDashboard tab="organizations" /></ProtectedRoute>} />
      <Route path="/organizations/:orgId" element={<ProtectedRoute requiredType="organization"><MainDashboard tab="organizations" /></ProtectedRoute>} />
      <Route path="/org-search" element={<ProtectedRoute requiredType="organization"><MainDashboard tab="org-search" /></ProtectedRoute>} />
      <Route path="/support" element={<SupportRoute><MainDashboard tab="support" /></SupportRoute>} />
      <Route path="/organization/:id" element={<MainDashboard tab="org-view" />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/chats" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <div className="w-full text-slate-100 font-sans">
          <AppContent />
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg, rgba(15, 23, 42, 0.8))',
                color: 'var(--toast-color, #f8fafc)',
                backdropFilter: 'blur(12px)',
                border: 'var(--toast-border, 1px solid rgba(255, 255, 255, 0.08))',
                boxShadow: 'var(--toast-shadow, 0 8px 32px 0 rgba(0, 0, 0, 0.3))',
                borderRadius: '12px',
                fontFamily: 'Outfit, sans-serif'
              },
            }}
          />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;

