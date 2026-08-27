# Pinboard App Architecture and Workflow

This document provides a comprehensive overview of the **Pinboard** application. You can share this document with AI assistants (like ChatGPT, Claude, or Gemini) to give them complete context about your app so they can suggest features, improvements, or debug issues effectively.

## 1. App Overview & Core Concept
**Pinboard** is a gamified productivity web application designed to help users track habits (Rituals) and manage one-off tasks (Told To / Tasks). It is built as a **Progressive Web App (PWA)**, meaning it can be installed on mobile devices and desktops.

It utilizes an offline-first strategy where all user data is stored locally in the browser's `localStorage`. However, to facilitate intelligent push notifications, it synchronizes essential state data to a backend key-value store.

## 2. Technical Stack
- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Backend / API**: Vercel Serverless Functions (`api/` directory)
- **Database**: Vercel KV (Redis-compatible Key-Value store)
- **Push Notifications**: `web-push` library for generating VAPID keys and sending payloads.
- **Charts**: `recharts` for data visualization.
- **Micro-interactions**: `canvas-confetti` for celebratory effects.

## 3. Core Features & User Interface
The UI is divided into five main tabs, accessible via a bottom navigation bar:

1. **Dashboard (Home)**: 
   - Displays a daily greeting and a motivational quote.
   - Shows summary statistics: Tasks Done Today, Rituals Done Today, Best Streak.
   - Highlights progress towards the user's next level/badge.
   - Visualizes a "This Week" view showing completion status for the past 7 days.
   - Shows quick summaries of "Today's Rituals" and "Pending Tasks".
2. **Tasks (ToldToSection)**:
   - A to-do list for one-off tasks.
   - Supports adding tasks with specific due dates and times.
3. **Rituals (DailyRitualsSection)**:
   - Habit tracking where users can set numerical goals (e.g., "Drink 8 glasses of water").
   - Users can define reminder modes (fixed times, intervals, smart contextual reminders).
4. **Charts (ChartsSection)**:
   - Visualizes productivity trends over time using line or bar charts.
5. **Rewards (RewardsSection)**:
   - **Gamification Engine**: Users earn points for completing tasks (+10 pts) and habits (+5 pts).
   - **Levels**: As users accumulate points, they progress through levels (Beginner, Getting There, On a Roll, Habit Hero, Unstoppable).
   - **Badges**: Users earn specific milestone badges which are saved locally.

## 4. State Management (Offline-First)
All primary user data is stored in the browser's `localStorage` using the following keys:
- `pinboard_tasks`: Array of task objects (id, name, dueDate, done).
- `pinboard_rituals_data`: Object containing `habits` array.
- `pinboard_completion_log`: Array of objects `{ type: 'task'|'habit', id, timestamp }` used to calculate points and weekly consistency.
- `pinboard_earned_badges`: Array of earned badges.
- `pinboard_daily_review_time`: Time of day for the daily task review reminder (default 20:00).

## 5. Push Notification Workflow & Backend Sync
To enable background push notifications without requiring the app to be open, Pinboard uses a hybrid sync architecture.

### Sync Process (`api/sync-state.js`)
1. The app requests push notification permissions (`Notification.permission === 'granted'`).
2. It subscribes to the push manager using a public VAPID key.
3. It triggers `syncStateToBackend()` (in `src/utils.js`) to send the user's `subscription`, `habits`, `tasks`, and `timezoneOffset` to the backend.
4. **Vercel KV Storage**: The backend stores this payload under a unique key `user_state_${subscription.endpoint}` and adds the endpoint to a master set `active_subscriptions`.

### Cron Job Processing (`api/cron/process.js`)
A Vercel Cron Job triggers periodically (likely every 15-30 minutes) to evaluate if notifications should be sent:
1. It fetches all `active_subscriptions` from Vercel KV.
2. It retrieves the synchronized state (tasks, habits, timezone) for each user.
3. It calculates the user's **local time** based on their `timezoneOffset`.
4. **Smart Evaluation Logic**:
   - **Habits**: Checks the reminder mode (`fixed`, `interval`, `smart`).
     - *Tone Adjustment*: Notification tone changes based on the time of day (Friendly in the morning -> Firm in the afternoon -> Urgent in the evening).
     - *Special Cases*: Custom copy for "wake up" habits.
   - **Tasks**: Checks deadlines (`dueDate`). Sends reminders 24 hours before, 2 hours before, at the exact time, and if it becomes overdue.
   - **Daily Review**: Sends a summary of pending tasks at the user's chosen `dailyReviewTime`.
   - **Nightly Summary**: At 22:00 local time, sends a wrap-up summarizing completed habits and pending tasks.
5. Sends the payload via the `web-push` library.

## 6. Prompting AI for Suggestions (How to use this doc)
To get the best suggestions from an AI, copy this entire document and append your specific request at the bottom. 

**Example Prompts you can use:**
- *"Based on this architecture, how can I improve the 'Smart' reminder mode in my cron job to use machine learning or better heuristics?"*
- *"I want to add a 'Social/Friends' feature. Given that my app is offline-first with Vercel KV for push sync, how should I architect the database to support sharing habit streaks?"*
- *"What are 5 creative gamification features I could add to the Rewards tab without breaking the current point system?"*
- *"How can I optimize the Vercel KV queries in my cron job to handle 10,000 active users?"*
