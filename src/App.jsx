import React, { useState } from 'react';
import InstallPrompt from './components/InstallPrompt';
import NotificationManager from './components/NotificationManager';
import ToldToSection from './components/ToldToSection';
import DailyRitualsSection from './components/DailyRitualsSection';
import Dashboard from './components/Dashboard';
import ChartsSection from './components/ChartsSection';
import BadgeCelebration from './components/BadgeCelebration';
import RewardsSection from './components/RewardsSection';
import SettingsSection from './components/SettingsSection';
import { MascotProvider } from './contexts/MascotContext';
import MascotAvatar from './components/MascotAvatar';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Initialize theme on load
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('pinboard_theme') || 'darker';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <MascotProvider>
      <div className="flex flex-col items-center min-h-screen p-4 relative pt-12 pb-24 overflow-x-hidden">
        <BadgeCelebration />
        <NotificationManager />
        <MascotAvatar />
        
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8">
          Pinboard
        </h1>
        
        {currentTab === 'dashboard' && <Dashboard setCurrentTab={setCurrentTab} />}
        {currentTab === 'tasks' && <ToldToSection />}
        {currentTab === 'rituals' && <DailyRitualsSection />}
        {currentTab === 'charts' && <ChartsSection />}
        {currentTab === 'rewards' && <RewardsSection />}
        {currentTab === 'settings' && <SettingsSection />}

        {/* PWA Install Prompt */}
        <InstallPrompt />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-50 px-6 pb-safe">
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
          onClick={() => setCurrentTab('charts')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'charts' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
          </svg>
          <span className="text-[10px] font-medium">Charts</span>
        </button>
        <button 
          onClick={() => setCurrentTab('rewards')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'rewards' ? 'text-amber-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-[10px] font-medium">Rewards</span>
        </button>
        <button 
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${currentTab === 'settings' ? 'text-pink-400' : 'text-gray-500 hover:text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
    </MascotProvider>
  )
}

export default App
