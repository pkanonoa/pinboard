# Pinboard Application Overview & Structure

This document is designed to provide AI agents and developers with a complete understanding of the Pinboard application, including its core concepts, UI modules, data flow, and file structure.

---

## 1. Overall Concept
Pinboard is a mobile-first, offline-capable Progressive Web App (PWA) designed to gamify personal productivity. It combines habit tracking, one-off task management, and long-term goal setting into a single cohesive experience.

To keep users engaged, Pinboard includes a gamification layer with points, levels, badges, and a virtual mascot named **Neo** that provides feedback and encouragement.

## 2. Core Modules (The Bottom Navigation)

The app is divided into 5 main sections, managed by `App.jsx` using client-side hash routing:

### 🏠 Home (Dashboard)
- **Component:** `Dashboard.jsx`
- **Purpose:** A high-level daily overview.
- **Features:** Displays today's pending tasks, today's incomplete rituals, and active goals. Uses `smartSuggestions.js` to dynamically analyze user data and suggest actions.

### 🎯 Goals
- **Component:** `GoalsSection.jsx`, `GoalCard.jsx`
- **Purpose:** Tracking long-term objectives with specific deadlines.
- **Tracking Types:** `count_toward`, `cumulative`, `daily_log`, `binary`.
- **Integration:** Goals can be directly linked to Rituals.

### 📋 Tasks
- **Component:** `ToldToSection.jsx`
- **Purpose:** A classic To-Do list for one-off items.
- **Features:** Standard CRUD operations. Can assign tasks to specific people/categories and supports due dates.

### 🔁 Rituals
- **Component:** `DailyRitualsSection.jsx`
- **Purpose:** Daily habit tracking with streaks.
- **Tracking Types:** `countable`, `one_time`, `time_locked`, `big_number`.
- **Features:** Daily resets at midnight and a Pause/Vacation Mode.

### ⋯ More
- **Component:** `MoreSection.jsx`
- **Purpose:** Access to deeper features.
- **Features:** 
  - **Rewards (`RewardsSection.jsx`):** Gamification hub displaying total points, levels, and badges.
  - **Charts (`ChartsSection.jsx`):** Data visualization of completion rates over time.
  - **Settings (`SettingsSection.jsx`):** Theme toggling (Light/Dark), notifications.
  - **Weekly Review (`WeeklyReviewScreen.jsx`):** A guided flow to review the past week's performance.

## 3. Data Flow & Integration Patterns

- **Local Storage:** All user data is stored synchronously in `localStorage` (`pinboard_rituals_data`, `pinboard_tasks`, `pinboard_goals`, etc.).
- **Cross-Module Syncing (`utils.js`):** Modules communicate via Custom Events and shared utility functions. When a user logs progress on a Ritual, `syncMonthlyGoalProgress` is called to increment any linked Goal.
- **Event Dispatching:** After mutating local storage, components dispatch events (e.g., `window.dispatchEvent(new Event("pinboard_rituals_updated"))`) so sibling components re-render instantly.
- **Gamification Triggers:** Completing tasks logs to a completion log. `checkAndUnlockBadges()` evaluates these logs to award badges and trigger the `NeoCelebration` animations.

---

## 4. Full Directory Structure & File Descriptions

```text
C:\PINBOARD\SRC
|   App.jsx                - The main layout component. Handles bottom navigation, routing, theme initialization, and PWA setup.
|   db.js                  - Wrapper for IndexedDB (used primarily by the Service Worker to store notification history).
|   index.css              - Global CSS file containing Tailwind directives and the core CSS variables for light/dark theming.
|   main.jsx               - React entry point. Mounts the `App` to the DOM.
|   utils.js               - Core utilities for formatting dates, synchronizing goals, logging completions, and syncing to the backend.
|   
+---assets                 - Static image assets used in the application.
|       neo-happy.png      - Mascot (Happy state)
|       neo-progressbar.png- Mascot (Progress visual)
|       neo-sad.png        - Mascot (Sad/Sympathetic state)
|       neo-wavinig.png    - Mascot (Greeting state)
|       neo.png            - Mascot (Default state)
|       
+---components             - Reusable UI components and main section views.
|       BadgeCelebration.jsx   - Full-screen modal that displays when a user unlocks a new badge.
|       ChartsSection.jsx      - Data visualization view showing completion stats and history.
|       DailyRitualsSection.jsx- The "Rituals" tab. Handles daily habits, big numbers, time-locked routines, and pausing.
|       Dashboard.jsx          - The "Home" tab. Shows today's overview, smart suggestions, and recent activity.
|       GoalCard.jsx           - Individual goal display component used in the Goals module. Shows progress bars and line charts.
|       GoalsSection.jsx       - The "Goals" tab. Handles long-term goal tracking and linking goals to rituals.
|       InstallPrompt.jsx      - PWA installation prompt that asks the user to add the app to their home screen.
|       LocalTaskNotifier.jsx  - Checks for pending tasks and triggers local notifications if the user hasn't completed them.
|       MoreSection.jsx        - The "More" tab. A menu linking to Settings, Rewards, Charts, and Weekly Reviews.
|       NeoAvatar.jsx          - Reusable component to render the Neo mascot with different moods.
|       NeoCelebration.jsx     - Renders confetti and a happy Neo overlay when a habit is completed.
|       NotificationDrawer.jsx - Slide-out sidebar showing a history of received push notifications.
|       NotificationManager.jsx- Handles Web Push API subscription and permissions.
|       OnboardingScreen.jsx   - Initial welcome flow for first-time users.
|       RewardsSection.jsx     - Gamification view showing current points, level, and all unlocked/locked badges.
|       SettingsSection.jsx    - User preferences (theme, notification times, daily review schedule).
|       ShareCard.jsx          - Component used to generate a shareable image of the user's progress.
|       ToldToSection.jsx      - The "Tasks" tab. Handles one-off to-do items, assignments, and due dates.
|       UserManualModal.jsx    - An in-app help guide explaining how the app works.
|       WeeklyReviewScreen.jsx - A guided modal summarizing the user's performance over the past 7 days.
|       
+---contexts               - (Directory for React contexts, currently unused as state is managed via LocalStorage/Events)
|
+---hooks                  - Custom React hooks.
|       useShareCard.js    - Hook containing the logic for capturing the UI as an image via html2canvas.
|       useTheme.js        - Hook managing the switch between Light and Dark mode using Tailwind's 'dark' class.
|       useVoiceLogger.js  - Hook bridging the microphone input to the Voice API for voice-driven logging.
|       
\---utils                  - Helper functions and domain logic.
        audioUtils.js          - Handles playing sound effects (like completion sounds).
        badgeUtils.js          - Contains the logic and definitions for all 30+ unlockable badges.
        smartSuggestions.js    - Engine for the Dashboard. Analyzes local state to suggest actions (e.g. "Pause this habit").
        voiceParser.js         - Natural language processing utility for translating voice input into task/habit actions.
```
