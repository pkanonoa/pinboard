import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

export default function MonthlyGoalCard({ goal, onLog, onComplete, onUndo, onDelete, onEdit }) {
  const [logValue, setLogValue] = useState('');

  // Pace Calculation
  const getPace = () => {
    if (goal.trackingType === 'binary') return null;
    if (goal.isCompleted) return 'on_track';
    
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    
    const expectedProgress = (goal.target / daysInMonth) * currentDay;
    
    if (goal.progress >= expectedProgress) return 'on_track';
    if (goal.progress >= expectedProgress * 0.8) return 'at_risk';
    return 'behind';
  };

  const pace = getPace();
  
  const handleLogSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(logValue);
    if (!isNaN(val)) {
      onLog(goal.id, val);
      setLogValue('');
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${goal.isCompleted ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-gray-800 border-gray-700'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-lg ${goal.isCompleted ? 'text-emerald-400' : 'text-gray-100'}`}>
              {goal.name}
            </h3>
            {pace === 'on_track' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="On Track" />}
            {pace === 'at_risk' && <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" title="At Risk" />}
            {pace === 'behind' && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Behind Pace" />}
          </div>
          
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
              {goal.category}
            </span>
            {goal.trackingType !== 'binary' && (
              <span className="text-gray-400 mt-0.5">
                {goal.progress} / {goal.target} {goal.unit}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => onEdit(goal)}
            className="text-gray-500 hover:text-indigo-400 transition-colors p-1"
            title="Edit Goal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button 
            onClick={() => { if (confirm('Are you sure you want to delete this monthly goal?')) onDelete(goal.id); }}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            title="Delete Goal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>

      {/* Mini Line Chart */}
      {goal.history && goal.history.length > 0 && (
        <div className="h-12 w-full mt-2 mb-4 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={goal.history}>
              <YAxis domain={['auto', 'auto']} hide />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={goal.isCompleted ? '#10b981' : '#6366f1'} 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-2 flex items-center justify-between">
        {goal.trackingType === 'binary' ? (
          goal.isCompleted ? (
            <div className="flex items-center justify-center w-full py-2 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Completed
            </div>
          ) : (
            <button 
              onClick={() => onComplete(goal.id)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
            >
              Mark Complete
            </button>
          )
        ) : (
          <>
            <div className="flex-1">
              {goal.trackingType === 'count_toward' ? (
                <button 
                  onClick={() => onLog(goal.id, 1)}
                  disabled={goal.isCompleted}
                  className={`w-full py-2 rounded-lg font-bold transition-colors ${goal.isCompleted ? 'bg-emerald-900/50 text-emerald-500' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                >
                  +1 {goal.unit}
                </button>
              ) : (
                <form onSubmit={handleLogSubmit} className="flex gap-2">
                  <input 
                    type="number" 
                    step="any"
                    placeholder={`Log ${goal.unit}`}
                    value={logValue}
                    onChange={(e) => setLogValue(e.target.value)}
                    disabled={goal.isCompleted}
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                  <button 
                    type="submit" 
                    disabled={goal.isCompleted || !logValue}
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Log
                  </button>
                </form>
              )}
            </div>
            
            {goal.progress > 0 && !goal.isCompleted && (
               <button 
                 onClick={() => onUndo(goal.id)}
                 className="ml-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 transition-colors"
                 title="Undo Last"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
               </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
