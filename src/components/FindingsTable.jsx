import React, { useMemo, useState } from "react";
import { filterFindings, sortBySeverity } from "../lib/aggregate.js";

const SEVERITY_COLOR = {
  CRITICAL: "var(--sev-critical)",
  HIGH: "var(--sev-high)",
  MEDIUM: "var(--sev-medium)",
  LOW: "var(--sev-low)",
  INFO: "var(--sev-info)",
};

const SOURCE_LABELS = {
  "aws-cspm": "AWS-CSPM",
  "jwt-scanner": "JWT-SCAN",
  "rbac-audit": "RBAC-AUDIT",
};

export default function FindingsTable({ findings }) {
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => sortBySeverity(filterFindings(findings, { source, severity, search })),
    [findings, source, severity, search]
  );

  return (
    <div className="panel">
      <h3 className="panel-title">Findings ({visible.length})</h3>

      <div className="filters">
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="aws-cspm">AWS CSPM</option>
          <option value="jwt-scanner">JWT Scanner</option>
          <option value="rbac-audit">RBAC Audit</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="all">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <input
          type="text"
          placeholder="Search findings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">No findings match these filters.</div>
      ) : (
        <table className="findings-table">
          <thead>
            <tr>
              <th style={{ width: "90px" }}>Severity</th>
              <th style={{ width: "110px" }}>Source</th>
              <th>Finding</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.id}>
                <td>
                  <span
                    className="sev-badge"
                    style={{ background: `${SEVERITY_COLOR[f.severity]}22`, color: SEVERITY_COLOR[f.severity] }}
                  >
                    {f.severity}
                  </span>
                </td>
                <td>
                  <span className="source-badge">{SOURCE_LABELS[f.source] || f.source}</span>
                </td>
                <td>
                  <div className="finding-title">{f.title}</div>
                  <div className="finding-resource">{f.resourceType}: {f.resourceId}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
