import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

export default function GoalCard({ goal, onLog, onComplete, onUndo, onDelete, onEdit }) {
  const [logValue, setLogValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Status Calculation
  const getStatus = () => {
    if (goal.isCompleted) return { label: 'Completed', color: 'text-emerald-400 bg-emerald-900/30' };
    
    if (goal.dueDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(goal.dueDate);
      due.setHours(0,0,0,0);
      
      if (today > due) {
        return { label: 'Overdue', color: 'text-red-400 bg-red-900/30' };
      }

      // If we have progress, target, createdAt and dueDate, we could calculate pace.
      // For now, if no pace calculation is strictly possible, default to in_progress or user-selected status.
      if (goal.trackingType !== 'binary' && goal.createdAt) {
        const created = new Date(goal.createdAt);
        created.setHours(0,0,0,0);
        
        const totalDays = Math.max(1, (due - created) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.max(0, (today - created) / (1000 * 60 * 60 * 24));
        
        const expectedProgress = (goal.target / totalDays) * daysPassed;
        if (goal.progress >= expectedProgress) return { label: 'On track', color: 'text-emerald-400 bg-emerald-900/30' };
        if (goal.progress >= expectedProgress * 0.75) return { label: 'At risk', color: 'text-amber-400 bg-amber-900/30' };
      }
    }
    
    // Default fallback
    return { label: 'In progress', color: 'text-indigo-400 bg-indigo-900/30' };
  };

  const status = getStatus();
  
  const progressPct = goal.trackingType === 'binary' 
    ? (goal.isCompleted ? 100 : 0) 
    : Math.min(100, Math.max(0, (goal.progress / goal.target) * 100)) || 0;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(logValue);
    if (!isNaN(val)) {
      onLog(goal.id, val);
      setLogValue('');
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 hover:bg-gray-800/60'}`}>
      
      {/* Summary View (Always visible, click to expand) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer select-none relative"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="pr-4">
            <h3 className={`font-bold text-[16px] leading-tight mb-1 ${goal.isCompleted ? 'text-gray-400 line-through' : 'text-gray-100'}`}>
              {goal.name}
            </h3>
            <p className="text-[13px] text-gray-500 font-medium">
              {goal.category} {goal.dueDate ? `· due ${formatDate(goal.dueDate)}` : '· ongoing'}
            </p>
          </div>
          <div className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${status.color}`}>
            {status.label}
          </div>
        </div>

        {/* Slim Progress Bar */}
        <div className="w-full h-1.5 bg-gray-800/80 rounded-full overflow-hidden mt-2">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${goal.isCompleted ? 'bg-emerald-500' : status.label === 'At risk' ? 'bg-amber-500' : status.label === 'Overdue' ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Expanded Actions View */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-700/50 bg-gray-800/30 animate-fade-in-down">
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-gray-400 font-medium">
              {goal.trackingType !== 'binary' ? `${goal.progress} / ${goal.target} ${goal.unit}` : 'Status: ' + (goal.isCompleted ? 'Completed' : 'Pending')}
            </span>
            
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="p-1.5 text-gray-400 hover:text-indigo-400 bg-gray-800 rounded-md transition-colors" title="Edit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete this goal?')) onDelete(goal.id); }} className="p-1.5 text-gray-400 hover:text-red-400 bg-gray-800 rounded-md transition-colors" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>

          {/* Mini Line Chart */}
          {goal.history && goal.history.length > 0 && (
            <div className="h-12 w-full mb-4 opacity-70">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goal.history}>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Line type="monotone" dataKey="value" stroke={goal.isCompleted ? '#10b981' : '#6366f1'} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action Logging */}
          <div className="flex flex-col gap-2">
            {goal.trackingType === 'binary' ? (
              goal.isCompleted ? (
                <div className="flex items-center justify-center w-full py-2.5 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/20">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Completed
                </div>
              ) : (
                <button onClick={() => onComplete(goal.id)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
                  Mark Complete
                </button>
              )
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  {goal.trackingType === 'count_toward' ? (
                    <button 
                      onClick={() => onLog(goal.id, 1)}
                      disabled={goal.isCompleted}
                      className={`w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 ${goal.isCompleted ? 'bg-emerald-900/50 text-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}`}
                    >
                      +1 {goal.unit}
                    </button>
                  ) : (
                    <form onSubmit={handleLogSubmit} className="flex gap-2">
                      <input 
                        type="number" 
                        step="any"
                        placeholder={`+ Amount`}
                        value={logValue}
                        onChange={(e) => setLogValue(e.target.value)}
                        disabled={goal.isCompleted}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                      />
                      <button 
                        type="submit" 
                        disabled={goal.isCompleted || !logValue}
                        className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-bold rounded-xl transition-colors active:scale-95 shadow-lg shadow-indigo-900/20"
                      >
                        Log
                      </button>
                    </form>
                  )}
                </div>
                
                {goal.progress > 0 && !goal.isCompleted && (
                   <button 
                     onClick={() => onUndo(goal.id)}
                     className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-gray-400 bg-gray-900 hover:bg-gray-700 border border-gray-700 transition-colors active:scale-95"
                     title="Undo Last"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                   </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
