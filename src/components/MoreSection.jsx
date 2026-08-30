import React, { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import {
  BarChart2,
  Award,
  Bell,
  Repeat,
  User,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { getUserStats } from "../utils";
import { playNotificationSound } from "../utils/audioUtils";
import UserManualModal from "./UserManualModal";

export default function MoreSection({ setCurrentTab, onOpenWeeklyReview }) {
  const [points, setPoints] = useState(0);
  const [showUserManual, setShowUserManual] = useState(false);

  useEffect(() => {
    const stats = getUserStats();
    setPoints(stats.points || 0);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in pb-28 px-1 pt-1">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        More
      </h1>

      {/* INSIGHTS GROUP */}
      <div className="mb-6">
        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase px-1 mb-2.5">
          INSIGHTS
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border)]/40 divide-y divide-[var(--border)]/60 shadow-lg">
          <button
            onClick={() => setCurrentTab("charts")}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <BarChart2
                className="w-5 h-5 text-[var(--accent-purple)]"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Activity charts
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>

          <button
            onClick={() => setCurrentTab("rewards")}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Award
                className="w-5 h-5 text-[var(--warning)]"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Rewards
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)] font-normal">
                {points} pts
              </span>
              <ChevronRight
                className="w-4 h-4 text-[var(--text-muted)]"
                strokeWidth={2}
              />
            </div>
          </button>

          <button
            onClick={onOpenWeeklyReview}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <CalendarDays
                className="w-5 h-5 text-violet-400"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Weekly review
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* SETTINGS GROUP */}
      <div>
        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase px-1 mb-2.5">
          SETTINGS
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border)]/40 divide-y divide-[var(--border)]/60 shadow-lg">
          <button
            onClick={() => {
              localStorage.setItem("pinboard_settings_focus", "notifications");
              setCurrentTab("settings");
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Bell
                className="w-5 h-5 text-[var(--text-secondary)]"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Notifications
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>

          <button
            onClick={() => {
              localStorage.setItem("pinboard_settings_focus", "rituals");
              setCurrentTab("settings");
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <Repeat
                className="w-5 h-5 text-[var(--text-secondary)]"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Manage rituals
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>

          <button
            onClick={() => {
              localStorage.setItem("pinboard_settings_focus", "account");
              setCurrentTab("settings");
            }}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <User
                className="w-5 h-5 text-[var(--text-secondary)]"
                strokeWidth={2}
              />
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Account
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>
        </div>
        {/* Add User Manual Section */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl overflow-hidden shadow-sm mt-6">
          <button
            onClick={() => setShowUserManual(true)}
            className="flex items-center justify-between w-full px-4 py-4 hover:bg-[var(--bg-card-hover)] transition-colors active:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                User Manual & Guide
              </span>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[var(--text-muted)]"
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      <UserManualModal isOpen={showUserManual} onClose={() => setShowUserManual(false)} />

      {window.location.hostname === 'localhost' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4 shadow-sm mt-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Debug Tools
          </h3>
          <button
            onClick={() => {
              if (!("Notification" in window)) {
                alert("Notifications not supported in this browser.");
                return;
              }
              if (Notification.permission !== "granted") {
                Notification.requestPermission().then((p) => {
                  if (p === "granted") fireTestNotif();
                  else alert("Permission denied");
                });
              } else {
                fireTestNotif();
              }

              function fireTestNotif() {
                playNotificationSound();
                const title = "Test OS Notification!";
                const options = {
                  body: "If you see this, native notifications and sound are working!",
                  icon: "/logo.jpg",
                  badge: "/logo.jpg",
                  vibrate: [200, 100, 200],
                  silent: false,
                };
                try {
                  if (
                    "serviceWorker" in navigator &&
                    navigator.serviceWorker.controller
                  ) {
                    navigator.serviceWorker.ready.then((r) => {
                      r.showNotification(title, options)
                        .then(() => alert("Triggered via Service Worker"))
                        .catch((err) => {
                          new Notification(title, options);
                          alert(
                            "Service Worker failed, triggered via new Notification()",
                          );
                        });
                    });
                  } else {
                    new Notification(title, options);
                    alert(
                      "Triggered via new Notification() (No active Service Worker)",
                    );
                  }
                } catch (err) {
                  alert("Error creating notification: " + err.message);
                }
              }
            }}
            className="w-full bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] py-3 rounded-xl font-medium transition-colors"
          >
            Test OS Notification
          </button>
        </div>
      )}

      {/* About & Version */}
      <div className="flex flex-col items-center justify-center py-6 mt-2 gap-1.5 opacity-70">
        <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center shadow-sm">
          <img src="/logo.jpg" alt="Logo" className="w-7 h-7 rounded-xl object-cover" />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Pinboard <span className="font-normal text-[var(--text-secondary)]">v1.3.0</span>
        </p>
        <p className="text-xs text-[var(--text-muted)]">Made for you 🌱</p>
      </div>
    </div>
  );
}
