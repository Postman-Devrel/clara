/**
 * Scan Command - Discover and analyze all specs in a repository
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { resolve, relative, basename, dirname, join } from 'path';
import { stat, mkdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { findSpecs, findDocs, type DiscoveredSpec } from '../../discovery/index.js';
import { analyze } from '../../analyzer/index.js';
import { MarkdownReporter } from '../../reporter/index.js';
import type { AnalyzeOptions, AnalysisReport, PillarScore, PriorityFix, ReportSummary } from '../../types/index.js';

// Get the clara package root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLARA_ROOT = resolve(__dirname, '..', '..', '..');

interface ScanResult {
  spec: DiscoveredSpec;
  score: number;
  agentReady: boolean;
  error?: string;
  priorityFixes?: PriorityFix[];
  pillars?: PillarScore[];
  summary?: ReportSummary;
  report?: AnalysisReport;
  reportPath?: string;
}


/**
 * Generate a timestamp string for report filenames
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Save a markdown report to the clara reports directory with versioning
 * Structure: reports/<repo-name>/<spec-name>/<timestamp>.md + latest.md
 */
async function saveReport(
  report: AnalysisReport,
  repoName: string,
  specName: string
): Promise<string> {
  // Generate safe directory name from spec name
  const safeName = specName.replace(/\.(yaml|yml|json)$/i, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  const specDir = join(CLARA_ROOT, 'reports', repoName, safeName);

  // Create the reports directory if it doesn't exist
  await mkdir(specDir, { recursive: true });

  // Generate timestamp-based filename
  const timestamp = getTimestamp();
  const filename = `${timestamp}.md`;
  const filepath = join(specDir, filename);
  const latestPath = join(specDir, 'latest.md');

  // Generate markdown report
  const reporter = new MarkdownReporter({ includeDetails: true });
  const markdown = reporter.generate(report);

  // Write the timestamped report and latest.md
  await writeFile(filepath, markdown, 'utf-8');
  await writeFile(latestPath, markdown, 'utf-8');

  return filepath;
}

export function createScanCommand(): Command {
  const command = new Command('scan')
    .description('Scan a repository for OpenAPI specs and analyze them')
    .argument('<directory>', 'Path to repository or directory to scan')
    .option('-v, --verbose', 'Show detailed results for each spec')
    .option('-q, --quiet', 'Only output summary scores')
    .option('--json', 'Output results as JSON')
    .option('--include-node-modules', 'Include node_modules in scan (not recommended)')
    .option('-d, --max-depth <depth>', 'Maximum directory depth to scan', '10')
    .option('-p, --probe', 'Enable live probing (requires specs to have server URLs)')
    .option('-a, --auth <header>', 'Authorization header for probing')
    .option('--parallel-key <key>', 'Parallel AI API key for docs comparison')
    .option('--fail-under <score>', 'Exit with error if any spec scores below threshold', '0')
    .action(runScan);

  return command;
}

async function runScan(
  directory: string,
  options: {
    verbose?: boolean;
    quiet?: boolean;
    json?: boolean;
    includeNodeModules?: boolean;
    maxDepth?: string;
    probe?: boolean;
    auth?: string;
    parallelKey?: string;
    failUnder?: string;
  }
): Promise<void> {
  const resolvedDir = resolve(directory);
  const failThreshold = parseInt(options.failUnder || '0', 10);

  // Verify directory exists
  try {
    const stats = await stat(resolvedDir);
    if (!stats.isDirectory()) {
      console.error(chalk.red(`Error: ${directory} is not a directory`));
      process.exit(1);
    }
  } catch {
    console.error(chalk.red(`Error: Directory not found: ${directory}`));
    process.exit(1);
  }

  const spinner = ora({
    text: `Scanning ${chalk.cyan(directory)} for OpenAPI specs...`,
    color: 'cyan',
  });

  if (!options.quiet && !options.json) {
    spinner.start();
  }

  try {
    // Find all specs
    const specs = await findSpecs(resolvedDir, {
      includeNodeModules: options.includeNodeModules,
      maxDepth: parseInt(options.maxDepth || '10', 10),
    });

    if (specs.length === 0) {
      if (!options.quiet && !options.json) {
        spinner.warn('No OpenAPI specs found');
      }
      if (options.json) {
        console.log(JSON.stringify({ specs: [], summary: { total: 0 } }, null, 2));
      }
      process.exit(0);
    }

    if (!options.quiet && !options.json) {
      spinner.succeed(`Found ${chalk.green(specs.length)} OpenAPI spec(s)`);
      console.log('');
    }

    // Find documentation
    const docs = await findDocs(resolvedDir);

    // Analyze each spec
    const results: ScanResult[] = [];

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]!;  // Non-null assertion - we know i is in bounds
      const relativePath = relative(resolvedDir, spec.path);

      if (!options.quiet && !options.json) {
        spinner.start(`Analyzing ${chalk.cyan(relativePath)} (${i + 1}/${specs.length})...`);
      }

      try {
        const analyzeOptions: AnalyzeOptions = {
          probe: options.probe,
          auth: options.auth,
          parallelKey: options.parallelKey || process.env.PARALLEL_API_KEY,
        };

        const report = await analyze(spec.path, analyzeOptions);

        // Save markdown report to clara's reports directory
        const repoName = basename(resolvedDir);
        const specName = basename(spec.path);
        let reportPath: string | undefined;

        if (!options.json) {
          try {
            reportPath = await saveReport(report, repoName, specName);
          } catch {
            // Silent fail for report saving - don't break the scan
          }
        }

        results.push({
          spec,
          score: report.summary.overallScore,
          agentReady: report.summary.agentReady,
          priorityFixes: report.priorityFixes,
          pillars: report.pillars,
          summary: report.summary,
          report,
          reportPath,
        });

        if (!options.quiet && !options.json) {
          const scoreColor = report.summary.overallScore >= 70 ? chalk.green :
                            report.summary.overallScore >= 50 ? chalk.yellow :
                            chalk.red;
          const readyIcon = report.summary.agentReady ? chalk.green('✓') : chalk.red('✗');
          spinner.succeed(
            `${chalk.cyan(relativePath)}: ${scoreColor(report.summary.overallScore + '%')} ${readyIcon}`
          );

          // Show concise output - full details are in the report
          if (!report.summary.agentReady || options.verbose) {
            // Brief score context
            const scoreDesc = report.summary.overallScore >= 70 ? 'AI-ready' :
                             report.summary.overallScore >= 50 ? 'Partially ready' :
                             'Needs work';
            console.log(chalk.gray(`   ${scoreDesc} • ${report.summary.criticalFailures} critical issues • ${report.priorityFixes.length} total fixes needed`));

            // Show top fix only
            if (report.priorityFixes.length > 0) {
              const topFix = report.priorityFixes[0]!;
              const severityColor = topFix.severity === 'critical' ? chalk.red : chalk.yellow;
              console.log(chalk.gray(`   Top fix: `) + severityColor(`${topFix.checkName}`) + chalk.gray(` (${topFix.endpointsAffected} endpoints)`));
            }

            // Point to the full report
            if (reportPath) {
              const relReportPath = relative(process.cwd(), reportPath);
              console.log(chalk.gray(`   Report: `) + chalk.cyan(relReportPath));
            }
            console.log('');
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          spec,
          score: 0,
          agentReady: false,
          error: errorMessage,
        });

        if (!options.quiet && !options.json) {
          spinner.fail(`${chalk.cyan(relativePath)}: ${chalk.red('Error')} - ${errorMessage}`);
        }
      }
    }

    // Output results
    if (options.json) {
      const output = {
        directory: resolvedDir,
        specs: results.map(r => ({
          path: relative(resolvedDir, r.spec.path),
          title: r.spec.title,
          format: r.spec.format,
          version: r.spec.version,
          score: r.score,
          agentReady: r.agentReady,
          error: r.error,
        })),
        documentation: docs.map(d => relative(resolvedDir, d)),
        summary: {
          total: results.length,
          analyzed: results.filter(r => !r.error).length,
          errors: results.filter(r => r.error).length,
          agentReady: results.filter(r => r.agentReady).length,
          averageScore: Math.round(
            results.filter(r => !r.error).reduce((sum, r) => sum + r.score, 0) /
            Math.max(results.filter(r => !r.error).length, 1)
          ),
        },
      };
      console.log(JSON.stringify(output, null, 2));
    } else if (options.quiet) {
      // Just output scores
      for (const result of results) {
        const relativePath = relative(resolvedDir, result.spec.path);
        if (result.error) {
          console.log(`${relativePath}: ERROR`);
        } else {
          const icon = result.agentReady ? '✓' : '✗';
          console.log(`${relativePath}: ${icon} ${result.score}%`);
        }
      }
    } else {
      // Summary
      console.log('');
      console.log(chalk.bold('─'.repeat(50)));
      console.log(chalk.bold('Summary'));
      console.log(chalk.bold('─'.repeat(50)));

      const analyzed = results.filter(r => !r.error);
      const avgScore = analyzed.length > 0
        ? Math.round(analyzed.reduce((sum, r) => sum + r.score, 0) / analyzed.length)
        : 0;
      const readyCount = results.filter(r => r.agentReady).length;

      console.log(`  Specs found:     ${chalk.cyan(results.length)}`);
      console.log(`  Analyzed:        ${chalk.cyan(analyzed.length)}`);
      if (results.some(r => r.error)) {
        console.log(`  Errors:          ${chalk.red(results.filter(r => r.error).length)}`);
      }
      console.log(`  Agent-ready:     ${readyCount > 0 ? chalk.green(readyCount) : chalk.yellow(readyCount)}/${analyzed.length}`);
      console.log(`  Average score:   ${avgScore >= 70 ? chalk.green(avgScore + '%') : avgScore >= 50 ? chalk.yellow(avgScore + '%') : chalk.red(avgScore + '%')}`);

      // Show reports location
      const reportsWithPaths = analyzed.filter(r => r.reportPath);
      if (reportsWithPaths.length > 0) {
        const repoName = basename(resolvedDir);
        const reportsDir = relative(process.cwd(), join(CLARA_ROOT, 'reports', repoName));
        console.log('');
        console.log(chalk.bold('  📄 Reports saved to:'));
        console.log(chalk.cyan(`     ${reportsDir}/`));
        for (const result of reportsWithPaths) {
          const specName = basename(result.spec.path).replace(/\.(yaml|yml|json)$/i, '');
          const reportName = basename(result.reportPath!);
          console.log(chalk.gray(`       └─ ${specName}/`) + chalk.white(`${reportName}`) + chalk.gray(` (+ latest.md)`));
        }
        console.log(chalk.gray(`\n     Run again to track progress over time.`));
      }

      if (docs.length > 0) {
        console.log('');
        console.log(`  Documentation found:`);
        for (const doc of docs) {
          console.log(chalk.gray(`    - ${relative(resolvedDir, doc)}`));
        }
      }

      console.log('');
    }

    // Check fail threshold
    const belowThreshold = results.filter(r => !r.error && r.score < failThreshold);
    if (belowThreshold.length > 0) {
      if (!options.json) {
        console.error(chalk.red(`\n${belowThreshold.length} spec(s) scored below ${failThreshold}%`));
      }
      process.exit(1);
    }

    // Exit with error if any specs failed to analyze
    if (results.some(r => r.error)) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    if (!options.quiet && !options.json) {
      spinner.fail('Scan failed');
    }

    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }

    process.exit(2);
  }
}
