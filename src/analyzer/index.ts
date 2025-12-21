/**
 * Analyzer module - Entry point for API analysis
 */

import type { AnalysisReport, AnalyzeOptions, InputSource } from '../types/index.js';
import { parseSpec, detectInputType } from '../parser/index.js';
import { CheckEngine, type ParallelIntegration } from './engine.js';
import { checks } from './checks/index.js';
import { Prober, type ProberConfig, type AuthConfig } from '../prober/index.js';
import {
  ParallelClient,
  DocumentationFetcher,
  SpecDocsComparator,
} from '../parallel/index.js';

export interface AnalyzeCallbacks {
  onParseComplete?: () => void;
  onProbeProgress?: (completed: number, total: number) => void;
  onProbeComplete?: () => void;
  onParallelProgress?: (completed: number, total: number) => void;
  onParallelComplete?: () => void;
  onCheckProgress?: (completed: number, total: number) => void;
}

/**
 * Analyze an API for AI-readiness
 */
export async function analyze(
  input: string | InputSource,
  options?: AnalyzeOptions,
  callbacks?: AnalyzeCallbacks
): Promise<AnalysisReport> {
  // Determine input source
  const source: InputSource = typeof input === 'string' ? detectInputType(input) : input;

  // Parse the spec
  const parsed = await parseSpec(source);
  callbacks?.onParseComplete?.();

  // Create check engine with all checks
  const engine = new CheckEngine(checks);

  // Get source path for the report
  const sourcePath =
    source.type === 'file'
      ? source.path
      : source.type === 'url'
        ? source.url
        : source.type === 'postman-collection'
          ? `postman:${source.collectionId}`
          : `postman-workspace:${source.workspaceId}`;

  // Create prober if probing is enabled
  let prober: Prober | undefined;
  if (options?.probe && options?.baseUrl) {
    const proberConfig: ProberConfig = {
      baseUrl: options.baseUrl,
      sandbox: options.sandbox,
      auth: parseAuthOption(options.auth),
      timeout: 30000,
      retries: 2,
    };
    prober = new Prober(proberConfig);
  }

  // Create parallel integration if API key is provided
  let parallel: ParallelIntegration | undefined;
  if (options?.parallelKey) {
    const client = new ParallelClient({ apiKey: options.parallelKey });
    const fetcher = new DocumentationFetcher(client, {
      docsUrl: options.docsUrl,
    });
    const comparator = new SpecDocsComparator();
    parallel = { fetcher, comparator };
  }

  // Run analysis (async if probing or parallel)
  const report = await engine.analyzeAsync(
    parsed.normalized,
    sourcePath,
    options,
    prober,
    {
      onProbeProgress: callbacks?.onProbeProgress,
      onProbeComplete: callbacks?.onProbeComplete,
      onParallelProgress: callbacks?.onParallelProgress,
      onParallelComplete: callbacks?.onParallelComplete,
    },
    parallel
  );

  return report;
}

/**
 * Parse auth option string into AuthConfig
 * Formats:
 *   "bearer:<token>"
 *   "apiKey:<header>:<key>" or "apiKey:<key>" (uses X-API-Key header)
 *   "basic:<username>:<password>"
 */
function parseAuthOption(auth?: string): AuthConfig | undefined {
  if (!auth) return undefined;

  const parts = auth.split(':');
  const firstPart = parts[0];
  if (!firstPart) return undefined;

  const type = firstPart.toLowerCase();

  switch (type) {
    case 'bearer':
      return {
        type: 'bearer',
        token: parts.slice(1).join(':'),
      };

    case 'apikey':
      if (parts.length === 3) {
        return {
          type: 'apiKey',
          apiKeyHeader: parts[1],
          apiKey: parts[2],
        };
      }
      return {
        type: 'apiKey',
        apiKey: parts[1],
      };

    case 'basic':
      return {
        type: 'basic',
        username: parts[1],
        password: parts.slice(2).join(':'),
      };

    default:
      // Assume it's a raw header value like "Authorization: Bearer xxx"
      if (auth.toLowerCase().startsWith('authorization:')) {
        const value = auth.slice('authorization:'.length).trim();
        if (value.toLowerCase().startsWith('bearer ')) {
          return {
            type: 'bearer',
            token: value.slice('bearer '.length),
          };
        }
      }
      return undefined;
  }
}

export { CheckEngine } from './engine.js';
export { calculateScore, calculatePillarScores } from './scoring.js';
