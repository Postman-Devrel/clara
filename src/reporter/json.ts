/**
 * JSON Reporter - Export Clara analysis results as JSON
 */

import type { AnalysisReport } from '../types/index.js';

export class JsonReporter {
  private pretty: boolean;

  constructor(options?: { pretty?: boolean }) {
    this.pretty = options?.pretty ?? true;
  }

  /**
   * Generate JSON string from analysis report
   */
  generate(report: AnalysisReport): string {
    if (this.pretty) {
      return JSON.stringify(report, null, 2);
    }
    return JSON.stringify(report);
  }

  /**
   * Generate minified JSON for machine consumption
   */
  generateMinified(report: AnalysisReport): string {
    return JSON.stringify(report);
  }

  /**
   * Generate JSON with only essential fields
   */
  generateSummary(report: AnalysisReport): string {
    const summary = {
      api: report.api,
      generatedAt: report.generatedAt,
      claraVersion: report.claraVersion,
      summary: report.summary,
      pillars: report.pillars.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
      })),
      topFixes: report.priorityFixes.slice(0, 10).map((f) => ({
        rank: f.rank,
        checkId: f.checkId,
        checkName: f.checkName,
        severity: f.severity,
        endpointsAffected: f.endpointsAffected,
        summary: f.summary,
      })),
    };

    return JSON.stringify(summary, null, 2);
  }
}
