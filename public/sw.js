const CACHE_NAME = 'pinboard-cache-v7';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Delete all caches that aren't the current one.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => cleanOldNotificationsFromDB())
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Use Network First strategy for HTML pages so we always get the latest version pointing to the latest assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Use Stale-While-Revalidate for other assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {}); // Fail silently for background updates if offline

      return cachedResponse || fetchPromise;
    })
  );
});

// Simple IndexedDB helper for the service worker
function saveNotificationToDB(notification) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PinboardDB', 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('notifications', 'readwrite');
      tx.objectStore('notifications').put(notification);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function cleanOldNotificationsFromDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PinboardDB', 2);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('notifications')) {
        resolve();
        return;
      }
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const getAllReq = store.getAll();
      
      getAllReq.onsuccess = () => {
        const notifications = getAllReq.result || [];
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        
        notifications.forEach(note => {
          if (now - note.timestamp > ONE_DAY_MS) {
            store.delete(note.id);
          }
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Handle incoming push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};

  const notificationObj = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    title: data.title || 'Pinboard',
    body: data.body || 'Time to check Pinboard!',
    type: data.type || 'general',
    timestamp: Date.now(),
    read: false
  };

  const options = {
    body: data.body || 'Time to check Pinboard!',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: data.tag || `pinboard-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url: data.url || '/',
      taskId: data.taskId || null,
      type: data.type || 'general'
    }
  };

  event.waitUntil(
    Promise.all([
      saveNotificationToDB(notificationObj)
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(windowClients => {
          for (let client of windowClients) {
            client.postMessage({ type: 'NEW_NOTIFICATION' });
          }
        })
        .catch(err => console.error("SW DB save error", err)),
      self.registration.showNotification(
        data.title || 'Pinboard',
        options
      )
    ])
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (deepLink) {
        // postMessage the deep link to all open clients
        for (const client of clientList) {
          client.postMessage({ deepLink });
        }
        if (clientList.length > 0) {
          clientList[0].focus();
          return;
        }
        return clients.openWindow('/' + deepLink.replace(/^\//, ''));
      }
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
