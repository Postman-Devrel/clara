/**
 * Remediate Command - Generate Agent Mode remediation plan
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { analyze } from '../../analyzer/index.js';
import { renderRemediationMarkdown } from '../../remediate/index.js';
import type { AnalyzeOptions } from '../../types/index.js';

export function createRemediateCommand(): Command {
  const command = new Command('remediate')
    .description(
      'Generate a remediation plan with Postman Agent Mode prompts'
    )
    .argument('<spec>', 'Path to OpenAPI spec file or URL')
    .option(
      '-o, --output <file>',
      'Save remediation plan to file (default: stdout)'
    )
    .option('-p, --probe', 'Enable live probing (requires --base-url)')
    .option('-b, --base-url <url>', 'Base URL for live probing')
    .option('-s, --sandbox', 'Mark as sandbox environment')
    .option(
      '-a, --auth <header>',
      'Authorization header (e.g., "Authorization: Bearer token")'
    )
    .option(
      '-d, --docs-url <url>',
      'Documentation URL for comparison'
    )
    .option(
      '--parallel-key <key>',
      'Parallel AI API key (or use PARALLEL_API_KEY env)'
    )
    .option('--json', 'Output raw JSON remediation plan')
    .action(runRemediate);

  return command;
}

async function runRemediate(
  spec: string,
  options: {
    output?: string;
    probe?: boolean;
    baseUrl?: string;
    sandbox?: boolean;
    auth?: string;
    docsUrl?: string;
    parallelKey?: string;
    json?: boolean;
  }
): Promise<void> {
  if (options.probe && !options.baseUrl) {
    console.error(chalk.red('Error: --probe requires --base-url'));
    process.exit(1);
  }

  const parallelKey =
    options.parallelKey || process.env.PARALLEL_API_KEY;

  const analyzeOptions: AnalyzeOptions = {
    probe: options.probe,
    sandbox: options.sandbox,
    baseUrl: options.baseUrl,
    auth: options.auth,
    docsUrl: options.docsUrl,
    parallelKey,
  };

  const spinner = ora({
    text: 'Analyzing API...',
    color: 'cyan',
  });

  if (!options.json) {
    spinner.start();
  }

  try {
    const report = await analyze(spec, analyzeOptions);

    if (!options.json) {
      spinner.text = 'Generating remediation plan...';
    }

    if (options.json) {
      const { generateRemediationPlan } = await import(
        '../../remediate/index.js'
      );
      const plan = generateRemediationPlan(report);
      const output = JSON.stringify(plan, null, 2);

      if (options.output) {
        writeFileSync(options.output, output);
        console.log(
          chalk.green(`Remediation plan saved to ${options.output}`)
        );
      } else {
        console.log(output);
      }
      return;
    }

    const markdown = renderRemediationMarkdown(report);

    spinner.succeed('Remediation plan generated');
    console.log('');

    if (options.output) {
      writeFileSync(options.output, markdown);
      console.log(
        chalk.green(`Remediation plan saved to ${options.output}`)
      );
      console.log(
        chalk.gray(
          'Open this file and copy the Agent Mode prompts into Postman.'
        )
      );
    } else {
      console.log(markdown);
    }

    process.exit(report.summary.agentReady ? 0 : 1);
  } catch (error) {
    if (!options.json) {
      spinner.fail('Failed to generate remediation plan');
    }

    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }

    process.exit(2);
  }
}
