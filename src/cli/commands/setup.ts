/**
 * Setup Command - Install Clara slash command for Claude Code
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { mkdir, writeFile, access } from 'fs/promises';
import { homedir } from 'os';

const SLASH_COMMAND_CONTENT = `---
name: clara
description: |
  Analyze APIs for AI agent readiness. Use when asked to:
  - Check if an API is ready for AI agents
  - Analyze an OpenAPI spec for agent compatibility
  - Grade an API on the 8 pillars of agent-readiness
  - Find issues that would prevent AI agents from using an API
---

# Clara - AI Agent API Readiness Analyzer

"Clara, be my eyes"

You are invoking Clara to analyze APIs for AI agent readiness. Clara checks 8 pillars:

1. **Metadata** - operationIds, summaries, descriptions
2. **Errors** - Structured error responses with codes
3. **Introspection** - Parameter types, required fields, enums
4. **Naming** - Consistent casing, RESTful conventions
5. **Predictability** - Response schemas, idempotency
6. **Documentation** - Auth docs, external references
7. **Performance** - Response times, rate limits
8. **Discoverability** - Server URLs, API info

## Scoring

- **70%+ with no critical failures** = AI Agent Ready
- Critical failures (missing operationIds, no error schemas) block readiness regardless of score

## Usage

Analyze a local OpenAPI spec:
\`\`\`bash
npx @postman/clara analyze ./openapi.yaml
\`\`\`

Analyze from URL:
\`\`\`bash
npx @postman/clara analyze https://api.example.com/openapi.json
\`\`\`

Verbose output with endpoint details:
\`\`\`bash
npx @postman/clara analyze ./openapi.yaml --verbose
\`\`\`

Scan entire repo for specs:
\`\`\`bash
npx @postman/clara scan .
\`\`\`

Generate AI-ready documentation:
\`\`\`bash
npx @postman/clara docs ./openapi.yaml -o ./docs
\`\`\`

## When the user asks about agent-readiness

1. Identify the OpenAPI spec (file path or URL)
2. Run \`npx @postman/clara analyze <spec>\`
3. Interpret the results:
   - Show the overall score and agent-ready status
   - Highlight critical failures first
   - List top priority fixes with their impact
4. If they want to fix issues, explain what each check requires

## Common Issues and Fixes

| Issue | Fix |
|-------|-----|
| Missing operationId | Add unique operationId to each operation |
| No error schema | Define error response schema with code/message |
| Missing parameter types | Add type to all parameters |
| No 4xx responses | Document 400, 401, 403, 404 responses |
| Missing response schema | Define schema for all responses |
`;

export function createSetupCommand(): Command {
  const command = new Command('setup')
    .description('Install Clara slash command for Claude Code')
    .option('-g, --global', 'Install globally (~/.claude/commands/) instead of project-local')
    .option('-f, --force', 'Overwrite existing slash command')
    .action(runSetup);

  return command;
}

async function runSetup(options: {
  global?: boolean;
  force?: boolean;
}): Promise<void> {
  const targetDir = options.global
    ? join(homedir(), '.claude', 'commands')
    : join(process.cwd(), '.claude', 'commands');

  const targetFile = join(targetDir, 'clara.md');
  const location = options.global ? 'global' : 'project';

  console.log('');
  console.log(chalk.cyan('Clara') + ' - Setting up Claude Code integration');
  console.log('');

  // Check if file already exists
  try {
    await access(targetFile);
    if (!options.force) {
      console.log(chalk.yellow('⚠️  Slash command already exists at:'));
      console.log(chalk.gray(`   ${targetFile}`));
      console.log('');
      console.log(chalk.gray('   Use --force to overwrite'));
      process.exit(0);
    }
  } catch {
    // File doesn't exist, continue
  }

  try {
    // Create directory if it doesn't exist
    await mkdir(targetDir, { recursive: true });

    // Write the slash command file
    await writeFile(targetFile, SLASH_COMMAND_CONTENT, 'utf-8');

    console.log(chalk.green('✓') + ` Installed ${location} slash command`);
    console.log('');
    console.log(chalk.gray('  Location:'));
    console.log(chalk.cyan(`  ${targetFile}`));
    console.log('');
    console.log(chalk.bold('  Usage:'));
    console.log(chalk.gray('  In Claude Code, type:'));
    console.log(chalk.cyan('    /clara'));
    console.log(chalk.gray('  Then ask about your API, e.g.:'));
    console.log(chalk.white('    "Is my API ready for AI agents?"'));
    console.log(chalk.white('    "Analyze ./openapi.yaml for agent-readiness"'));
    console.log('');

    if (!options.global) {
      console.log(chalk.gray('  💡 Tip: Use --global to install for all projects'));
    }

  } catch (error) {
    console.error(chalk.red('✗ Failed to install slash command'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}
