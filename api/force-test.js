import { kv } from '@vercel/kv';
import webpush from 'web-push';

export default async function handler(req, res) {
  try {
    const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:test@pinboard.app';

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const activeEndpoints = await kv.smembers('active_subscriptions');
    if (!activeEndpoints || activeEndpoints.length === 0) {
      return res.status(200).json({ success: false, msg: 'No active subscriptions' });
    }

    let sent = 0;
    for (const endpoint of activeEndpoints) {
      const state = await kv.get(`user_state_${endpoint}`);
      if (state && state.subscription) {
        // Only target endpoints that were active in the last 24 hours
        if (state.lastUpdated > Date.now() - 24 * 60 * 60 * 1000) {
          try {
            await webpush.sendNotification(state.subscription, JSON.stringify({
              title: 'Forced Test Notification! 🎉',
              body: 'If you see this, push notifications are WORKING perfectly!',
              type: 'summary'
            }));
            sent++;
          } catch(e) {
            console.error(e);
          }
        }
      }
    }
    return res.status(200).json({ success: true, sent });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
