import React, { useMemo } from "react";
import RiskGauge from "./components/RiskGauge.jsx";
import SourceBreakdown from "./components/SourceBreakdown.jsx";
import SeverityBar from "./components/SeverityBar.jsx";
import FindingsTable from "./components/FindingsTable.jsx";
import {
  normalizeAwsFindings, normalizeJwtFindings, normalizeRbacAuditLog,
  computeSeverityCounts, computeRiskScore, computeRiskScoreBySource,
} from "./lib/aggregate.js";
import sampleData from "./data/sample-findings.json";

/**
 * Loads and combines output from three independently-built security
 * tools into one unified findings list. In this demo, the data comes
 * from a bundled sample-findings.json — see README "Connecting real
 * data" for how to point this at live output from the other projects in
 * this portfolio instead of the sample.
 */
function useCombinedFindings() {
  return useMemo(() => {
    const awsFindings = normalizeAwsFindings(sampleData.awsReport);
    const jwtFindings = normalizeJwtFindings(sampleData.jwtReport, "captured-session-token");
    const rbacFindings = normalizeRbacAuditLog(sampleData.rbacAuditLog);
    return [...awsFindings, ...jwtFindings, ...rbacFindings];
  }, []);
}

export default function App() {
  const findings = useCombinedFindings();
  const overallScore = computeRiskScore(findings);
  const scoresBySource = computeRiskScoreBySource(findings);
  const severityCounts = computeSeverityCounts(findings);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <div className="brand-title">Unified Security Posture</div>
            <div className="brand-subtitle">aws-cspm · jwt-scanner · rbac-audit</div>
          </div>
        </div>
        <RiskGauge score={overallScore} />
      </div>

      <div className="grid">
        <SourceBreakdown scoresBySource={scoresBySource} />
        <SeverityBar counts={severityCounts} />
      </div>

      <FindingsTable findings={findings} />
    </div>
  );
}
