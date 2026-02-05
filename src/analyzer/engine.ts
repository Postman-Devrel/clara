/**
 * Check Engine - Executes checks against normalized API specs
 */

import type {
  Check,
  CheckContext,
  CheckResult,
  NormalizedAPI,
  NormalizedEndpoint,
  AnalyzeOptions,
  AnalysisReport,
  EndpointReport,
  LiveResponse,
  MalformationTestResult,
  ParallelDocs,
} from '../types/index.js';
import {
  calculatePillarScores,
  generateSummary,
  calculatePriorityFixes,
  calculateEndpointScore,
  determineEndpointStatus,
} from './scoring.js';
import type { Prober } from '../prober/index.js';
import type { DocumentationFetcher, SpecDocsComparator } from '../parallel/index.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLARA_VERSION = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
).version;

export interface AnalyzeCallbacks {
  onProbeProgress?: (completed: number, total: number) => void;
  onProbeComplete?: () => void;
  onParallelProgress?: (completed: number, total: number) => void;
  onParallelComplete?: () => void;
}

export interface ParallelIntegration {
  fetcher: DocumentationFetcher;
  comparator: SpecDocsComparator;
}

export class CheckEngine {
  private checks: Check[];

  constructor(checks: Check[]) {
    this.checks = checks;
  }

  /**
   * Run all checks against an API (sync version without probing)
   */
  analyze(api: NormalizedAPI, sourcePath: string, options?: AnalyzeOptions): AnalysisReport {
    const allResults: CheckResult[] = [];
    const endpointReports: EndpointReport[] = [];

    // Run API-level checks (context without specific endpoint)
    const apiContext: CheckContext = { api, options };
    const apiLevelResults = this.runChecksForContext(apiContext);
    allResults.push(...apiLevelResults);

    // Run endpoint-level checks
    for (const endpoint of api.endpoints) {
      const endpointContext: CheckContext = { api, endpoint, options };
      const endpointResults = this.runChecksForContext(endpointContext);
      allResults.push(...endpointResults);

      // Create endpoint report
      endpointReports.push({
        path: endpoint.path,
        method: endpoint.method,
        operationId: endpoint.operationId,
        score: calculateEndpointScore(endpointResults),
        status: determineEndpointStatus(endpointResults),
        checks: endpointResults,
      });
    }

    // Calculate summary and pillar scores
    const summary = generateSummary(allResults, api.endpoints.length);
    const pillarScores = calculatePillarScores(allResults, this.checks);
    const priorityFixes = calculatePriorityFixes(allResults, this.checks);

    return {
      claraVersion: CLARA_VERSION,
      generatedAt: new Date().toISOString(),
      api: {
        name: api.info.title,
        version: api.info.version,
        source: 'openapi',
        sourcePath,
      },
      summary,
      pillars: pillarScores,
      priorityFixes,
      endpoints: endpointReports,
    };
  }

  /**
   * Run all checks against an API with optional live probing and parallel docs
   */
  async analyzeAsync(
    api: NormalizedAPI,
    sourcePath: string,
    options?: AnalyzeOptions,
    prober?: Prober,
    callbacks?: AnalyzeCallbacks,
    parallel?: ParallelIntegration
  ): Promise<AnalysisReport> {
    const allResults: CheckResult[] = [];
    const endpointReports: EndpointReport[] = [];

    // Collect live responses and malformation results if probing
    const liveResponses = new Map<string, LiveResponse>();
    const malformationResults = new Map<string, MalformationTestResult[]>();
    const parallelDocsMap = new Map<string, ParallelDocs>();

    // Fetch documentation using Parallel AI if configured
    if (parallel && options?.parallelKey) {
      try {
        const docsResults = await parallel.fetcher.fetchForAllEndpoints(
          api,
          (completed, total) => callbacks?.onParallelProgress?.(completed, total)
        );

        // Compare spec to docs for each endpoint
        for (const endpoint of api.endpoints) {
          const key = `${endpoint.method} ${endpoint.path}`;
          const endpointDocs = docsResults.get(key);

          if (endpointDocs) {
            const comparison = parallel.comparator.compare(endpoint, endpointDocs, api);

            parallelDocsMap.set(key, {
              found: endpointDocs.found,
              content: endpointDocs.content,
              url: endpointDocs.url,
              title: endpointDocs.title,
              excerpts: endpointDocs.excerpts,
              confidence: endpointDocs.confidence,
              comparison: {
                match: comparison.match,
                confidence: comparison.confidence,
                discrepancies: comparison.discrepancies,
              },
            });
          }
        }

        callbacks?.onParallelComplete?.();
      } catch (error) {
        // Log error but continue analysis without parallel docs
        // DOC_004 will be skipped due to missing parallelDocs
        if (options?.verbose) {
          console.warn(
            `Parallel AI unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    if (prober && options?.probe) {
      let completed = 0;
      const total = api.endpoints.length;

      for (const endpoint of api.endpoints) {
        const key = `${endpoint.method} ${endpoint.path}`;

        // Only probe safe methods (GET, HEAD, OPTIONS) unless sandbox mode
        if (this.shouldProbe(endpoint, options)) {
          const liveResponse = await prober.getLiveResponse(endpoint, api);
          if (liveResponse) {
            liveResponses.set(key, liveResponse);
          }
        }

        // Run malformation tests for endpoints with request bodies or security
        // Only in sandbox mode or for POST/PUT/PATCH endpoints
        if (this.shouldTestMalformations(endpoint, options)) {
          const results = await prober.runMalformationTests(endpoint, api);
          if (results.length > 0) {
            malformationResults.set(key, results);
          }
        }

        completed++;
        callbacks?.onProbeProgress?.(completed, total);
      }

      callbacks?.onProbeComplete?.();
    }

    // Run API-level checks (context without specific endpoint)
    const apiContext: CheckContext = { api, options };
    const apiLevelResults = this.runChecksForContext(apiContext);
    allResults.push(...apiLevelResults);

    // Run endpoint-level checks
    for (const endpoint of api.endpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      const liveResponse = liveResponses.get(key);
      const endpointMalformations = malformationResults.get(key);
      const parallelDocs = parallelDocsMap.get(key);

      const endpointContext: CheckContext = {
        api,
        endpoint,
        options,
        liveResponse,
        malformationResults: endpointMalformations,
        parallelDocs,
      };

      const endpointResults = this.runChecksForContext(endpointContext);
      allResults.push(...endpointResults);

      // Create endpoint report
      endpointReports.push({
        path: endpoint.path,
        method: endpoint.method,
        operationId: endpoint.operationId,
        score: calculateEndpointScore(endpointResults),
        status: determineEndpointStatus(endpointResults),
        checks: endpointResults,
      });
    }

    // Calculate summary and pillar scores
    const summary = generateSummary(allResults, api.endpoints.length);
    const pillarScores = calculatePillarScores(allResults, this.checks);
    const priorityFixes = calculatePriorityFixes(allResults, this.checks);

    return {
      claraVersion: CLARA_VERSION,
      generatedAt: new Date().toISOString(),
      api: {
        name: api.info.title,
        version: api.info.version,
        source: 'openapi',
        sourcePath,
      },
      summary,
      pillars: pillarScores,
      priorityFixes,
      endpoints: endpointReports,
    };
  }

  /**
   * Determine if an endpoint should be probed
   */
  private shouldProbe(endpoint: NormalizedEndpoint, options?: AnalyzeOptions): boolean {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    // In sandbox mode, probe all methods
    if (options?.sandbox) {
      return true;
    }

    // Otherwise only probe safe methods
    return safeMethods.includes(endpoint.method);
  }

  /**
   * Determine if malformation tests should run for an endpoint
   */
  private shouldTestMalformations(
    endpoint: NormalizedEndpoint,
    options?: AnalyzeOptions
  ): boolean {
    // Must be in probe mode
    if (!options?.probe) {
      return false;
    }

    // Only test in sandbox mode for safety
    if (!options?.sandbox) {
      return false;
    }

    // Test endpoints with request bodies
    if (endpoint.requestBody) {
      return true;
    }

    // Test endpoints with security requirements (for missing-auth tests)
    if (endpoint.security && endpoint.security.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Run applicable checks for a given context
   */
  private runChecksForContext(context: CheckContext): CheckResult[] {
    const results: CheckResult[] = [];

    for (const check of this.checks) {
      // Skip checks that require features not enabled
      if (check.requires?.liveProbing && !context.options?.probe) {
        continue;
      }
      if (check.requires?.parallelAi && !context.options?.parallelKey) {
        continue;
      }

      // Determine if this check should run for this context
      const isEndpointCheck = this.isEndpointLevelCheck(check);
      const hasEndpoint = context.endpoint !== undefined;

      // Skip endpoint-level checks if no endpoint in context
      if (isEndpointCheck && !hasEndpoint) {
        continue;
      }

      // Skip API-level checks if we have an endpoint in context
      if (!isEndpointCheck && hasEndpoint) {
        continue;
      }

      try {
        const result = check.check(context);

        // Add path and method info for endpoint-level checks
        if (context.endpoint) {
          result.path = context.endpoint.path;
          result.method = context.endpoint.method;
        }

        results.push(result);
      } catch (error) {
        // Log error but don't fail entire analysis
        results.push({
          id: check.id,
          status: 'skipped',
          severity: check.severity,
          message: `Check failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: context.endpoint?.path,
          method: context.endpoint?.method,
        });
      }
    }

    return results;
  }

  /**
   * Determine if a check is endpoint-level or API-level
   */
  private isEndpointLevelCheck(check: Check): boolean {
    // Most checks are endpoint-level
    // API-level checks typically look at overall API structure
    const apiLevelChecks = [
      'DISC_001', // spec publicly accessible
      'DISC_002', // server URL in spec
      'DISC_003', // contact info
      'DISC_004', // license
      'DOC_001',  // authentication documented
      'DOC_002',  // rate limits documented
      'DOC_003',  // versioning documented
    ];

    return !apiLevelChecks.includes(check.id);
  }

  /**
   * Get all registered checks
   */
  getChecks(): Check[] {
    return [...this.checks];
  }

  /**
   * Add a check
   */
  addCheck(check: Check): void {
    this.checks.push(check);
  }

  /**
   * Remove a check by ID
   */
  removeCheck(checkId: string): boolean {
    const index = this.checks.findIndex((c) => c.id === checkId);
    if (index !== -1) {
      this.checks.splice(index, 1);
      return true;
    }
    return false;
  }
}
