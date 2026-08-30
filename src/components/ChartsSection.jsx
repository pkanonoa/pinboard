import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
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

  // Start of today
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  // Week days (Mon-Sun)
  const getWeekDays = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i,
      );
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
      name: `${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i >= 12 ? "PM" : "AM"}`,
      tasks: 0,
      habits: 0,
    }));

    completionLog.forEach((log) => {
      const logDate = new Date(log.timestamp);
      if (logDate >= startOfToday) {
        const hour = logDate.getHours();
        if (log.type === "task") hours[hour].tasks++;
        if (log.type === "habit") hours[hour].habits++;
      }
    });

    return hours;
  };

  // 2. Weekly Data (Mon - Sun)
  const getWeeklyData = () => {
    const weekDays = getWeekDays();
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const data = weekDays.map((date, i) => {
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

    return data;
  };

  // 3. Monthly Data (1st to last day)
  const getMonthlyData = () => {
    const monthDays = getMonthDays();

    const data = monthDays.map((date) => {
      const dateYMD = getLocalYMD(date);
      let total = 0;

      completionLog.forEach((log) => {
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
      <div className="w-full h-64 text-sm">
        <ResponsiveContainer width="100%" height="100%">
          {view === "Day" ? (
            <BarChart
              data={getDailyData()}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "light" ? "rgba(0,0,0,0.06)" : "#374151"}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                tickFormatter={(val, index) => (index % 3 === 0 ? val : "")}
              />
              <YAxis
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)" }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill:
                    theme === "light"
                      ? "rgba(0,0,0,0.04)"
                      : "rgba(255,255,255,0.04)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar
                dataKey="tasks"
                name="Tasks"
                stackId="a"
                fill="var(--accent-purple)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="habits"
                name="Rituals"
                stackId="a"
                fill="var(--success)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : view === "Week" ? (
            <BarChart
              data={getWeeklyData()}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "light" ? "rgba(0,0,0,0.06)" : "#374151"}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)" }}
              />
              <YAxis
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)" }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill:
                    theme === "light"
                      ? "rgba(0,0,0,0.04)"
                      : "rgba(255,255,255,0.04)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar
                dataKey="tasks"
                name="Tasks"
                stackId="a"
                fill="var(--accent-purple)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="habits"
                name="Rituals"
                stackId="a"
                fill="var(--success)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart
              data={getMonthlyData()}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "light" ? "rgba(0,0,0,0.06)" : "#374151"}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                tickFormatter={(val, index) => (index % 5 === 0 ? val : "")}
              />
              <YAxis
                stroke="var(--text-secondary)"
                tick={{ fill: "var(--text-secondary)" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Completions"
                stroke="var(--warning)"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "var(--warning)",
                  stroke: "var(--bg-primary)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
