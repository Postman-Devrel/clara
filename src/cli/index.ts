#!/usr/bin/env node

/**
 * Clara CLI - AI Agent API Readiness Analyzer
 *
 * "Clara, be my eyes" - The Doctor
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createDocsCommand } from './commands/docs.js';
import { createScanCommand } from './commands/scan.js';
import { createSetupCommand } from './commands/setup.js';
import { createRemediateCommand } from './commands/remediate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VERSION = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
).version;

const program = new Command();

program
  .name('clara')
  .description(
    `${chalk.cyan('Clara')} - AI Agent API Readiness Analyzer

${chalk.italic('"Clara, be my eyes"')}

Analyzes REST APIs to ensure AI agents can:
  • ${chalk.green('Discover')} what the API does
  • ${chalk.green('Understand')} how to use it correctly
  • ${chalk.green('Self-heal')} from errors without human intervention

Commands:
  ${chalk.cyan('clara analyze <spec>')} Analyze a single spec file
  ${chalk.cyan('clara scan <dir>')}     Scan a repo for all OpenAPI specs
  ${chalk.cyan('clara docs <spec>')}    Generate AI-ready documentation
  ${chalk.cyan('clara setup')}          Install /clara slash command for Claude Code
  ${chalk.cyan('clara remediate <spec>')} Generate Agent Mode remediation plan`
  )
  .version(VERSION, '-V, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for command');

// Add commands
program.addCommand(createAnalyzeCommand());
program.addCommand(createDocsCommand());
program.addCommand(createScanCommand());
program.addCommand(createSetupCommand());
program.addCommand(createRemediateCommand());

// Default action (when no command is specified)
program.action(() => {
  program.help();
});

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof Error && 'code' in error) {
    const exitCode = (error as { code: string }).code;
    if (
      exitCode === 'commander.help' ||
      exitCode === 'commander.helpDisplayed' ||
      exitCode === 'commander.version'
    ) {
      process.exit(0);
    }
  }
  // Don't print error for commander exits, it handles its own output
  if (error instanceof Error && !error.message.includes('commander')) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
  process.exit(1);
}
