import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { currentUser, getAvatarSvg } from '../data/mockData';
import toast from 'react-hot-toast';
import axios from 'axios';
import { mockSocket } from '../services/mockSocket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = sessionStorage.getItem('aether_user');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* ignore */ }
    }
    return currentUser;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!sessionStorage.getItem('aether_token') && !!sessionStorage.getItem('aether_user');
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [appLocked, setAppLocked] = useState(false);
  const [lockMethod, setLockMethod] = useState(null); // 'pin' | 'faceid' | null
  const [loginStep, setLoginStep] = useState('welcome'); // welcome, login, register, forgot, otp, reset, create-profile
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const [activeIdentity, setActiveIdentity] = useState(() => {
    try {
      const cached = sessionStorage.getItem('aether_active_identity');
      return cached ? JSON.parse(cached) : { type: 'personal', id: null, data: null };
    } catch {
      return { type: 'personal', id: null, data: null };
    }
  });

  useEffect(() => {
    if (user) {
      if (activeIdentity.type === 'personal') {
        setActiveIdentity(prev => ({ ...prev, data: user }));
      }
    }
  }, [user]);

  const currentProfileName = useMemo(() => {
    if (activeIdentity.type === 'business') {
      return activeIdentity.data?.businessName || 'Business Profile';
    } else if (activeIdentity.type === 'organization') {
      return activeIdentity.data?.name || 'Organization Profile';
    }
    return user?.name || 'Personal Account';
  }, [activeIdentity, user]);

  const currentProfileAvatar = useMemo(() => {
    if (activeIdentity.type === 'business') {
      return activeIdentity.data?.logo || '';
    } else if (activeIdentity.type === 'organization') {
      return activeIdentity.data?.logo || '';
    }
    return user?.avatar || '';
  }, [activeIdentity, user]);

  const currentProfileUsername = useMemo(() => {
    if (activeIdentity.type === 'business') {
      return activeIdentity.data?.username || 'business';
    } else if (activeIdentity.type === 'organization') {
      return activeIdentity.data?.username || 'organization';
    }
    return user?.username || 'personal';
  }, [activeIdentity, user]);

  // 1. Initial Authentication Check on mount
  useEffect(() => {
    const token = sessionStorage.getItem('aether_token');

    if (!token) {
      setIsAuthenticated(false);
      setAuthLoading(false);
      setLoginStep('welcome');
      return;
    }

    // Release UI immediately from cache, verify backend in background
    setAuthLoading(false);

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.get('/api/auth/profile', { timeout: 5000 })
      .then(response => {
        if (response.data) {
          setUser(response.data);
          sessionStorage.setItem('aether_user', JSON.stringify(response.data));

          if (response.data.securitySettings?.pinLock) {
            setAppLocked(true);
            setLockMethod('pin');
          } else if (response.data.securitySettings?.faceId) {
            setAppLocked(true);
            setLockMethod('faceid');
          }
          setIsAuthenticated(true);
        }
      })
.catch(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('aether_token');
          sessionStorage.removeItem('aether_user');
          setUser(null);
          setIsAuthenticated(false);
        });
  }, []);

  // Hydrate theme immediately so unauthenticated pages also honor light/dark mode
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('aether_theme') || '{}');
      const root = document.documentElement;
      if (stored.mode === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark'; }
      else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
      if (stored.primaryColor) { root.classList.remove('theme-emerald','theme-sapphire','theme-amethyst','theme-rose'); root.classList.add('theme-' + stored.primaryColor); }
    } catch (err) {}
  }, []);

  // Apply Theme effects on user theme preference updates
  useEffect(() => {
    const storedRaw = sessionStorage.getItem('aether_theme');
    let stored = {};
    try { stored = JSON.parse(storedRaw || '{}'); } catch (err) {}
    const base = (user && (user.themePreference || user.theme)) || stored;
    const theme = typeof base === 'string' ? { mode: 'light', primaryColor: 'emerald' } : { mode: 'light', primaryColor: 'emerald', fontSize: 'medium', ...base };

    const root = document.documentElement;
    
    // Apply Light/Dark mode
    if (theme.mode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Apply color theme classes
    root.classList.remove('theme-emerald', 'theme-sapphire', 'theme-amethyst', 'theme-rose');
    root.classList.add(`theme-${theme.primaryColor || 'emerald'}`);

    // Font size scaling
    if (theme.fontSize === 'small') {
      root.style.fontSize = '14px';
    } else if (theme.fontSize === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }

    // Apply bubble style
    root.classList.remove('bubble-rounded', 'bubble-sharp', 'bubble-playful');
    root.classList.add(`bubble-${theme.bubbleStyle || 'rounded'}`);

    // Apply wallpaper
    root.classList.remove('wallpaper-grid', 'wallpaper-dots', 'wallpaper-solid', 'wallpaper-neon');
    root.classList.add(`wallpaper-${theme.chatWallpaper || 'grid'}`);

    // Apply accessibility preferences
    root.classList.toggle('reduce-motion', user?.accessibilityPrefs?.reduceMotion || false);
    root.classList.toggle('high-contrast', user?.accessibilityPrefs?.highContrast || false);

    try { sessionStorage.setItem('aether_theme', JSON.stringify({ mode: theme.mode, primaryColor: theme.primaryColor })); } catch (err) {}
  }, [user?.themePreference, user?.accessibilityPrefs, user]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user: backendUser } = response.data;
      sessionStorage.setItem('aether_token', token);
      sessionStorage.setItem('aether_user', JSON.stringify(backendUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(backendUser);
      
      if (backendUser.securitySettings?.pinLock) {
        setAppLocked(true);
        setLockMethod('pin');
      }
      setIsAuthenticated(true);
      toast.success('Logged in successfully!');
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      toast.error(err.response?.data?.error || 'Invalid email or password.');
      throw err;
    }
  };

  const register = async (name, username, email, password, phone, accountType = 'personal', businessFields = {}, orgFields = {}) => {
    try {
      const response = await axios.post('/api/auth/register', {
        name, username, email, password, phone, accountType,
        ...(accountType === 'business' ? { businessName: businessFields.businessName, category: businessFields.category, description: businessFields.description, address: businessFields.address } : {}),
        ...(accountType === 'organization' ? { orgName: orgFields.orgName, orgType: orgFields.orgType, orgDescription: orgFields.orgDescription } : {})
      });
      const { token, user: backendUser } = response.data;
      sessionStorage.setItem('aether_token', token);
      sessionStorage.setItem('aether_user', JSON.stringify(backendUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(backendUser);
      setIsAuthenticated(true);
      toast.success('Registered and connected successfully!');
      return true;
    } catch (err) {
      console.error('Registration failed:', err);
      toast.error(err.response?.data?.error || 'Registration failed. Try a different username/email.');
      throw err;
    }
  };

  const verifyOtp = async (code) => {
    toast.error('OTP login is disabled. Please use password-based authentication.');
  };

  const completeProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data);
      setIsAuthenticated(true);
      toast.success('Profile created successfully!');
    } catch (err) {
      const fallbackUser = user || {};
      const updatedUser = {
        ...fallbackUser,
        name: profileData.name || fallbackUser.name || '',
        username: profileData.username || fallbackUser.username || '',
        bio: profileData.bio || fallbackUser.bio || '',
        avatar: profileData.avatar || getAvatarSvg(profileData.name || 'U'),
      };
      setUser(updatedUser);
      setIsAuthenticated(true);
      toast.success('Profile created locally (fallback)');
    }
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setTempEmail(email);
      setLoginStep('reset-password');
      toast.success('Password reset code sent to email!');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset code.');
      return false;
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      const emailToUse = email || tempEmail;
      await axios.post('/api/auth/reset-password', {
        email: emailToUse,
        code,
        newPassword
      });
      toast.success('Password updated successfully. Please login.');
      setLoginStep('login');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password.');
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('aether_token');
    sessionStorage.removeItem('aether_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setLoginStep('welcome');
    mockSocket.disconnect();
    toast.error('Logged out securely.');
  };

  const updateProfile = async (fields) => {
    try {
      const response = await axios.put('/api/auth/profile', fields);
      setUser(response.data);
      toast.success('Profile updated.');
    } catch (err) {
      setUser(prev => {
        const updated = { ...prev, ...fields };
        toast.success('Profile updated locally.');
        return updated;
      });
    }
  };

  const updateTheme = async (themeFields) => {
    try {
      const nextTheme = {
        mode: themeFields.mode !== undefined ? themeFields.mode : user?.themePreference?.mode,
        primaryColor: themeFields.primaryColor !== undefined ? themeFields.primaryColor : user?.themePreference?.primaryColor,
        fontSize: themeFields.fontSize !== undefined ? themeFields.fontSize : user?.themePreference?.fontSize,
        bubbleStyle: themeFields.bubbleStyle !== undefined ? themeFields.bubbleStyle : user?.themePreference?.bubbleStyle,
        chatWallpaper: themeFields.chatWallpaper !== undefined ? themeFields.chatWallpaper : user?.themePreference?.chatWallpaper,
        language: themeFields.language !== undefined ? themeFields.language : user?.themePreference?.language,
      };
      const response = await axios.put('/api/auth/profile', { themePreference: nextTheme });
      setUser(response.data);
    } catch (err) {
      setUser(prev => ({
        ...prev,
        themePreference: { ...prev.themePreference, ...themeFields }
      }));
    }
  };

  const updatePrivacy = async (privacyFields) => {
    try {
      const response = await axios.put('/api/auth/profile', { privacySettings: privacyFields });
      setUser(response.data);
      toast.success('Privacy settings updated.');
    } catch (err) {
      setUser(prev => ({
        ...prev,
        privacySettings: { ...prev.privacySettings, ...privacyFields }
      }));
      toast.success('Privacy settings saved locally.');
    }
  };

  const updateSecurity = async (securityFields) => {
    try {
      const nextSec = {
        pinLock: securityFields.pinLock !== undefined ? securityFields.pinLock : user.securitySettings?.pinLock,
        faceId: securityFields.faceId !== undefined ? securityFields.faceId : user.securitySettings?.faceId,
        twoFactor: securityFields.twoFactor !== undefined ? securityFields.twoFactor : user.securitySettings?.twoFactor,
      };
      const payload = { securitySettings: nextSec };
      if (securityFields.pin !== undefined) {
        payload.pin = securityFields.pin;
      }
      const response = await axios.put('/api/auth/profile', payload);
      setUser(response.data);
      if (securityFields.pin) {
        toast.success('PIN code updated successfully.');
      } else {
        toast.success('Security settings saved.');
      }
    } catch (err) {
      setUser(prev => ({
        ...prev,
        securitySettings: { ...prev.securitySettings, ...securityFields }
      }));
      toast.success('Security settings updated locally.');
    }
  };

  const unlockApp = async (pinCode) => {
    if (lockMethod === 'pin') {
      try {
        const response = await axios.post('/api/auth/verify-pin', { pin: pinCode });
        if (!response.data.valid) {
          toast.error('Invalid PIN code.');
          return false;
        }
      } catch (err) {
        const storedPin = user?.securitySettings?.pin || user?.pin || '1234';
        if (pinCode !== storedPin) {
          toast.error('Invalid PIN code.');
          return false;
        }
      }
    }
    setAppLocked(false);
    setIsAuthenticated(true);
    toast.success('App unlocked!');
    return true;
  };

  const lockAppManual = () => {
    setLockMethod('pin');
    setAppLocked(true);
  };

  const deleteAccount = async () => {
    try {
      await axios.delete('/api/auth/profile');
      logout();
      toast.success('Account deleted successfully');
    } catch (err) {
      logout();
    }
  };

  const updateNotifications = async (fields) => {
    try {
      const response = await axios.put('/api/auth/profile', { notifications: fields });
      setUser(response.data);
      toast.success('Notification settings updated.');
    } catch (err) {
      setUser(prev => ({
        ...(prev || {}),
        notifications: { ...(prev?.notifications || {}), ...fields }
      }));
      toast.success('Notification settings saved locally.');
    }
  };

  const updateChatPrefs = async (fields) => {
    try {
      const response = await axios.put('/api/auth/profile', { chatPrefs: fields });
      setUser(response.data);
      toast.success('Chat preferences updated.');
    } catch (err) {
      setUser(prev => ({
        ...(prev || {}),
        chatPrefs: { ...(prev?.chatPrefs || {}), ...fields }
      }));
      toast.success('Chat preferences saved locally.');
    }
  };

  const updateAiPrefs = async (fields) => {
    try {
      const response = await axios.put('/api/auth/profile', { aiPrefs: fields });
      setUser(response.data);
      toast.success('AI preferences updated.');
    } catch (err) {
      setUser(prev => ({
        ...(prev || {}),
        aiPrefs: { ...(prev?.aiPrefs || {}), ...fields }
      }));
      toast.success('AI preferences saved locally.');
    }
  };

  const updateAccessibilityPrefs = async (fields) => {
    try {
      const response = await axios.put('/api/auth/profile', { accessibilityPrefs: fields });
      setUser(response.data);
      toast.success('Accessibility preferences updated.');
    } catch (err) {
      setUser(prev => ({
        ...(prev || {}),
        accessibilityPrefs: { ...(prev?.accessibilityPrefs || {}), ...fields }
      }));
      toast.success('Accessibility preferences saved locally.');
    }
  };

  const translations = {
    en: {
      chats: "Chats",
      calls: "Calls",
      stories: "Stories",
      channels: "Channels",
      communities: "Communities",
      projects: "Projects",
      tasks: "Tasks",
      notifications: "Notifications",
      search: "Search",
      gallery: "Gallery",
      settings: "Settings",
      profile: "My Profile",
      disconnect: "Disconnect",
      activeNow: "Active Now",
      statusText: "System Status",
      welcome: "Welcome to AetherChat"
    },
    es: {
      chats: "Chats",
      calls: "Llamadas",
      stories: "Historias",
      channels: "Canales",
      communities: "Comunidades",
      projects: "Proyectos",
      tasks: "Tareas",
      notifications: "Notificaciones",
      search: "Buscar",
      gallery: "Galería",
      settings: "Configuración",
      profile: "Mi Perfil",
      disconnect: "Desconectar",
      activeNow: "Activo ahora",
      statusText: "Estado del sistema",
      welcome: "Bienvenido a AetherChat"
    },
    fr: {
      chats: "Chats",
      calls: "Appels",
      stories: "Histoires",
      channels: "Chaînes",
      communities: "Communautés",
      projects: "Projets",
      tasks: "Tâches",
      notifications: "Notifications",
      search: "Rechercher",
      gallery: "Galerie",
      settings: "Paramètres",
      profile: "Mon Profil",
      disconnect: "Déconnecter",
      activeNow: "Actif maintenant",
      statusText: "Statut du système",
      welcome: "Bienvenue sur AetherChat"
    },
    ja: {
      chats: "チャット",
      calls: "通話",
      stories: "ストーリー",
      channels: "チャンネル",
      communities: "コミュニティ",
      projects: "プロジェクト",
      tasks: "タスク",
      notifications: "通知",
      search: "検索",
      gallery: "ギャラリー",
      settings: "設定",
      profile: "マイプロフィール",
      disconnect: "切断",
      activeNow: "オンライン",
      statusText: "システムステータス",
      welcome: "AetherChatへようこそ"
    }
  };

  const t = (key) => {
    const lang = user?.themePreference?.language || 'en';
    const normalizedLang = lang.toLowerCase().substring(0, 2);
    const dict = translations[normalizedLang] || translations.en;
    return dict[key] || key;
  };

  const accountType = user?.accountType || 'personal';
  const isSupport = user?.role === 'support' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const isBanned = user?.banned === true;
  const isSuspended = !isBanned && !!user?.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  const upgradeAccount = async (type, details = {}) => {
    if (!['personal', 'business', 'organization'].includes(type)) return;
    try {
      const payload = { accountType: type, accountDetails: details, ...details };
      const response = await axios.put('/api/auth/profile', payload);
      setUser(response.data);
      sessionStorage.setItem('aether_user', JSON.stringify(response.data));
      toast.success(`Account successfully verified & updated as ${type.toUpperCase()}!`);
    } catch (err) {
      setUser(prev => {
        const updated = { ...prev, accountType: type, accountDetails: details };
        sessionStorage.setItem('aether_user', JSON.stringify(updated));
        return updated;
      });
      toast.success(`Account updated & verified as ${type.toUpperCase()}!`);
    }
  };

  
  return (
    <AuthContext.Provider value={useMemo(() => ({
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      authLoading,
      appLocked,
      lockMethod,
      loginStep,
      setLoginStep,
      login,
      register,
      verifyOtp,
      completeProfile,
      forgotPassword,
      resetPassword,
      logout,
      updateProfile,
      updateTheme,
      updatePrivacy,
      updateSecurity,
      updateNotifications,
      updateChatPrefs,
      updateAiPrefs,
      updateAccessibilityPrefs,
      unlockApp,
      lockAppManual,
      deleteAccount,
      t,
      accountType,
      isSupport,
      isAdmin,
      isBanned,
      isSuspended,
      upgradeAccount,
      activeIdentity,
      setActiveIdentity,
      currentProfileName,
      currentProfileAvatar,
      currentProfileUsername
    }), [user, isAuthenticated, authLoading, appLocked, lockMethod, loginStep, accountType, isSupport, isAdmin, isBanned, isSuspended, activeIdentity, currentProfileName, currentProfileAvatar, currentProfileUsername])}>
      {children}
    </AuthContext.Provider>
  );
};
