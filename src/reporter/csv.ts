/**
 * CSV Reporter - Export Clara analysis results as CSV
 */

import type { AnalysisReport, CheckResult } from '../types/index.js';

export class CsvReporter {
  /**
   * Generate CSV for all check results by endpoint
   */
  generateEndpointChecks(report: AnalysisReport): string {
    const headers = [
      'API Name',
      'API Version',
      'Endpoint Path',
      'HTTP Method',
      'Operation ID',
      'Endpoint Score',
      'Endpoint Status',
      'Check ID',
      'Check Status',
      'Check Severity',
      'Check Message',
    ];

    const rows: string[][] = [headers];

    for (const endpoint of report.endpoints) {
      for (const check of endpoint.checks) {
        rows.push([
          report.api.name,
          report.api.version,
          endpoint.path,
          endpoint.method,
          endpoint.operationId || '',
          endpoint.score.toString(),
          endpoint.status,
          check.id,
          check.status,
          check.severity,
          check.message,
        ]);
      }
    }

    return this.toCSV(rows);
  }

  /**
   * Generate CSV summary by endpoint
   */
  generateEndpointSummary(report: AnalysisReport): string {
    const headers = [
      'API Name',
      'API Version',
      'Path',
      'Method',
      'Operation ID',
      'Score',
      'Status',
      'Passed',
      'Failed',
      'Warnings',
      'Skipped',
    ];

    const rows: string[][] = [headers];

    for (const endpoint of report.endpoints) {
      const counts = this.countCheckStatuses(endpoint.checks);
      rows.push([
        report.api.name,
        report.api.version,
        endpoint.path,
        endpoint.method,
        endpoint.operationId || '',
        endpoint.score.toString(),
        endpoint.status,
        counts.passed.toString(),
        counts.failed.toString(),
        counts.warning.toString(),
        counts.skipped.toString(),
      ]);
    }

    return this.toCSV(rows);
  }

  /**
   * Generate CSV for pillar scores
   */
  generatePillarScores(report: AnalysisReport): string {
    const headers = [
      'API Name',
      'API Version',
      'Pillar ID',
      'Pillar Name',
      'Score',
      'Weight',
      'Checks Passed',
      'Checks Failed',
    ];

    const rows: string[][] = [headers];

    for (const pillar of report.pillars) {
      rows.push([
        report.api.name,
        report.api.version,
        pillar.id,
        pillar.name,
        pillar.score.toString(),
        pillar.weight.toString(),
        pillar.checksPassed.toString(),
        pillar.checksFailed.toString(),
      ]);
    }

    return this.toCSV(rows);
  }

  /**
   * Generate CSV for priority fixes
   */
  generatePriorityFixes(report: AnalysisReport): string {
    const headers = [
      'API Name',
      'API Version',
      'Rank',
      'Check ID',
      'Check Name',
      'Severity',
      'Severity Weight',
      'Endpoints Affected',
      'Priority Score',
      'Summary',
      'Fix Description',
    ];

    const rows: string[][] = [headers];

    for (const fix of report.priorityFixes) {
      rows.push([
        report.api.name,
        report.api.version,
        fix.rank.toString(),
        fix.checkId,
        fix.checkName,
        fix.severity,
        fix.severityWeight.toString(),
        fix.endpointsAffected.toString(),
        fix.priorityScore.toString(),
        fix.summary,
        fix.fix?.description || '',
      ]);
    }

    return this.toCSV(rows);
  }

  /**
   * Generate overall summary CSV
   */
  generateSummary(report: AnalysisReport): string {
    const headers = [
      'API Name',
      'API Version',
      'Source',
      'Generated At',
      'Clara Version',
      'Overall Score',
      'Agent Ready',
      'Total Endpoints',
      'Passed',
      'Failed',
      'Warnings',
      'Critical Failures',
    ];

    const rows: string[][] = [
      headers,
      [
        report.api.name,
        report.api.version,
        report.api.sourcePath,
        report.generatedAt,
        report.claraVersion,
        report.summary.overallScore.toString(),
        report.summary.agentReady ? 'Yes' : 'No',
        report.summary.totalEndpoints.toString(),
        report.summary.passed.toString(),
        report.summary.failed.toString(),
        report.summary.warnings.toString(),
        report.summary.criticalFailures.toString(),
      ],
    ];

    return this.toCSV(rows);
  }

  /**
   * Generate combined CSV with all data (multiple sections)
   */
  generateFull(report: AnalysisReport): string {
    const sections = [
      '# Summary',
      this.generateSummary(report),
      '',
      '# Pillar Scores',
      this.generatePillarScores(report),
      '',
      '# Endpoint Summary',
      this.generateEndpointSummary(report),
      '',
      '# Priority Fixes',
      this.generatePriorityFixes(report),
    ];

    return sections.join('\n');
  }

  private countCheckStatuses(checks: CheckResult[]): { passed: number; failed: number; warning: number; skipped: number } {
    const counts = { passed: 0, failed: 0, warning: 0, skipped: 0 };
    for (const check of checks) {
      counts[check.status]++;
    }
    return counts;
  }

  private toCSV(rows: string[][]): string {
    return rows.map((row) => row.map((cell) => this.escapeCSV(cell)).join(',')).join('\n');
  }

  private escapeCSV(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape quotes by doubling them
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
