/**
 * Types for Clara Live Prober
 */

import type { HttpMethod, NormalizedEndpoint, Schema } from '../types/index.js';

// ============================================
// Configuration
// ============================================

export interface ProberConfig {
  baseUrl: string;
  timeout?: number; // Default: 30000ms
  retries?: number; // Default: 2
  retryDelay?: number; // Default: 1000ms
  sandbox?: boolean; // If true, allows write operations
  auth?: AuthConfig;
  headers?: Record<string, string>;
  rateLimit?: {
    requestsPerSecond: number;
  };
}

export interface AuthConfig {
  type: 'bearer' | 'apiKey' | 'basic';
  token?: string; // For bearer
  apiKey?: string; // For apiKey
  apiKeyHeader?: string; // Default: 'X-API-Key'
  apiKeyIn?: 'header' | 'query'; // Default: 'header'
  username?: string; // For basic
  password?: string;
}

// ============================================
// Requests
// ============================================

export interface ProbeRequest {
  endpoint: NormalizedEndpoint;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  malformation?: MalformationType;
}

export type MalformationType =
  | 'none' // Valid request
  | 'invalid-json' // Malformed JSON body
  | 'missing-required' // Omit required field
  | 'wrong-type' // String where number expected
  | 'extra-field' // Unknown field in body
  | 'missing-auth' // Omit authentication
  | 'invalid-path-param' // Wrong type/format in path
  | 'boundary-value' // Min-1, Max+1 values
  | 'empty-body' // Empty body where required
  | 'null-required'; // Null for required field

// ============================================
// Responses
// ============================================

export interface ProbeResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTimeMs: number;
  timedOut: boolean;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Validation
// ============================================

export interface SchemaValidationResult {
  valid: boolean;
  errors?: SchemaValidationError[];
}

export interface SchemaValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

export interface ErrorQualityResult {
  hasErrorCode: boolean;
  hasMessage: boolean;
  messageIsHelpful: boolean; // Not just "error" or "failed"
  identifiesField: boolean; // For validation errors
  suggestsFix: boolean;
  hasDocUrl: boolean;
  score: number; // 0-100
  feedback: string[];
}

// ============================================
// Probe Results
// ============================================

export interface ProbeResult {
  endpoint: NormalizedEndpoint;
  request: ProbeRequest;
  response: ProbeResponse;
  validation: {
    schemaValid: boolean | null; // null if no schema to validate against
    schemaErrors?: SchemaValidationError[];
    errorQuality?: ErrorQualityResult;
  };
  malformationResult?: MalformationResult;
}

export interface MalformationResult {
  type: MalformationType;
  passed: boolean;
  score: number; // 0-100
  expectedBehavior: string;
  actualBehavior: string;
  feedback: string;
}

export interface EndpointProbeReport {
  endpoint: NormalizedEndpoint;
  probes: ProbeResult[];
  summary: {
    reachable: boolean;
    validRequestPassed: boolean;
    responseMatchesSchema: boolean;
    errorHandlingScore: number; // 0-100 based on malformed request handling
    avgResponseTimeMs: number;
    p95ResponseTimeMs: number;
  };
}

// ============================================
// Malformation Strategies
// ============================================

export interface MalformationStrategy {
  type: MalformationType;
  name: string;
  description: string;
  expectedStatusCodes: number[]; // Expected responses (e.g., [400, 422])
  expectedBehavior: string;
  appliesTo: (endpoint: NormalizedEndpoint) => boolean;
  apply: (request: ProbeRequest, schema?: Schema) => ProbeRequest;
  evaluate: (response: ProbeResponse, request: ProbeRequest) => MalformationResult;
}
