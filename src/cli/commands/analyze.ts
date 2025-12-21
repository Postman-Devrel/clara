/**
 * Analyze Command - Core Clara analysis functionality
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { analyze, type AnalyzeCallbacks } from '../../analyzer/index.js';
import { ConsoleReporter } from '../../reporter/console.js';
import type { AnalyzeOptions } from '../../types/index.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze')
    .description('Analyze an OpenAPI spec for AI-readiness')
    .argument('<spec>', 'Path to OpenAPI spec file or URL')
    .option('-p, --probe', 'Enable live probing (requires --base-url)')
    .option('-s, --sandbox', 'Mark as sandbox environment (allows write operation probing)')
    .option('-b, --base-url <url>', 'Base URL for live probing')
    .option('-m, --mock-url <url>', 'Mock server URL for write operations')
    .option('-a, --auth <header>', 'Authorization header (e.g., "Authorization: Bearer token")')
    .option('-d, --docs-url <url>', 'Documentation URL for comparison')
    .option('--parallel-key <key>', 'Parallel AI API key (or use PARALLEL_API_KEY env)')
    .option('--postman-key <key>', 'Postman API key (or use POSTMAN_API_KEY env)')
    .option('-w, --workspace-id <id>', 'Postman workspace ID to publish results')
    .option('-o, --output <file>', 'Output file (can be repeated for multiple formats)', collect, [])
    .option('-v, --verbose', 'Verbose output with endpoint details')
    .option('-q, --quiet', 'Quiet mode - only output score')
    .option('--json', 'Output raw JSON to stdout')
    .action(runAnalyze);

  return command;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function runAnalyze(
  spec: string,
  options: {
    probe?: boolean;
    sandbox?: boolean;
    baseUrl?: string;
    mockUrl?: string;
    auth?: string;
    docsUrl?: string;
    parallelKey?: string;
    postmanKey?: string;
    workspaceId?: string;
    output?: string[];
    verbose?: boolean;
    quiet?: boolean;
    json?: boolean;
  }
): Promise<void> {
  // Validate options
  if (options.probe && !options.baseUrl) {
    console.error(chalk.red('Error: --probe requires --base-url'));
    process.exit(1);
  }

  // Get API keys from environment if not provided
  const parallelKey = options.parallelKey || process.env.PARALLEL_API_KEY;
  const postmanKey = options.postmanKey || process.env.POSTMAN_API_KEY;

  const analyzeOptions: AnalyzeOptions = {
    probe: options.probe,
    sandbox: options.sandbox,
    baseUrl: options.baseUrl,
    mockUrl: options.mockUrl,
    auth: options.auth,
    docsUrl: options.docsUrl,
    parallelKey,
    postmanKey,
    workspaceId: options.workspaceId,
    output: options.output,
    verbose: options.verbose,
  };

  // Start analysis with spinner
  const spinner = ora({
    text: 'Loading OpenAPI spec...',
    color: 'cyan',
  });

  if (!options.quiet && !options.json) {
    spinner.start();
  }

  try {
    // Create callbacks for progress updates
    const callbacks: AnalyzeCallbacks = {};

    if (!options.quiet && !options.json) {
      callbacks.onParseComplete = () => {
        spinner.text = 'Spec parsed successfully';
      };

      // Parallel AI progress
      if (parallelKey) {
        callbacks.onParallelProgress = (completed, total) => {
          spinner.text = `Fetching documentation... ${completed}/${total}`;
        };

        callbacks.onParallelComplete = () => {
          spinner.text = 'Documentation comparison complete';
        };
      }

      // Live probing progress
      if (options.probe) {
        callbacks.onProbeProgress = (completed, total) => {
          spinner.text = `Probing endpoints... ${completed}/${total}`;
        };

        callbacks.onProbeComplete = () => {
          spinner.text = 'Probing complete, running checks...';
        };
      }
    }

    // Run analysis
    const report = await analyze(spec, analyzeOptions, callbacks);

    // Stop spinner
    if (!options.quiet && !options.json) {
      const probeMsg = options.probe ? ' (with live probing)' : '';
      spinner.succeed(`Analysis complete${probeMsg}`);
    }

    // Handle JSON output mode
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // Handle quiet mode
    if (options.quiet) {
      const emoji = report.summary.agentReady ? '✓' : '✗';
      console.log(`${emoji} ${report.summary.overallScore}%`);
      process.exit(report.summary.agentReady ? 0 : 1);
      return;
    }

    // Print console report
    const reporter = new ConsoleReporter({ verbose: options.verbose });
    reporter.print(report);

    // Handle file outputs
    if (options.output && options.output.length > 0) {
      for (const outputPath of options.output) {
        const extension = outputPath.split('.').pop()?.toLowerCase();

        if (extension === 'json') {
          writeFileSync(outputPath, JSON.stringify(report, null, 2));
          console.log(chalk.green(`✓ JSON report saved to ${outputPath}`));
        } else if (extension === 'csv') {
          // CSV output (basic for MVP)
          const csv = generateCsv(report);
          writeFileSync(outputPath, csv);
          console.log(chalk.green(`✓ CSV report saved to ${outputPath}`));
        } else if (extension === 'md') {
          // Markdown output (basic for MVP)
          const md = generateMarkdown(report);
          writeFileSync(outputPath, md);
          console.log(chalk.green(`✓ Markdown report saved to ${outputPath}`));
        } else {
          console.warn(chalk.yellow(`Warning: Unknown output format for ${outputPath}`));
        }
      }
    }

    // Exit with appropriate code
    process.exit(report.summary.agentReady ? 0 : 1);
  } catch (error) {
    if (!options.quiet && !options.json) {
      spinner.fail('Analysis failed');
    }

    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (options.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }

    process.exit(2);
  }
}

/**
 * Generate basic CSV output
 */
function generateCsv(report: ReturnType<typeof analyze> extends Promise<infer T> ? T : never): string {
  const headers = ['endpoint', 'method', 'operation_id', 'score', 'status', 'check_id', 'check_status', 'severity', 'message'];
  const rows: string[][] = [headers];

  for (const endpoint of report.endpoints) {
    for (const check of endpoint.checks) {
      rows.push([
        endpoint.path,
        endpoint.method,
        endpoint.operationId || '',
        endpoint.score.toString(),
        endpoint.status,
        check.id,
        check.status,
        check.severity,
        `"${check.message.replace(/"/g, '""')}"`,
      ]);
    }
  }

  return rows.map((row) => row.join(',')).join('\n');
}

/**
 * Generate basic Markdown output
 */
function generateMarkdown(report: ReturnType<typeof analyze> extends Promise<infer T> ? T : never): string {
  const lines: string[] = [];

  lines.push(`# Clara Analysis Report`);
  lines.push('');
  lines.push(`**API:** ${report.api.name} v${report.api.version}`);
  lines.push(`**Source:** ${report.api.sourcePath}`);
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push('');

  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Overall Score:** ${report.summary.overallScore}%`);
  lines.push(`- **AI Agent Ready:** ${report.summary.agentReady ? 'Yes ✓' : 'No ✗'}`);
  lines.push(`- **Total Endpoints:** ${report.summary.totalEndpoints}`);
  lines.push(`- **Passed:** ${report.summary.passed}`);
  lines.push(`- **Failed:** ${report.summary.failed}`);
  lines.push(`- **Warnings:** ${report.summary.warnings}`);
  lines.push('');

  lines.push(`## Pillar Scores`);
  lines.push('');
  lines.push('| Pillar | Score | Checks |');
  lines.push('|--------|-------|--------|');
  for (const pillar of report.pillars) {
    lines.push(`| ${pillar.name} | ${pillar.score}% | ${pillar.checksPassed}/${pillar.checksPassed + pillar.checksFailed} |`);
  }
  lines.push('');

  if (report.priorityFixes.length > 0) {
    lines.push(`## Priority Fixes`);
    lines.push('');
    for (const fix of report.priorityFixes.slice(0, 10)) {
      lines.push(`### #${fix.rank} ${fix.checkName} [${fix.severity.toUpperCase()}]`);
      lines.push('');
      lines.push(`- **Check ID:** ${fix.checkId}`);
      lines.push(`- **Endpoints Affected:** ${fix.endpointsAffected}`);
      lines.push(`- **Impact:** ${fix.summary}`);
      if (fix.fix?.example) {
        lines.push('');
        lines.push('```');
        lines.push(fix.fix.example);
        lines.push('```');
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(`*Generated by Clara v${report.claraVersion}*`);

  return lines.join('\n');
}
