import React, { useState, useEffect, useRef } from "react";
import neoImg from "../assets/neo.png";
import { getUserStats } from "../utils";
import ShareCard from "./ShareCard";
import { useShareCard } from "../hooks/useShareCard";

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMon = (dayOfWeek + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun, sevenDaysAgo: mon };
}

function fmtShort(date) {
  return date.toLocaleDateString("en-US", {
    weekday: undefined,
    month: "short",
    day: "numeric",
  });
}

function getISOWeek(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function buildWeeklyData() {
  const { sevenDaysAgo } = getWeekBounds();

  // load raw data
  let completionLog = [];
  let habits = [];
  let monthlyGoals = [];
  let stats = {};

  try {
    completionLog = JSON.parse(
      localStorage.getItem("pinboard_completion_log") || "[]",
    );
  } catch (e) {}
  try {
    const rd = JSON.parse(
      localStorage.getItem("pinboard_rituals_data") || "{}",
    );
    habits = rd.habits || [];
  } catch (e) {}
  try {
    monthlyGoals = JSON.parse(localStorage.getItem("pinboard_goals") || "[]");
  } catch (e) {}
  try {
    stats = JSON.parse(localStorage.getItem("pinboard_stats") || "{}");
  } catch (e) {}

  // filter to this week
  const weekLogs = completionLog.filter(
    (log) => new Date(log.timestamp) >= sevenDaysAgo,
  );

  // Build per-habit completion day map { habitId -> Set of date strings }
  const habitDayMap = {};
  for (const log of weekLogs) {
    if (log.type === "habit") {
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      if (!habitDayMap[log.id]) habitDayMap[log.id] = new Set();
      habitDayMap[log.id].add(day);
    }
  }

  const nonPausedHabits = habits.filter((h) => !h.paused);
  const totalPossible = nonPausedHabits.length * 7;
  const totalCompletions = Object.values(habitDayMap).reduce(
    (acc, s) => acc + s.size,
    0,
  );
  const overallScore =
    totalPossible > 0
      ? Math.round((totalCompletions / totalPossible) * 100)
      : 0;

  // Best & worst habit
  let bestHabit = null,
    bestDays = -1;
  let worstHabit = null,
    worstDays = 8;
  for (const h of nonPausedHabits) {
    const days = (habitDayMap[h.id] || new Set()).size;
    if (days > bestDays) {
      bestDays = days;
      bestHabit = h;
    }
    if (days < worstDays) {
      worstDays = days;
      worstHabit = h;
    }
  }

  // Streak snapshot delta
  let snapshot = {};
  try {
    snapshot = JSON.parse(
      localStorage.getItem("pinboard_streak_snapshot") || "{}",
    );
  } catch (e) {}
  const streakDeltas = nonPausedHabits.map((h) => ({
    id: h.id,
    name: h.name,
    streak: h.streak || 0,
    prev: snapshot[h.id] || 0,
    delta: (h.streak || 0) - (snapshot[h.id] || 0),
  }));

  // Points this week
  const pointsThisWeek = weekLogs.length * 10; // simple: 10pts per completion log entry
  const bestWeekEver = parseInt(
    localStorage.getItem("pinboard_best_week_points") || "0",
    10,
  );
  if (pointsThisWeek > bestWeekEver) {
    localStorage.setItem("pinboard_best_week_points", String(pointsThisWeek));
  }

  // Last week points (stored separately)
  const lastWeekPoints = parseInt(
    localStorage.getItem("pinboard_last_week_points") || "0",
    10,
  );

  // Monthly goals pulse
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const daysPassed = now.getDate();
  const activeGoals = monthlyGoals.filter((g) => !g.isCompleted);
  const goalsPulse = activeGoals.map((g) => {
    const progress = g.progress || 0;
    const target = g.target || 1;
    const progressPct = target > 0 ? progress / target : 0;
    const expectedPct = daysInMonth > 0 ? daysPassed / daysInMonth : 1;
    const pace =
      expectedPct > 0 ? progressPct / expectedPct : progressPct > 0 ? 999 : 0;
    let status = "on_track";
    if (pace < 0.6) status = "behind";
    else if (pace < 0.9) status = "at_risk";
    return { ...g, progress, target, status };
  });

  return {
    overallScore,
    bestHabit,
    bestDays: bestDays < 0 ? 0 : bestDays,
    worstHabit,
    worstDays: worstDays > 7 ? 0 : worstDays,
    streakDeltas,
    pointsThisWeek,
    lastWeekPoints,
    bestWeekEver: Math.max(pointsThisWeek, bestWeekEver),
    isNewRecord: pointsThisWeek > bestWeekEver && bestWeekEver > 0,
    goalsPulse,
    nonPausedHabits,
    totalCompletions,
    totalPossible,
  };
}

// ── Animated score ring ───────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference * (1 - score / 100));
    }, 120);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const color = score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";
  const label =
    score >= 70 ? "Great week!" : score >= 40 ? "Getting there" : "Needs work";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#1e1e28"
            strokeWidth="10"
          />
          {/* progress */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-tight">
          <span className="text-3xl font-black text-[var(--text-primary)]">
            {score}%
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-medium">
            This week
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WeeklyReviewScreen({ onClose }) {
  const { mon, sun } = getWeekBounds();
  const data = useRef(buildWeeklyData()).current;
  const {
    overallScore,
    bestHabit,
    bestDays,
    worstHabit,
    worstDays,
    streakDeltas,
    pointsThisWeek,
    lastWeekPoints,
    bestWeekEver,
    isNewRecord,
    goalsPulse,
    totalCompletions,
    totalPossible,
  } = data;

  const [intention, setIntention] = useState(
    () => localStorage.getItem("pinboard_weekly_intention") || "",
  );
  const [prevIntention] = useState(
    () => localStorage.getItem("pinboard_prev_weekly_intention") || "",
  );
  const [intentionSkipped, setIntentionSkipped] = useState(false);

  const shareCardRef = useRef(null);
  const [shareData, setShareData] = useState(null);
  const { shareCard, isGenerating } = useShareCard(shareCardRef);

  useEffect(() => {
    if (shareData) {
      const run = async () => {
        await new Promise((r) => setTimeout(r, 150));
        await shareCard();
        setShareData(null);
      };
      run();
    }
  }, [shareData]);

  const handleShareClick = () => {
    const userName = localStorage.getItem("pinboard_user_name") || "User";
    const weekLabel = `${fmtShort(mon)} – ${fmtShort(sun)}`;
    const stats = getUserStats();
    const levelName = stats.currentLevel.name;
    const bestStreak =
      streakDeltas.length > 0
        ? Math.max(...streakDeltas.map((s) => s.streak))
        : 0;

    let mvpHabit = null;
    if (bestHabit) {
      mvpHabit = {
        name: bestHabit.name,
        days: bestDays,
      };
    }

    setShareData({
      userName,
      weekLabel,
      bestStreak,
      pointsThisWeek,
      habitsDone: totalCompletions,
      habitTotal: totalPossible,
      levelName,
      mvpHabit,
    });
  };

  // Save snapshot of streaks on mount (for next week's delta)
  useEffect(() => {
    try {
      let habits = [];
      const rd = JSON.parse(
        localStorage.getItem("pinboard_rituals_data") || "{}",
      );
      habits = rd.habits || [];
      const snap = {};
      for (const h of habits) snap[h.id] = h.streak || 0;
      localStorage.setItem("pinboard_streak_snapshot", JSON.stringify(snap));
      // store last week points
      localStorage.setItem("pinboard_last_week_points", String(pointsThisWeek));
    } catch (e) {}
  }, []);

  const headerLabel = `Week of ${fmtShort(mon)} — ${fmtShort(sun)}`;
  const neoAnim = overallScore >= 70 ? "neo-proud-pulse" : "neo-gentle-float";

  function saveIntention() {
    if (intention.trim()) {
      localStorage.setItem("pinboard_prev_weekly_intention", intention.trim());
      localStorage.setItem("pinboard_weekly_intention", "");
    }
  }

  function handleClose() {
    saveIntention();
    onClose();
  }

  // Streak bar helper
  const maxStreak = Math.max(...streakDeltas.map((s) => s.streak), 1);

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--bg-primary)] overflow-hidden animate-slide-up flex flex-col items-center">
      {/* Off-screen rendering container for share card capture */}
      {shareData && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            zIndex: -100,
          }}
        >
          <ShareCard ref={shareCardRef} {...shareData} />
        </div>
      )}

      {/* Sticky Close Button */}
      <button
        onClick={handleClose}
        className="fixed top-4 right-4 z-[210] w-9 h-9 flex items-center justify-center rounded-full bg-[var(--bg-card)]/80 hover:bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 text-sm shadow-md"
        aria-label="Close"
      >
        ✕
      </button>

      {/* ── Full Scrollable Container ── */}
      <div className="w-full max-w-md h-full overflow-y-auto px-4 pt-10 pb-40 space-y-3">
        {/* ── Header ── */}
        <div className="flex flex-col items-center pb-3 px-2 text-center">
          <span className="text-xs text-[var(--text-muted)] font-medium tracking-wide mb-1">
            {headerLabel}
          </span>
          <h1 className="text-2xl font-black text-[var(--text-primary)] mb-4">
            Your Weekly Recap
          </h1>
          <div className={`${neoAnim}`} style={{ width: 120, height: 120 }}>
            <img
              src={neoImg}
              alt="Neo"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* 1. Overall Score */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-5 flex flex-col items-center gap-3">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider self-start">
            Overall Score
          </h2>
          <ScoreRing score={overallScore} />
        </div>

        {/* 2. Best Habit */}
        {bestHabit && (
          <div className="bg-[var(--bg-card)] border-l-4 border-emerald-500 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-bold text-[var(--success)] uppercase tracking-wider">
              🏆 Best habit
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[var(--text-primary)] font-bold text-base">
                {bestHabit.name}
              </span>
              {bestDays === 7 && (
                <span className="text-yellow-400 text-lg">👑</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Completed{" "}
              <span className="text-[var(--text-primary)] font-semibold">
                {bestDays} / 7
              </span>{" "}
              days
            </p>
            {bestDays === 7 && (
              <p className="text-xs text-[var(--success)] font-semibold">
                Perfect week! Neo is so proud 🧅✨
              </p>
            )}
          </div>
        )}

        {/* 3. Worst Habit */}
        {worstHabit && worstHabit.id !== bestHabit?.id && (
          <div className="bg-[var(--bg-card)] border-l-4 border-amber-500 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-bold text-[var(--warning)] uppercase tracking-wider">
              ⚠️ Needs work
            </span>
            <div className="text-[var(--text-primary)] font-bold text-base mt-1">
              {worstHabit.name}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Only completed{" "}
              <span className="text-[var(--text-primary)] font-semibold">
                {worstDays} / 7
              </span>{" "}
              days
            </p>
            <p className="text-xs text-[var(--text-muted)] italic mt-1">
              Try pausing it if life is busy — no shame in that 💛
            </p>
          </div>
        )}

        {/* 4. Streak Changes */}
        {streakDeltas.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Streak Changes
            </h2>
            <div className="flex flex-col gap-2">
              {streakDeltas.map((s) => {
                const barWidth = Math.round((s.streak / maxStreak) * 100);
                const deltaColor =
                  s.delta > 0
                    ? "text-[var(--success)]"
                    : s.delta < 0
                      ? "text-[var(--danger)]"
                      : "text-[var(--text-muted)]";
                const deltaLabel =
                  s.delta > 0
                    ? `+${s.delta} ↑`
                    : s.delta < 0
                      ? `${s.delta} ↓`
                      : "=";
                return (
                  <div key={s.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                        🔥 {s.name}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                        <span className="font-bold">{s.streak}d</span>
                        <span className={`text-xs font-bold ${deltaColor}`}>
                          {deltaLabel}
                        </span>
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--bg-card)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${barWidth}%`,
                          background: s.delta >= 0 ? "#34d399" : "#f87171",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Points This Week */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Points This Week
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-black text-yellow-400">
              ⭐ {pointsThisWeek}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              points earned
            </span>
          </div>
          {/* Mini bar: this week vs last week */}
          <div className="space-y-1.5">
            {[
              { label: "This week", pts: pointsThisWeek, color: "#818cf8" },
              { label: "Last week", pts: lastWeekPoints, color: "#4b5563" },
            ].map((row) => {
              const pct =
                bestWeekEver > 0
                  ? Math.round((row.pts / bestWeekEver) * 100)
                  : 0;
              return (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-20 shrink-0">
                    {row.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: row.color }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] w-8 text-right">
                    {row.pts}
                  </span>
                </div>
              );
            })}
          </div>
          {isNewRecord && (
            <p className="text-xs font-bold text-[var(--accent-purple)] mt-2">
              🎉 New personal record this week!
            </p>
          )}
          {!isNewRecord && bestWeekEver > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Your best week:{" "}
              <span className="text-[var(--text-secondary)] font-semibold">
                {bestWeekEver} pts
              </span>
            </p>
          )}
        </div>

        {/* 6. Monthly Goals Pulse */}
        {goalsPulse.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Monthly Goals
            </h2>
            <div className="flex flex-col gap-2">
              {goalsPulse.map((g) => {
                const icon =
                  g.status === "on_track"
                    ? "📈"
                    : g.status === "at_risk"
                      ? "⚠️"
                      : "🔴";
                const statusLabel =
                  g.status === "on_track"
                    ? "on track"
                    : g.status === "at_risk"
                      ? "at risk"
                      : "falling behind";
                const statusColor =
                  g.status === "on_track"
                    ? "text-[var(--success)]"
                    : g.status === "at_risk"
                      ? "text-[var(--warning)]"
                      : "text-[var(--danger)]";
                return (
                  <div key={g.id} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">
                      {icon} {g.name}
                    </span>
                    <span className={`text-xs font-semibold ${statusColor}`}>
                      {statusLabel} ({g.progress}/{g.target})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. Next Week Intention */}
        {!intentionSkipped && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                One thing to focus on next week
              </h2>
              <button
                onClick={() => {
                  saveIntention();
                  setIntentionSkipped(true);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Skip
              </button>
            </div>
            {prevIntention && (
              <p className="text-xs text-[var(--text-muted)] italic mb-2">
                Last week: "{prevIntention}"
              </p>
            )}
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onBlur={() => {
                if (intention.trim())
                  localStorage.setItem(
                    "pinboard_weekly_intention",
                    intention.trim(),
                  );
              }}
              placeholder="e.g. Don't miss water for 7 days straight"
              rows={2}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm placeholder-gray-600 outline-none focus:border-indigo-500 resize-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* ── Close Button ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-primary)]/90 backdrop-blur-md border-t border-[var(--border)]/60 flex flex-col gap-2.5 max-w-md mx-auto z-[210]">
        <button
          onClick={handleShareClick}
          disabled={isGenerating}
          className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-teal-900/40 text-sm flex items-center justify-center gap-1.5"
        >
          {isGenerating ? "Generating card..." : "📤 Share my week"}
        </button>
        <button
          onClick={handleClose}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-900/40 text-sm"
        >
          Close review
        </button>
      </div>
    </div>
  );
}
