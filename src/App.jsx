import React, { useState, useEffect } from 'react';
import { Home, Goal, ClipboardList, Repeat, MoreHorizontal } from 'lucide-react';
import InstallPrompt from './components/InstallPrompt';
import NotificationManager from './components/NotificationManager';
import ToldToSection from './components/ToldToSection';
import DailyRitualsSection from './components/DailyRitualsSection';
import Dashboard from './components/Dashboard';
import ChartsSection from './components/ChartsSection';
import BadgeCelebration from './components/BadgeCelebration';
import RewardsSection from './components/RewardsSection';
import SettingsSection from './components/SettingsSection';
import NotificationDrawer from './components/NotificationDrawer';
import GoalsSection from './components/GoalsSection';
import OnboardingScreen from './components/OnboardingScreen';
import MoreSection from './components/MoreSection';
import { getNotifications, cleanOldNotifications } from './db';
import { syncStateToBackend } from './utils';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onboarded, setOnboarded] = useState(true);
  const [touchStartXY, setTouchStartXY] = useState(null);

  const handleSetCurrentTab = (tab) => {
    if (tab !== currentTab) {
      const subTabs = ['charts', 'rewards', 'settings'];
      
      if (tab === 'dashboard') {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } else if (subTabs.includes(tab)) {
        window.history.pushState({ tab }, '', `#${tab}`);
      } else {
        if (currentTab === 'dashboard') {
          window.history.pushState({ tab }, '', `#${tab}`);
        } else {
          window.history.replaceState({ tab }, '', `#${tab}`);
        }
      }
      setCurrentTab(tab);
    }
  };

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state && e.state.tab) {
        setCurrentTab(e.state.tab);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (['dashboard', 'goals', 'tasks', 'rituals', 'more', 'charts', 'rewards', 'settings'].includes(hash)) {
          setCurrentTab(hash);
        } else {
          setCurrentTab('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    if (!window.location.hash || window.location.hash === '#dashboard') {
      window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
    } else {
      // If deep linked, set it
      const hash = window.location.hash.replace('#', '');
      setCurrentTab(hash);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize theme on load
  useEffect(() => {
    const isOnboarded = localStorage.getItem('pinboard_onboarded') === 'true';
    setOnboarded(isOnboarded);
    
    if (isOnboarded) {
      syncStateToBackend();
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncStateToBackend();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const savedTheme = localStorage.getItem('pinboard_theme') || 'darker';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Cleanup old notifications and check unread count
    cleanOldNotifications().then(() => {
      checkUnread();
    });
    
    window.addEventListener('focus', checkUnread);
    window.addEventListener('notifications_read', checkUnread);
    const swMessageListener = (event) => {
      if (event.data && event.data.type === 'NEW_NOTIFICATION') {
        checkUnread();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', swMessageListener);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkUnread);
      window.removeEventListener('notifications_read', checkUnread);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', swMessageListener);
      }
    };
  }, []);

  const checkUnread = async () => {
    try {
      const notifs = await getNotifications();
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch(e) {}
  };

  if (!onboarded) {
    return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
  }

  const onTouchStart = (e) => {
    setTouchStartXY({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = (e) => {
    if (!touchStartXY) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchStartXY.x - touchEndX;
    const dy = touchStartXY.y - touchEndY;
    
    // Swipe needs to be mostly horizontal, and at least 70px
    if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 70) {
      const tabs = ['dashboard', 'goals', 'tasks', 'rituals', 'more'];
      const currentIndex = tabs.indexOf(currentTab);
      
      if (currentIndex !== -1) {
        if (dx > 0 && currentIndex < tabs.length - 1) {
          handleSetCurrentTab(tabs[currentIndex + 1]);
        } else if (dx < 0 && currentIndex > 0) {
          handleSetCurrentTab(tabs[currentIndex - 1]);
        }
      }
    }
    setTouchStartXY(null);
  };

  return (
    <div 
      className="flex flex-col items-center min-h-screen p-4 relative pt-4 pb-24 overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <BadgeCelebration />
      <NotificationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        setCurrentTab={handleSetCurrentTab} 
      />
      
      {/* Bell Icon */}
      <button 
        onClick={() => setIsDrawerOpen(true)}
        className="fixed top-4 right-4 z-[35] p-3 bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 hover:bg-gray-700 transition-colors"
      >
        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-gray-900"></span>
          </span>
        )}
      </button>
      
      {currentTab === 'dashboard' && <Dashboard setCurrentTab={handleSetCurrentTab} />}
      {currentTab === 'tasks' && <ToldToSection />}
      {currentTab === 'rituals' && <DailyRitualsSection />}
      {currentTab === 'charts' && <ChartsSection />}
      {currentTab === 'rewards' && <RewardsSection />}
      {currentTab === 'settings' && <SettingsSection />}
      {currentTab === 'goals' && <GoalsSection />}
      {currentTab === 'more' && <MoreSection setCurrentTab={handleSetCurrentTab} />}

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-50 px-2 pb-safe">
        <button 
          onClick={() => handleSetCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'dashboard' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <Home className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => handleSetCurrentTab('goals')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'goals' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <Goal className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">Goals</span>
        </button>
        <button 
          onClick={() => handleSetCurrentTab('tasks')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'tasks' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <ClipboardList className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">Tasks</span>
        </button>
        <button 
          onClick={() => handleSetCurrentTab('rituals')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'rituals' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <Repeat className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">Rituals</span>
        </button>
        <button 
          onClick={() => handleSetCurrentTab('more')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'more' ? 'text-white' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <MoreHorizontal className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </div>
  )
}

export default App

