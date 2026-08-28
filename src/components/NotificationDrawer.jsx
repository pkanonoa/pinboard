import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, deleteNotification, markAllAsRead } from '../db';
import { getLocalYMD } from '../utils';

const iconMap = {
  water: '💧',
  task: '📋',
  habit: '💧',
  badge: '🏆',
  summary: '📊'
};

const getRelativeTime = (timestamp) => {
  const diffInMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export default function NotificationDrawer({ isOpen, onClose, setCurrentTab }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const allNotifs = await getNotifications();
      const today = getLocalYMD();
      
      const notifs = allNotifs.filter(n => {
        return getLocalYMD(new Date(n.timestamp)) === today;
      });
      
      // sort newest first
      notifs.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(notifs);
      
      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > 0) {
        await markAllAsRead();
        // optionally trigger a re-render or event to update bell dot
        window.dispatchEvent(new Event('notifications_read'));
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (type) => {
    onClose();
    if (type === 'task') setCurrentTab('tasks');
    else if (type === 'habit' || type === 'water') setCurrentTab('rituals');
    else if (type === 'badge') setCurrentTab('rewards');
    else setCurrentTab('dashboard');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 shadow-2xl rounded-b-3xl max-h-[80vh] flex flex-col pt-safe"
          >
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                Notifications
              </h2>
              <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                  <p className="text-sm font-medium">All caught up!</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif.type)}
                    className="relative flex items-start gap-3 p-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-750 transition-colors border border-gray-700/50"
                  >
                    <div className="text-2xl mt-1">
                      {iconMap[notif.type] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="text-sm font-bold text-white mb-0.5">{notif.title}</h4>
                      <p className="text-xs text-gray-400 leading-tight mb-2 line-clamp-2">{notif.body}</p>
                      <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{getRelativeTime(notif.timestamp)}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDismiss(e, notif.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 text-center border-t border-gray-800 pb-safe">
              <p className="text-[10px] text-gray-500 font-medium">Older notifications are cleared daily.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
