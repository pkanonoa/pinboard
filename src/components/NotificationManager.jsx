import React, { useState, useEffect } from "react";
import { syncStateToBackend } from "../utils";

// Vite exposes env variables prefixed with VITE_ via import.meta.env
const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Utility to convert Base64 string to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationManager({ onComplete }) {
  const [permissionState, setPermissionState] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default",
  );

  const handleEnableNotifications = async () => {
    try {
      if (!("Notification" in window)) {
        alert("Notifications not supported");
        return;
      }

      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === "denied") {
        localStorage.setItem("pinboard_push_subscribed", "denied");
        return;
      }

      if (permission === "granted") {
        // Wait for service worker registration to be active
        const registration = await navigator.serviceWorker.ready;

        // Subscribe the user
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        // Send the subscription and current state to our backend
        await syncStateToBackend();

        localStorage.setItem("pinboard_push_subscribed", "true");
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
    }
  };

  if (permissionState === "denied") {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-[var(--bg-card)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
          <svg
            className="w-8 h-8 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            ></path>
          </svg>
        </div>
        <h4 className="font-bold text-[var(--text-primary)] mb-2 text-lg">
          Notifications Blocked
        </h4>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          You've blocked notifications. Please enable them in your device
          settings to receive reminders.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 border border-indigo-500/30">
        <span className="text-3xl">🔔</span>
      </div>
      <h4 className="font-bold text-[var(--text-primary)] mb-2 text-lg">
        Enable Notifications
      </h4>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Stay up to date with new activity on your pinboard and never miss a
        ritual.
      </p>
      <button
        onClick={handleEnableNotifications}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-primary)] rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)]"
      >
        Enable Now
      </button>
    </div>
  );
}
