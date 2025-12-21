/**
 * Scoring Calculator - Calculates scores based on check results
 */

import type {
  CheckResult,
  Severity,
  Pillar,
  PillarScore,
  ReportSummary,
  PriorityFix,
  Check,
} from '../types/index.js';

const SEVERITY_WEIGHT_VALUES: Record<Severity, number> = {
  critical: 4,
  high: 2,
  medium: 1,
  low: 0.5,
};

const PILLAR_NAMES: Record<Pillar, string> = {
  metadata: 'Machine-Consumable Metadata',
  errors: 'Rich Error Semantics',
  introspection: 'Complete Introspection',
  naming: 'Consistent Naming',
  predictability: 'Predictable Behavior',
  documentation: 'Comprehensive Documentation',
  performance: 'Speed & Reliability',
  discoverability: 'Discoverability',
};

const AGENT_READY_THRESHOLD = 70;

/**
 * Calculate overall score from check results
 */
export function calculateScore(results: CheckResult[]): number {
  if (results.length === 0) return 100;

  const totalWeight = results.reduce(
    (sum, result) => sum + SEVERITY_WEIGHT_VALUES[result.severity],
    0
  );

  const earnedWeight = results
    .filter((result) => result.status === 'passed')
    .reduce((sum, result) => sum + SEVERITY_WEIGHT_VALUES[result.severity], 0);

  return Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Calculate scores per pillar
 */
export function calculatePillarScores(
  results: CheckResult[],
  checks: Check[]
): PillarScore[] {
  const pillarMap = new Map<Pillar, { passed: CheckResult[]; failed: CheckResult[] }>();

  // Initialize all pillars
  const allPillars: Pillar[] = [
    'metadata',
    'errors',
    'introspection',
    'naming',
    'predictability',
    'documentation',
    'performance',
    'discoverability',
  ];

  for (const pillar of allPillars) {
    pillarMap.set(pillar, { passed: [], failed: [] });
  }

  // Group results by pillar
  for (const result of results) {
    const check = checks.find((c) => c.id === result.id);
    if (!check) continue;

    const pillarData = pillarMap.get(check.pillar);
    if (!pillarData) continue;

    if (result.status === 'passed') {
      pillarData.passed.push(result);
    } else if (result.status === 'failed') {
      pillarData.failed.push(result);
    }
  }

  // Calculate scores for each pillar
  const pillarScores: PillarScore[] = [];

  for (const [pillar, data] of pillarMap) {
    const allResults = [...data.passed, ...data.failed];
    const score = calculateScore(allResults);

    pillarScores.push({
      id: pillar,
      name: PILLAR_NAMES[pillar],
      score,
      weight: 1.0, // Equal weight for MVP
      checksPassed: data.passed.length,
      checksFailed: data.failed.length,
    });
  }

  return pillarScores.sort((a, b) => a.score - b.score);
}

/**
 * Generate report summary
 */
export function generateSummary(
  results: CheckResult[],
  totalEndpoints: number
): ReportSummary {
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const warnings = results.filter((r) => r.status === 'warning').length;
  const criticalFailures = results.filter(
    (r) => r.status === 'failed' && r.severity === 'critical'
  ).length;

  const overallScore = calculateScore(results);
  const agentReady = overallScore >= AGENT_READY_THRESHOLD && criticalFailures === 0;

  return {
    overallScore,
    agentReady,
    totalEndpoints,
    passed,
    warnings,
    failed,
    criticalFailures,
  };
}

/**
 * Calculate priority fixes - sorted by impact
 */
export function calculatePriorityFixes(
  results: CheckResult[],
  checks: Check[]
): PriorityFix[] {
  // Group failed checks by check ID
  const failedByCheck = new Map<string, CheckResult[]>();

  for (const result of results) {
    if (result.status !== 'failed') continue;

    const existing = failedByCheck.get(result.id) || [];
    existing.push(result);
    failedByCheck.set(result.id, existing);
  }

  // Calculate priority scores
  const priorityFixes: PriorityFix[] = [];

  for (const [checkId, failedResults] of failedByCheck) {
    const check = checks.find((c) => c.id === checkId);
    if (!check) continue;

    const severityWeight = SEVERITY_WEIGHT_VALUES[check.severity];
    const endpointsAffected = failedResults.length;
    const priorityScore = severityWeight * endpointsAffected;

    // Get a sample result for the fix
    const sampleResult = failedResults[0];
    const fix = check.generateFix
      ? check.generateFix(
          { api: {} as never, endpoint: undefined },
          sampleResult!
        )
      : undefined;

    priorityFixes.push({
      rank: 0, // Will be set after sorting
      checkId: check.id,
      checkName: check.name,
      severity: check.severity,
      severityWeight,
      endpointsAffected,
      priorityScore,
      summary: check.selfHealing.withoutThis,
      fix,
    });
  }

  // Sort by priority score (descending) and assign ranks
  priorityFixes.sort((a, b) => b.priorityScore - a.priorityScore);
  priorityFixes.forEach((fix, index) => {
    fix.rank = index + 1;
  });

  return priorityFixes;
}

/**
 * Calculate endpoint score
 */
export function calculateEndpointScore(results: CheckResult[]): number {
  return calculateScore(results);
}

/**
 * Determine endpoint status based on results
 */
export function determineEndpointStatus(
  results: CheckResult[]
): 'passed' | 'warning' | 'failed' {
  const hasCriticalFailure = results.some(
    (r) => r.status === 'failed' && r.severity === 'critical'
  );
  if (hasCriticalFailure) return 'failed';

  const hasFailure = results.some((r) => r.status === 'failed');
  if (hasFailure) return 'warning';

  return 'passed';
}
