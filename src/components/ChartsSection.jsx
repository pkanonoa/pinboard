import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { getLocalYMD } from "../utils";
import { useTheme } from "../hooks/useTheme";

export default function ChartsSection() {
  const [view, setView] = useState("Day"); // Day, Week, Month
  const [completionLog, setCompletionLog] = useState([]);
  const { theme } = useTheme();

  useEffect(() => {
    const logStr = localStorage.getItem("pinboard_completion_log");
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
  const getStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfToday = getStartOfDay(now);

  const getWeekDays = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    }
    return days;
  };

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

  const countInRange = (start, end) => {
    let tasks = 0;
    let habits = 0;
    completionLog.forEach(log => {
      const d = new Date(log.timestamp);
      if (d >= start && d < end) {
        if (log.type === "task") tasks++;
        if (log.type === "habit") habits++;
      }
    });
    return { tasks, habits, total: tasks + habits };
  };

  // --- Data Aggregation ---
  const { chartData, percentChange, peakValue, peakSeries, peakTime } = useMemo(() => {
    let currentTotal = 0;
    let prevTotal = 0;
    let data = [];

    if (view === "Day") {
      data = Array.from({ length: 24 }, (_, i) => ({
        name: `${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i >= 12 ? "PM" : "AM"}`,
        tasks: 0,
        habits: 0,
      }));
      completionLog.forEach((log) => {
        const logDate = new Date(log.timestamp);
        if (logDate >= startOfToday) {
          const hour = logDate.getHours();
          if (log.type === "task") data[hour].tasks++;
          if (log.type === "habit") data[hour].habits++;
        }
      });
      currentTotal = data.reduce((acc, curr) => acc + curr.tasks + curr.habits, 0);
      
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      prevTotal = countInRange(startOfYesterday, startOfToday).total;
    } else if (view === "Week") {
      const weekDays = getWeekDays();
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      data = weekDays.map((date, i) => {
        const dateYMD = getLocalYMD(date);
        let tasks = 0;
        let habits = 0;
        completionLog.forEach((log) => {
          const logDate = new Date(log.timestamp);
          if (getLocalYMD(logDate) === dateYMD) {
            if (log.type === "task") tasks++;
            if (log.type === "habit") habits++;
          }
        });
        return { name: dayNames[i], tasks, habits };
      });
      currentTotal = data.reduce((acc, curr) => acc + curr.tasks + curr.habits, 0);

      const startOfThisWeek = weekDays[0];
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      prevTotal = countInRange(startOfLastWeek, startOfThisWeek).total;
    } else if (view === "Month") {
      const monthDays = getMonthDays();
      data = monthDays.map((date) => {
        const dateYMD = getLocalYMD(date);
        let tasks = 0;
        let habits = 0;
        completionLog.forEach((log) => {
          const logDate = new Date(log.timestamp);
          if (getLocalYMD(logDate) === dateYMD) {
            if (log.type === "task") tasks++;
            if (log.type === "habit") habits++;
          }
        });
        return { name: date.getDate().toString(), tasks, habits };
      });
      currentTotal = data.reduce((acc, curr) => acc + curr.tasks + curr.habits, 0);

      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevTotal = countInRange(startOfLastMonth, startOfThisMonth).total;
    }

    let pValue = 0;
    let pSeries = "Rituals";
    let pTime = "";

    data.forEach(d => {
      if (d.tasks > pValue) {
        pValue = d.tasks;
        pSeries = "Tasks";
        pTime = d.name;
      }
      if (d.habits > pValue) {
        pValue = d.habits;
        pSeries = "Rituals";
        pTime = d.name;
      }
    });

    const pChange = prevTotal === 0 
      ? (currentTotal > 0 ? 100 : 0) 
      : Math.round(((currentTotal - prevTotal) / prevTotal) * 100);

    return { chartData: data, percentChange: pChange, peakValue: pValue, peakSeries: pSeries, peakTime: pTime };
  }, [view, completionLog]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`border-none rounded-xl p-3 text-sm shadow-xl ${theme === "light" ? "bg-white text-gray-900" : "bg-[var(--bg-card)] text-white"}`}
        >
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
    <div className="w-full max-w-md z-10 flex flex-col gap-6 pt-6 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          Activity
        </h2>
      </div>

      {/* Toggle View */}
      <div
        className={`flex rounded-xl p-1.5 mb-2 ${theme === "light" ? "bg-[var(--bg-secondary)]" : "bg-[var(--bg-card)]"}`}
      >
        {["Day", "Week", "Month"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
              view === v
                ? theme === "light"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "bg-[var(--bg-card-hover)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="w-full h-64 text-sm relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRituals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="none"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              stroke="var(--text-muted)"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickFormatter={(val, index) => {
                if (view === "Day" && index % 3 !== 0) return "";
                if (view === "Month" && index % 5 !== 0) return "";
                return val;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="var(--text-muted)"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'var(--border)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
                fill: 'transparent',
              }}
            />
            <Area
              type="monotone"
              dataKey="tasks"
              name="Tasks"
              stroke="var(--accent-purple)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTasks)"
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="habits"
              name="Rituals"
              stroke="var(--success)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRituals)"
              activeDot={{ r: 4 }}
            />
            
            {peakValue > 0 && (
              <ReferenceDot 
                x={peakTime} 
                y={peakValue} 
                r={4} 
                fill={peakSeries === "Tasks" ? "var(--accent-purple)" : "var(--success)"}
                stroke={peakSeries === "Tasks" ? "var(--accent-purple)" : "var(--success)"}
                strokeOpacity={0.25}
                strokeWidth={8}
                isFront={true}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pt-4 border-t border-[var(--border)] px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)]"></div>
          <span className="text-[11px] text-[var(--text-secondary)]">Rituals</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-purple)]"></div>
          <span className="text-[11px] text-[var(--text-secondary)]">Tasks</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mt-1">
        <div className="flex flex-col items-center justify-center p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]/50 shadow-sm">
          <span className={`text-lg font-bold ${peakSeries === "Tasks" ? "text-[var(--accent-purple)]" : "text-[var(--success)]"}`}>
            {peakValue}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">peak {peakSeries.toLowerCase()}</span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]/50 shadow-sm">
          <span className="text-lg font-bold text-[var(--accent-purple)]">
            {peakTime || "-"}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">busiest time</span>
        </div>
        
        <div className="flex flex-col items-center justify-center p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]/50 shadow-sm">
          <span className={`text-lg font-bold ${percentChange >= 0 ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
            {percentChange > 0 ? "+" : ""}{percentChange}%
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            vs last {view.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
