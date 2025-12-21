/**
 * Types for Parallel AI Integration
 *
 * Defines interfaces for Parallel AI Search and Extract APIs,
 * documentation fetching results, and spec/docs comparison.
 */

import type { Severity } from '../types/index.js';

// ============================================
// Parallel AI API Types
// ============================================

/**
 * Parallel AI Search API Request
 */
export interface ParallelSearchRequest {
  objective: string;
  search_queries?: string[];
  processor?: 'base' | 'pro';
  max_results?: number;
  excerpts?: {
    max_chars_per_result?: number;
  };
  source_policy?: {
    include_domains?: string[];
    exclude_domains?: string[];
  };
}

/**
 * Parallel AI Search API Response
 */
export interface ParallelSearchResponse {
  search_id: string;
  results: ParallelSearchResult[];
  warnings?: string[] | null;
  usage?: ParallelUsage[];
}

export interface ParallelSearchResult {
  url: string;
  title: string;
  publish_date?: string | null;
  excerpts: string[];
}

export interface ParallelUsage {
  name: string;
  count: number;
}

/**
 * Parallel AI Extract API Request
 */
export interface ParallelExtractRequest {
  urls: string[];
  objective: string;
  excerpts?: boolean;
  full_content?: boolean;
}

/**
 * Parallel AI Extract API Response
 */
export interface ParallelExtractResponse {
  extract_id: string;
  results: ParallelExtractResult[];
  errors?: string[];
  warnings?: string[] | null;
}

export interface ParallelExtractResult {
  url: string;
  title: string;
  publish_date?: string | null;
  excerpts?: string[];
  full_content?: string | null;
}

// ============================================
// Client Configuration
// ============================================

export interface ParallelClientConfig {
  apiKey: string;
  baseUrl?: string; // Default: https://api.parallel.ai
  timeout?: number; // Default: 60000ms
  retries?: number; // Default: 2
  retryDelay?: number; // Default: 1000ms
}

// ============================================
// Documentation Fetching
// ============================================

/**
 * Documentation fetch result for an endpoint
 */
export interface EndpointDocumentation {
  found: boolean;
  url?: string;
  title?: string;
  content?: string;
  excerpts?: string[];
  searchQueries: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface FetcherConfig {
  docsUrl?: string; // Base documentation URL to focus search
  maxResultsPerEndpoint?: number;
  maxCharsPerResult?: number;
}

// ============================================
// Spec vs Docs Comparison
// ============================================

/**
 * Result of comparing spec to documentation
 */
export interface SpecDocsComparison {
  match: boolean;
  confidence: number; // 0-100
  discrepancies: SpecDocsDiscrepancy[];
  warnings: string[];
}

export interface SpecDocsDiscrepancy {
  field: string;
  specValue: string | undefined;
  docsValue: string | undefined;
  severity: Severity;
  message: string;
}

// ============================================
// Three-Way Comparison
// ============================================

export interface ThreeWayComparison {
  specVsDocs?: SpecDocsComparison;
  specVsLive?: SpecLiveComparison;
  docsVsLive?: DocsLiveComparison;
  overallConsistency: 'consistent' | 'minor_discrepancies' | 'major_discrepancies';
  summary: string;
}

export interface SpecLiveComparison {
  match: boolean;
  discrepancies: Array<{
    field: string;
    specValue?: unknown;
    liveValue?: unknown;
    message: string;
  }>;
}

export interface DocsLiveComparison {
  match: boolean;
  discrepancies: Array<{
    field: string;
    docsValue?: string;
    liveValue?: unknown;
    message: string;
  }>;
}
