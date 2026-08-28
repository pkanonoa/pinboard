import React from 'react';

export default function MoreSection({ setCurrentTab }) {
  return (
    <div className="w-full max-w-md mx-auto animate-fade-in pb-24 pt-4">
      <h2 className="text-2xl font-bold text-white mb-6 pl-2">More</h2>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => setCurrentTab('charts')}
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-purple-900/40 text-purple-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-bold text-gray-200">Charts</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">View your progress and trends</p>
          </div>
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <button 
          onClick={() => setCurrentTab('rewards')}
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-amber-900/40 text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-bold text-gray-200">Rewards</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Manage your earned points</p>
          </div>
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <button 
          onClick={() => setCurrentTab('settings')}
          className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-sm hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-pink-900/40 text-pink-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-bold text-gray-200">Settings</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">App preferences and backups</p>
          </div>
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );
}
