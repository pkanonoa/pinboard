import React, { useState, useEffect } from 'react';
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

  return (
    <div className="flex flex-col items-center min-h-screen p-4 relative pt-16 pb-24 overflow-x-hidden">
      <BadgeCelebration />
      <NotificationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        setCurrentTab={setCurrentTab} 
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

      {currentTab !== 'goals' && currentTab !== 'more' && (
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8">
          Pinboard
        </h1>
      )}
      
      {currentTab === 'dashboard' && <Dashboard setCurrentTab={setCurrentTab} />}
      {currentTab === 'tasks' && <ToldToSection />}
      {currentTab === 'rituals' && <DailyRitualsSection />}
      {currentTab === 'charts' && <ChartsSection />}
      {currentTab === 'rewards' && <RewardsSection />}
      {currentTab === 'settings' && <SettingsSection />}
      {currentTab === 'goals' && <GoalsSection />}
      {currentTab === 'more' && <MoreSection setCurrentTab={setCurrentTab} />}

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-50 px-2 pb-safe">
        <button 
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'dashboard' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => setCurrentTab('goals')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'goals' ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span className="text-[10px] font-medium">Goals</span>
        </button>
        <button 
          onClick={() => setCurrentTab('tasks')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'tasks' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <span className="text-[10px] font-medium">Tasks</span>
        </button>
        <button 
          onClick={() => setCurrentTab('rituals')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'rituals' ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-[10px] font-medium">Rituals</span>
        </button>
        <button 
          onClick={() => setCurrentTab('more')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'more' ? 'text-white' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
          </svg>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </div>
  )
}

export default App

