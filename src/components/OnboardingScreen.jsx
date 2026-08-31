import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import neoImg from "../assets/neo.png";
import { syncStateToBackend } from "../utils";

const HABIT_OPTIONS = [
  {
    id: "h_water",
    name: "Drink Water",
    emoji: "💧",
    type: "countable",
    goal: 8,
    unit: "glasses",
  },
  { id: "h_exercise", name: "Exercise", emoji: "💪", type: "one_time" },
  { id: "h_sleep", name: "Sleep Early", emoji: "😴", type: "time_locked" },
  { id: "h_wake", name: "Wake Up Early", emoji: "⏰", type: "time_locked" },
  { id: "h_read", name: "Read", emoji: "📚", type: "one_time" },
  { id: "h_meditate", name: "Meditate", emoji: "🧘", type: "one_time" },
  { id: "h_walk", name: "Daily Walk", emoji: "🚶", type: "one_time" },
  {
    id: "h_meds",
    name: "Take Medicine",
    emoji: "💊",
    type: "countable",
    goal: 1,
    unit: "dose",
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [wakeTime, setWakeTime] = useState("06:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [neoBounce, setNeoBounce] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (step === 2 && nameInputRef.current) {
      setTimeout(() => nameInputRef.current.focus(), 100);
    }
    if (step === 6) {
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
      const needsTime =
        selectedHabits.includes("h_sleep") || selectedHabits.includes("h_wake");
      setStep(needsTime ? 4 : 5);
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const toggleHabit = (id) => {
    setSelectedHabits((prev) => {
      if (prev.includes(id)) {
        return prev.filter((h) => h !== id);
      } else {
        triggerBounce();
        return [...prev, id];
      }
    });
  };

  const requestNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
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

  const finishOnboarding = () => {
    localStorage.setItem("pinboard_onboarded", "true");
    localStorage.setItem("pinboard_user_name", name);

    const habitsToSave = selectedHabits.map((id) => {
      const option = HABIT_OPTIONS.find((o) => o.id === id);
      const habitObj = {
        id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: option.name,
        type: option.type,
        count: 0,
        streak: 0,
        lastCompletedDate: null,
        failedDate: null,
        reminderEnabled: false,
        reminderType: "fixed",
        reminderTime: "09:00",
        reminderInterval: 2,
        reminderIntervalUnit: "hours",
      };

      if (option.type === "countable") {
        habitObj.goal = option.goal;
        habitObj.unit = option.unit;
      } else if (option.type === "one_time") {
        habitObj.goal = 1;
      } else if (option.type === "time_locked") {
        habitObj.goal = 1;
        habitObj.graceWindow = 30; // 30 minutes window as requested
        if (id === "h_sleep") habitObj.targetTime = sleepTime;
        if (id === "h_wake") habitObj.targetTime = wakeTime;
      }
      return habitObj;
    });

    localStorage.setItem(
      "pinboard_rituals_data",
      JSON.stringify({
        habits: habitsToSave,
        lastResetDate: new Date().toISOString().split("T")[0],
      }),
    );

    syncStateToBackend();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Progress Dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= i ? "w-6 bg-teal-400" : "w-2 bg-[var(--bg-card-hover)]"
            } ${step === 4 && i === 4 && !selectedHabits.includes("h_sleep") && !selectedHabits.includes("h_wake") ? "hidden" : ""}`}
          />
        ))}
      </div>

      <style>{`
 @keyframes floatNeo {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-8px); }
 }
 @keyframes bounceNeo {
 0%, 100% { transform: translateY(0); }
 50% { transform: translateY(-20px); }
 }
 @keyframes celebrateNeo {
 0%, 100% { transform: scale(1) rotate(0deg); }
 25% { transform: scale(1.1) rotate(-5deg); }
 75% { transform: scale(1.1) rotate(5deg); }
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
          <p className="text-[var(--text-secondary)] font-medium mb-10 text-lg">
            Your habits. Your rules.
          </p>
          <img
            src={neoImg}
            alt="Neo"
            className="w-[180px] mb-12 neo-float drop-shadow-2xl"
          />
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
            <h2 className="text-3xl font-bold text-left leading-tight w-2/3">
              What should Neo call you?
            </h2>
            <img
              src={neoImg}
              alt="Neo"
              className={`w-[110px] ${neoBounce ? "neo-bounce" : "neo-float"}`}
            />
          </div>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b-2 border-[var(--border)] focus:border-teal-400 text-center text-3xl py-3 outline-none text-[var(--text-primary)] transition-colors mb-12 placeholder-gray-600"
          />
          <button
            onClick={handleNext}
            disabled={name.trim().length < 2}
            className={`w-full font-bold text-lg py-4 rounded-2xl transition-all duration-300 active:scale-95 ${
              name.trim().length >= 2
                ? "bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)]"
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
              <p className="text-[var(--text-secondary)] text-sm">
                Choose at least one to start.
              </p>
            </div>
            <img
              src={neoImg}
              alt="Neo"
              className={`w-[70px] ${neoBounce ? "neo-bounce" : "neo-float"}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-10 overflow-y-auto">
            {HABIT_OPTIONS.map((habit) => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                    isSelected
                      ? "border-teal-500 bg-teal-500/20"
                      : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border)]"
                  }`}
                >
                  <span className="text-3xl mb-2">{habit.emoji}</span>
                  <span
                    className={`text-sm font-semibold ${isSelected ? "text-[var(--accent-teal)]" : ""}`}
                  >
                    {habit.name}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={selectedHabits.length === 0}
            className={`w-full font-bold text-lg py-4 rounded-2xl mt-auto transition-all duration-300 active:scale-95 ${
              selectedHabits.length > 0
                ? "bg-teal-500 text-teal-950 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)]"
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
            <h2 className="text-3xl font-bold text-left leading-tight w-2/3">
              Set your times
            </h2>
            <img src={neoImg} alt="Neo" className="w-[120px] neo-float" />
          </div>

          <div className="w-full flex flex-col gap-6 mb-12">
            {selectedHabits.includes("h_wake") && (
              <div className="bg-[var(--bg-primary)]/80 p-5 rounded-2xl border border-[var(--border)] text-left">
                <label className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-3">
                  I wake up at
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] text-2xl outline-none focus:ring-2 focus:ring-teal-500 "
                />
              </div>
            )}
            {selectedHabits.includes("h_sleep") && (
              <div className="bg-[var(--bg-primary)]/80 p-5 rounded-2xl border border-[var(--border)] text-left">
                <label className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-3">
                  I sleep at
                </label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] text-2xl outline-none focus:ring-2 focus:ring-purple-500 "
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

      {/* NOTIFICATIONS POPUP (Overlay over Step 4) */}
      {step === 5 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-indigo-500"></div>

            <div className="text-5xl mb-4 mt-2">🔔</div>
            <h2 className="text-2xl font-bold mb-2">Enable Notifications</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Neo will nudge you at the right time, every day so you never
              forget.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={requestNotifications}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-[var(--text-primary)] font-bold py-3 rounded-xl transition-transform active:scale-95"
              >
                Enable Notifications
              </button>
              <button
                onClick={handleLater}
                className="w-full bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] font-bold py-3 rounded-xl transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: ALL DONE */}
      {step === 6 && (
        <div className="flex flex-col items-center justify-center animate-fade-in text-center w-full max-w-sm h-full">
          <img
            src={neoImg}
            alt="Neo"
            className="w-[200px] mb-8 neo-celebrate drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]"
          />

          <h2 className="text-4xl font-extrabold mb-3">Ready, {name}! 🎉</h2>
          <p className="text-[var(--text-secondary)] text-xl mb-12">
            Neo's got your back from here.
          </p>

          <button
            onClick={finishOnboarding}
            className="w-full bg-gradient-to-r from-teal-500 to-indigo-500 text-[var(--text-primary)] shadow-[0_0_30px_rgba(99,102,241,0.5)] font-bold text-xl py-4 rounded-2xl transition-transform active:scale-95"
          >
            Open Pinboard &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
