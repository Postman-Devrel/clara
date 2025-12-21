/**
 * Console Reporter - Pretty console output for Clara analysis results
 */

import chalk from 'chalk';
import type { AnalysisReport, PillarScore, PriorityFix, Severity } from '../types/index.js';

const SEVERITY_COLORS: Record<Severity, typeof chalk> = {
  critical: chalk.red,
  high: chalk.yellow,
  medium: chalk.blue,
  low: chalk.gray,
};

const STATUS_ICONS = {
  passed: chalk.green('✓'),
  failed: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  skipped: chalk.gray('○'),
};

export class ConsoleReporter {
  private verbose: boolean;

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose ?? false;
  }

  /**
   * Print full analysis report to console
   */
  print(report: AnalysisReport): void {
    this.printHeader(report);
    this.printScoreSummary(report);
    this.printPillarScores(report.pillars);
    this.printPriorityFixes(report.priorityFixes);

    if (this.verbose) {
      this.printEndpointDetails(report);
    }

    this.printFooter(report);
  }

  private printHeader(report: AnalysisReport): void {
    console.log('');
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
    console.log(chalk.bold.cyan('  Clara - AI Agent API Readiness Analyzer'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
    console.log('');
    console.log(chalk.gray(`  API: ${report.api.name} v${report.api.version}`));
    console.log(chalk.gray(`  Source: ${report.api.sourcePath}`));
    console.log(chalk.gray(`  Generated: ${new Date(report.generatedAt).toLocaleString()}`));
    console.log('');
  }

  private printScoreSummary(report: AnalysisReport): void {
    const { summary } = report;
    const scoreColor = this.getScoreColor(summary.overallScore);
    const statusEmoji = summary.agentReady ? '🤖' : '⚠️';

    console.log(chalk.bold('  OVERALL SCORE'));
    console.log('');
    console.log(`    ${scoreColor(this.renderScoreBar(summary.overallScore))} ${scoreColor.bold(`${summary.overallScore}%`)}`);
    console.log('');
    console.log(`    ${statusEmoji} ${summary.agentReady ? chalk.green.bold('AI Agent Ready') : chalk.yellow.bold('Not AI Agent Ready')}`);
    console.log('');
    console.log(chalk.gray(`    Endpoints: ${summary.totalEndpoints} | Passed: ${chalk.green(summary.passed)} | Failed: ${chalk.red(summary.failed)} | Warnings: ${chalk.yellow(summary.warnings)}`));

    if (summary.criticalFailures > 0) {
      console.log(chalk.red.bold(`    ⚠ ${summary.criticalFailures} critical failure${summary.criticalFailures > 1 ? 's' : ''}`));
    }

    console.log('');
    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────────'));
    console.log('');
  }

  private printPillarScores(pillars: PillarScore[]): void {
    console.log(chalk.bold('  PILLAR SCORES'));
    console.log('');

    // Sort by score (lowest first to highlight problem areas)
    const sorted = [...pillars].sort((a, b) => a.score - b.score);

    for (const pillar of sorted) {
      const scoreColor = this.getScoreColor(pillar.score);
      const bar = this.renderMiniBar(pillar.score);
      const checks = `${pillar.checksPassed}/${pillar.checksPassed + pillar.checksFailed}`;

      console.log(`    ${bar} ${scoreColor(`${pillar.score.toString().padStart(3)}%`)}  ${pillar.name.padEnd(30)} ${chalk.gray(`(${checks} checks)`)}`);
    }

    console.log('');
    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────────'));
    console.log('');
  }

  private printPriorityFixes(fixes: PriorityFix[]): void {
    if (fixes.length === 0) {
      console.log(chalk.green.bold('  ✓ No fixes needed - API is AI-ready!'));
      console.log('');
      return;
    }

    console.log(chalk.bold('  PRIORITY FIXES'));
    console.log(chalk.gray('  (Ranked by impact: severity × endpoints affected)'));
    console.log('');

    const topFixes = fixes.slice(0, 5);

    for (const fix of topFixes) {
      const severityColor = SEVERITY_COLORS[fix.severity];
      const severityBadge = severityColor(`[${fix.severity.toUpperCase()}]`);

      console.log(`    ${chalk.bold(`#${fix.rank}`)} ${severityBadge} ${chalk.bold(fix.checkName)}`);
      console.log(chalk.gray(`       ${fix.checkId} | ${fix.endpointsAffected} endpoint${fix.endpointsAffected > 1 ? 's' : ''} affected | Priority: ${fix.priorityScore}`));
      console.log(`       ${chalk.italic(fix.summary)}`);

      if (fix.fix?.example) {
        const exampleLines = fix.fix.example.split('\n').slice(0, 3);
        console.log(chalk.cyan(`       Fix: ${exampleLines[0]}`));
        for (const line of exampleLines.slice(1)) {
          console.log(chalk.cyan(`            ${line}`));
        }
      }

      console.log('');
    }

    if (fixes.length > 5) {
      console.log(chalk.gray(`    ... and ${fixes.length - 5} more fixes`));
      console.log('');
    }

    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────────'));
    console.log('');
  }

  private printEndpointDetails(report: AnalysisReport): void {
    console.log(chalk.bold('  ENDPOINT DETAILS'));
    console.log('');

    for (const endpoint of report.endpoints) {
      const statusIcon = STATUS_ICONS[endpoint.status];
      const scoreColor = this.getScoreColor(endpoint.score);

      console.log(`    ${statusIcon} ${chalk.bold(`${endpoint.method.padEnd(7)} ${endpoint.path}`)} ${scoreColor(`${endpoint.score}%`)}`);

      if (endpoint.operationId) {
        console.log(chalk.gray(`       operationId: ${endpoint.operationId}`));
      }

      // Show failed checks
      const failedChecks = endpoint.checks.filter((c) => c.status === 'failed');
      for (const check of failedChecks) {
        const severityColor = SEVERITY_COLORS[check.severity];
        console.log(`       ${chalk.red('✗')} ${severityColor(`[${check.severity}]`)} ${check.id}: ${check.message}`);
      }

      // Show warnings if verbose
      if (this.verbose) {
        const warnings = endpoint.checks.filter((c) => c.status === 'warning');
        for (const check of warnings) {
          console.log(`       ${chalk.yellow('⚠')} ${chalk.yellow(`[${check.severity}]`)} ${check.id}: ${check.message}`);
        }
      }

      console.log('');
    }

    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────────'));
    console.log('');
  }

  private printFooter(report: AnalysisReport): void {
    console.log(chalk.gray(`  Clara v${report.claraVersion} | "Clara, be my eyes"`));
    console.log('');
  }

  private getScoreColor(score: number): typeof chalk {
    if (score >= 80) return chalk.green;
    if (score >= 60) return chalk.yellow;
    if (score >= 40) return chalk.hex('#FFA500'); // Orange
    return chalk.red;
  }

  private renderScoreBar(score: number): string {
    const width = 30;
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;

    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  private renderMiniBar(score: number): string {
    const width = 10;
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;

    const color = this.getScoreColor(score);
    return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }
}

/**
 * Print a compact summary (for non-verbose mode)
 */
export function printCompactSummary(report: AnalysisReport): void {
  const { summary } = report;
  const status = summary.agentReady ? chalk.green('READY') : chalk.red('NOT READY');

  console.log('');
  console.log(`Clara Analysis: ${chalk.bold(report.api.name)} v${report.api.version}`);
  console.log(`Score: ${summary.overallScore}% | Status: ${status}`);
  console.log(`Checks: ${chalk.green(summary.passed)} passed, ${chalk.red(summary.failed)} failed, ${chalk.yellow(summary.warnings)} warnings`);

  if (report.priorityFixes.length > 0) {
    console.log('');
    console.log('Top fix: ' + report.priorityFixes[0]?.checkName);
  }

  console.log('');
}
