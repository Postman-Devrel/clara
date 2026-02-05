/**
 * Clara - AI Agent API Readiness Analyzer
 *
 * "Clara, be my eyes" - The Doctor
 *
 * Analyzes REST APIs to ensure AI agents can:
 * 1. Discover what the API does
 * 2. Understand how to use it correctly
 * 3. Self-heal from errors without human intervention
 */

// Types
export * from './types/index.js';

// Errors
export * from './errors.js';

// Parser
export { parseSpec, parseFile, parseUrl } from './parser/index.js';

// Analyzer
export { analyze } from './analyzer/index.js';
export { CheckEngine } from './analyzer/engine.js';
export { calculateScore, calculatePillarScores } from './analyzer/scoring.js';

// Checks
export { checks, getCheckById, getChecksByPillar } from './analyzer/checks/index.js';

// Reporter
export { ConsoleReporter } from './reporter/console.js';

// Remediation
export { generateRemediationPlan, renderRemediationMarkdown } from './remediate/index.js';
