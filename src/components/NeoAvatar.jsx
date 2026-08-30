import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import neoImg from '../assets/neo.png';
import neoSadImg from '../assets/neo-sad.png';
import neoProgressbarImg from '../assets/neo-progressbar.png';

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

// Returns 'morning' | 'noon' | 'evening' | 'night'
const getTimePeriod = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'noon';
  if (h >= 16 && h < 21) return 'evening';
  return 'night';
};

const getPeriodGreeting = (period, name) => {
  const n = name && name !== 'friend' ? `, ${name}` : '';
  if (period === 'morning') return `Good morning${n}!`;
  if (period === 'noon') return `Good afternoon${n}!`;
  if (period === 'evening') return `Good evening${n}!`;
  return `Hey there${n}!`;
};

export default function NeoAvatar({ habits = [], tasks = [], allGoalsOnTrack = false }) {
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

  // Check if they are a new user who has never logged any completions
  let hasAnyCompletion = false;
  try {
    const logStr = localStorage.getItem('pinboard_completion_log');
    if (logStr) {
      hasAnyCompletion = JSON.parse(logStr).length > 0;
    }
  } catch (e) {}

  if (pct === 1 && totalHabits > 0 && allGoalsOnTrack) {
    state = 6;
    animationClass = "neo-proud-pulse";
  } else if (pct === 1 && totalHabits > 0) {
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
  } else if (!hasAnyCompletion) {
    // New user with no completions yet - start in happy/welcoming mode
    state = 2;
    animationClass = "neo-gentle-float";
  }

  // ── Mood-aware full greeting (1st open per period) ────────────────────
  const buildFullGreeting = (period, currentState, tasks, habits) => {
    const greet = getPeriodGreeting(period, userName);
    const pending = tasks.filter(t => !t.done);
    const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    const activeH = habits.filter(h => !h.paused);
    const remaining = activeH.filter(h => h.count < h.goal);

    const happy = currentState >= 4; // 4, 5, 6
    const sad = currentState === 1;

    if (sad) {
      // Sad Neo — gentle encouragement
      if (overdue.length > 0)
        return `${greet} I see "${overdue[0].name}" is overdue... Let's fix that together 🤝`;
      if (pending.length > 0)
        return `${greet} We've got ${pending.length} tasks ahead — slow and steady wins! 🐢`;
      if (remaining.length > 0)
        return `${greet} ${remaining.length} ritual${remaining.length > 1 ? 's' : ''} left today. Every small step counts 💛`;
      return `${greet} Even on slow days, showing up is everything 💛`;
    }

    if (happy) {
      // Happy Neo — celebratory & energetic
      if (period === 'morning')
        return `${greet} Let's absolutely CRUSH it today! 🚀🔥`;
      if (period === 'noon')
        return `${greet} Midday check-in — you're killing it! Keep going! ⚡`;
      if (period === 'evening')
        return `${greet} Evening power hour! Finish strong today! 💪✨`;
      return `${greet} Even at night Neo believes in you! Rest well & grind tomorrow! 🌙`;
    }

    // Neutral (state 2-3)
    if (period === 'morning') {
      if (pending.length > 0)
        return `${greet} ${pending.length} task${pending.length > 1 ? 's' : ''} and your rituals are waiting. Let's go! 🎯`;
      return `${greet} Ready to build today's momentum? ✨`;
    }
    if (period === 'noon') {
      if (remaining.length > 0)
        return `${greet} Still ${remaining.length} ritual${remaining.length > 1 ? 's' : ''} left — afternoon push time! 🏃`;
      return `${greet} You're halfway through the day — keep the energy up! ⚡`;
    }
    if (period === 'evening') {
      return `${greet} Time to wrap up the day strong! 🌆`;
    }
    return `${greet} Night owl mode activated! 🦉 What's left on your list?`;
  };

  // ── Short hi message (2nd+ open in same period) ───────────────────────
  const buildShortHi = (currentState, tasks, habits) => {
    const pending = tasks.filter(t => !t.done);
    const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    const activeH = habits.filter(h => !h.paused);
    const remaining = activeH.filter(h => h.count < h.goal);

    const happy = currentState >= 4;
    const sad = currentState === 1;

    // Priority: overdue → pending task → habit reminder → quote
    if (overdue.length > 0) {
      if (happy) return `Still on fire! Don't forget "${overdue[0].name}" is overdue 🔥`;
      if (sad) return `Hey... "${overdue[0].name}" is still waiting. You've got this 💛`;
      return `Hey! "${overdue[0].name}" is overdue — quick catch-up! ⏰`;
    }
    if (pending.length > 0) {
      const t = pending[Math.floor(Math.random() * pending.length)];
      if (happy) return `Psst — "${t.name}" is still on the list! Let's blast through it! ⚡`;
      if (sad) return `When you're ready, "${t.name}" is waiting 🤍`;
      return `Reminder: "${t.name}" needs your attention 🎯`;
    }
    if (remaining.length > 0) {
      const h = remaining[Math.floor(Math.random() * remaining.length)];
      if (happy) return `Nearly there! "${h.name}" is all that's left 💪🔥`;
      if (sad) return `Take it easy — "${h.name}" is still left for today 🌿`;
      return `Don't forget your "${h.name}" ritual! 💧`;
    }
    // Fallback: quote (mood-tinted)
    const quotes = happy
      ? ["You're absolutely on FIRE today! 🔥🏆", "Max productivity unlocked! 🚀", "Neo is proud of you today! ⭐"]
      : sad
        ? ["Rest if you must, but don't quit 💛", "Progress > perfection, always 🌿", "Small steps still move you forward 🤝"]
        : INSPIRATIONAL_QUOTES;
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  // Trigger contextual speech: task reminders, habit checks, or inspiration
  const triggerNotification = () => {
    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];
    const msg = buildShortHi(state, currentTasks, currentHabits);
    setSpeech(msg);
    setBounce(true);
    setTimeout(() => setBounce(false), 380);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => setSpeech(null), 5500);
  };

  // Welcome greeting on mount + automatic recurring reminders
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const period = getTimePeriod();
    const periodKey = `neo_greeted_${today}_${period}`;
    const hasGreetedThisPeriod = localStorage.getItem(periodKey);

    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];

    let msg;
    if (!hasGreetedThisPeriod) {
      // 1st open of this time period → full mood-aware greeting
      localStorage.setItem(periodKey, '1');
      msg = buildFullGreeting(period, state, currentTasks, currentHabits);
    } else {
      // 2nd+ open → short hi + task/quote
      msg = buildShortHi(state, currentTasks, currentHabits);
    }

    setSpeech(msg);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => setSpeech(null), 5500);

    // Automatic motivational quote timer: fires every 15 minutes
    const autoInterval = setInterval(() => {
      triggerNotification();
    }, 15 * 60 * 1000);

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

            {/* State 1: Sad Neo, State 5: Glow Neo, State 6: Progressbar Neo */}
            <img
              src={state === 6 ? neoProgressbarImg : state === 1 ? neoSadImg : neoImg}
              alt="Neo"
              draggable="false"
              className={`w-full h-full object-contain ${state === 5 ? 'drop-shadow-[0_0_18px_#f5c518]'
                  : state === 6 ? 'drop-shadow-[0_0_22px_#34d399]'
                    : ''
                }`}
            />




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

            {/* State 6: 📈 Badge overlay */}
            {state === 6 && (
              <div className="absolute top-[10%] -right-6 text-2xl z-40 drop-shadow-md animate-bounce">
                📈
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}
