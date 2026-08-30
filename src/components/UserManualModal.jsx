import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, RefreshCw, ClipboardList, Target, Settings, ChevronRight } from "lucide-react";

export default function UserManualModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]/60 bg-[var(--bg-card)] shrink-0 z-10 sticky top-0">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                User Manual
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tips, tricks, and hidden gestures
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 pb-10">
            {/* Section 1: Neo */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Neo: AI Voice Assistant
                </h3>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3 pl-13">
                <p>
                  Neo is your smart companion (the little onion!). You can use Neo to interact with the app completely hands-free.
                </p>
                <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)]/50">
                  <p className="font-semibold text-[var(--text-primary)] mb-2 text-xs uppercase tracking-wider">How to use it</p>
                  <ul className="space-y-2 text-[13px]">
                    <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong>Hold (Long Press) Neo</strong> on the Home tab to start speaking.</span></li>
                    <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong>"I just drank water"</strong> → Logs +1 to your water ritual.</span></li>
                    <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong>"Remind me to call mom at 5 PM"</strong> → Creates a scheduled task.</span></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Rituals */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Rituals (Habits)
                </h3>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3 pl-13">
                <p>
                  <strong className="text-[var(--text-primary)]">Hidden Gesture (Quick Edit):</strong> On the Home tab, <strong>Long Press (press and hold)</strong> any ritual card to bring up a hidden menu to instantly edit or delete it!
                </p>
                <p>
                  <strong className="text-[var(--text-primary)]">Setting Notifications:</strong> Go to the More Tab → Rituals Management → Edit. Turn on <strong>Reminders</strong> to choose:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[13px]">
                  <li><strong>Intervals:</strong> Reminds you repeatedly (e.g., every 2 hours).</li>
                  <li><strong>Fixed Time:</strong> Reminds you once daily (e.g., 8:00 AM).</li>
                  <li><strong>Goal Check-in:</strong> Reminds you only if you're falling behind!</li>
                </ul>
              </div>
            </section>

            {/* Section 3: Tasks */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Tasks & Todos
                </h3>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3 pl-13">
                <p>
                  When creating or editing a task, tap the <strong>Due Date & Time</strong> field. If you select a specific time, the app will automatically send you a push notification exactly when the task is due.
                </p>
                <p>
                  You'll also get a <strong>Daily Digest</strong> notification every evening summarizing your pending tasks.
                </p>
              </div>
            </section>

            {/* Section 4: Goals */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Monthly Goals
                </h3>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3 pl-13">
                <p>
                  <strong className="text-[var(--text-primary)]">Linking Rituals:</strong> You can link a Goal to a Daily Ritual! For example, link your "Read 5 Books" goal to your daily "Read 10 pages" ritual. Every time you log pages daily, your monthly goal updates automatically.
                </p>
                <p>
                  Pinboard monitors your goal pace. If you start falling behind, Neo will send you a gentle notification to pick it up!
                </p>
              </div>
            </section>

            {/* Section 5: Settings */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Pro Tips
                </h3>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-3 pl-13">
                <p>
                  <strong className="text-[var(--text-primary)]">Enable Notifications:</strong> If notifications aren't showing up, scroll down in the More tab and tap <strong>Enable Notifications</strong>. Make sure your browser/phone grants permission!
                </p>
                <p>
                  <strong className="text-[var(--text-primary)]">Install the App:</strong> For the best experience, open your browser menu (Chrome/Safari) and tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>. Notifications work best when installed!
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
