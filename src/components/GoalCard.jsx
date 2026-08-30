import React, { useState } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export default function GoalCard({
  goal,
  onLog,
  onComplete,
  onUndo,
  onDelete,
  onEdit,
  onTogglePause,
}) {
  const [logValue, setLogValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Status Calculation
  const getStatus = () => {
    if (goal.isCompleted)
      return {
        label: "Completed",
        color: "text-[var(--success)] bg-emerald-900/30",
      };
    if (goal.paused)
      return {
        label: "Paused",
        color: "text-[var(--text-secondary)] bg-[var(--bg-card)]",
      };

    if (goal.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(goal.dueDate);
      due.setHours(0, 0, 0, 0);

      if (today > due) {
        return {
          label: "Overdue",
          color: "text-[var(--danger)] bg-red-900/30",
        };
      }

      // If we have progress, target, createdAt and dueDate, we could calculate pace.
      // For now, if no pace calculation is strictly possible, default to in_progress or user-selected status.
      if (goal.trackingType !== "binary" && goal.createdAt) {
        const created = new Date(goal.createdAt);
        created.setHours(0, 0, 0, 0);

        const totalPausedMs = goal.totalPausedMs || 0;
        let currentPausedMs = 0;
        if (goal.paused && goal.pausedAt) {
          currentPausedMs = Math.max(0, today - new Date(goal.pausedAt));
        }

        const activeDurationMs = Math.max(
          0,
          today - created - totalPausedMs - currentPausedMs,
        );
        const daysPassed = activeDurationMs / (1000 * 60 * 60 * 24);
        const totalDays = Math.max(1, (due - created) / (1000 * 60 * 60 * 24));

        const expectedProgress = (goal.target / totalDays) * daysPassed;
        if (goal.progress >= expectedProgress)
          return {
            label: "On track",
            color: "text-[var(--success)] bg-emerald-900/30",
          };
        if (goal.progress >= expectedProgress * 0.75)
          return {
            label: "At risk",
            color: "text-[var(--warning)] bg-amber-900/30",
          };
      }
    }

    // Default fallback
    return {
      label: "In progress",
      color: "text-[var(--accent-purple)] bg-indigo-500/20",
    };
  };

  const status = getStatus();

  const progressPct =
    goal.trackingType === "binary"
      ? goal.isCompleted
        ? 100
        : 0
      : Math.min(100, Math.max(0, (goal.progress / goal.target) * 100)) || 0;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(logValue);
    if (!isNaN(val)) {
      onLog(goal.id, val);
      setLogValue("");
    }
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 overflow-hidden bg-[var(--bg-card)] select-none ${isExpanded ? "shadow-xl shadow-black/20" : ""}`}
    >
      {/* Summary View (Always visible, click to expand) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer relative"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="pr-4">
            <h3
              className={`font-medium text-base leading-tight mb-1 ${goal.isCompleted ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"}`}
            >
              {goal.name}
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] font-medium">
              {goal.category}{" "}
              {goal.dueDate ? `· due ${formatDate(goal.dueDate)}` : "· ongoing"}
            </p>
          </div>
          <div
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide flex items-center justify-center ${status.color}`}
          >
            {status.label}
          </div>
        </div>

        {/* Slim Progress Bar */}
        <div className="w-full h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${goal.isCompleted ? "bg-emerald-500" : status.label === "At risk" ? "bg-amber-500" : status.label === "Overdue" ? "bg-red-500" : "bg-indigo-500"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Expanded Actions View */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-4 border-t border-[var(--border)] bg-[var(--bg-card)] animate-fade-in-down">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              {goal.trackingType !== "binary"
                ? `${goal.progress} / ${goal.target} ${goal.unit}`
                : "Status: " + (goal.isCompleted ? "Completed" : "Pending")}
            </span>

            <div className="flex gap-2">
              {onTogglePause && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePause(goal.id);
                  }}
                  className={`p-1.5 rounded-md transition-colors ${goal.paused ? "text-[var(--warning)] bg-amber-900/20 hover:bg-amber-900/40" : "text-[var(--text-secondary)] hover:text-[var(--warning)]"}`}
                  title={goal.paused ? "Resume" : "Pause"}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {goal.paused ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      ></path>
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 9v6m4-6v6M5 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                      ></path>
                    )}
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(goal);
                }}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-purple)] transition-colors"
                title="Edit"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  ></path>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this goal?")) onDelete(goal.id);
                }}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors"
                title="Delete"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Mini Line Chart */}
          {goal.history && goal.history.length > 0 && (
            <div className="h-12 w-full mb-4 opacity-70">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goal.history}>
                  <YAxis domain={["auto", "auto"]} hide />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={goal.isCompleted ? "#10b981" : "#6366f1"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action Logging */}
          <div className="flex flex-col gap-2">
            {goal.trackingType === "binary" ? (
              goal.isCompleted ? (
                <div className="flex items-center justify-center w-full py-2.5 bg-emerald-500/20 text-[var(--success)] font-bold rounded-xl border border-emerald-500/20">
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  Completed
                </div>
              ) : (
                <button
                  onClick={() => onComplete(goal.id)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-primary)] font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                >
                  Mark Complete
                </button>
              )
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  {goal.trackingType === "count_toward" ? (
                    <button
                      onClick={() => onLog(goal.id, 1)}
                      disabled={goal.isCompleted}
                      className={`w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 ${goal.isCompleted ? "bg-emerald-900/50 text-emerald-500" : "bg-indigo-600 hover:bg-indigo-500 text-[var(--text-primary)] shadow-lg shadow-indigo-900/20"}`}
                    >
                      +1 {goal.unit}
                    </button>
                  ) : (
                    <form onSubmit={handleLogSubmit} className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder={`+ Amount`}
                        value={logValue}
                        onChange={(e) => setLogValue(e.target.value)}
                        disabled={goal.isCompleted}
                        className="flex-1 bg-[var(--bg-card)] border-none rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={goal.isCompleted || !logValue}
                        className="px-6 bg-indigo-500 hover:bg-indigo-600 disabled:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold rounded-xl transition-colors active:scale-95"
                      >
                        Log
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
