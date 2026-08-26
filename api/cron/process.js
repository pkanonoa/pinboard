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
    const endpoints = await kv.smembers('active_subscriptions');
    if (!endpoints || endpoints.length === 0) {
      return res.status(200).json({ message: 'No active subscriptions.' });
    }

    const keys = endpoints.map(ep => `user_state_${ep}`);
    const states = await kv.mget(...keys);

    const now = Date.now();
    let sentCount = 0;

    for (const state of states) {
      if (!state || !state.subscription) continue;

      const { subscription, habits, tasks, dailyReviewTime, timezoneOffset } = state;
      
      const localNow = new Date(now - (timezoneOffset * 60000));
      const localHour = localNow.getUTCHours();
      const localMin = localNow.getUTCMinutes();
      const todayStr = `${localNow.getUTCFullYear()}-${String(localNow.getUTCMonth()+1).padStart(2, '0')}-${String(localNow.getUTCDate()).padStart(2, '0')}`;

      const notificationsToSend = [];

      // Habits processing
      if (habits) {
        for (const habit of habits) {
          if (habit.count >= habit.goal && habit.lastCompletedDate === todayStr) continue;

          const mode = habit.reminderMode;
          if (!mode || mode === 'off') continue;

          let shouldSend = false;
          let tone = 'friendly'; 

          if (localHour < 12) tone = 'friendly';
          else if (localHour >= 12 && localHour < 19) tone = 'firm';
          else tone = 'urgent';

          if (mode === 'fixed') {
            const targetTimes = habit.reminderSettings?.times || [];
            for (const t of targetTimes) {
               if (!t) continue;
               const [th, tm] = t.split(':').map(Number);
               const diff = (localHour * 60 + localMin) - (th * 60 + tm);
               if (diff >= 0 && diff < 15) {
                 shouldSend = true;
                 break;
               }
            }
          } 
          else if (mode === 'interval') {
            const intervalHrs = habit.reminderSettings?.hours || 2;
            if (localHour >= 8 && localHour <= 22) {
              if (localHour % intervalHrs === 0 && localMin < 15) {
                 shouldSend = true;
              }
            }
          }
          else if (mode === 'smart') {
            const intervalHrs = habit.reminderSettings?.hours || 3;
            const inactiveHrs = (now - state.lastUpdated) / (1000 * 60 * 60);
            if (localHour >= 9 && localHour <= 21 && inactiveHrs >= intervalHrs) {
               if (localMin < 15) {
                 shouldSend = true;
                 tone = 'firm'; 
               }
            }
          }

          if (shouldSend) {
             let prefix = tone === 'friendly' ? '☀️ Rise and shine!' : tone === 'firm' ? "👀 Don't forget" : '🚨 Urgent!';
             let title = `${prefix} ${habit.name}`;
             let body = `${habit.count}/${habit.goal} ${habit.unit} today. Keep going!`;

             const lowerName = habit.name.toLowerCase();
             if (lowerName.includes('wake up') || lowerName.includes('wakeup')) {
               title = '⏰ Time to wakeup!';
               body = 'Rise and shine, it is time to start your day!';
             }

             notificationsToSend.push({
               title,
               body
             });
          }
        }
      }

      // Tasks processing
      if (tasks) {
        for (const task of tasks) {
           if (task.done) continue;
           
           if (task.dueDate) {
              const taskTime = new Date(task.dueDate).getTime();
              const diffMins = (taskTime - now) / 60000;
              
              if (diffMins > 0 && diffMins <= (24 * 60) && diffMins > (24 * 60 - 15)) {
                 notificationsToSend.push({ title: 'Task due tomorrow', body: task.name });
              }
              else if (diffMins > 0 && diffMins <= 120 && diffMins > 105) {
                 notificationsToSend.push({ title: 'Task due in 2 hours', body: task.name });
              }
              else if (diffMins < 0 && localMin < 15) {
                 notificationsToSend.push({ title: 'Overdue task!', body: task.name });
              }
           }
        }
      }

      if (dailyReviewTime) {
         const [dh, dm] = dailyReviewTime.split(':').map(Number);
         const diff = (localHour * 60 + localMin) - (dh * 60 + dm);
         if (diff >= 0 && diff < 15) {
            const undatedPending = (tasks || []).filter(t => !t.done && !t.dueDate);
            if (undatedPending.length > 0) {
               notificationsToSend.push({
                 title: 'Daily Task Review',
                 body: `You have ${undatedPending.length} pending tasks to look at.`
               });
            }
         }
      }
      
      if (localHour === 22 && localMin < 15) {
         const allHabits = habits || [];
         const allTasks = tasks || [];
         const completedHabits = allHabits.filter(h => h.count >= h.goal && h.lastCompletedDate === todayStr).length;
         const pendingTasks = allTasks.filter(t => !t.done).length;
         notificationsToSend.push({
            title: 'Daily Summary',
            body: `You finished ${completedHabits}/${allHabits.length} rituals today. ${pendingTasks} tasks pending.`
         });
      }

      for (const note of notificationsToSend) {
         try {
           await webpush.sendNotification(subscription, JSON.stringify(note));
           sentCount++;
         } catch (e) {
           console.error('Error sending push', e);
         }
      }
    }

    return res.status(200).json({ success: true, sent: sentCount });

  } catch (error) {
    console.error('Cron process error:', error);
    return res.status(500).json({ error: 'Process failed' });
  }
}
