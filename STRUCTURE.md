# Pinboard Application Structure

This document outlines the complete directory structure of the Pinboard application, providing a brief description of each file's purpose and role in the app.

## Directory Tree & Descriptions

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

## How the Pieces Fit Together

1. **Routing:** Handled entirely by `App.jsx` checking the `currentTab` state (based on URL hashes). It mounts `Dashboard`, `GoalsSection`, `ToldToSection`, `DailyRitualsSection`, or `MoreSection`.
2. **State Management:** The app doesn't use Redux or Context for domain data. Instead, sections read from `localStorage` on mount. When a section mutates data, it saves to `localStorage` and calls `window.dispatchEvent(...)` so other mounted components can instantly refresh.
3. **Data Sharing:** `utils.js` (specifically `syncMonthlyGoalProgress`) acts as the bridge. For instance, `DailyRitualsSection` calls it when a habit is completed, which updates the goals data that `GoalsSection` reads.
4. **Gamification:** `RewardsSection` reads from the logs written by `utils.js` (`logCompletion`). `badgeUtils.js` evaluates these logs and triggers `BadgeCelebration`.
