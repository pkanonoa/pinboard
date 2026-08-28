import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import neoImg from '../assets/neo.png';

const INSPIRATIONAL_QUOTES = [
  "Small daily wins create massive yearly results! 🏆",
  "Action cures hesitation. You've got this! ⚡",
  "Focus on progress, not perfection. 💡",
  "Discipline is choosing between what you want now and what you want most. 🎯",
  "One step at a time, one victory at a time! 🪜",
  "Consistency beats intensity every single day! 🔥",
  "Make today something your future self will thank you for! ✨",
  "Every finished task clears your mind and builds momentum! 🚀",
  "Don't stop when you're tired, stop when you're done! 💪",
  "Your potential is endless. Show up today! 🌟"
];

const getTimeGreeting = (name) => {
  const hour = new Date().getHours();
  let greet = "Good evening";
  if (hour < 12) greet = "Good morning";
  else if (hour < 17) greet = "Good afternoon";
  return name && name !== 'friend' ? `${greet}, ${name}!` : `${greet}!`;
};

export default function NeoAvatar({ habits = [], tasks = [] }) {
  const [speech, setSpeech] = useState(null);
  const [bounce, setBounce] = useState(false);
  const speechTimeoutRef = useRef(null);

  // Keep fresh references for intervals and timers
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  // Exclude paused habits
  const activeHabits = habits.filter(h => !h.paused);
  const totalHabits = activeHabits.length;
  const doneHabits = activeHabits.filter(h => h.count >= h.goal).length;
  const pct = totalHabits > 0 ? doneHabits / totalHabits : 1;

  const userName = localStorage.getItem('pinboard_user_name') || 'friend';

  // Compute state & animation based on habit progress
  let state = 1;
  let animationClass = "neo-gentle-rock";

  if (pct === 1 && totalHabits > 0) {
    state = 5;
    animationClass = "neo-proud-pulse";
  } else if (pct >= 0.7) {
    state = 4;
    animationClass = "neo-energetic-bounce";
  } else if (pct >= 0.4) {
    state = 3;
    animationClass = "neo-faster-float";
  } else if (pct > 0) {
    state = 2;
    animationClass = "neo-gentle-float";
  }

  // Trigger contextual speech: task reminders, habit checks, or inspiration
  const triggerNotification = () => {
    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];
    const activeHabitsList = currentHabits.filter(h => !h.paused);
    const pendingTasks = currentTasks.filter(t => !t.done);
    const overdueTasks = currentTasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    const remainingHabits = activeHabitsList.filter(h => h.count < h.goal);
    const doneCount = activeHabitsList.filter(h => h.count >= h.goal).length;
    const totalCount = activeHabitsList.length;
    const bestStreakCount = currentHabits.length > 0 ? Math.max(...currentHabits.map(h => h.streak || 0)) : 0;

    const options = [];

    // 1. Task Reminders & Overdue Alerts (Highest Priority)
    if (overdueTasks.length > 0) {
      options.push(`Reminder: "${overdueTasks[0].name}" is overdue! Let's tackle it 💪`);
      options.push(`Heads up! "${overdueTasks[0].name}" needs your attention! ⏰`);
    }
    if (pendingTasks.length > 0) {
      const randomTask = pendingTasks[Math.floor(Math.random() * pendingTasks.length)];
      options.push(`Reminder: "${randomTask.name}" is waiting for you! 🎯`);
      options.push(`Next goal: "${randomTask.name}"! You've got this! ✨`);
      options.push(`${pendingTasks.length} ${pendingTasks.length === 1 ? 'task' : 'tasks'} remaining today. One victory at a time! 📋`);
    }

    // 2. Habit Tracking
    if (remainingHabits.length > 0) {
      const randomHabit = remainingHabits[Math.floor(Math.random() * remainingHabits.length)];
      options.push(`Don't forget your "${randomHabit.name}" ritual today! 💧`);
      options.push(`${doneCount}/${totalCount} rituals done. Keep the momentum going! ⚡`);
    } else if (totalCount > 0 && doneCount === totalCount) {
      options.push(`All rituals completed! You're operating at your peak! 🌟`);
    }

    // 3. Streak Tracking
    if (bestStreakCount >= 2) {
      options.push(`You're on a ${bestStreakCount}-day streak! Consistency is your superpower! 🏆`);
    }

    // 4. Inspirational Quotes
    options.push(...INSPIRATIONAL_QUOTES);

    const chosen = options[Math.floor(Math.random() * options.length)];
    setSpeech(chosen);

    // Friendly bounce animation to signal an automatic reminder
    setBounce(true);
    setTimeout(() => setBounce(false), 380);

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
    }, 5500);
  };

  // Welcome greeting on mount + automatic recurring reminders
  useEffect(() => {
    const greeting = getTimeGreeting(userName);
    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];
    const activeHabitsList = currentHabits.filter(h => !h.paused);
    const pendingTasks = currentTasks.filter(t => !t.done);
    const overdueTasks = currentTasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    const remainingHabits = activeHabitsList.filter(h => h.count < h.goal);

    let welcomeMsg = `${greeting} Ready to conquer your day? ✨`;
    if (overdueTasks.length > 0) {
      welcomeMsg = `${greeting} Heads up: "${overdueTasks[0].name}" is overdue! Let's get it done 💪`;
    } else if (pendingTasks.length > 0 && activeHabitsList.length > 0) {
      welcomeMsg = `${greeting} You have ${pendingTasks.length} ${pendingTasks.length === 1 ? 'task' : 'tasks'} and rituals waiting today! 🚀`;
    } else if (pendingTasks.length > 0) {
      welcomeMsg = `${greeting} Ready to crush ${pendingTasks.length} ${pendingTasks.length === 1 ? 'task' : 'tasks'} today? 📋`;
    } else if (remainingHabits.length > 0) {
      welcomeMsg = `${greeting} Let's check off your daily rituals and build that streak! 🔥`;
    } else if (activeHabitsList.length > 0 && remainingHabits.length === 0 && pendingTasks.length === 0) {
      welcomeMsg = `${greeting} Everything is crushed today! You're unstoppable! 🌟`;
    }

    setSpeech(welcomeMsg);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
    }, 5500);

    // Automatic motivational quote timer: fires every 15 minutes (900,000 ms)
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const autoInterval = setInterval(() => {
      triggerNotification();
    }, FIFTEEN_MINUTES_MS);

    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      clearInterval(autoInterval);
    };
  }, []);

  // Confetti on reaching 100% habits
  const prevPctRef = useRef(pct);
  useEffect(() => {
    if (pct === 1 && prevPctRef.current < 1) {
      const today = new Date().toLocaleDateString();
      const firedDate = localStorage.getItem('pinboard_confetti_date');
      if (firedDate !== today) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.4 }
        });
        localStorage.setItem('pinboard_confetti_date', today);
      }
      setSpeech("YESSS!! All rituals crushed!! You're on fire! 🎉");
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setSpeech(null), 5500);
    }
    prevPctRef.current = pct;
  }, [pct]);

  // Global bounce listener
  useEffect(() => {
    const handleBounce = () => {
      setBounce(true);
      setTimeout(() => setBounce(false), 380);
    };
    window.addEventListener('neo-bounce', handleBounce);
    return () => window.removeEventListener('neo-bounce', handleBounce);
  }, []);

  // On Tap: immediately trigger a notification on demand
  const handleTap = () => {
    triggerNotification();
  };

  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

  return (
    <div className="fixed bottom-[80px] right-2 flex flex-col items-end justify-end select-none z-40 pointer-events-none">
      
      {/* Speech Bubble */}
      <div 
        className={`absolute bottom-full right-2 mb-2 bg-white text-gray-900 px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-xl max-w-[210px] text-center transition-all duration-300 pointer-events-none leading-snug ${speech ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {speech}
        <div className="absolute right-6 bottom-0 transform translate-y-[90%] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"></div>
      </div>

      {/* Main Avatar Container */}
      <div 
        className="relative cursor-pointer mt-2 pointer-events-auto"
        onClick={handleTap}
        style={{ width: '96px', height: '96px' }}
      >
        <div className={`${animationClass} w-full h-full relative`}>
          <div className={`w-full h-full transition-transform duration-600 ${bounce ? 'neo-bounce-once' : ''}`}>
            
            {/* Glow for State 5 */}
            <img 
              src={neoImg} 
              alt="Neo" 
              draggable="false"
              className={`w-full h-full object-contain ${state === 5 ? 'drop-shadow-[0_0_18px_#f5c518]' : ''}`}
            />

            {/* State 1: Cloud & Tears */}
            {state === 1 && (
              <>
                <svg className="absolute -top-[30px] left-1/2 transform -translate-x-1/2 w-10 h-10 text-gray-500 neo-cloud-drift" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.5 19c-2.485 0-4.5-2.015-4.5-4.5 0-.15.01-.297.028-.442A5.495 5.495 0 008.5 9c-3.038 0-5.5 2.462-5.5 5.5S5.462 20 8.5 20h9a4.5 4.5 0 000-9h-.335a4.498 4.498 0 00-.036.63c0 2.404 1.948 4.353 4.35 4.368L22 16v3h-4.5z"/>
                </svg>
                <div className="absolute top-[48%] left-[28%] w-[8px] h-[12px] bg-blue-400 opacity-70 rounded-[50%_50%_50%_0] neo-tear-drop" style={{ animationDelay: '0s' }} />
                <div className="absolute top-[48%] right-[28%] w-[8px] h-[12px] bg-blue-400 opacity-70 rounded-[50%_50%_50%_0] neo-tear-drop" style={{ animationDelay: '1s' }} />
              </>
            )}

            {/* State 3: 6 Sparkles */}
            {state === 3 && (
              <>
                {[...Array(6)].map((_, i) => (
                  <span 
                    key={`sparkle3-${i}`}
                    className="absolute text-yellow-300 neo-twinkle text-lg"
                    style={{
                      top: `${Math.random() * 80}%`,
                      left: `${Math.random() * 80 + 10}%`,
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  >✨</span>
                ))}
              </>
            )}

            {/* State 4: 10 Sparkles */}
            {state === 4 && (
              <>
                {[...Array(10)].map((_, i) => (
                  <span 
                    key={`sparkle4-${i}`}
                    className="absolute text-yellow-400 neo-twinkle text-xl"
                    style={{
                      top: `${Math.random() * 90}%`,
                      left: `${Math.random() * 90 + 5}%`,
                      animationDelay: `${Math.random() * 1.5}s`
                    }}
                  >✨</span>
                ))}
              </>
            )}

            {/* State 5: Gold Star Badge */}
            {state === 5 && (
              <div className="absolute top-[20%] -right-6 neo-slow-spin text-2xl z-40 drop-shadow-md">
                ⭐
              </div>
            )}
            
            {/* Streak Accessories */}
            {bestStreak >= 3 && (
              <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-[14px] z-20" title="3 Day Streak!">👟</span>
            )}
            
            {bestStreak >= 7 && (
              <svg className="absolute top-[10px] left-[55%] transform -translate-x-1/2 w-[28px] h-[28px] text-pink-500 z-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L3 19h18L12 2zm0 4.5l5.5 10.5h-11L12 6.5z"/>
                <circle cx="12" cy="2" r="2" fill="currentColor" />
              </svg>
            )}
            
            {bestStreak >= 30 && (
              <svg className="absolute -top-[15px] left-[55%] transform -translate-x-1/2 w-[32px] h-[32px] text-yellow-400 neo-slow-shimmer z-30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 22h16v-2H4v2zm16-4V7l-4 3-4-6-4 6-4-3v11h16z"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
