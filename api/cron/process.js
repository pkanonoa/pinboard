import { kv } from '@vercel/kv';
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@pinboard.local',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const lastCronRun = (await kv.get('last_cron_run')) || (Date.now() - 5 * 60 * 1000);
    await kv.set('last_cron_run', Date.now());

    const endpoints = await kv.smembers('active_subscriptions');
    if (!endpoints || endpoints.length === 0) {
      return res.status(200).json({ message: 'No active subscriptions.' });
    }

    const keys = endpoints.map(ep => `user_state_${ep}`);
    const states = await kv.mget(...keys);

    const now = Date.now();
    let sentCount = 0;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const endpoint = endpoints[i];
      if (!state || !state.subscription) continue;

      const { subscription, habits, tasks, dailyReviewTime, timezoneOffset } = state;

      const userLocalNow = new Date(now + timezoneOffset * 60 * 1000);
      const userYear = userLocalNow.getUTCFullYear();
      const userMonth = userLocalNow.getUTCMonth();
      const userDate = userLocalNow.getUTCDate();

      const todayStr = `${userYear}-${String(userMonth + 1).padStart(2, '0')}-${String(userDate).padStart(2, '0')}`;
      const endpointHash = endpoint.substring(0, 16);

      // Habits processing
      if (habits) {
        for (const habit of habits) {
          // Check for auto-resume notification first
          if (habit.paused && habit.resumeDate) {
            const resumeDateStr = habit.resumeDate; // YYYY-MM-DD
            if (todayStr >= resumeDateStr) {
              const resumeKey = `resumed_${habit.id}_${resumeDateStr}`;
              const alreadySentResume = await kv.get(resumeKey);
              if (!alreadySentResume) {
                try {
                  await webpush.sendNotification(subscription, JSON.stringify({
                    title: `Neo's back! 🧅`,
                    body: `${habit.name} resumes today. Let's keep that streak alive!`,
                    type: 'habit'
                  }));
                  await kv.set(resumeKey, true, { ex: 86400 });
                  sentCount++;
                } catch (e) {
                  console.error('Error sending resume push', e);
                }
              }
            }
            continue; // Skip normal reminder processing if paused
          }

          if (habit.count >= habit.goal && habit.lastCompletedDate === todayStr) continue;

          if (habit.reminderEnabled) {
            const isInterval = habit.reminderType === 'interval';
            const isGoalProgress = habit.reminderType === 'goal_progress';

            if (isGoalProgress) {
              const checkInTimes = Array.isArray(habit.checkInTimes) && habit.checkInTimes.length > 0
                ? habit.checkInTimes
                : (habit.reminderTime ? [habit.reminderTime] : ['12:00', '18:00']);

              for (const checkInTime of checkInTimes) {
                if (!checkInTime) continue;
                const [ch, cm] = checkInTime.split(':').map(Number);
                const checkInDueTime = Date.UTC(userYear, userMonth, userDate, ch, cm, 0) - (timezoneOffset * 60 * 1000);

                if (checkInDueTime > lastCronRun && checkInDueTime <= now) {
                  const safeTimeKey = checkInTime.replace(':', '');
                  const checkKey = `notified_${endpointHash}_ritual_${habit.id}_${safeTimeKey}_${todayStr}`;
                  const alreadyChecked = await kv.get(checkKey);

                  if (!alreadyChecked) {
                    const currentValue = habit.count || 0;
                    const targetValue = habit.goal || 1;
                    const progress = targetValue > 0 ? currentValue / targetValue : 0;
                    const threshold = habit.alertThreshold !== undefined ? Number(habit.alertThreshold) : 0.5;

                    if (progress < threshold) {
                      const remainingValue = Math.max(0, targetValue - currentValue);
                      const unitStr = habit.unit ? ` ${habit.unit}` : '';
                      const remainingStr = `${remainingValue.toLocaleString()}${unitStr}`;
                      const percentStr = `${Math.round(progress * 100)}%`;
                      const template = habit.messageTemplate || "You're {remaining} away from your goal. Let's get moving! 🚶";
                      const body = template.replace(/{remaining}/g, remainingStr).replace(/{percent}/g, percentStr);
                      const title = `🎯 ${habit.name} check-in`;

                      try {
                        await webpush.sendNotification(subscription, JSON.stringify({
                          title,
                          body,
                          type: 'habit'
                        }));
                        sentCount++;
                      } catch (e) {
                        console.error('Error sending goal progress push', e);
                      }
                    }

                    await kv.set(checkKey, true, { ex: 86400 });
                  }
                }
              }
            } else if (!isInterval && habit.reminderTime) {
              // Day of week check (0=Sunday, 1=Monday...)
              if (habit.reminderDays && habit.reminderDays.length > 0) {
                const localDOW = userLocalNow.getUTCDay();
                if (!habit.reminderDays.includes(localDOW)) {
                  continue;
                }
              }

              const [th, tm] = habit.reminderTime.split(':').map(Number);
              const dueTime = Date.UTC(userYear, userMonth, userDate, th, tm, 0) - (timezoneOffset * 60 * 1000);

              if (dueTime > lastCronRun && dueTime <= now) {
                let title = `⏰ Time for ${habit.name}`;
                let body = `You haven't completed this yet today.`;

                const lowerName = habit.name.toLowerCase();
                if (lowerName.includes('wake up') || lowerName.includes('wakeup')) {
                  title = '⏰ Time to wakeup!';
                  body = 'Rise and shine, it is time to start your day!';
                }

                const ritualNotifKey = `notified_${endpointHash}_ritual_${habit.id}_daily`;
                const alreadySentRitual = await kv.get(ritualNotifKey);
                if (!alreadySentRitual) {
                  try {
                    await webpush.sendNotification(subscription, JSON.stringify({ title, body, type: 'habit' }));
                    await kv.set(ritualNotifKey, true, { ex: 86400 });
                    sentCount++;
                  } catch (e) {
                    console.error('Error sending push', e);
                  }
                }
              }
            } else if (isInterval) {
              const intervalValue = habit.reminderInterval || 2;
              const intervalUnit = habit.reminderIntervalUnit || 'hours';
              const intervalMs = intervalUnit === 'minutes' ? intervalValue * 60 * 1000 : intervalValue * 60 * 60 * 1000;

              const localHour = userLocalNow.getUTCHours();

              // Only alert during waking hours (e.g. 8am to 10pm)
              if (localHour >= 8 && localHour < 22) {
                const lastSentKey = `last_sent_${endpointHash}_ritual_${habit.id}`;
                const lastSentTime = parseInt(await kv.get(lastSentKey) || '0', 10);

                if (now - lastSentTime >= intervalMs) {
                  try {
                    await webpush.sendNotification(subscription, JSON.stringify({
                      title: `🔄 Routine: ${habit.name}`,
                      body: `Quick reminder for your interval ritual!`,
                      type: 'habit'
                    }));
                    await kv.set(lastSentKey, now);
                    sentCount++;
                  } catch (e) {
                    console.error('Error sending push', e);
                  }
                }
              }
            }
          }
        }
      }

      // Tasks processing
      if (tasks && tasks.length > 0) {
        // 1. Individual task due date notifications
        for (const task of tasks) {
          if (task.done || !task.dueDate) continue;

          // dueDate is a datetime-local string: "YYYY-MM-DDThh:mm"
          if (task.dueDate.includes('T')) {
            const [datePart, timePart] = task.dueDate.split('T');
            if (datePart && timePart) {
              const [y, m, d] = datePart.split('-').map(Number);
              const [h, min] = timePart.split(':').map(Number);

              const taskDueTime = Date.UTC(y, m - 1, d, h, min, 0) - (timezoneOffset * 60 * 1000);

              if (taskDueTime > lastCronRun && taskDueTime <= now) {
                const taskDueKey = `notified_${endpointHash}_task_${task.id}_due`;
                const alreadySentDue = await kv.get(taskDueKey);
                if (!alreadySentDue) {
                  try {
                    await webpush.sendNotification(subscription, JSON.stringify({
                      title: `⏰ Task Due!`,
                      body: `${task.name}`,
                      type: 'task'
                    }));
                    await kv.set(taskDueKey, true, { ex: 86400 }); // expire in 24h
                    sentCount++;
                  } catch (e) {
                    console.error('Error sending task due push', e);
                  }
                }
              }
            }
          }
        }

        // 2. Daily Review Digest
        if (dailyReviewTime) {
          const [dh, dm] = dailyReviewTime.split(':').map(Number);
          const digestDueTime = Date.UTC(userYear, userMonth, userDate, dh, dm, 0) - (timezoneOffset * 60 * 1000);

          if (digestDueTime > lastCronRun && digestDueTime <= now) {
            const pendingTasks = tasks.filter(t => !t.done);
            if (pendingTasks.length > 0) {
              let bodyStr = pendingTasks.slice(0, 3).map(t => `• ${t.name}`).join('\n');
              if (pendingTasks.length > 3) {
                bodyStr += `\n...and ${pendingTasks.length - 3} more.`;
              }

              const taskNotifKey = `notified_${endpointHash}_task_digest_due`;
              const alreadySent = await kv.get(taskNotifKey);
              if (!alreadySent) {
                try {
                  await webpush.sendNotification(subscription, JSON.stringify({ title: '📋 Daily Task Review', body: bodyStr, type: 'task' }));
                  await kv.set(taskNotifKey, true, { ex: 3600 });
                  sentCount++;
                } catch (e) {
                  console.error('Error sending push', e);
                }
              }
            }
          }
        }
      }

      // ── Monthly Goals evaluation ──────────────────────────────────────
      const { monthlyGoals } = state;
      if (monthlyGoals && monthlyGoals.length > 0) {
        const daysInMonth = new Date(userYear, userMonth + 1, 0).getUTCDate();
        const daysPassed = userDate;
        const daysRemaining = daysInMonth - daysPassed;
        const isLastDay = daysRemaining === 0;

        // End-of-month summary (8pm local on last day)
        if (isLastDay) {
          const eomSummaryKey = `monthly_summary_${endpointHash}_${userYear}-${String(userMonth + 1).padStart(2, '0')}`;
          const eomAlreadySent = await kv.get(eomSummaryKey);
          const eomTime = Date.UTC(userYear, userMonth, userDate, 20, 0, 0) - (timezoneOffset * 60 * 1000);
          if (!eomAlreadySent && eomTime > lastCronRun && eomTime <= now) {
            const summaryLines = monthlyGoals.slice(0, 3).map(g => {
              const done = g.isCompleted || (g.progress >= g.target);
              return `${done ? '✅' : '❌'} ${g.name}`;
            });
            try {
              await webpush.sendNotification(subscription, JSON.stringify({
                title: '📅 Month wrap-up',
                body: summaryLines.join('\n'),
                type: 'goal'
              }));
              await kv.set(eomSummaryKey, true, { ex: 86400 });
              sentCount++;
            } catch (e) {
              console.error('Error sending month summary', e);
            }
          }
        }

        // Per-goal evaluations
        for (const goal of monthlyGoals) {
          if (!goal.id || !goal.target) continue;
          const progress = goal.progress || 0;
          const target = goal.target;
          const progressPct = target > 0 ? progress / target : 0;
          const expectedPct = daysInMonth > 0 ? daysPassed / daysInMonth : 1;
          const pace = expectedPct > 0 ? progressPct / expectedPct : (progressPct > 0 ? 999 : 0);
          const goalYMD = todayStr;
          const goalMonthKey = `${userYear}-${String(userMonth + 1).padStart(2, '0')}`;

          // Completed detection (fire immediately via cron tick)
          if (progress >= target) {
            const doneKey = `monthly_done_${endpointHash}_${goal.id}_${goalMonthKey}`;
            const alreadyDone = await kv.get(doneKey);
            if (!alreadyDone) {
              const secsToEndOfMonth = daysRemaining * 86400;
              try {
                await webpush.sendNotification(subscription, JSON.stringify({
                  title: '🏆 Monthly goal crushed!',
                  body: `${goal.name} — done for the month! Neo is proud. 🧅`,
                  type: 'goal'
                }));
                await kv.set(doneKey, true, { ex: Math.max(secsToEndOfMonth, 3600) });
                sentCount++;
              } catch (e) {
                console.error('Error sending goal done notif', e);
              }
            }
            continue; // No pace notifications if already done
          }

          // Pace-based daily notification at dailyReviewTime
          if (dailyReviewTime) {
            const [dh, dm] = dailyReviewTime.split(':').map(Number);
            const reviewTime = Date.UTC(userYear, userMonth, userDate, dh, dm, 0) - (timezoneOffset * 60 * 1000);

            if (reviewTime > lastCronRun && reviewTime <= now) {
              let paceStatus = 'on_track';
              if (pace < 0.6) paceStatus = 'behind';
              else if (pace < 0.9) paceStatus = 'at_risk';

              const dailyKey = `monthly_notif_${endpointHash}_${goal.id}_${goalYMD}`;
              const alreadySentDaily = await kv.get(dailyKey);

              if (!alreadySentDaily) {
                let title, body;
                if (paceStatus === 'on_track' && progressPct > 0) {
                  title = `📈 ${goal.name}`;
                  body = `You're on pace! ${progress} of ${target} ${goal.unit || ''} this month.`.trim();
                } else if (paceStatus === 'at_risk') {
                  title = `⚠️ ${goal.name} needs attention`;
                  body = `A little behind — ${progress}/${target} ${goal.unit || ''}. ${daysRemaining} days left, you've got this.`.trim();
                } else if (paceStatus === 'behind') {
                  title = `🔴 ${goal.name} is falling behind`;
                  body = `Only ${progress}/${target} ${goal.unit || ''} logged. ${daysRemaining} days to catch up — start today.`.trim();
                }

                if (title) {
                  try {
                    await webpush.sendNotification(subscription, JSON.stringify({ title, body, type: 'goal' }));
                    await kv.set(dailyKey, true, { ex: 86400 });
                    sentCount++;
                  } catch (e) {
                    console.error('Error sending goal pace notif', e);
                  }
                }
              }
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────
    }

    // ── Weekly Review: Sunday 9pm local time ─────────────────────────────────
    const localDayOfWeek = userLocalNow.getUTCDay(); // 0 = Sunday
    const localHour = userLocalNow.getUTCHours();

    if (localDayOfWeek === 0 && localHour === 21) {
      // ISO week number for dedup key
      const d = new Date(Date.UTC(userYear, userMonth, userDate));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const isoWeek = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      const weeklyKey = `weekly_review_${endpointHash}_${userYear}-W${String(isoWeek).padStart(2, '0')}`;
      const alreadySentWeekly = await kv.get(weeklyKey);

      if (!alreadySentWeekly) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify({
            title: '📊 Your weekly recap is ready',
            body: "Neo's been keeping score. Tap to see how your week went.",
            type: 'summary',
            deepLink: '/weekly-review'
          }));
          await kv.set(weeklyKey, true, { ex: 86400 * 7 });
          sentCount++;
        } catch (e) {
          console.error('Error sending weekly review push', e);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
    }

    return res.status(200).json({ success: true, sent: sentCount });

    } catch (error) {
      console.error('Cron process error:', error);
      return res.status(500).json({ error: 'Process failed' });
    }
  }
