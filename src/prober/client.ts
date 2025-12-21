/**
 * HTTP Client for Clara Prober
 *
 * Handles HTTP requests with retry logic, timeout, and rate limiting.
 * Uses native fetch (Node 20+).
 */

import type { ProberConfig, ProbeRequest, ProbeResponse } from './types.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;

export class ProberClient {
  private config: Required<
    Pick<ProberConfig, 'timeout' | 'retries' | 'retryDelay'>
  > &
    ProberConfig;
  private lastRequestTime = 0;
  private minRequestInterval = 0;

  constructor(config: ProberConfig) {
    this.config = {
      timeout: DEFAULT_TIMEOUT,
      retries: DEFAULT_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
      ...config,
    };

    if (config.rateLimit) {
      this.minRequestInterval = 1000 / config.rateLimit.requestsPerSecond;
    }
  }

  /**
   * Send an HTTP request and return the response
   */
  async send(request: ProbeRequest): Promise<ProbeResponse> {
    await this.enforceRateLimit();

    const headers = this.buildHeaders(request);
    const url = this.buildUrl(request);

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.config.retries) {
      try {
        const response = await this.executeRequest(url, request, headers);

        // Don't retry on client errors (4xx) - these are expected responses
        if (response.statusCode >= 400 && response.statusCode < 500) {
          return response;
        }

        // Don't retry on success
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.statusCode >= 500 && attempt < this.config.retries) {
          attempt++;
          await this.delay(this.config.retryDelay * attempt);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.config.retries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    // All retries exhausted
    return {
      statusCode: 0,
      statusText: 'Request Failed',
      headers: {},
      body: null,
      responseTimeMs: 0,
      timedOut: lastError?.name === 'AbortError',
      error: {
        code: lastError?.name || 'UNKNOWN_ERROR',
        message: lastError?.message || 'Request failed after retries',
      },
    };
  }

  /**
   * Execute a single HTTP request
   */
  private async executeRequest(
    url: string,
    request: ProbeRequest,
    headers: Record<string, string>
  ): Promise<ProbeResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const startTime = Date.now();

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: controller.signal,
      };

      // Add body for methods that support it
      if (
        request.body !== undefined &&
        ['POST', 'PUT', 'PATCH'].includes(request.method)
      ) {
        if (request.malformation === 'invalid-json') {
          // Send malformed JSON as-is
          fetchOptions.body = request.body as string;
        } else {
          fetchOptions.body = JSON.stringify(request.body);
        }
      }

      const response = await fetch(url, fetchOptions);
      const responseTimeMs = Date.now() - startTime;

      // Parse response body
      let body: unknown = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }
      } else {
        body = await response.text();
      }

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      return {
        statusCode: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        responseTimeMs,
        timedOut: false,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;

      if (err.name === 'AbortError') {
        return {
          statusCode: 0,
          statusText: 'Timeout',
          headers: {},
          body: null,
          responseTimeMs,
          timedOut: true,
          error: {
            code: 'TIMEOUT',
            message: `Request timed out after ${this.config.timeout}ms`,
          },
        };
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(request: ProbeRequest): string {
    const url = new URL(request.url);

    if (request.params) {
      for (const [key, value] of Object.entries(request.params)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Build headers including auth
   */
  private buildHeaders(request: ProbeRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Clara/0.1.0 (AI API Analyzer)',
      ...this.config.headers,
      ...request.headers,
    };

    // Skip auth for malformation tests
    if (request.malformation === 'missing-auth') {
      return headers;
    }

    // Add authentication
    if (this.config.auth) {
      const auth = this.config.auth;

      switch (auth.type) {
        case 'bearer':
          if (auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          }
          break;

        case 'apiKey':
          if (auth.apiKey) {
            if (auth.apiKeyIn === 'query') {
              // Will be added to URL params elsewhere
            } else {
              headers[auth.apiKeyHeader || 'X-API-Key'] = auth.apiKey;
            }
          }
          break;

        case 'basic':
          if (auth.username && auth.password) {
            const credentials = Buffer.from(
              `${auth.username}:${auth.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
      }
    }

    return headers;
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    if (this.minRequestInterval === 0) return;

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      await this.delay(this.minRequestInterval - elapsed);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
