// Runnable directly with Node, no npm install / test framework required:
//     node tests/aggregate.test.mjs
// This mirrors the "manual test runner" pattern used for the Python
// projects in this series where pytest wasn't installable — same
// principle: verify logic is verified even without full tooling access.

import {
  normalizeAwsFindings, normalizeJwtFindings, normalizeRbacAuditLog,
  computeSeverityCounts, computeRiskScore, computeRiskScoreBySource,
  filterFindings, sortBySeverity, _resetIdCounterForTests,
} from "../src/lib/aggregate.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// --- normalizeAwsFindings ---
_resetIdCounterForTests();
{
  const awsJson = {
    risk_score: 40,
    finding_count: 1,
    findings: [{
      rule_id: "S3-001", resource_type: "s3_bucket", resource_id: "b1",
      severity: "CRITICAL", title: "Public bucket", description: "d", remediation: "r", cis_reference: "x",
    }],
  };
  const result = normalizeAwsFindings(awsJson);
  assertEqual(result.length, 1, "normalizeAwsFindings returns one finding");
  assertEqual(result[0].source, "aws-cspm", "normalizeAwsFindings sets source correctly");
  assertEqual(result[0].severity, "CRITICAL", "normalizeAwsFindings preserves severity");
  assertEqual(result[0].resourceId, "b1", "normalizeAwsFindings maps resource_id -> resourceId");
}

assertEqual(normalizeAwsFindings({}), [], "normalizeAwsFindings handles missing findings key gracefully");
assertEqual(normalizeAwsFindings({ findings: [] }), [], "normalizeAwsFindings handles empty findings array");

// --- normalizeJwtFindings ---
{
  const jwtJson = {
    findings: [{ severity: "HIGH", title: "Weak kid", detail: "path traversal" }],
  };
  const result = normalizeJwtFindings(jwtJson, "token-abc");
  assertEqual(result.length, 1, "normalizeJwtFindings returns one finding");
  assertEqual(result[0].source, "jwt-scanner", "normalizeJwtFindings sets source");
  assertEqual(result[0].description, "path traversal", "normalizeJwtFindings maps detail -> description");
  assertEqual(result[0].resourceId, "token-abc", "normalizeJwtFindings uses provided token label");
}

// --- normalizeRbacAuditLog ---
{
  const auditLines = [
    { user_id: "u1", resource: "orders", action: "write", allow: true, violations: [] },
    { user_id: "u2", resource: "financial_report", action: "export", allow: false, violations: ["export requires finance role"], timestamp: "2026-01-01T00:00:00Z" },
  ];
  const result = normalizeRbacAuditLog(auditLines);
  assertEqual(result.length, 1, "normalizeRbacAuditLog only includes denied decisions");
  assertEqual(result[0].source, "rbac-audit", "normalizeRbacAuditLog sets source");
  assert(result[0].title.includes("u2"), "normalizeRbacAuditLog includes user in title");
  assert(result[0].description.includes("finance role"), "normalizeRbacAuditLog includes violation reason");
}

assertEqual(normalizeRbacAuditLog([]), [], "normalizeRbacAuditLog handles empty log");

// --- computeSeverityCounts ---
{
  const findings = [
    { severity: "CRITICAL" }, { severity: "CRITICAL" }, { severity: "LOW" },
  ];
  const counts = computeSeverityCounts(findings);
  assertEqual(counts.CRITICAL, 2, "computeSeverityCounts counts CRITICAL correctly");
  assertEqual(counts.LOW, 1, "computeSeverityCounts counts LOW correctly");
  assertEqual(counts.HIGH, 0, "computeSeverityCounts zero-fills missing severities");
}

// --- computeRiskScore ---
{
  assertEqual(computeRiskScore([]), 0, "computeRiskScore is 0 for no findings");
  assertEqual(
    computeRiskScore([{ severity: "HIGH" }, { severity: "MEDIUM" }]),
    30,
    "computeRiskScore sums weights correctly (20 + 10)"
  );
  const manyFindings = Array(10).fill({ severity: "CRITICAL" });
  assertEqual(computeRiskScore(manyFindings), 100, "computeRiskScore caps at 100");
}

// --- computeRiskScoreBySource ---
{
  const findings = [
    { source: "aws-cspm", severity: "CRITICAL" },
    { source: "aws-cspm", severity: "LOW" },
    { source: "jwt-scanner", severity: "HIGH" },
  ];
  const bySource = computeRiskScoreBySource(findings);
  assertEqual(bySource["aws-cspm"], 45, "computeRiskScoreBySource sums per-source (40 + 5)");
  assertEqual(bySource["jwt-scanner"], 20, "computeRiskScoreBySource isolates jwt-scanner score");
}

// --- filterFindings ---
{
  const findings = [
    { source: "aws-cspm", severity: "CRITICAL", title: "Public bucket", description: "d1", resourceId: "b1" },
    { source: "jwt-scanner", severity: "LOW", title: "Missing iat", description: "d2", resourceId: "tok1" },
  ];
  assertEqual(filterFindings(findings, { source: "aws-cspm" }).length, 1, "filterFindings filters by source");
  assertEqual(filterFindings(findings, { severity: "LOW" }).length, 1, "filterFindings filters by severity");
  assertEqual(filterFindings(findings, { search: "bucket" }).length, 1, "filterFindings filters by search term (case-insensitive title match)");
  assertEqual(filterFindings(findings, { search: "BUCKET" }).length, 1, "filterFindings search is case-insensitive");
  assertEqual(filterFindings(findings, {}).length, 2, "filterFindings with no filters returns everything");
  assertEqual(filterFindings(findings, { source: "all", severity: "all" }).length, 2, "filterFindings treats 'all' as no-op filter");
}

// --- sortBySeverity ---
{
  const findings = [
    { severity: "LOW" }, { severity: "CRITICAL" }, { severity: "MEDIUM" },
  ];
  const sorted = sortBySeverity(findings);
  assertEqual(sorted.map((f) => f.severity), ["CRITICAL", "MEDIUM", "LOW"], "sortBySeverity orders CRITICAL first");
  assertEqual(findings.map((f) => f.severity), ["LOW", "CRITICAL", "MEDIUM"], "sortBySeverity does not mutate the original array");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
