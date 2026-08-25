import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { getLocalYMD } from '../utils';

export default function ChartsSection() {
  const [view, setView] = useState('Day'); // Day, Week, Month
  const [completionLog, setCompletionLog] = useState([]);

  useEffect(() => {
    const logStr = localStorage.getItem('pinboard_completion_log');
    if (logStr) {
      try {
        setCompletionLog(JSON.parse(logStr));
      } catch (e) {
        console.error("Failed to parse completion log", e);
      }
    }
  }, []);

  // --- Date Helpers ---
  const now = new Date();
  
  // Start of today
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Week days (Mon-Sun)
  const getWeekDays = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      days.push(current);
    }
    return days;
  };

  // Days in current month
  const getMonthDays = () => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // --- Data Aggregation ---

  // 1. Daily Data (24 hours)
  const getDailyData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      name: `${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i >= 12 ? 'PM' : 'AM'}`,
      tasks: 0,
      habits: 0
    }));

    completionLog.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate >= startOfToday) {
        const hour = logDate.getHours();
        if (log.type === 'task') hours[hour].tasks++;
        if (log.type === 'habit') hours[hour].habits++;
      }
    });

    return hours;
  };

  // 2. Weekly Data (Mon - Sun)
  const getWeeklyData = () => {
    const weekDays = getWeekDays();
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const data = weekDays.map((date, i) => {
      const dateYMD = getLocalYMD(date);
      let tasks = 0;
      let habits = 0;

      completionLog.forEach(log => {
        const logDate = new Date(log.timestamp);
        if (getLocalYMD(logDate) === dateYMD) {
          if (log.type === 'task') tasks++;
          if (log.type === 'habit') habits++;
        }
      });

      return { name: dayNames[i], tasks, habits };
    });

    return data;
  };

  // 3. Monthly Data (1st to last day)
  const getMonthlyData = () => {
    const monthDays = getMonthDays();
    
    const data = monthDays.map(date => {
      const dateYMD = getLocalYMD(date);
      let total = 0;

      completionLog.forEach(log => {
        const logDate = new Date(log.timestamp);
        if (getLocalYMD(logDate) === dateYMD) {
          total++;
        }
      });

      return { name: date.getDate().toString(), total };
    });

    return data;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white shadow-lg">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5 z-10 pb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
        </svg>
        Activity Charts
      </h2>

      {/* Toggle View */}
      <div className="flex bg-gray-950 rounded-lg p-1 mb-8">
        {['Day', 'Week', 'Month'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
              view === v ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="w-full h-64 text-sm">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'Day' ? (
            <BarChart data={getDailyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val, index) => index % 3 === 0 ? val : ''} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="tasks" name="Tasks" stackId="a" fill="#818CF8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="habits" name="Rituals" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : view === 'Week' ? (
            <BarChart data={getWeeklyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="tasks" name="Tasks" stackId="a" fill="#818CF8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="habits" name="Rituals" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={getMonthlyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="total" name="Total Completions" stroke="#FBBF24" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#FBBF24', stroke: '#1F2937', strokeWidth: 2 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
}
