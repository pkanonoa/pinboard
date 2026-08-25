import React, { useState, useEffect } from 'react';

// Vite exposes env variables prefixed with VITE_ via import.meta.env
const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Utility to convert Base64 string to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
 
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
 
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationManager() {
  const [permissionState, setPermissionState] = useState(Notification.permission);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push messaging is not supported in this browser.');
      return;
    }

    if (Notification.permission === 'default') {
      setShowPrompt(true);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission === 'denied') {
        localStorage.setItem('pinboard_push_subscribed', 'denied');
        setShowPrompt(false);
        return;
      }

      if (permission === 'granted') {
        // Wait for service worker registration to be active
        const registration = await navigator.serviceWorker.ready;
        
        // Subscribe the user
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // Send the subscription to our backend
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription,
            title: 'Welcome to Pinboard!',
            body: 'Push notifications are successfully enabled.'
          })
        });

        localStorage.setItem('pinboard_push_subscribed', 'true');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  };

  const handleDismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pinboard_push_subscribed', 'dismissed');
  }
  // If we need to prompt the user to enable
  if (showPrompt) {
    return (
      <div className="w-full max-w-md mb-6">
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-white mb-1">Enable Notifications</h4>
              <p className="text-sm text-gray-400">
                Stay up to date with new activity on your pinboard.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={handleDismissPrompt} className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded transition-colors">
              Maybe later
            </button>
            <button onClick={handleEnableNotifications} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
              Enable
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
