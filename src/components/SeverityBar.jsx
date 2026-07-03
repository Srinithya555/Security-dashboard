import React from "react";

const SEVERITY_META = [
  { key: "CRITICAL", color: "var(--sev-critical)", label: "Critical" },
  { key: "HIGH", color: "var(--sev-high)", label: "High" },
  { key: "MEDIUM", color: "var(--sev-medium)", label: "Medium" },
  { key: "LOW", color: "var(--sev-low)", label: "Low" },
  { key: "INFO", color: "var(--sev-info)", label: "Info" },
];

export default function SeverityBar({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="panel">
      <h3 className="panel-title">Severity distribution</h3>
      {total === 0 ? (
        <div className="empty-state">No findings to display.</div>
      ) : (
        <>
          <div className="severity-bar">
            {SEVERITY_META.map(({ key, color }) => {
              const pct = (counts[key] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={key}
                  style={{ width: `${pct}%`, background: color }}
                  title={`${key}: ${counts[key]}`}
                />
              );
            })}
          </div>
          <div className="severity-bar-legend">
            {SEVERITY_META.map(({ key, color, label }) => (
              <div className="legend-item" key={key}>
                <span className="legend-dot" style={{ background: color }} />
                <span>{label} ({counts[key]})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
