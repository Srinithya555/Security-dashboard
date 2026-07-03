import React from "react";

const SOURCE_LABELS = {
  "aws-cspm": "AWS CSPM Scanner",
  "jwt-scanner": "JWT Security Scanner",
  "rbac-audit": "RBAC Policy Audit",
};

export default function SourceBreakdown({ scoresBySource }) {
  const sources = Object.keys(SOURCE_LABELS);

  return (
    <div className="panel">
      <h3 className="panel-title">Tools reporting in</h3>
      {sources.map((source) => (
        <div className="source-row" key={source}>
          <span className="source-name">{SOURCE_LABELS[source]}</span>
          <span className="source-score">{scoresBySource[source] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
