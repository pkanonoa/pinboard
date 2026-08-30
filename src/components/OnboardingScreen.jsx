import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import neoImg from '../assets/neo.png';
import { syncStateToBackend } from '../utils';

const HABIT_OPTIONS = [
  { id: 'h_water', name: 'Drink Water', emoji: '💧', type: 'countable', goal: 8, unit: 'glasses' },
  { id: 'h_exercise', name: 'Exercise', emoji: '💪', type: 'one_time' },
  { id: 'h_sleep', name: 'Sleep Early', emoji: '😴', type: 'time_locked' },
  { id: 'h_wake', name: 'Wake Up Early', emoji: '⏰', type: 'time_locked' },
  { id: 'h_read', name: 'Read', emoji: '📚', type: 'one_time' },
  { id: 'h_meditate', name: 'Meditate', emoji: '🧘', type: 'one_time' },
  { id: 'h_walk', name: 'Daily Walk', emoji: '🚶', type: 'one_time' },
  { id: 'h_meds', name: 'Take Medicine', emoji: '💊', type: 'countable', goal: 1, unit: 'dose' }
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [wakeTime, setWakeTime] = useState('06:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [neoBounce, setNeoBounce] = useState(false);
  const nameInputRef = useRef(null);

  // Goal Onboarding states
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('15');
  const [goalUnit, setGoalUnit] = useState('times');
  const [createdGoal, setCreatedGoal] = useState(null);

  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      setTimeout(() => nameInputRef.current.focus(), 100);
    }
    if (step === 7) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [step]);

  const triggerBounce = () => {
    setNeoBounce(true);
    setTimeout(() => setNeoBounce(false), 400);
  };

  const handleNext = () => {
    triggerBounce();
    
    if (step === 3) {
      const needsTime = selectedHabits.includes('h_sleep') || selectedHabits.includes('h_wake');
      setStep(needsTime ? 4 : 5);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    triggerBounce();
    
    if (step === 5) {
      const needsTime = selectedHabits.includes('h_sleep') || selectedHabits.includes('h_wake');
      setStep(needsTime ? 4 : 3);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const toggleHabit = (id) => {
    setSelectedHabits(prev => {
      if (prev.includes(id)) {
        return prev.filter(h => h !== id);
      } else {
        triggerBounce();
        return [...prev, id];
      }
    });
  };

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setTimeout(() => handleNext(), 1500);
      } else {
        handleNext();
      }
    } catch (e) {
      console.error(e);
      handleNext();
    }
  };

  const handleLater = () => {
    window.alert("You can enable notifications later in Settings.");
    handleNext();
  };

  const handleSaveGoal = () => {
    const targetVal = parseFloat(goalTarget) || 1;
    setCreatedGoal({
      id: `g_${Date.now()}`,
      name: goalName.trim(),
      category: 'Body',
      target: targetVal,
      unit: goalUnit.trim() || 'times',
      trackingType: 'count_toward',
      linkedHabitIds: [],
      dueDate: null,
      progress: 0,
      history: [],
      isCompleted: false,
      createdAt: new Date().toISOString()
    });
    handleNext();
  };

  const handleSkipGoal = () => {
    setCreatedGoal(null);
    handleNext();
  };

  const finishOnboarding = () => {
    localStorage.setItem('pinboard_onboarded', 'true');
    localStorage.setItem('pinboard_user_name', name);

    const habitsToSave = selectedHabits.map(id => {
      const option = HABIT_OPTIONS.find(o => o.id === id);
      const habitObj = {
        id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: option.name,
        type: option.type,
        count: 0,
        streak: 0,
        lastCompletedDate: null,
        failedDate: null,
        reminderEnabled: false,
        reminderType: 'fixed',
        reminderTime: '09:00',
        reminderInterval: 2,
        reminderIntervalUnit: 'hours'
      };

      if (option.type === 'countable') {
        habitObj.goal = option.goal;
        habitObj.unit = option.unit;
      } else if (option.type === 'one_time') {
        habitObj.goal = 1;
      } else if (option.type === 'time_locked') {
        habitObj.goal = 1;
        habitObj.graceWindow = 30; // 30 minutes window as requested
        if (id === 'h_sleep') habitObj.targetTime = sleepTime;
        if (id === 'h_wake') habitObj.targetTime = wakeTime;
      }
      return habitObj;
    });

    localStorage.setItem('pinboard_rituals_data', JSON.stringify({
      habits: habitsToSave,
      lastResetDate: new Date().toISOString().split('T')[0]
    }));

    if (createdGoal) {
      localStorage.setItem('pinboard_goals', JSON.stringify([createdGoal]));
    } else {
      localStorage.removeItem('pinboard_goals');
    }

    syncStateToBackend();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0f1a] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* Progress Dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= i ? 'w-6 bg-teal-400' : 'w-2 bg-gray-700'
            } ${step === 4 && i === 4 && (!selectedHabits.includes('h_sleep') && !selectedHabits.includes('h_wake')) ? 'hidden' : ''}`}
          />
        ))}
      </div>

      {/* Back Button */}
      {step > 1 && step < 7 && (
        <button
          onClick={handleBack}
          className="absolute top-5 left-5 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800/40 active:scale-95 z-[60]"
          title="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <style>{`
        @keyframes floatNeo {
          0%, 100%, 50% { transform: none; }
        }
        @keyframes bounceNeo {
          0%, 100%, 50% { transform: none; }
        }
        @keyframes celebrateNeo {
          0%, 100%, 25%, 75% { transform: none; }
        }
        .neo-float { animation: floatNeo 2.5s ease-in-out infinite; }
        .neo-bounce { animation: bounceNeo 400ms cubic-bezier(0.28, 0.84, 0.42, 1); }
        .neo-celebrate { animation: celebrateNeo 1.5s ease-in-out infinite; }
      `}</style>

      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="flex flex-col items-center animate-fade-in text-center w-full max-w-sm">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-teal-400 mb-2">
            Pinboard
          </h1>
          <p className="text-gray-400 font-medium mb-10 text-lg">Your habits. Your rules.</p>
          <img src={neoImg} alt="Neo" className="w-[180px] mb-12 neo-float drop-shadow-2xl" />
          <button 
            onClick={handleNext}
            className="w-full bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-transform active:scale-95"
          >
            Let's Go &rarr;
          </button>
        </div>
      )}

      {/* STEP 2: NAME */}
      {step === 2 && (
        <div className="flex flex-col items-center animate-fade-in text-center w-full max-w-sm">
          <div className="flex w-full justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-left leading-tight w-2/3">What should Neo call you?</h2>
            <img src={neoImg} alt="Neo" className={`w-[110px] ${neoBounce ? 'neo-bounce' : 'neo-float'}`} />
          </div>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-transparent border-b-2 border-gray-700 focus:border-teal-400 text-center text-3xl py-3 outline-none text-white transition-colors mb-12 placeholder-gray-600"
          />
          <button 
            onClick={handleNext}
            disabled={name.trim().length < 2}
            className={`w-full font-bold text-lg py-4 rounded-2xl transition-all duration-300 active:scale-95 ${
              name.trim().length >= 2 
                ? 'bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 3: PICK HABITS */}
      {step === 3 && (
        <div className="flex flex-col animate-fade-in w-full max-w-md h-full justify-center">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Pick habits to track</h2>
              <p className="text-gray-400 text-sm">Choose at least one to start.</p>
            </div>
            <img src={neoImg} alt="Neo" className={`w-[70px] ${neoBounce ? 'neo-bounce' : 'neo-float'}`} />
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-10 overflow-y-auto">
            {HABIT_OPTIONS.map(habit => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                    isSelected 
                      ? 'border-teal-500 bg-teal-500/20' 
                      : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <span className="text-3xl mb-2">{habit.emoji}</span>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-teal-400' : ''}`}>{habit.name}</span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleNext}
            disabled={selectedHabits.length === 0}
            className={`w-full font-bold text-lg py-4 rounded-2xl mt-auto transition-all duration-300 active:scale-95 ${
              selectedHabits.length > 0 
                ? 'bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 4: TIME PREFERENCES */}
      {step === 4 && (
        <div className="flex flex-col items-center animate-fade-in text-center w-full max-w-sm">
          <div className="flex w-full justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-left leading-tight w-2/3">Set your times</h2>
            <img src={neoImg} alt="Neo" className="w-[120px] neo-float" />
          </div>
          
          <div className="w-full flex flex-col gap-6 mb-12">
            {selectedHabits.includes('h_wake') && (
              <div className="bg-gray-900/80 p-5 rounded-2xl border border-gray-800 text-left">
                <label className="text-sm text-gray-400 font-bold uppercase tracking-wider block mb-3">I wake up at</label>
                <input 
                  type="time" 
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white text-2xl outline-none focus:ring-2 focus:ring-teal-500 [color-scheme:dark]"
                />
              </div>
            )}
            {selectedHabits.includes('h_sleep') && (
              <div className="bg-gray-900/80 p-5 rounded-2xl border border-gray-800 text-left">
                <label className="text-sm text-gray-400 font-bold uppercase tracking-wider block mb-3">I sleep at</label>
                <input 
                  type="time" 
                  value={sleepTime}
                  onChange={e => setSleepTime(e.target.value)}
                  className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-white text-2xl outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)] font-bold text-lg py-4 rounded-2xl transition-transform active:scale-95"
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 5: MONTHLY GOAL */}
      {step === 5 && (
        <div className="flex flex-col items-center animate-fade-in text-center w-full max-w-sm">
          <div className="flex w-full justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-left leading-tight w-2/3">Set a monthly goal</h2>
            <img src={neoImg} alt="Neo" className="w-[110px] neo-float" />
          </div>

          <div className="w-full flex flex-col gap-4 text-left mb-8">
            <div className="bg-gray-900/80 p-4.5 rounded-2xl border border-gray-800">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Goal Name</label>
              <input
                type="text"
                placeholder="e.g. Gym visits, Book reading..."
                value={goalName}
                onChange={e => setGoalName(e.target.value)}
                className="w-full bg-[#12131c] border-none rounded-xl px-4 py-3 text-white text-base outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-gray-900/80 p-4.5 rounded-2xl border border-gray-800">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Target</label>
                <input
                  type="number"
                  placeholder="15"
                  min="1"
                  value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)}
                  className="w-full bg-[#12131c] border-none rounded-xl px-4 py-3 text-white text-base outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex-1 bg-gray-900/80 p-4.5 rounded-2xl border border-gray-800">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Unit</label>
                <input
                  type="text"
                  placeholder="e.g. sessions, pages"
                  value={goalUnit}
                  onChange={e => setGoalUnit(e.target.value)}
                  className="w-full bg-[#12131c] border-none rounded-xl px-4 py-3 text-white text-base outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleSaveGoal}
              disabled={!goalName.trim()}
              className={`w-full font-bold text-lg py-4 rounded-2xl transition-all duration-300 active:scale-95 ${
                goalName.trim()
                  ? 'bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Set Goal & Continue
            </button>
            <button
              onClick={handleSkipGoal}
              className="w-full bg-transparent border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-gray-300 font-bold py-3.5 rounded-2xl transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS POPUP */}
      {step === 6 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-indigo-500"></div>
            
            <div className="text-5xl mb-4 mt-2">🔔</div>
            <h2 className="text-2xl font-bold mb-2">Enable Notifications</h2>
            <p className="text-gray-400 text-sm mb-6">Neo will nudge you at the right time, every day so you never forget.</p>
            
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={requestNotifications}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-transform active:scale-95"
              >
                Enable Notifications
              </button>
              <button 
                onClick={handleLater}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: ALL DONE */}
      {step === 7 && (
        <div className="flex flex-col items-center justify-center animate-fade-in text-center w-full max-w-sm h-full">
          <img src={neoImg} alt="Neo" className="w-[200px] mb-8 neo-celebrate drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]" />
          
          <h2 className="text-4xl font-extrabold mb-3">Ready, {name}! 🎉</h2>
          <p className="text-gray-400 text-xl mb-12">Neo's got your back from here.</p>
          
          <button 
            onClick={finishOnboarding}
            className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] font-bold text-xl py-4 rounded-2xl transition-transform active:scale-95"
          >
            Open Pinboard &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
