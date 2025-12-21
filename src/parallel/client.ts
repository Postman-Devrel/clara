/**
 * HTTP Client for Parallel AI API
 *
 * Handles Search and Extract API calls with retry logic.
 * Follows the ProberClient pattern for consistency.
 */

import type {
  ParallelClientConfig,
  ParallelSearchRequest,
  ParallelSearchResponse,
  ParallelExtractRequest,
  ParallelExtractResponse,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.parallel.ai';
const DEFAULT_TIMEOUT = 60000; // 60s for search operations
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;

interface RequiredConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export class ParallelClient {
  private config: RequiredConfig;

  constructor(config: ParallelClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      retries: config.retries ?? DEFAULT_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY,
    };
  }

  /**
   * Search for documentation using Parallel AI Search API
   */
  async search(request: ParallelSearchRequest): Promise<ParallelSearchResponse> {
    return this.executeRequest<ParallelSearchResponse>('/v1/search', request);
  }

  /**
   * Extract content from specific URLs using Parallel AI Extract API
   */
  async extract(request: ParallelExtractRequest): Promise<ParallelExtractResponse> {
    return this.executeRequest<ParallelExtractResponse>('/v1/extract', request);
  }

  /**
   * Execute an API request with retries
   */
  private async executeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          const error = new Error(
            `Parallel AI API error: ${response.status} ${response.statusText}`
          );
          (error as Error & { status?: number; body?: string }).status = response.status;
          (error as Error & { status?: number; body?: string }).body = errorBody;

          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }

          lastError = error;
        } else {
          return (await response.json()) as T;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Parallel AI request timed out');
        } else {
          lastError = error as Error;
        }

        // Don't retry on 4xx errors
        if (
          lastError &&
          'status' in lastError &&
          typeof (lastError as Error & { status?: number }).status === 'number'
        ) {
          const status = (lastError as Error & { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            throw lastError;
          }
        }
      }

      // Wait before retrying (with exponential backoff)
      if (attempt < this.config.retries) {
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('Parallel AI request failed');
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
