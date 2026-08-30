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

export default function MoreSection({ setCurrentTab, onOpenWeeklyReview }) {
  const [points, setPoints] = useState(0);

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
      </div>

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
              const title = "Test OS Notification!";
              const options = {
                body: "If you see this, native notifications are working!",
                icon: "/pwa-192x192.png",
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
    </div>
  );
}
