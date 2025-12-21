/**
 * Docs Command - Generate AI-ready documentation from OpenAPI specs
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { parseSpec, detectInputType } from '../../parser/index.js';
import { DocsGenerator } from '../../docs/index.js';
import type { InputSource } from '../../types/index.js';

export function createDocsCommand(): Command {
  const command = new Command('docs')
    .description('Generate AI-ready documentation from an OpenAPI spec')
    .argument('<spec>', 'Path to OpenAPI spec file or URL')
    .option('-o, --output <path>', 'Output file or directory', './docs')
    .option('--single-file', 'Generate a single combined markdown file')
    .option('--no-examples', 'Skip generating examples')
    .option('--no-errors', 'Skip generating error handling guide')
    .option('-v, --verbose', 'Verbose output')
    .action(runDocs);

  return command;
}

async function runDocs(
  spec: string,
  options: {
    output: string;
    singleFile?: boolean;
    examples?: boolean;
    errors?: boolean;
    verbose?: boolean;
  }
): Promise<void> {
  const spinner = ora({
    text: 'Loading OpenAPI spec...',
    color: 'cyan',
  }).start();

  try {
    // Parse the spec
    const source: InputSource = detectInputType(spec);
    const parsed = await parseSpec(source);
    spinner.text = 'Generating documentation...';

    // Create generator
    const generator = new DocsGenerator({
      includeExamples: options.examples !== false,
      includeErrorHandling: options.errors !== false,
      groupByTag: true,
    });

    // Generate docs
    const docs = generator.generate(parsed.normalized);

    // Determine output mode
    if (options.singleFile || options.output.endsWith('.md')) {
      // Single file output
      const outputPath = options.output.endsWith('.md')
        ? options.output
        : join(options.output, 'api-docs.md');

      ensureDirectoryExists(dirname(outputPath));
      writeFileSync(outputPath, docs.allInOne ?? '');
      spinner.succeed('Documentation generated');
      console.log(chalk.green(`✓ Saved to ${outputPath}`));
    } else {
      // Multiple files output
      const outputDir = options.output;
      ensureDirectoryExists(outputDir);

      // Write overview
      writeFileSync(join(outputDir, 'README.md'), docs.overview);
      if (options.verbose) {
        console.log(chalk.gray(`  Created: ${join(outputDir, 'README.md')}`));
      }

      // Write authentication
      writeFileSync(join(outputDir, 'authentication.md'), docs.authentication);
      if (options.verbose) {
        console.log(chalk.gray(`  Created: ${join(outputDir, 'authentication.md')}`));
      }

      // Write quickstart
      writeFileSync(join(outputDir, 'quickstart.md'), docs.quickstart);
      if (options.verbose) {
        console.log(chalk.gray(`  Created: ${join(outputDir, 'quickstart.md')}`));
      }

      // Write error handling guide
      if (options.errors !== false) {
        writeFileSync(join(outputDir, 'errors.md'), docs.errors);
        if (options.verbose) {
          console.log(chalk.gray(`  Created: ${join(outputDir, 'errors.md')}`));
        }
      }

      // Write endpoint files
      const endpointsDir = join(outputDir, 'endpoints');
      ensureDirectoryExists(endpointsDir);

      for (const [name, content] of docs.endpoints) {
        const filename = `${name}.md`;
        writeFileSync(join(endpointsDir, filename), content);
        if (options.verbose) {
          console.log(chalk.gray(`  Created: ${join(endpointsDir, filename)}`));
        }
      }

      spinner.succeed('Documentation generated');
      console.log(chalk.green(`✓ Saved to ${outputDir}/`));
      console.log('');
      console.log('Generated files:');
      console.log(`  ${chalk.cyan('README.md')} - API overview`);
      console.log(`  ${chalk.cyan('authentication.md')} - Authentication guide`);
      console.log(`  ${chalk.cyan('quickstart.md')} - Getting started`);
      if (options.errors !== false) {
        console.log(`  ${chalk.cyan('errors.md')} - Error handling`);
      }
      console.log(`  ${chalk.cyan('endpoints/')} - Endpoint documentation by resource`);
    }
  } catch (error) {
    spinner.fail('Documentation generation failed');

    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (options.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }

    process.exit(1);
  }
}

function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
