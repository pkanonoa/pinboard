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

          if (habit.reminderEnabled && habit.reminderTime) {
            const [th, tm] = habit.reminderTime.split(':').map(Number);
            const diff = (localHour * 60 + localMin) - (th * 60 + tm);
            
            if (diff >= 0 && diff < 15) {
               let title = `⏰ Time for ${habit.name}`;
               let body = `You haven't completed this yet today.`;

               const lowerName = habit.name.toLowerCase();
               if (lowerName.includes('wake up') || lowerName.includes('wakeup')) {
                 title = '⏰ Time to wakeup!';
                 body = 'Rise and shine, it is time to start your day!';
               }

               notificationsToSend.push({ title, body, type: 'habit' });
            }
          }
        }
      }

      // Tasks processing (Daily Review Digest)
      if (dailyReviewTime) {
         const [dh, dm] = dailyReviewTime.split(':').map(Number);
         const diff = (localHour * 60 + localMin) - (dh * 60 + dm);
         if (diff >= 0 && diff < 15) {
            const pendingTasks = (tasks || []).filter(t => !t.done);
            if (pendingTasks.length > 0) {
               let bodyStr = pendingTasks.slice(0, 3).map(t => `• ${t.name}`).join('\n');
               if (pendingTasks.length > 3) {
                 bodyStr += `\n...and ${pendingTasks.length - 3} more.`;
               }
               
               notificationsToSend.push({
                 title: '📋 Daily Task Review',
                 body: bodyStr,
                 type: 'task'
               });
            }
         }
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
