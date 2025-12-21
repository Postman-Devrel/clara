/**
 * Parallel AI Integration Module
 *
 * Provides documentation fetching and comparison using Parallel AI.
 */

export { ParallelClient } from './client.js';
export { DocumentationFetcher } from './fetcher.js';
export { SpecDocsComparator } from './comparator.js';

export type {
  // API Types
  ParallelSearchRequest,
  ParallelSearchResponse,
  ParallelSearchResult,
  ParallelExtractRequest,
  ParallelExtractResponse,
  ParallelExtractResult,
  ParallelUsage,
  // Configuration
  ParallelClientConfig,
  FetcherConfig,
  // Documentation
  EndpointDocumentation,
  // Comparison
  SpecDocsComparison,
  SpecDocsDiscrepancy,
  ThreeWayComparison,
  SpecLiveComparison,
  DocsLiveComparison,
} from './types.js';
