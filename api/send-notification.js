import webpush from 'web-push';
import { kv } from '@vercel/kv';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@pinboard.local',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  // Check that the keys are configured
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys are not configured.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, title, body, scheduledFor } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing push subscription' });
  }

  try {
    // Ensure we have a valid key base for the subscription
    const subKey = `sub_${subscription.endpoint}`;
    
    // Always keep the subscription object fresh in KV
    await kv.set(subKey, subscription);

    // Prepare the notification payload
    const payload = JSON.stringify({
      title: title || 'Pinboard',
      body: body || 'New update from Pinboard'
    });

    if (scheduledFor) {
      // Option 2: True scheduling via Cron + KV
      // Store the scheduled task in a sorted set (score = timestamp) or list.
      const scheduledPush = { subscription, payload, scheduledFor };
      await kv.zadd('scheduled_pushes', { score: scheduledFor, member: JSON.stringify(scheduledPush) });
      
      return res.status(200).json({ 
        success: true, 
        message: `Notification scheduled for ${new Date(scheduledFor).toLocaleString()}` 
      });
    }

    // Handle Daily Recurring Reminders
    const { recurringTime, habitId } = req.body;
    
    if (habitId) {
      const recurringKey = `recurring_${subscription.endpoint}_${habitId}`;
      
      if (recurringTime) {
        // Save the recurring schedule
        await kv.hset('recurring_pushes', { 
          [recurringKey]: JSON.stringify({ subscription, payload, recurringTime, habitId }) 
        });
        return res.status(200).json({ success: true, message: `Recurring reminder set for ${recurringTime}` });
      } else if (recurringTime === null) {
        // Clear the recurring schedule
        await kv.hdel('recurring_pushes', recurringKey);
        return res.status(200).json({ success: true, message: `Recurring reminder cleared` });
      }
    }

    // Send the notification immediately if no schedule provided
    await webpush.sendNotification(subscription, payload);

    return res.status(200).json({ 
      success: true, 
      message: 'Notification sent and subscription stored' 
    });
  } catch (error) {
    console.error('Error sending push notification or storing in KV:', error);
    return res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message 
    });
  }
}
