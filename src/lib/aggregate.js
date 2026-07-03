/**
 * Pure data-transformation logic for the security dashboard: normalizes
 * output from three different tools (the AWS CSPM scanner, the JWT
 * scanner, and the RBAC policy engine's audit log) into ONE unified
 * finding shape, then provides aggregation/filtering functions the UI
 * components consume.
 *
 * This file has ZERO React dependency on purpose — every function here
 * can be (and is, see tests/aggregate.test.mjs) unit tested by running
 * plain Node, with no build step, no npm install, no browser. That
 * mirrors the same design principle used in the AWS CSPM project
 * (cspm/engine.py never touches boto3) and the RBAC project
 * (reference_engine.py never touches OPA): keep the actual decision/
 * transformation logic testable in isolation from whatever framework or
 * SDK surrounds it.
 *
 * Risk-scoring weights are intentionally identical to
 * aws-cspm-scanner/cspm/engine.py's compute_risk_score, so a "72" means
 * the same thing whether it's reported by the CSPM tool alone or by this
 * dashboard aggregating across tools — a deliberate consistency decision
 * worth mentioning in an interview.
 */

export const SEVERITY_WEIGHT = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  INFO: 1,
};

export const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `f-${_idCounter}`;
}

/** Normalizes aws-cspm-scanner's report.py JSON output (to_json_report). */
export function normalizeAwsFindings(awsReportJson) {
  const findings = awsReportJson?.findings ?? [];
  return findings.map((f) => ({
    id: nextId(),
    source: "aws-cspm",
    severity: f.severity,
    title: f.title,
    description: f.description,
    remediation: f.remediation,
    resourceType: f.resource_type,
    resourceId: f.resource_id,
    ruleId: f.rule_id,
  }));
}

/** Normalizes jwt-security-scanner's --json CLI output. */
export function normalizeJwtFindings(jwtReportJson, tokenLabel = "scanned-token") {
  const findings = jwtReportJson?.findings ?? [];
  return findings.map((f) => ({
    id: nextId(),
    source: "jwt-scanner",
    severity: f.severity,
    title: f.title,
    description: f.detail,
    remediation: "",
    resourceType: "jwt",
    resourceId: tokenLabel,
    ruleId: "",
  }));
}

/**
 * Normalizes the RBAC policy engine's audit log (JSON Lines from
 * AuditLogger.log_decision). Only DENIED decisions become "findings" here
 * — an audit log is a record, not a vulnerability report, but repeated or
 * notable denials are worth surfacing on a security dashboard (e.g. "this
 * user was denied access to financial_report 14 times this week" is a
 * signal worth someone's attention).
 */
export function normalizeRbacAuditLog(auditLogLines) {
  return auditLogLines
    .filter((entry) => entry.allow === false)
    .map((entry) => ({
      id: nextId(),
      source: "rbac-audit",
      severity: "LOW",
      title: `Access denied: ${entry.user_id} → ${entry.action} on ${entry.resource}`,
      description: (entry.violations || []).join("; ") || "No reason recorded",
      remediation: "",
      resourceType: "rbac-decision",
      resourceId: entry.resource,
      ruleId: "",
      timestamp: entry.timestamp,
    }));
}

export function computeSeverityCounts(findings) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}

export function computeRiskScore(findings, cap = 100) {
  const raw = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] || 0), 0);
  return Math.min(raw, cap);
}

export function computeRiskScoreBySource(findings) {
  const bySource = {};
  for (const f of findings) {
    bySource[f.source] = bySource[f.source] || [];
    bySource[f.source].push(f);
  }
  const result = {};
  for (const [source, list] of Object.entries(bySource)) {
    result[source] = computeRiskScore(list);
  }
  return result;
}

/**
 * Filters findings by source, severity, and a free-text search over
 * title/description/resourceId. All filters are optional and combine
 * with AND semantics.
 */
export function filterFindings(findings, { source, severity, search } = {}) {
  return findings.filter((f) => {
    if (source && source !== "all" && f.source !== source) return false;
    if (severity && severity !== "all" && f.severity !== severity) return false;
    if (search) {
      const haystack = `${f.title} ${f.description} ${f.resourceId}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });
}

export function sortBySeverity(findings) {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

/** Resets the internal id counter — used only by tests to get deterministic ids. */
export function _resetIdCounterForTests() {
  _idCounter = 0;
}
