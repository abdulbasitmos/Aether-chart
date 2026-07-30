import React, { useState, lazy, Suspense } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import NavSidebar from '../components/NavSidebar';
import Sidebar from '../components/Sidebar';
import AnnouncementBanner from '../components/AnnouncementBanner';
import usePushNotifications from '../hooks/usePushNotifications';

import CallOverlay from '../components/CallOverlay';
import StatusViewer from '../components/StatusViewer';
import { FiArrowLeft } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';

// Lazy load all tab views for code splitting
const ChatWindow = lazy(() => import('../components/ChatWindow'));
const InfoPanel = lazy(() => import('../components/InfoPanel'));
const CallsView = lazy(() => import('../components/CallsView'));
const StatusView = lazy(() => import('../components/StatusView'));
const CommunitiesView = lazy(() => import('../components/CommunitiesView'));
const ChannelsView = lazy(() => import('../components/ChannelsView'));
const ProfileView = lazy(() => import('../components/ProfileView'));
const SettingsView = lazy(() => import('../components/SettingsView'));
const SearchView = lazy(() => import('../components/SearchView'));
const NotificationCenter = lazy(() => import('../components/NotificationCenter'));
const MediaGalleryView = lazy(() => import('../components/MediaGalleryView'));
const TasksDashboard = lazy(() => import('../components/TasksDashboard'));
const AddContactView = lazy(() => import('../components/AddContactView'));
const BusinessDashboard = lazy(() => import('../components/BusinessDashboard'));
const OrganizationWorkspace = lazy(() => import('../components/OrganizationWorkspace'));
const OrganizationsView = lazy(() => import('../components/OrganizationsView'));
const IdentitySwitcher = lazy(() => import('../components/IdentitySwitcher'));
const BusinessPublicProfile = lazy(() => import('../components/BusinessPublicProfile'));
const BusinessBookingFlow = lazy(() => import('../components/BusinessBookingFlow'));
const SupportDashboard = lazy(() => import('../components/SupportDashboard'));
const OrgPublicProfile = lazy(() => import('../components/OrgPublicProfile'));
const UserEventsPanel = lazy(() => import('../components/UserEventsPanel'));
const FeedView = lazy(() => import('../components/FeedView'));


const TabFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-[#080c14]">
    <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

const MainDashboard = ({ tab }) => {
  const { selectedChatId, selectChat, isRightPanelOpen, activeCall, declineCall, endCall, activeTab, setActiveTab } = useChat();
  const { user, isSupport } = useAuth();
  const params = useParams();
  const chatId = params.chatId || params.orgId;
  const navigate = useNavigate();

  const isSupportUser = user?.role === 'support' || user?.accountType === 'support' || isSupport;

  // Dedicated Support Workspace Isolation Mode
  if (isSupportUser) {
    return (
      <div className="h-screen w-screen bg-[#080c14] overflow-hidden relative font-sans text-slate-100 flex flex-col">
        <Suspense fallback={<TabFallback />}>
          <SupportDashboard />
        </Suspense>
      </div>
    );
  }

  // Register push notifications for this logged-in user
  usePushNotifications(navigate);
  
  // Responsive mobile states
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat'
  // Status story viewer state
  const [activeStory, setActiveStory] = useState(null);

  // Sidebar Width resize states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('aether_sidebar_width');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Screen resize listener
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Spacing CSS variable on mount
  React.useEffect(() => {
    const savedSpacing = localStorage.getItem('aether_layout_spacing') || '0';
    document.documentElement.style.setProperty('--layout-component-spacing', `${savedSpacing}px`);
  }, []);

  const startResizing = React.useCallback((mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((mouseMoveEvent) => {
    if (isResizing) {
      // Calculate new width: mouse X position minus the NavSidebar width if NavSidebar is visible
      const offset = 72; // NavSidebar is 72px on md screens
      const newWidth = mouseMoveEvent.clientX - offset;
      if (newWidth >= 240 && newWidth <= 600) {
        setSidebarWidth(newWidth);
        localStorage.setItem('aether_sidebar_width', newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Adjust document body styles during resize
  React.useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  // Sync route tabs and active chat params with context
  React.useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab, setActiveTab]);

  React.useEffect(() => {
    if (tab === 'ai') {
      selectChat('chat_user_ai');
      setMobileView('chat');
    }
  }, [tab, selectChat]);

  React.useEffect(() => {
    if (chatId && selectedChatId !== chatId) {
      selectChat(chatId);
      setMobileView('chat');
    }
  }, [chatId, selectedChatId, selectChat]);

  // Global Escape key handler to end call or close status stories
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeCall) {
          if (activeCall.status === 'ringing' && activeCall.direction === 'incoming') {
            declineCall();
          } else {
            endCall();
          }
        }
        if (activeStory) {
          setActiveStory(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCall, activeStory, declineCall, endCall]);

  const handleSelectChatFromSidebar = (chatId) => {
    navigate(`/chats/${chatId}`);
  };

  const handleBackToSidebar = () => {
    setMobileView('sidebar');
    navigate(`/${activeTab}`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#030712] overflow-hidden relative font-sans text-slate-100">
      {/* System-wide Announcement Banner (hidden for support/admin panel) */}
      {activeTab !== 'support' && <AnnouncementBanner />}

      {/* Main Flex Grid Layout */}
      <div className="flex-1 flex h-full w-full z-10 relative overflow-hidden" style={{ minHeight: 0 }}>
        
        {/* 1. NAV SIDEBAR - 72px (Hidden in Support Dashboard) */}
        {activeTab !== 'support' && (
          <div className="h-full shrink-0 w-[72px] hidden md:block border-r border-white/5">
            <NavSidebar />
          </div>
        )}

        {/* 2. CONVERSATION LIST / PANEL - Adjustable width */}
        {activeTab !== 'business-view' && activeTab !== 'business-book' && activeTab !== 'support' && activeTab !== 'org-view' && activeTab !== 'my-events' && activeTab !== 'feed' && (
          <>
            <div 
              className={`h-full shrink-0 border-r border-white/5 md:block ${
                mobileView === 'sidebar' ? 'w-full' : 'hidden md:block'
              }`}
              style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
            >
              <Sidebar 
                onSelectStatus={(story) => setActiveStory(story)} 
                onSelectChat={handleSelectChatFromSidebar}
              />
            </div>
            {!isMobile && (
              <div 
                className="w-[3px] hover:w-[6px] bg-white/5 hover:bg-emerald-500/60 active:bg-emerald-500 cursor-col-resize h-full select-none transition-all duration-150 relative z-30 shrink-0"
                onMouseDown={startResizing}
                title="Drag to resize layout"
              />
            )}
          </>
        )}


        {/* CHAT SESSION AREA */}
        <div 
          className={`h-full flex-1 flex flex-col transition-all duration-300 relative ${
            mobileView === 'chat' ? 'w-full' : 'hidden md:flex'
          }`}
          style={{ 
            paddingLeft: 'var(--layout-component-spacing, 0px)',
            paddingRight: 'var(--layout-component-spacing, 0px)',
            paddingTop: 'var(--layout-component-spacing, 0px)',
            paddingBottom: 'var(--layout-component-spacing, 0px)'
          }}
        >
          {/* Mobile Header Bar (Only visible on small devices when inside chat) */}
          {mobileView === 'chat' && (
            <div className="md:hidden p-3 bg-[#202C33] border-b border-white/5 flex items-center gap-3 shrink-0">
              <button 
                onClick={handleBackToSidebar}
                className="p-2 bg-[#2A3942] border border-white/10 rounded-xl text-[#8696A0] active:scale-95 transition-all cursor-pointer"
              >
                <FiArrowLeft size={18} />
              </button>
              <span className="text-[15px] font-semibold text-[#E9EDEF]">Back to Chats</span>
            </div>
          )}

          {(() => {
            switch (activeTab) {
              case 'chats':
                return <Suspense fallback={<TabFallback />}><ChatWindow /></Suspense>;
              case 'ai':
                return <Suspense fallback={<TabFallback />}><ChatWindow /></Suspense>;
              case 'calls':
                return <Suspense fallback={<TabFallback />}><CallsView /></Suspense>;
              case 'status':
                return <Suspense fallback={<TabFallback />}><StatusView onSelectStatus={(story) => setActiveStory(story)} /></Suspense>;
              case 'communities':
                return <Suspense fallback={<TabFallback />}><CommunitiesView /></Suspense>;
              case 'channels':
                return <Suspense fallback={<TabFallback />}><ChannelsView /></Suspense>;
              case 'profile':
                return <Suspense fallback={<TabFallback />}><ProfileView /></Suspense>;
              case 'settings':
                return <Suspense fallback={<TabFallback />}><SettingsView /></Suspense>;
              case 'search':
                return <Suspense fallback={<TabFallback />}><SearchView /></Suspense>;
              case 'notifications':
                return <Suspense fallback={<TabFallback />}><NotificationCenter /></Suspense>;
              case 'gallery':
                return <Suspense fallback={<TabFallback />}><MediaGalleryView /></Suspense>;
              case 'tasks':
                return <Suspense fallback={<TabFallback />}><TasksDashboard /></Suspense>;
              case 'feed':
                return <Suspense fallback={<TabFallback />}><FeedView /></Suspense>;
              case 'my-events':
                return <Suspense fallback={<TabFallback />}><UserEventsPanel /></Suspense>;

              case 'add-contact':
                return <Suspense fallback={<TabFallback />}><AddContactView /></Suspense>;
              case 'business':
                return <Suspense fallback={<TabFallback />}><BusinessDashboard /></Suspense>;
              case 'business-view':
                return <Suspense fallback={<TabFallback />}><BusinessPublicProfile /></Suspense>;
              case 'business-book':
                return <Suspense fallback={<TabFallback />}><BusinessBookingFlow /></Suspense>;
              case 'org-view':
                return <Suspense fallback={<TabFallback />}><OrgPublicProfile /></Suspense>;
              case 'organizations':
                return <Suspense fallback={<TabFallback />}>{chatId ? <OrganizationWorkspace organizationId={chatId} /> : <OrganizationsView />}</Suspense>;
              case 'support':
                return <Suspense fallback={<TabFallback />}><SupportDashboard /></Suspense>;
              case 'org-search':
                return <Suspense fallback={<TabFallback />}><OrganizationsView /></Suspense>;

              default:
                return <Suspense fallback={<TabFallback />}><ChatWindow /></Suspense>;
            }
          })()}
        </div>

        {/* RIGHT PANEL: USER INFO, MEDIA, AI CO-PILOT */}
        {isRightPanelOpen && (
          <div className="h-full shrink-0 hidden lg:block">
            <Suspense fallback={null}>
              <InfoPanel />
            </Suspense>
          </div>
        )}

      </div>

      {/* FULL SCREEN POPUPS / OVERLAYS */}

      {/* 1. Voice and Video Call Screen Overlay */}
      {activeCall && <CallOverlay />}

      {/* 2. Status Story Viewer Overlay */}
      {activeStory && (
        <StatusViewer 
          status={activeStory} 
          onClose={() => setActiveStory(null)} 
        />
      )}

    </div>
  );
};

export default MainDashboard;
