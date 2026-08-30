/**
 * smartSuggestions.js
 * Client-side habit intelligence — detects patterns and returns
 * up to N prioritised suggestion objects from the completion log.
 *
 * Priority order (per spec):
 *   R1 > R3 > R5 > R4 > R2 > R6 > R7
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── helpers ──────────────────────────────────────────────────────────────────

function dayStr(ts) {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function logsFor(completionLog, habitId) {
  return completionLog.filter(l => l.type === 'habit' && l.id === habitId);
}

function completedDaysInRange(completionLog, habitId, fromTs, toTs = Date.now()) {
  const days = new Set();
  for (const log of completionLog) {
    if (log.type !== 'habit' || log.id !== habitId) continue;
    if (log.timestamp < fromTs || log.timestamp > toTs) continue;
    days.add(dayStr(log.timestamp));
  }
  return days;
}

// ── Rule 1 — Consistent miss day ─────────────────────────────────────────────

function rule1_consistentMissDay(habits, completionLog) {
  const suggestions = [];
  const fourWeeksAgo = daysAgo(28);

  for (const habit of habits) {
    if (habit.paused) continue;

    const buckets = Array.from({ length: 7 }, () => ({ completed: 0, total: 0 }));

    for (let d = 0; d < 28; d++) {
      const dayTs = daysAgo(28 - d);
      const dow = new Date(dayTs).getDay();
      buckets[dow].total += 1;
    }

    const logs = logsFor(completionLog, habit.id).filter(l => l.timestamp >= fourWeeksAgo);
    const doneDays = new Set(logs.map(l => dayStr(l.timestamp)));

    for (const ds of doneDays) {
      const dow = new Date(ds).getDay();
      buckets[dow].completed = Math.min(buckets[dow].completed + 1, buckets[dow].total);
    }

    const rates = buckets.map(b => b.total > 0 ? b.completed / b.total : null);
    const validRates = rates.filter(r => r !== null);
    if (validRates.length < 4) continue;

    const avgRate = validRates.reduce((a, b) => a + b, 0) / validRates.length;
    if (avgRate < 0.5) continue;

    for (let dow = 0; dow < 7; dow++) {
      if (rates[dow] === null) continue;
      if (rates[dow] < 0.3 && avgRate > 0.6) {
        const dayName = DAY_NAMES[dow];
        suggestions.push({
          id: `r1_${habit.id}_${dow}`,
          habitId: habit.id,
          icon: '\u23F0',
          title: `${habit.name} slips on ${dayName}s`,
          body: `You complete it most days but often miss ${dayName}s. An extra nudge could help!`,
          action: { label: `Add ${dayName} reminder`, type: 'add_reminder' },
          priority: 1
        });
        break;
      }
    }
  }

  return suggestions;
}

// ── Rule 2 — Late streak recovery ────────────────────────────────────────────

function rule2_streakRecovery(habits, completionLog) {
  const suggestions = [];
  const sevenDaysAgo = daysAgo(7);

  for (const habit of habits) {
    if (habit.paused) continue;
    if ((habit.streak || 0) < 2) continue;

    const recentLogs = logsFor(completionLog, habit.id)
      .filter(l => l.timestamp >= sevenDaysAgo)
      .sort((a, b) => a.timestamp - b.timestamp);

    const doneDays = [...new Set(recentLogs.map(l => dayStr(l.timestamp)))].sort();
    if (doneDays.length < 2) continue;

    let hadGap = false;
    for (let i = 1; i < doneDays.length; i++) {
      const prev = new Date(doneDays[i - 1]).getTime();
      const curr = new Date(doneDays[i]).getTime();
      if (curr - prev > 86400000 * 1.5) { hadGap = true; break; }
    }

    let snap = {};
    try { snap = JSON.parse(localStorage.getItem('pinboard_streak_snapshot') || '{}'); } catch (e) {}
    const prevStreak = snap[habit.id] || 0;

    if (hadGap && (habit.streak || 0) < prevStreak) {
      suggestions.push({
        id: `r2_${habit.id}`,
        habitId: habit.id,
        icon: '\uD83D\uDCAA',
        title: `You bounced back on ${habit.name}!`,
        body: `Your streak broke but you came back strong. Pausing during tough weeks protects it next time.`,
        action: { label: 'Learn about pausing', type: 'pause' },
        priority: 5
      });
    }
  }

  return suggestions;
}

// ── Rule 3 — Consistent late sleep ───────────────────────────────────────────

function rule3_lateSleep(habits, completionLog) {
  const sleepHabit = habits.find(h =>
    !h.paused && h.type === 'time_locked' && /sleep/i.test(h.name)
  );
  if (!sleepHabit) return [];

  let missCount = 0;
  for (let i = 1; i <= 7; i++) {
    const ds = dayStr(daysAgo(i));
    const wasCompleted = completionLog.some(
      l => l.type === 'habit' && l.id === sleepHabit.id && dayStr(l.timestamp) === ds
    );
    if (!wasCompleted) missCount++;
  }

  if (missCount > 4) {
    return [{
      id: `r3_${sleepHabit.id}`,
      habitId: sleepHabit.id,
      icon: '\uD83C\uDF19',
      title: `Missed sleep goal ${missCount}\xD7 this week`,
      body: `You've missed your sleep goal ${missCount} nights. Shifting your target 30 minutes later might make it more achievable.`,
      action: { label: 'Adjust sleep goal', type: 'adjust_goal' },
      priority: 2
    }];
  }

  return [];
}

// ── Rule 4 — Water miss in afternoon ─────────────────────────────────────────

function rule4_waterAfternoon(habits, completionLog) {
  const waterHabit = habits.find(h => !h.paused && /water|drink/i.test(h.name));
  if (!waterHabit) return [];
  if ((waterHabit.count || 0) >= (waterHabit.goal || 1)) return [];

  const sevenDaysAgo = daysAgo(7);
  const recentLogs = logsFor(completionLog, waterHabit.id)
    .filter(l => l.timestamp >= sevenDaysAgo);
  if (recentLogs.length < 5) return [];

  const allBeforeNoon = recentLogs.every(l => new Date(l.timestamp).getHours() < 12);

  if (allBeforeNoon) {
    return [{
      id: `r4_${waterHabit.id}`,
      habitId: waterHabit.id,
      icon: '\uD83D\uDCA7',
      title: `You forget water in the afternoon`,
      body: `Your water logs are all before noon but you're not hitting your daily goal. A 3pm reminder could fill the gap.`,
      action: { label: 'Add 3pm reminder', type: 'add_reminder' },
      priority: 4
    }];
  }

  return [];
}

// ── Rule 5 — Long pause with no resume ───────────────────────────────────────

function rule5_longPause(habits) {
  const suggestions = [];
  const now = Date.now();

  for (const habit of habits) {
    if (!habit.paused) continue;
    const pausedAt = habit.pausedAt ? new Date(habit.pausedAt).getTime() : 0;
    if (!pausedAt) continue;

    const daysPaused = Math.floor((now - pausedAt) / 86400000);
    if (daysPaused >= 7) {
      suggestions.push({
        id: `r5_${habit.id}_w${Math.floor(daysPaused / 7)}`,
        habitId: habit.id,
        icon: '\u23F8\uFE0F',
        title: `${habit.name} paused ${daysPaused} days ago`,
        body: `Ready to bring it back? Even just once a week can restart the momentum.`,
        action: { label: 'Unpause', type: 'pause' },
        priority: 3
      });
    }
  }

  return suggestions;
}

// ── Rule 6 — Perfect week ─────────────────────────────────────────────────────

function rule6_perfectWeek(habits, completionLog) {
  const nonPaused = habits.filter(h => !h.paused);
  if (nonPaused.length === 0) return [];

  const from = daysAgo(14);
  const to = daysAgo(7);

  for (const habit of nonPaused) {
    const days = completedDaysInRange(completionLog, habit.id, from, to);
    if (days.size < 7) return [];
  }

  return [{
    id: `r6_perfect_${dayStr(daysAgo(7))}`,
    habitId: null,
    icon: '\uD83C\uDF1F',
    title: 'Perfect week last week!',
    body: `You nailed every ritual every single day. Ready to level up a goal?`,
    action: { label: 'Level up a goal', type: 'adjust_goal' },
    priority: 6
  }];
}

// ── Rule 7 — Monthly goal falling behind + linked ritual ─────────────────────

function rule7_goalBehindRitual(habits, completionLog) {
  const suggestions = [];

  let goals = [];
  try { goals = JSON.parse(localStorage.getItem('pinboard_goals') || '[]'); } catch (e) {}

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const expectedPct = daysPassed / daysInMonth;

  for (const goal of goals) {
    if (goal.isCompleted) continue;
    const progressPct = (goal.progress || 0) / (goal.target || 1);
    const pace = expectedPct > 0 ? progressPct / expectedPct : 0;
    if (pace >= 0.6) continue;

    const linkedHabit = habits.find(h =>
      !h.paused && (
        (goal.linkedHabitId && h.id === goal.linkedHabitId) ||
        goal.name.toLowerCase().split(' ').some(w => w.length > 3 && h.name.toLowerCase().includes(w))
      )
    );
    if (!linkedHabit) continue;

    const weekDays = completedDaysInRange(completionLog, linkedHabit.id, daysAgo(7));
    if (weekDays.size / 7 >= 0.5) continue;

    suggestions.push({
      id: `r7_${goal.id}_${linkedHabit.id}`,
      habitId: linkedHabit.id,
      icon: '\uD83D\uDCC8',
      title: `${goal.name} is falling behind`,
      body: `Logging ${linkedHabit.name} daily keeps you on track for this month's goal.`,
      action: { label: 'Got it', type: 'dismiss' },
      priority: 7
    });
  }

  return suggestions;
}

// ── Rule 8 — Overdue Tasks ───────────────────────────────────────────────────

function rule8_overdueTasks(tasks) {
  const suggestions = [];
  const now = new Date();
  
  if (!tasks) return suggestions;
  
  const overdueTasks = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < now);

  if (overdueTasks.length > 0) {
    const task = overdueTasks[0];
    suggestions.push({
      id: `r8_${task.id}`,
      icon: '⏰',
      title: 'Task overdue',
      body: `"${task.name}" is past its due date. Time to reschedule or tackle it today!`,
      action: { label: 'Got it', type: 'dismiss' },
      priority: 8
    });
  }
  return suggestions;
}

// ── Rule 9 — Stale Tasks ─────────────────────────────────────────────────────

function rule9_staleTasks(tasks) {
  const suggestions = [];
  const now = Date.now();
  
  if (!tasks) return suggestions;
  
  const staleTasks = tasks.filter(t => {
    if (t.done || !t.createdAt) return false;
    const daysOld = (now - new Date(t.createdAt).getTime()) / 86400000;
    return daysOld > 14;
  });

  if (staleTasks.length > 0) {
    const task = staleTasks[0];
    suggestions.push({
      id: `r9_${task.id}`,
      icon: '🕸️',
      title: 'Stale task found',
      body: `"${task.name}" has been pending for over 2 weeks. Consider breaking it down or deleting it.`,
      action: { label: 'Got it', type: 'dismiss' },
      priority: 9
    });
  }
  return suggestions;
}

// ── Rule 10 — Goal Halfway ───────────────────────────────────────────────────

function rule10_goalHalfway(goals) {
  const suggestions = [];
  
  if (!goals) return suggestions;
  
  for (const goal of goals) {
    if (goal.isCompleted) continue;
    const progressPct = (goal.progress || 0) / (goal.target || 1);
    
    // Check if it's recently halfway (50-60%)
    if (progressPct >= 0.5 && progressPct < 0.6) {
      suggestions.push({
        id: `r10_${goal.id}`,
        icon: '🎉',
        title: 'You are halfway there!',
        body: `You've reached the halfway mark for "${goal.name}". Keep up the great work!`,
        action: { label: 'Keep going', type: 'dismiss' },
        priority: 10
      });
      // Just return one to avoid overwhelming
      break;
    }
  }
  return suggestions;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * generateSuggestions(habits, tasks, goals, completionLog)
 * Returns all passing suggestions sorted by priority ascending.
 * Caller slices to desired display count.
 */
export function generateSuggestions(habits, tasks = [], goals = [], completionLog = []) {
  if (!habits?.length || !completionLog?.length) return [];

  const oldest = Math.min(...completionLog.map(l => l.timestamp));
  if ((Date.now() - oldest) / 86400000 < 14) return [];

  const dismissed = (() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinboard_dismissed_suggestions') || '[]')); }
    catch (e) { return new Set(); }
  })();

  const all = [
    ...rule1_consistentMissDay(habits, completionLog),
    ...rule3_lateSleep(habits, completionLog),
    ...rule5_longPause(habits),
    ...rule4_waterAfternoon(habits, completionLog),
    ...rule2_streakRecovery(habits, completionLog),
    ...rule6_perfectWeek(habits, completionLog),
    ...rule7_goalBehindRitual(habits, completionLog),
    ...rule8_overdueTasks(tasks),
    ...rule9_staleTasks(tasks),
    ...rule10_goalHalfway(goals)
  ];

  return all
    .filter(s => !dismissed.has(s.id))
    .sort((a, b) => a.priority - b.priority);
}

/** Persist a dismissed suggestion id to localStorage. */
export function dismissSuggestion(id) {
  try {
    const existing = JSON.parse(localStorage.getItem('pinboard_dismissed_suggestions') || '[]');
    if (!existing.includes(id)) {
      existing.push(id);
      localStorage.setItem('pinboard_dismissed_suggestions', JSON.stringify(existing));
    }
  } catch (e) {}
}

/**
 * maybeResetDismissals()
 * Call once on app load. Clears dismissed suggestions every 30 days
 * so persistent patterns can resurface.
 */
export function maybeResetDismissals() {
  try {
    const resetDate = localStorage.getItem('pinboard_suggestions_reset_date');
    const now = Date.now();
    if (!resetDate || now > parseInt(resetDate, 10) + 30 * 86400000) {
      localStorage.removeItem('pinboard_dismissed_suggestions');
      localStorage.setItem('pinboard_suggestions_reset_date', String(now));
    }
  } catch (e) {}
}
