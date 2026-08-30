import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import neoImg from '../assets/neo.png';
import neoSadImg from '../assets/neo-sad.png';
import neoProgressbarImg from '../assets/neo-progressbar.png';
import { useVoiceLogger } from '../hooks/useVoiceLogger';
import { updateHabitInStorage, syncStateToBackend } from '../utils';
import { syncMonthlyGoalProgress } from '../utils';

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

export default function NeoAvatar({ habits = [], tasks = [], allGoalsOnTrack = false, suggestions = [], onSuggestionAction = () => {}, onDismissSuggestion = () => {} }) {
  const [speech, setSpeech] = useState(null);
  const [speechType, setSpeechType] = useState('default'); // 'default', 'success', 'fail', 'listening'
  const [bounce, setBounce] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const speechTimeoutRef = useRef(null);
  const longPressTimerRef = useRef(null);

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
    if (speechType === 'listening') return; // Don't interrupt if listening
    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];
    const msg = buildShortHi(state, currentTasks, currentHabits);
    setSpeech(msg);
    setSpeechType('default');
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

    // sessionStorage is wiped every time the browser/tab is fully closed & reopened
    const isNewSession = !sessionStorage.getItem('neo_session_started');

    const currentTasks = tasksRef.current || [];
    const currentHabits = habitsRef.current || [];

    let msg;
    let displayTime = 6000;

    const firstWelcomeShown = localStorage.getItem('neo_first_welcome_shown') === 'true';

    if (!firstWelcomeShown) {
      // Very first time ever — one-time onboarding welcome
      localStorage.setItem('neo_first_welcome_shown', 'true');
      localStorage.setItem(periodKey, '1');
      sessionStorage.setItem('neo_session_started', '1');
      msg = `Welcome to Pinboard, ${userName}! 🎉 Neo is so excited to help you build habits and conquer your days! Let's make today your first victory! 🧅✨`;
      displayTime = 9000;
    } else if (isNewSession) {
      // App was fully closed and reopened — always greet warmly
      sessionStorage.setItem('neo_session_started', '1');
      localStorage.setItem(periodKey, '1');

      const pending = (tasksRef.current || []).filter(t => !t.done);
      const activeH = (habitsRef.current || []).filter(h => !h.paused);
      const remaining = activeH.filter(h => h.count < h.goal);

      const periodWord =
        period === 'morning' ? 'Good morning' :
        period === 'noon'    ? 'Good afternoon' :
        period === 'evening' ? 'Good evening' : 'Welcome back';

      if (state === 1) {
        // Sad Neo
        msg = `${periodWord}, ${userName} 💛 Neo missed you. Ready to pick things back up together?`;
      } else if (state >= 5) {
        // Happy Neo
        msg = `${periodWord}, ${userName}! 🎉 Neo is SO happy you're back — let's keep crushing it! 🔥`;
      } else if (pending.length > 0 && remaining.length > 0) {
        msg = `${periodWord}, ${userName}! 👋 You've got ${pending.length} task${pending.length > 1 ? 's' : ''} and ${remaining.length} ritual${remaining.length > 1 ? 's' : ''} waiting. Let's go! 💪`;
      } else if (pending.length > 0) {
        msg = `${periodWord}, ${userName}! 👋 ${pending.length} task${pending.length > 1 ? 's' : ''} still on the list — Neo believes in you! ✨`;
      } else if (remaining.length > 0) {
        msg = `${periodWord}, ${userName}! 👋 ${remaining.length} ritual${remaining.length > 1 ? 's' : ''} left today. You got this 💪`;
      } else {
        msg = `${periodWord}, ${userName}! 🧅 Great to have you back. Neo is rooting for you today!`;
      }
    } else if (!hasGreetedThisPeriod) {
      // Same session, new time period → full mood-aware greeting
      localStorage.setItem(periodKey, '1');
      msg = buildFullGreeting(period, state, currentTasks, currentHabits);
    } else {
      // Same session, same period → short reminder
      msg = buildShortHi(state, currentTasks, currentHabits);
    }

    if (!speech || speechType !== 'listening') {
      setSpeech(msg);
      setSpeechType('default');
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => setSpeech(null), displayTime);
    }

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

  // Dismiss speech bubble when clicking anywhere outside Neo
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const neoElement = document.getElementById('neo-avatar-container');
      if (neoElement && !neoElement.contains(e.target)) {
        setSpeech(null);
      }
    };

    if (speech) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [speech]);

  // Voice Logger Logic
  const handleVoiceLog = React.useCallback((parsed) => {
    const { habitId, action, value, feedback } = parsed;
    if (action === 'increment') syncMonthlyGoalProgress(habitId, value ?? 1);
    else if (action === 'set') {
      const habit = habitsRef.current.find(h => h.id === habitId);
      if (habit) syncMonthlyGoalProgress(habitId, (value ?? 0) - habit.count);
    } else if (action === 'complete') {
      const habit = habitsRef.current.find(h => h.id === habitId);
      if (habit && habit.count < habit.goal) {
        syncMonthlyGoalProgress(habitId, habit.goal - habit.count);
      }
    }
    updateHabitInStorage(habitId, action, value);
    
    setSpeech(feedback || 'Got it!');
    setSpeechType('success');
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
      setSpeechType('default');
    }, 4000);

    window.dispatchEvent(new CustomEvent('neo-bounce'));
    window.dispatchEvent(new CustomEvent('neo_celebration'));
    syncStateToBackend();
  }, []);

  const { startListening, stopListening, listening, result } = useVoiceLogger(habits, handleVoiceLog);

  useEffect(() => {
    if (listening) {
      setSpeech("I'm listening... 🎙️");
      setSpeechType('listening');
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    } else if (speechType === 'listening') {
      // If listening stopped but no result came yet, reset
      setSpeech(null);
      setSpeechType('default');
    }
  }, [listening]);

  useEffect(() => {
    if (result && !result.success) {
      if (result.message.includes('not-allowed') || result.message.includes('denied')) {
        setSpeech("Microphone access denied 🎙️");
      } else {
        setSpeech("Hmm, didn't catch that. Try again?");
        setWiggle(true);
        setTimeout(() => setWiggle(false), 400);
      }
      setSpeechType('fail');
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => {
        setSpeech(null);
        setSpeechType('default');
      }, 3000);
    }
  }, [result]);

  // On Tap: open suggestions if available, otherwise show quote
  const handleTap = (e) => {
    if (e) e.preventDefault();
    if (listening) {
      stopListening();
      return;
    }
    if (suggestions && suggestions.length > 0) {
      setIsSuggestionsOpen(true);
    } else {
      triggerNotification();
    }
  };

  // Long Press Handlers
  const startPress = (e) => {
    if (listening) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50); // haptic feedback
      startListening();
    }, 500); // 500ms long press
  };

  const cancelPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

  const renderSuggestionsDrawer = () => {
    if (!isSuggestionsOpen || !suggestions || suggestions.length === 0) return null;
    return createPortal(
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSuggestionsOpen(false)}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-auto"
        />
        
        {/* suggestions bottom sheet/drawer */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[110] bg-[#0d0e17] border-t border-gray-800 shadow-2xl rounded-t-3xl max-h-[80vh] flex flex-col p-5 pb-safe pointer-events-auto"
        >
          <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🧅</span> Neo's suggestions
            </h2>
            <button 
              onClick={() => setIsSuggestionsOpen(false)}
              className="p-1.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-16">
            {suggestions.map(s => {
              const borderColor =
                s.priority <= 2 ? 'border-l-amber-500' :
                s.priority <= 4 ? 'border-l-teal-500' :
                s.priority === 6 ? 'border-l-green-500' : 'border-l-indigo-500';
              const iconBg =
                s.priority <= 2 ? 'bg-amber-500/10' :
                s.priority <= 4 ? 'bg-teal-500/10' :
                s.priority === 6 ? 'bg-green-500/10' : 'bg-indigo-500/10';
              const btnColor =
                s.priority <= 2 ? 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10' :
                s.priority <= 4 ? 'text-teal-400 border-teal-500/30 hover:bg-teal-500/10' :
                s.priority === 6 ? 'text-green-400 border-green-500/30 hover:bg-green-500/10' : 'text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10';

              return (
                <div
                  key={s.id}
                  className={`bg-[#141522] border border-gray-800/60 border-l-4 ${borderColor} rounded-2xl p-3.5`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center text-lg shrink-0 mt-0.5`}>
                       {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.body}</p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => {
                            onSuggestionAction(s);
                            setIsSuggestionsOpen(false);
                          }}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors active:scale-95 ${btnColor}`}
                        >
                          {s.action.label}
                        </button>
                        <button
                          onClick={() => onDismissSuggestion(s.id)}
                          className="ml-auto p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5 active:scale-90"
                          aria-label="Dismiss"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <div className="fixed bottom-[80px] right-2 flex flex-col items-end justify-end select-none z-45 pointer-events-none">

      {/* Speech Bubble */}
      <div
        className={`absolute bottom-[105px] right-2 mb-2 bg-white text-gray-900 px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-xl max-w-[210px] text-center transition-all duration-300 pointer-events-none leading-snug ${speech ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${speechType === 'success' ? '!bg-[rgba(34,197,94,0.15)] !text-emerald-100' : speechType === 'fail' ? '!bg-[rgba(239,68,68,0.12)] !text-red-200' : speechType === 'listening' ? '!bg-red-500/20 !text-red-100 border border-red-500/40 animate-pulse' : 'text-gray-900'}`}
      >
        {speech}
        <div className={`absolute right-6 bottom-0 transform translate-y-[90%] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${speechType === 'success' ? 'border-t-[rgba(34,197,94,0.15)]' : speechType === 'fail' ? 'border-t-[rgba(239,68,68,0.12)]' : speechType === 'listening' ? 'border-t-[rgba(239,68,68,0.2)]' : 'border-t-white'}`}></div>
      </div>

      {/* Main Avatar Container */}
      <div
        id="neo-avatar-container"
        className={`relative cursor-pointer mt-2 pointer-events-auto transition-transform duration-400 ${wiggle ? 'neo-wiggle-once' : ''}`}
        onClick={handleTap}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
        style={{ width: '96px', height: '96px', WebkitTouchCallout: 'none' }}
      >
        {/* Glowing Suggestions Badge Dot */}
        {suggestions && suggestions.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 z-50">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border border-[#0d0e17] flex items-center justify-center text-[10px] font-black text-white shadow-md">
              {suggestions.length}
            </span>
          </span>
        )}

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

      {renderSuggestionsDrawer()}
    </div>
  );
}
