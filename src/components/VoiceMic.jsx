import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVoiceLogger } from '../hooks/useVoiceLogger';
import { updateHabitInStorage, syncStateToBackend } from '../utils';
import { syncMonthlyGoalProgress } from '../utils';
import confetti from 'canvas-confetti';

// Check support once at module level
const isSpeechSupported = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export default function VoiceMic() {
  const [supported, setSupported] = useState(true);
  const [habits, setHabits] = useState([]);

  // Load habits from localStorage (refreshed on rituals update event)
  const loadHabits = useCallback(() => {
    try {
      const saved = localStorage.getItem('pinboard_rituals_data');
      if (saved) {
        setHabits(JSON.parse(saved).habits || []);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    setSupported(isSpeechSupported());
    loadHabits();
    window.addEventListener('pinboard_rituals_updated', loadHabits);
    return () => window.removeEventListener('pinboard_rituals_updated', loadHabits);
  }, [loadHabits]);

  // onLog callback — applies parsed voice command to habits
  const handleVoiceLog = useCallback((parsed) => {
    const { habitId, action, value } = parsed;

    // Sync monthly goal progress before updating habit count
    if (action === 'increment') syncMonthlyGoalProgress(habitId, value ?? 1);
    else if (action === 'set') {
      // Find old count to compute delta
      const habit = habits.find(h => h.id === habitId);
      if (habit) syncMonthlyGoalProgress(habitId, (value ?? 0) - habit.count);
    } else if (action === 'complete') {
      const habit = habits.find(h => h.id === habitId);
      if (habit && habit.count < habit.goal) {
        syncMonthlyGoalProgress(habitId, habit.goal - habit.count);
      }
    }

    updateHabitInStorage(habitId, action, value);

    // Celebration + neo bounce
    window.dispatchEvent(new CustomEvent('neo-bounce'));
    window.dispatchEvent(new CustomEvent('neo_celebration'));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

    syncStateToBackend();
  }, [habits]);

  const { startListening, stopListening, listening, transcript, result } =
    useVoiceLogger(habits, handleVoiceLog);

  // Auto-dismiss result toast after 3s
  const [visibleResult, setVisibleResult] = useState(null);
  useEffect(() => {
    if (result) {
      setVisibleResult(result);
      const timer = setTimeout(() => setVisibleResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (!supported) return null;

  return (
    <>
      {/* Overlays above the mic button */}
      <div className="fixed bottom-[90px] right-5 z-[60] flex flex-col items-end gap-2 pointer-events-none">

        {/* LISTENING PILL */}
        <AnimatePresence>
          {listening && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="flex items-center gap-2 bg-gray-900/95 border border-red-500/40 text-white px-3 py-1.5 rounded-full text-sm shadow-lg"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-medium">Listening...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULT TOAST */}
        <AnimatePresence>
          {visibleResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className={`flex items-start gap-2 px-3 py-2 rounded-xl text-sm shadow-xl border max-w-[220px] ${
                visibleResult.success
                  ? 'bg-emerald-900/95 border-emerald-500/40 text-emerald-100'
                  : 'bg-amber-900/95 border-amber-500/40 text-amber-100'
              }`}
            >
              <span className="text-base mt-0.5">
                {visibleResult.success ? '✅' : '⚠️'}
              </span>
              <span className="font-medium leading-snug">{visibleResult.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRANSCRIPT (dev only) */}
        {import.meta.env.DEV && transcript && (
          <p className="text-[10px] text-gray-600 font-mono max-w-[180px] text-right leading-tight">
            "{transcript}"
          </p>
        )}
      </div>

      {/* MIC BUTTON */}
      <button
        onClick={listening ? stopListening : startListening}
        className={`fixed bottom-[90px] right-5 z-[60] w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border ${
          listening
            ? 'border-red-400/60 bg-red-600 animate-pulse shadow-red-500/40'
            : 'border-teal-400/30 bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/30'
        }`}
        aria-label={listening ? 'Stop voice logging' : 'Start voice logging'}
        title={listening ? 'Tap to stop' : 'Voice log a ritual'}
      >
        {listening ? (
          // Stop icon
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Microphone icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
    </>
  );
}
