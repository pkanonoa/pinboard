import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, habits, tasks, dailyReviewTime, timezoneOffset } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing push subscription' });
  }

  try {
    const subKey = `user_state_${subscription.endpoint}`;
    
    // Store everything in a single KV key per subscription
    const payload = {
      subscription,
      habits: habits || [],
      tasks: tasks || [],
      dailyReviewTime: dailyReviewTime || '20:00',
      timezoneOffset: timezoneOffset || 0,
      lastUpdated: Date.now()
    };

    await kv.set(subKey, payload);

    // Keep a master list of all active subscription endpoints so the cron job knows who to check
    await kv.sadd('active_subscriptions', subscription.endpoint);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error syncing state:', error);
    return res.status(500).json({ error: 'Failed to sync state' });
  }
}
