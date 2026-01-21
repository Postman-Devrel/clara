/**
 * Scan Command - Discover and analyze all specs in a repository
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { resolve, relative } from 'path';
import { stat } from 'fs/promises';
import { findSpecs, findDocs, type DiscoveredSpec } from '../../discovery/index.js';
import { analyze } from '../../analyzer/index.js';
import type { AnalyzeOptions } from '../../types/index.js';

interface ScanResult {
  spec: DiscoveredSpec;
  score: number;
  agentReady: boolean;
  error?: string;
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

        results.push({
          spec,
          score: report.summary.overallScore,
          agentReady: report.summary.agentReady,
        });

        if (!options.quiet && !options.json) {
          const scoreColor = report.summary.overallScore >= 70 ? chalk.green :
                            report.summary.overallScore >= 50 ? chalk.yellow :
                            chalk.red;
          const readyIcon = report.summary.agentReady ? chalk.green('✓') : chalk.red('✗');
          spinner.succeed(
            `${chalk.cyan(relativePath)}: ${scoreColor(report.summary.overallScore + '%')} ${readyIcon}`
          );

          if (options.verbose) {
            // Show pillar breakdown
            console.log(chalk.gray('  Pillars:'));
            for (const pillar of report.pillars) {
              const pillarColor = pillar.score >= 70 ? chalk.green :
                                  pillar.score >= 50 ? chalk.yellow :
                                  chalk.red;
              console.log(chalk.gray(`    ${pillar.name}: ${pillarColor(pillar.score + '%')}`));
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
