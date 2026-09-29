import { ImageResponse } from "next/og";

export const alt = "Hexathlon: puzzle drills for hex-board trading games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CARDS = [
  { name: "Pip Flash", skill: "Read the board", color: "#f59e0b" },
  { name: "Port Math", skill: "Trade efficiently", color: "#4f7cf0" },
  { name: "Hand Tracker", skill: "Count the cards", color: "#10b981" },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f6f5f1",
          color: "#1c1b18",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="-1 -1 2 2">
            <polygon points="0,-0.95 0.82,-0.475 0.82,0.475 0,0.95 -0.82,0.475 -0.82,-0.475" fill="#4338ca" />
            <circle r="0.34" fill="#ffffff" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>Hexathlon</div>
            <div style={{ fontSize: 34, color: "#625e53" }}>Puzzle drills for hex-board trading games</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {CARDS.map((c) => (
            <div
              key={c.name}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: 28,
                borderRadius: 28,
                background: c.color,
                color: "white",
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800 }}>{c.name}</div>
              <div style={{ fontSize: 26, opacity: 0.95 }}>{c.skill}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 30, color: "#625e53" }}>Daily puzzle · 13-puzzle Rush · Challenge your friends</div>
      </div>
    ),
    { ...size },
  );
}
