import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, RefreshCw, ClipboardList, Target, Settings, ChevronRight, Bell } from "lucide-react";

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]/60 shrink-0">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">User Manual</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Tips, tricks, and hidden gestures</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex flex-col gap-7 pb-10">

            {/* Section 1: Neo */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg">🧅</div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Neo — Your Smart Companion</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-2">
                <p>Neo is the floating onion on your <strong className="text-[var(--text-primary)]">Home</strong> tab. He reacts to your progress in real time — the more rituals you complete, the happier he gets!</p>
                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-1.5">
                  <p className="font-semibold text-[var(--text-primary)] mb-2 text-xs uppercase tracking-wider">Gestures</p>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Tap Neo</strong> — Shows a motivational quote or opens Smart Suggestions if you have any.</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Hold (Long Press) Neo</strong> — Activates voice mode! You can speak to log a ritual (e.g. <em>"I drank 2 glasses of water"</em>) and Neo will update your progress automatically.</span></div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">When listening, the speech bubble will turn red and pulse. Neo's speech bubble also dismisses if you tap anywhere else on the screen.</p>
              </div>
            </section>

            {/* Section: Hidden Gestures */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-lg">👆</div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Hidden Gestures & Shortcuts</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-3">

                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-2">
                  <p className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1">🔄 Rituals Tab</p>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span><strong>Long Press a ritual card</strong> → Opens a hidden action menu with <em>Edit</em>, <em>Pause</em>, <em>Reset today</em>, and <em>Delete</em> options.</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span><strong>Tap "Done"</strong> on a completed ritual → Undoes your progress.</span></div>
                </div>

                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-2">
                  <p className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1">📋 Tasks Tab</p>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span><strong>Long Press a task</strong> → Reveals a hidden <em>Delete</em> button on the right side of the task.</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span><strong>Tap a task checkbox</strong> → Marks it complete and archives it in the Completed section.</span></div>
                </div>

                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-2">
                  <p className="font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider mb-1">📱 Navigation</p>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /><span><strong>Swipe left/right</strong> anywhere on screen → Switches between tabs (Home → Goals → Tasks → Rituals → More).</span></div>
                </div>

              </div>
            </section>

            {/* Section 2: Rituals */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-emerald-500" /></div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Rituals (Habits)</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-2">
                <p>Go to the <strong className="text-[var(--text-primary)]">Rituals</strong> tab to manage your daily habits.</p>
                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-1.5">
                  <p className="font-semibold text-[var(--text-primary)] mb-2 text-xs uppercase tracking-wider">Ritual Types</p>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Mark Done</strong> — Simple one-tap completion (e.g. Exercise, Shower).</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Counter</strong> — Log a number (e.g. Drink 8 glasses of water).</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Big Number</strong> — For large targets (e.g. 10,000 steps).</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Time-Locked</strong> — Only completable during specific hours (e.g. Wake Up Early).</span></div>
                </div>
                <p><strong className="text-[var(--text-primary)]">Reorder:</strong> In <strong>More → Rituals Management</strong>, drag the handles to reorder your rituals.</p>
                <p><strong className="text-[var(--text-primary)]">Quick complete from Home:</strong> Mark rituals as done right from the Home tab without switching tabs.</p>
              </div>
            </section>

            {/* Section 3: Ritual Notifications */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Bell className="w-5 h-5 text-amber-500" /></div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Setting Reminders</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-2">
                <p>Edit any ritual and toggle on <strong className="text-[var(--text-primary)]">Reminders</strong> to choose one of three reminder modes:</p>
                <div className="bg-[var(--bg-primary)] p-3.5 rounded-2xl border border-[var(--border)]/50 space-y-2">
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span><strong>Interval</strong> — Repeating nudges (e.g. every 2 hours between 8AM–10PM). Great for water or stretch breaks.</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span><strong>Fixed Time</strong> — A single daily reminder at a set time (e.g. 7:00 AM). Can be restricted to specific days of the week.</span></div>
                  <div className="flex gap-2 items-start"><ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span><strong>Goal / Progress Check-in</strong> — Reminds you at custom times only when you're below your daily goal threshold.</span></div>
                </div>
                <p><strong className="text-[var(--text-primary)]">For Tasks:</strong> Set a due date & time when creating a task — you'll get an automatic push notification at that exact moment.</p>
              </div>
            </section>

            {/* Section 4: Goals */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Target className="w-5 h-5 text-purple-500" /></div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Monthly Goals</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-2">
                <p>Goals in the <strong className="text-[var(--text-primary)]">Goals</strong> tab are big monthly targets. You can link a goal to one or more rituals so that completing a ritual automatically logs progress toward the goal.</p>
                <p>The app tracks your pace. If you're falling behind where you should be for the month, Neo will send you a reminder notification.</p>
              </div>
            </section>

            {/* Section 5: Settings tips */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center"><Settings className="w-5 h-5 text-[var(--text-secondary)]" /></div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Pro Tips</h3>
              </div>
              <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed space-y-2">
                <p><strong className="text-[var(--text-primary)]">Enable Notifications:</strong> Go to More → App & Account → Enable Notifications. Your browser must grant permission for reminders to work.</p>
                <p><strong className="text-[var(--text-primary)]">Install the App:</strong> Open your browser menu and tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>. Background notifications work best when the app is installed as a PWA.</p>
                <p><strong className="text-[var(--text-primary)]">Themes:</strong> Switch between <strong>Light</strong>, <strong>Dark</strong>, and <strong>AMOLED</strong> modes from the More tab.</p>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


