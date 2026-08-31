import React, { useState, useEffect } from "react";
import {
  logCompletion,
  removeCompletionToday,
  syncStateToBackend,
} from "../utils";
import { checkAndUnlockBadges } from "../utils/badgeUtils";

export default function ToldToSection() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("pinboard_tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [taskName, setTaskName] = useState("");
  const [whoSaidIt, setWhoSaidIt] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskData, setEditTaskData] = useState({ name: "", person: "", dueDate: "" });
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showDeleteMenuId, setShowDeleteMenuId] = useState(null);
  const [dailyReviewTime, setDailyReviewTime] = useState(() => {
    return localStorage.getItem("pinboard_daily_review_time") || "20:00";
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("pinboard_daily_review_time", dailyReviewTime);
  }, [dailyReviewTime]);

  useEffect(() => {
    if (showDeleteMenuId) {
      const handleClickOutside = () => setShowDeleteMenuId(null);
      document.addEventListener("pointerdown", handleClickOutside);
      return () =>
        document.removeEventListener("pointerdown", handleClickOutside);
    }
  }, [showDeleteMenuId]);

  // Save to local storage whenever tasks change
  useEffect(() => {
    localStorage.setItem("pinboard_tasks", JSON.stringify(tasks));
    checkAndUnlockBadges();
    syncStateToBackend();
  }, [tasks]);

  const scheduleNotification = async (taskName, dueDateStr) => {
    await syncStateToBackend();
    setIsScheduling(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      name: taskName,
      person: whoSaidIt,
      dueDate: dueDate,
      done: false,
      isFading: false,
    };

    setTasks([...tasks, newTask]);

    if (dueDate) {
      await scheduleNotification(taskName, dueDate);
    }

    setTaskName("");
    setWhoSaidIt("");
    setDueDate("");
    setIsAdding(false);
  };

  const handleToggleDone = (id) => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    setTasks((currentTasks) =>
      currentTasks.map((t) => {
        if (t.id === id) {
          const willBeDone = !t.done;
          if (willBeDone) {
            logCompletion("task", id);
            window.dispatchEvent(new CustomEvent("neo_celebration"));
          } else {
            removeCompletionToday("task", id);
          }
          return {
            ...t,
            done: willBeDone,
            completedDate: willBeDone ? todayStr : null,
          };
        }
        return t;
      }),
    );
  };

  const handleDeleteTask = (id) => {
    setTasks((currentTasks) => currentTasks.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter((t) => !t.done));
  };

  const startLongPress = (taskId) => {
    const timer = setTimeout(() => {
      setShowDeleteMenuId(taskId);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
    setLongPressTimer(timer);
  };

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const pendingTasks = tasks.filter((t) => !t.done).sort((a, b) => b.id - a.id);
  const completedTasks = tasks
    .filter((t) => t.done)
    .sort((a, b) => b.id - a.id);

  return (
    <div className="w-full max-w-md z-10 flex flex-col gap-4">
      <div className="flex justify-between items-center pr-14">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
      </div>

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="fixed bottom-20 right-4 z-[50] w-12 h-12 flex items-center justify-center bg-[var(--bg-card)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] active:scale-95 transition-all"
        >
          <svg
            className="w-5 h-5 text-[var(--accent-purple)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </button>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-card)]/80 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-[var(--border)]/50 animate-fade-in-down">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 text-center">New Task</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Task description"
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Assigned by (optional)"
                  value={whoSaidIt}
                  onChange={(e) => setWhoSaidIt(e.target.value)}
                  className="w-1/2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
                <input
                  type="datetime-local"
                  value={dueDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-1/2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-1/3 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-medium py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="w-2/3 bg-indigo-500/90 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg"
                >
                  {isScheduling ? "Scheduling..." : "Add task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* TODAY SECTION */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase mb-1">
            Today
          </h3>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic px-1">
              No tasks. You're all caught up!
            </p>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)]/60 shadow-sm rounded-2xl transition-all duration-300 ease-in-out"
              >
                {editingTaskId === task.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setTasks((current) =>
                        current.map((t) =>
                          t.id === task.id ? { ...t, ...editTaskData } : t
                        )
                      );
                      setEditingTaskId(null);
                      if (editTaskData.dueDate && editTaskData.dueDate !== task.dueDate) {
                        scheduleNotification(editTaskData.name, editTaskData.dueDate);
                      }
                    }}
                    className="w-full animate-fade-in flex flex-col gap-3"
                  >
                    <input
                      type="text"
                      required
                      value={editTaskData.name}
                      onChange={(e) => setEditTaskData({ ...editTaskData, name: e.target.value })}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Assigned by (optional)"
                        value={editTaskData.person}
                        onChange={(e) => setEditTaskData({ ...editTaskData, person: e.target.value })}
                        className="w-1/2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                      />
                      <input
                        type="datetime-local"
                        value={editTaskData.dueDate}
                        onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                        className="w-1/2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-3 text-[var(--text-secondary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                      />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="w-1/3 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-sm font-medium py-2.5 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all shadow-md"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div
                      className="w-[22px] h-[22px] rounded-md border-2 border-[var(--border)] flex items-center justify-center cursor-pointer flex-shrink-0 hover:border-gray-500 transition-colors"
                      onClick={() => handleToggleDone(task.id)}
                    ></div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-medium text-[var(--text-primary)] text-base break-words leading-tight">
                        {task.name}
                      </p>
                      {(task.person || task.dueDate) && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
                          {task.dueDate && (() => {
                            const d = new Date(task.dueDate);
                            const today = new Date();
                            const isToday = d.toDateString() === today.toDateString();
                            const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                            const dateLabel = isToday
                              ? "Today"
                              : isTomorrow
                              ? "Tomorrow"
                              : d.toLocaleDateString([], { month: "short", day: "numeric" });
                            const timeLabel = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                            return (
                              <span className="flex items-center gap-1">
                                <span>📅</span>
                                <span>{dateLabel}, {timeLabel}</span>
                              </span>
                            );
                          })()}
                          {task.dueDate && task.person && <span>·</span>}
                          {task.person && <span>from {task.person}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditTaskData({
                            name: task.name,
                            person: task.person || "",
                            dueDate: task.dueDate || "",
                          });
                        }}
                        className="text-[var(--text-muted)] hover:text-indigo-500 p-2 rounded-md transition-colors"
                        aria-label="Edit task"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] p-2 rounded-md transition-colors"
                        aria-label="Delete task"
                      >
                        <svg
                          className="w-5 h-5"
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
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* COMPLETED SECTION */}
        {completedTasks.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase mb-1">
              Completed
            </h3>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)]/60 shadow-sm rounded-2xl transition-all duration-300 ease-in-out cursor-pointer select-none active:scale-[0.98]"
                onTouchStart={() => startLongPress(task.id)}
                onTouchEnd={clearLongPress}
                onMouseDown={() => startLongPress(task.id)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
              >
                <div
                  className="w-[22px] h-[22px] rounded-md border-2 border-emerald-400 bg-emerald-400/20 flex items-center justify-center cursor-pointer flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDone(task.id);
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5 text-[var(--success)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-medium text-[var(--text-muted)] text-base break-words leading-tight line-through">
                    {task.name}
                  </p>
                </div>
                {showDeleteMenuId === task.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-[var(--danger)] p-2 rounded-md hover:bg-[var(--bg-card)] transition-colors flex-shrink-0 animate-fade-in"
                    aria-label="Delete task"
                  >
                    <svg
                      className="w-5 h-5"
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
