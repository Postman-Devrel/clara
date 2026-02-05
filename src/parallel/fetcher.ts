/**
 * Documentation Fetcher for Clara
 *
 * Fetches API documentation for endpoints using Parallel AI Search API.
 * Caches results to avoid duplicate searches.
 */

import type { NormalizedEndpoint, NormalizedAPI } from '../types/index.js';
import type { ParallelClient } from './client.js';
import type {
  EndpointDocumentation,
  FetcherConfig,
  ParallelSearchResult,
} from './types.js';

const DEFAULT_MAX_RESULTS = 3;
const DEFAULT_MAX_CHARS = 5000;

interface RequiredConfig {
  docsUrl?: string;
  maxResultsPerEndpoint: number;
  maxCharsPerResult: number;
}

export class DocumentationFetcher {
  private client: ParallelClient;
  private config: RequiredConfig;
  private cache: Map<string, EndpointDocumentation> = new Map();

  constructor(client: ParallelClient, config: FetcherConfig = {}) {
    this.client = client;
    this.config = {
      docsUrl: config.docsUrl,
      maxResultsPerEndpoint: config.maxResultsPerEndpoint ?? DEFAULT_MAX_RESULTS,
      maxCharsPerResult: config.maxCharsPerResult ?? DEFAULT_MAX_CHARS,
    };
  }

  /**
   * Fetch documentation for a single endpoint
   */
  async fetchForEndpoint(
    endpoint: NormalizedEndpoint,
    api: NormalizedAPI
  ): Promise<EndpointDocumentation> {
    const cacheKey = `${endpoint.method} ${endpoint.path}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const searchQueries = this.buildSearchQueries(endpoint, api);
    const objective = this.buildObjective(endpoint, api);

    try {
      const response = await this.client.search({
        objective,
        search_queries: searchQueries,
        processor: 'base',
        max_results: this.config.maxResultsPerEndpoint,
        excerpts: {
          max_chars_per_result: this.config.maxCharsPerResult,
        },
        source_policy: this.config.docsUrl
          ? {
              include_domains: [this.extractDomain(this.config.docsUrl)],
            }
          : undefined,
      });

      const result = this.processSearchResults(response.results, endpoint, searchQueries);
      this.cache.set(cacheKey, result);
      return result;
    } catch (_error) {
      // Return not found on error, don't fail the whole analysis
      const notFound: EndpointDocumentation = {
        found: false,
        searchQueries,
        confidence: 'low',
      };
      this.cache.set(cacheKey, notFound);
      return notFound;
    }
  }

  /**
   * Fetch documentation for all endpoints (sequentially to avoid rate limits)
   */
  async fetchForAllEndpoints(
    api: NormalizedAPI,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, EndpointDocumentation>> {
    const results = new Map<string, EndpointDocumentation>();
    const total = api.endpoints.length;
    let completed = 0;

    // Process sequentially to avoid rate limiting
    for (const endpoint of api.endpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      const docs = await this.fetchForEndpoint(endpoint, api);
      results.set(key, docs);

      completed++;
      onProgress?.(completed, total);
    }

    return results;
  }

  /**
   * Build search queries from endpoint metadata
   */
  private buildSearchQueries(endpoint: NormalizedEndpoint, api: NormalizedAPI): string[] {
    const queries: string[] = [];
    const apiName = api.info.title || 'API';

    // Use operationId if available (most specific)
    if (endpoint.operationId) {
      queries.push(`${apiName} ${endpoint.operationId}`);
    }

    // Use summary if available
    if (endpoint.summary) {
      queries.push(`${apiName} ${endpoint.summary}`);
    }

    // Build path-based query (removing path parameters)
    const pathParts = endpoint.path
      .split('/')
      .filter((p) => p && !p.startsWith('{'));
    if (pathParts.length > 0) {
      queries.push(`${apiName} ${endpoint.method} ${pathParts.join(' ')}`);
    }

    // Fallback to basic method + path
    if (queries.length === 0) {
      queries.push(`${apiName} ${endpoint.method} ${endpoint.path}`);
    }

    return queries.slice(0, 3); // Max 3 queries
  }

  /**
   * Build search objective describing what we're looking for
   */
  private buildObjective(endpoint: NormalizedEndpoint, api: NormalizedAPI): string {
    const apiName = api.info.title || 'API';
    const operationDesc =
      endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`;

    return (
      `Find documentation for the ${apiName} endpoint: ${operationDesc}. ` +
      `Look for information about request parameters, response format, error codes, and authentication requirements.`
    );
  }

  /**
   * Process search results into EndpointDocumentation
   */
  private processSearchResults(
    results: ParallelSearchResult[],
    endpoint: NormalizedEndpoint,
    searchQueries: string[]
  ): EndpointDocumentation {
    if (!results || results.length === 0) {
      return {
        found: false,
        searchQueries,
        confidence: 'low',
      };
    }

    const bestResult = results[0];
    const allExcerpts = results.flatMap((r) => r.excerpts || []);
    const combinedContent = allExcerpts.join('\n\n');

    // Determine confidence based on result quality
    const confidence = this.assessConfidence(results, endpoint);

    return {
      found: true,
      url: bestResult?.url,
      title: bestResult?.title,
      content: combinedContent,
      excerpts: allExcerpts,
      searchQueries,
      confidence,
    };
  }

  /**
   * Assess confidence level based on how well results match the endpoint
   */
  private assessConfidence(
    results: ParallelSearchResult[],
    endpoint: NormalizedEndpoint
  ): 'high' | 'medium' | 'low' {
    const content = results
      .flatMap((r) => r.excerpts || [])
      .join(' ')
      .toLowerCase();
    const pathParts = endpoint.path
      .toLowerCase()
      .split('/')
      .filter((p) => p && !p.startsWith('{'));

    // Check if content mentions the endpoint path parts or operationId
    const pathMatches = pathParts.filter((part) => content.includes(part)).length;
    const hasOperationId =
      endpoint.operationId && content.includes(endpoint.operationId.toLowerCase());
    const hasMethod = content.includes(endpoint.method.toLowerCase());

    if ((pathMatches >= 2 || hasOperationId) && hasMethod) {
      return 'high';
    } else if (pathMatches >= 1 || hasOperationId || hasMethod) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract domain from URL for source filtering
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
