import React, { useState, useEffect } from 'react';
import { BarChart2, Award, Bell, Repeat, User, ChevronRight } from 'lucide-react';
import { getUserStats } from '../utils';

export default function MoreSection({ setCurrentTab }) {
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

      {/* DEVELOPER TESTING GROUP */}
      <div className="mt-6">
        <div className="text-xs font-semibold tracking-wider text-amber-500 uppercase px-1 mb-2.5">
          DEVELOPER / TESTING
        </div>
        <div className="bg-[#181824] rounded-2xl overflow-hidden border border-amber-900/30 divide-y divide-gray-800/60 shadow-lg">
          <button 
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);

              // 1. Seed Tasks
              localStorage.setItem('pinboard_tasks', JSON.stringify([
                { id: 't1', name: 'Morning standup meeting',        done: true,  completedDate: today, dueDate: today + 'T09:00', person: '' },
                { id: 't2', name: 'Review PR #42 – auth refactor',  done: true,  completedDate: today, dueDate: '',               person: 'Arjun' },
                { id: 't3', name: 'Fix login bug on mobile',        done: true,  completedDate: today, dueDate: today + 'T11:00', person: '' },
                { id: 't4', name: 'Send weekly report to manager',  done: false, dueDate: today + 'T17:30', person: 'Priya' },
                { id: 't5', name: 'Update API documentation',       done: false, dueDate: '',               person: '' },
                { id: 't6', name: 'Deploy hotfix to production',    done: false, dueDate: today + 'T18:00', person: '' },
                { id: 't7', name: 'Team lunch coordination',        done: false, dueDate: '',               person: 'Rahul' },
                { id: 't8', name: 'Code review for sprint tasks',   done: false, dueDate: '',               person: '' },
              ]));

              // 2. Seed Rituals
              localStorage.setItem('pinboard_rituals_data', JSON.stringify({
                lastResetDate: today,
                habits: [
                  { id: 'h1', name: 'Drink Water',   goal: 8,  unit: 'glasses', count: 5,  streak: 12, lastCompletedDate: null,  reminderEnabled: true,  reminderTime: '09:00', type: 'countable' },
                  { id: 'h2', name: 'Exercise',      goal: 1,  unit: 'session', count: 1,  streak: 7,  lastCompletedDate: today, reminderEnabled: false, reminderTime: '07:00', type: 'one_time'  },
                  { id: 'h3', name: 'Book Reading',  goal: 20, unit: 'pages',   count: 20, streak: 3,  lastCompletedDate: today, reminderEnabled: false, reminderTime: '21:00', type: 'countable' },
                ]
              }));

              // 3. Seed Monthly Goals
              localStorage.setItem('pinboard_goals', JSON.stringify([
                { id: 'g1', name: 'Gym visits',    category: 'Body',   target: 20,  unit: 'sessions', trackingType: 'count_toward', linkedHabitIds: [], progress: 14, history: [], isCompleted: false, createdAt: new Date().toISOString() },
                { id: 'g2', name: 'Book reading',  category: 'Mind',   target: 300, unit: 'pages',    trackingType: 'count_toward', linkedHabitIds: [], progress: 80, history: [], isCompleted: false, createdAt: new Date().toISOString() },
                { id: 'g3', name: 'Water streak',  category: 'Health', target: 30,  unit: 'days',     trackingType: 'count_toward', linkedHabitIds: [], progress: 3,  history: [], isCompleted: false, createdAt: new Date().toISOString() },
              ]));

              // 4. Seed Completion log
              localStorage.setItem('pinboard_completion_log', JSON.stringify([
                { type: 'task',  id: 't1', timestamp: new Date().toISOString() },
                { type: 'task',  id: 't2', timestamp: new Date().toISOString() },
                { type: 'task',  id: 't3', timestamp: new Date().toISOString() },
                { type: 'habit', id: 'h2', timestamp: new Date().toISOString() },
                { type: 'habit', id: 'h3', timestamp: new Date().toISOString() },
              ]));

              // 5. Seed Badges
              localStorage.setItem('pinboard_earned_badges', JSON.stringify([
                { id: 'first_step', timestamp: new Date().toISOString() },
                { id: 'early_bird', timestamp: new Date().toISOString() },
                { id: 'task_5',     timestamp: new Date().toISOString() },
              ]));

              alert("✅ Bulk test data successfully loaded! App will reload now.");
              window.location.reload();
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-amber-500/[0.04] transition-colors active:bg-amber-500/[0.08]"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-lg">🧪</span>
              <span className="text-[15px] font-semibold text-amber-400">Load test data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
