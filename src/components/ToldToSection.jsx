import React, { useState, useEffect } from 'react';
import { logCompletion, removeCompletionToday } from '../utils';
import { checkAndUnlockBadges } from '../utils/badgeUtils';

export default function ToldToSection() {
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');
  const [whoSaidIt, setWhoSaidIt] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pinboard_tasks');
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);

  // Save to local storage whenever tasks change
  useEffect(() => {
    localStorage.setItem('pinboard_tasks', JSON.stringify(tasks));
    checkAndUnlockBadges();
  }, [tasks]);

  const scheduleNotification = async (taskName, dueDateStr) => {
    if (!('serviceWorker' in navigator)) return;
    
    setIsScheduling(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        setIsScheduling(false);
        return;
      }

      const date = new Date(dueDateStr);
      
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          title: 'Pinboard Reminder',
          body: `Task due: ${taskName}`,
          scheduledFor: date.getTime()
        })
      });
    } catch (e) {
      console.error('Failed to schedule notification', e);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      name: taskName,
      person: whoSaidIt,
      dueDate: dueDate,
      done: false,
      isFading: false,
    };

    setTasks([...tasks, newTask]);

    if (dueDate) {
      await scheduleNotification(taskName, dueDate);
    }

    setTaskName('');
    setWhoSaidIt('');
    setDueDate('');
  };

  const handleToggleDone = (id) => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    setTasks(currentTasks => 
      currentTasks.map(t => {
        if (t.id === id) {
          const willBeDone = !t.done;
          if (willBeDone) {
            logCompletion('task', id);
          } else {
            removeCompletionToday('task', id);
          }
          return { ...t, done: willBeDone, completedDate: willBeDone ? todayStr : null };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id) => {
    setTasks(currentTasks => currentTasks.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(t => !t.done));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done === b.done) {
      return b.id - a.id;
    }
    return a.done ? 1 : -1;
  });

  const completedCount = tasks.filter(t => t.done).length;

  return (
    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5 z-10">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
        Told To...
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
        <input 
          type="text" 
          placeholder="What do you need to do? (Required)" 
          required 
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Who said it?" 
            value={whoSaidIt}
            onChange={(e) => setWhoSaidIt(e.target.value)}
            className="w-1/2 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
          <input 
            type="datetime-local" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-1/2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
        </div>
        <button 
          type="submit" 
          disabled={isScheduling}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-all mt-1 active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
        >
          {isScheduling ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scheduling...
            </>
          ) : 'Add Task'}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg className="w-16 h-16 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-sm">No tasks. You're all caught up!</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <div 
              key={task.id} 
              className={`flex items-start gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 transition-all duration-300 ease-in-out ${task.done ? 'opacity-60 bg-gray-850' : 'opacity-100'}`}
            >
              <input 
                type="checkbox" 
                checked={task.done}
                onChange={() => handleToggleDone(task.id)}
                className="mt-1 w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-700 cursor-pointer flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium break-words leading-tight transition-colors ${task.done ? 'text-gray-500 line-through' : 'text-white'}`}>{task.name}</p>
                
                {(task.person || task.dueDate) && (
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                    {task.person && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        {task.person}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleDeleteTask(task.id)}
                className="text-gray-500 hover:text-red-400 p-1.5 rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
                aria-label="Delete task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {completedCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-500">{completedCount} completed tasks</span>
          <button onClick={clearCompleted} className="text-xs text-red-400 hover:text-red-300 transition-all active:scale-95 px-2 py-1 rounded hover:bg-gray-800">
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
