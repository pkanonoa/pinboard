import React, { useState, useEffect } from 'react';
import { BarChart2, Award, Bell, Repeat, User, ChevronRight, CalendarDays } from 'lucide-react';
import { getUserStats } from '../utils';

export default function MoreSection({ setCurrentTab, onOpenWeeklyReview }) {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const stats = getUserStats();
    setPoints(stats.points || 0);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in pb-28 px-1 pt-1">
      <h1 className="text-2xl font-bold text-white mb-6">More</h1>
      
      {/* INSIGHTS GROUP */}
      <div className="mb-6">
        <div className="text-xs font-semibold tracking-wider text-gray-500 uppercase px-1 mb-2.5">
          INSIGHTS
        </div>
        <div className="bg-[#181824] rounded-2xl overflow-hidden border border-gray-800/40 divide-y divide-gray-800/60 shadow-lg">
          <button 
            onClick={() => setCurrentTab('charts')}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <BarChart2 className="w-5 h-5 text-indigo-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Activity charts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
          </button>

          <button 
            onClick={() => setCurrentTab('rewards')}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Award className="w-5 h-5 text-amber-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Rewards</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-normal">{points} pts</span>
              <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
            </div>
          </button>

          <button
            onClick={onOpenWeeklyReview}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <CalendarDays className="w-5 h-5 text-violet-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Weekly review</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* SETTINGS GROUP */}
      <div>
        <div className="text-xs font-semibold tracking-wider text-gray-500 uppercase px-1 mb-2.5">
          SETTINGS
        </div>
        <div className="bg-[#181824] rounded-2xl overflow-hidden border border-gray-800/40 divide-y divide-gray-800/60 shadow-lg">
          <button 
            onClick={() => {
              localStorage.setItem('pinboard_settings_focus', 'notifications');
              setCurrentTab('settings');
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Bell className="w-5 h-5 text-gray-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
          </button>

          <button 
            onClick={() => {
              localStorage.setItem('pinboard_settings_focus', 'rituals');
              setCurrentTab('settings');
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Repeat className="w-5 h-5 text-gray-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Manage rituals</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
          </button>

          <button 
            onClick={() => {
              localStorage.setItem('pinboard_settings_focus', 'account');
              setCurrentTab('settings');
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <User className="w-5 h-5 text-gray-400" strokeWidth={2} />
              <span className="text-[15px] font-medium text-white">Account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" strokeWidth={2} />
          </button>
        </div>
      </div>


    </div>
  );
}
