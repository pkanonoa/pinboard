import React, { forwardRef } from "react";
import neoImg from "../assets/neo.png";

/**
 * ShareCard — pure presentational component.
 * Uses ONLY inline styles — no Tailwind classes — so html2canvas works reliably.
 * Receives all data as props; does zero data fetching.
 * Note: Colors are intentionally hardcoded to the Dark Theme scheme so that
 * shared cards always look identical, regardless of the user's active app theme.
 */
const ShareCard = forwardRef(function ShareCard(
  {
    userName,
    weekLabel,
    bestStreak,
    pointsThisWeek,
    habitsDone,
    habitTotal,
    levelName,
    mvpHabit,
  },
  ref,
) {
  const card = {
    width: 390,
    height: 600,
    background: "linear-gradient(160deg, #0a0f1a 0%, #1a2535 100%)",
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "36px 28px 28px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  };

  // subtle grid overlay
  const gridOverlay = {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px)," +
      "linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
    backgroundSize: "30px 30px",
    pointerEvents: "none",
  };

  const wordmark = {
    fontSize: 22,
    fontWeight: 900,
    background: "linear-gradient(90deg, #a78bfa, #2dd4bf)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
    marginBottom: 18,
  };

  const neoWrapper = {
    width: 110,
    height: 110,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    filter: "drop-shadow(0 8px 24px rgba(245,197,24,0.45))",
    marginBottom: 14,
  };

  const nameStyle = {
    fontSize: 26,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.3px",
    marginBottom: 4,
  };

  const weekStyle = {
    fontSize: 13,
    color: "#5eead4",
    fontWeight: 500,
    marginBottom: 20,
  };

  const divider = {
    width: "100%",
    height: 1,
    background: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    width: "100%",
    marginBottom: 18,
  };

  const statBox = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const statLabel = {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
    letterSpacing: "0.3px",
  };

  const statValue = {
    fontSize: 22,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.5px",
  };

  const mvpBox = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(94,234,212,0.18)",
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginBottom: "auto",
  };

  const mvpLabel = {
    fontSize: 11,
    color: "#5eead4",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };

  const mvpName = {
    fontSize: 20,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
  };

  const mvpDays = {
    fontSize: 13,
    color: "#5eead4",
    fontWeight: 500,
  };

  const bottomBar = {
    marginTop: 18,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  };

  const neoCircle = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.05)",
  };

  const builtWith = {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 500,
  };

  const stats = [
    { emoji: "🔥", label: "Best Streak", value: `${bestStreak} days` },
    { emoji: "⭐", label: "Points Earned", value: `${pointsThisWeek} pts` },
    {
      emoji: "✅",
      label: "Habits Done",
      value: `${habitsDone} / ${habitTotal}`,
    },
    { emoji: "🏆", label: "Level", value: levelName || "Beginner" },
  ];

  function getHabitEmoji(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("water") || n.includes("drink") || n.includes("hydrate"))
      return "💧";
    if (
      n.includes("gym") ||
      n.includes("exercise") ||
      n.includes("workout") ||
      n.includes("run") ||
      n.includes("walk") ||
      n.includes("sport") ||
      n.includes("yoga") ||
      n.includes("stretch") ||
      n.includes("lift") ||
      n.includes("training")
    )
      return "🏃‍♂️";
    if (n.includes("sleep") || n.includes("bed")) return "🌙";
    if (n.includes("wake") || n.includes("morning")) return "🌅";
    if (
      n.includes("read") ||
      n.includes("book") ||
      n.includes("study") ||
      n.includes("learn")
    )
      return "📚";
    if (
      n.includes("meditat") ||
      n.includes("mind") ||
      n.includes("breathe") ||
      n.includes("calm") ||
      n.includes("zen")
    )
      return "🧘";
    if (
      n.includes("code") ||
      n.includes("work") ||
      n.includes("programming") ||
      n.includes("dev") ||
      n.includes("study")
    )
      return "💻";
    if (n.includes("journal") || n.includes("write") || n.includes("diary"))
      return "✍️";
    if (
      n.includes("eat") ||
      n.includes("food") ||
      n.includes("meal") ||
      n.includes("diet") ||
      n.includes("cook")
    )
      return "🥗";
    if (
      n.includes("clean") ||
      n.includes("house") ||
      n.includes("chore") ||
      n.includes("tidy")
    )
      return "🧹";
    return "🌱"; // default fallback
  }

  return (
    <div ref={ref} style={card}>
      {/* @import Inter font for html2canvas */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div style={gridOverlay} />

      {/* Wordmark */}
      <div style={wordmark}>Pinboard</div>

      {/* Neo */}
      <div style={neoWrapper}>
        <img
          src={neoImg}
          alt="Neo"
          style={{ width: 110, height: 110, objectFit: "contain" }}
        />
      </div>

      {/* Name */}
      <div style={nameStyle}>{userName ? `${userName}'s Week` : "My Week"}</div>

      {/* Week dates */}
      <div style={weekStyle}>{weekLabel}</div>

      {/* Divider */}
      <div style={divider} />

      {/* 2×2 stat grid */}
      <div style={grid}>
        {stats.map((s) => (
          <div key={s.label} style={statBox}>
            <div style={statLabel}>
              {s.emoji} {s.label}
            </div>
            <div style={statValue}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={divider} />

      {/* MVP habit */}
      {mvpHabit && (
        <div style={mvpBox}>
          <div style={mvpLabel}>This week's MVP habit</div>
          <div
            style={{
              fontSize: 40,
              lineHeight: 1,
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {getHabitEmoji(mvpHabit.name)}
          </div>
          <div style={mvpName}>{mvpHabit.name}</div>
          <div style={mvpDays}>{mvpHabit.days} / 7 days</div>
        </div>
      )}

      {/* Bottom */}
      <div style={bottomBar}>
        <div style={neoCircle}>
          <img
            src={neoImg}
            alt=""
            style={{ width: 48, height: 48, objectFit: "cover" }}
          />
        </div>
        <div style={builtWith}>Built with Pinboard 🧅</div>
      </div>
    </div>
  );
});

export default ShareCard;
