import React from "react";

/**
 * The dashboard's signature visual element: a radial arc gauge for the
 * aggregate risk score (0-100), colored by zone. Built as hand-rolled SVG
 * rather than a charting library — one less dependency to go wrong, and
 * for a single gauge like this, the library overhead isn't worth it.
 *
 * Math note: the arc spans 270 degrees (from -225deg to +45deg, i.e.
 * leaving a 90-degree gap at the bottom) — a common gauge convention that
 * reads as "a dial," not a full circle, which would be ambiguous about
 * where "empty" is.
 */
export default function RiskGauge({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 of 360 degrees
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * (clamped / 100);

  const color =
    clamped >= 70 ? "var(--sev-critical)" :
    clamped >= 40 ? "var(--sev-high)" :
    clamped >= 15 ? "var(--sev-medium)" :
    "var(--sev-low)";

  const label =
    clamped >= 70 ? "CRITICAL RISK" :
    clamped >= 40 ? "ELEVATED RISK" :
    clamped >= 15 ? "MODERATE RISK" :
    "LOW RISK";

  const size = (radius + strokeWidth) * 2;
  const center = size / 2;
  const rotationOffset = 135; // rotates the arc so its gap sits at the bottom

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotationOffset} ${center} ${center})`}
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotationOffset} ${center} ${center})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text
          x={center} y={center - 6} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize="40" fontWeight="700"
          fill="var(--text-primary)"
        >
          {clamped}
        </text>
        <text
          x={center} y={center + 20} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize="11"
          fill="var(--text-secondary)"
        >
          / 100
        </text>
      </svg>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600,
        letterSpacing: "0.08em", color, marginTop: "4px",
      }}>
        {label}
      </div>
    </div>
  );
}
