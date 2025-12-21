/**
 * Performance Checks - Ensure API meets performance requirements for AI agents
 *
 * Note: These checks require live probing to measure actual API performance.
 * Without live probing, they are skipped with informative messages.
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * PERF_001: Response time acceptable
 * High - Requires live probing
 */
export const PERF_001: Check = {
  id: 'PERF_001',
  pillar: 'performance',
  name: 'response time acceptable',
  description: 'API responses should complete within acceptable time limits',
  severity: 'high',
  requires: {
    liveProbing: true,
  },
  selfHealing: {
    impact: 'Agent can plan operations with predictable timing',
    withoutThis: 'Agent may timeout or experience unexpected delays',
    withThis: 'Agent knows API meets performance requirements',
  },

  check(context: CheckContext): CheckResult {
    const { liveResponse } = context;

    if (!liveResponse) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag to enable',
      };
    }

    // When live probing is implemented:
    // - Measure response time for successful requests
    // - Compare against thresholds (e.g., < 500ms for simple queries, < 2s for complex ops)
    // - Report actual timings and pass/fail based on thresholds

    const responseTime = liveResponse.responseTime;
    if (!responseTime) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Response time not measured',
      };
    }

    const threshold = 2000; // 2 seconds as default threshold
    const passed = responseTime < threshold;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `Response time ${responseTime}ms is acceptable (< ${threshold}ms)`
        : `Response time ${responseTime}ms exceeds threshold of ${threshold}ms`,
      details: { responseTime, threshold },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Optimize API response times',
      example: `Performance optimization suggestions:
- Add database indexes for frequently queried fields
- Implement caching for read-heavy endpoints
- Use pagination for large result sets
- Consider async operations for long-running tasks
- Optimize serialization/deserialization`,
    };
  },
};

/**
 * PERF_002: Rate limits documented
 * High - Agent knows request limits
 */
export const PERF_002: Check = {
  id: 'PERF_002',
  pillar: 'performance',
  name: 'rate limits documented',
  description: 'API should document rate limiting to help agents plan requests',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can plan request frequency appropriately',
    withoutThis: 'Agent may be rate-limited unexpectedly, causing failures',
    withThis: 'Agent can implement proper request throttling',
  },

  check(context: CheckContext): CheckResult {
    const { api, endpoint } = context;

    // Check for rate limit information in various places

    // 1. Check for x-rate-limit extension
    const hasRateLimitExtension =
      api.extensions?.['x-rate-limit'] !== undefined ||
      api.extensions?.['x-ratelimit'] !== undefined;

    // 2. Check for 429 response documented
    let has429Documented = false;
    if (endpoint) {
      has429Documented = endpoint.responses['429'] !== undefined;
    }

    // 3. Check for rate limit headers in response headers
    let hasRateLimitHeaders = false;
    if (endpoint) {
      for (const [, response] of Object.entries(endpoint.responses)) {
        if (response.headers) {
          const headerNames = Object.keys(response.headers).map((h) => h.toLowerCase());
          hasRateLimitHeaders = headerNames.some(
            (h) =>
              h.includes('ratelimit') ||
              h.includes('rate-limit') ||
              h.includes('x-rate') ||
              h.includes('retry-after')
          );
          if (hasRateLimitHeaders) break;
        }
      }
    }

    // 4. Check for rate limit info in description
    const hasDescriptionMention =
      api.info.description?.toLowerCase().includes('rate limit') ||
      api.info.description?.toLowerCase().includes('ratelimit') ||
      endpoint?.description?.toLowerCase().includes('rate limit');

    const hasRateLimitInfo =
      hasRateLimitExtension || has429Documented || hasRateLimitHeaders || hasDescriptionMention;

    if (hasRateLimitInfo) {
      const details: string[] = [];
      if (hasRateLimitExtension) details.push('x-rate-limit extension');
      if (has429Documented) details.push('429 response documented');
      if (hasRateLimitHeaders) details.push('rate limit headers');
      if (hasDescriptionMention) details.push('mentioned in description');

      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Rate limiting documented: ${details.join(', ')}`,
        details: { hasRateLimitExtension, has429Documented, hasRateLimitHeaders, hasDescriptionMention },
      };
    }

    return {
      id: this.id,
      status: 'warning',
      severity: this.severity,
      message: 'No rate limiting documentation found',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Document API rate limits',
      example: `# Option 1: Document 429 response
responses:
  '429':
    description: Rate limit exceeded
    headers:
      X-RateLimit-Limit:
        description: The rate limit ceiling
        schema:
          type: integer
      X-RateLimit-Remaining:
        description: Requests remaining in current window
        schema:
          type: integer
      Retry-After:
        description: Seconds until rate limit resets
        schema:
          type: integer
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: string
            retryAfter:
              type: integer

# Option 2: Use extension
x-rate-limit:
  requests: 1000
  period: hour
  burstLimit: 100`,
    };
  },
};

/**
 * PERF_003: Timeout behavior documented
 * Medium - Agent knows how to handle timeouts
 */
export const PERF_003: Check = {
  id: 'PERF_003',
  pillar: 'performance',
  name: 'timeout behavior documented',
  description: 'Long-running operations should document timeout behavior',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent handles timeouts gracefully',
    withoutThis: 'Agent may fail unexpectedly on long operations',
    withThis: 'Agent can implement appropriate timeout handling',
  },

  check(context: CheckContext): CheckResult {
    const { api, endpoint } = context;

    // Check for timeout info in various places
    const hasTimeoutExtension = api.extensions?.['x-timeout'] !== undefined;

    let has504Documented = false;
    let has408Documented = false;
    let hasTimeoutInDescription = false;

    if (endpoint) {
      has504Documented = endpoint.responses['504'] !== undefined;
      has408Documented = endpoint.responses['408'] !== undefined;
      hasTimeoutInDescription =
        endpoint.description?.toLowerCase().includes('timeout') ||
        endpoint.summary?.toLowerCase().includes('timeout') ||
        false;
    }

    const hasTimeoutInfo =
      hasTimeoutExtension || has504Documented || has408Documented || hasTimeoutInDescription;

    if (hasTimeoutInfo) {
      const details: string[] = [];
      if (hasTimeoutExtension) details.push('x-timeout extension');
      if (has504Documented) details.push('504 Gateway Timeout documented');
      if (has408Documented) details.push('408 Request Timeout documented');
      if (hasTimeoutInDescription) details.push('mentioned in description');

      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Timeout behavior documented: ${details.join(', ')}`,
        details: { hasTimeoutExtension, has504Documented, has408Documented, hasTimeoutInDescription },
      };
    }

    // Only warn for potentially long operations
    const isLongOperation =
      endpoint?.method === 'POST' ||
      endpoint?.operationId?.toLowerCase().includes('export') ||
      endpoint?.operationId?.toLowerCase().includes('import') ||
      endpoint?.operationId?.toLowerCase().includes('report') ||
      endpoint?.operationId?.toLowerCase().includes('batch');

    if (!isLongOperation) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'Simple operation - timeout documentation not required',
      };
    }

    return {
      id: this.id,
      status: 'warning',
      severity: this.severity,
      message: 'Potentially long operation without timeout documentation',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Document timeout behavior for long-running operations',
      example: `# Document potential timeouts
responses:
  '408':
    description: Request Timeout - client took too long to send request
  '504':
    description: Gateway Timeout - upstream service took too long

# Or use extension
x-timeout:
  default: 30s
  maximum: 300s

# Or document in operation description
description: |
  Generates a report for the specified date range.

  **Timeout**: This operation may take up to 5 minutes for large date ranges.
  Consider using the async version for ranges > 1 year.`,
    };
  },
};

/**
 * PERF_004: Async operations available
 * Low - Agent can handle long operations
 */
export const PERF_004: Check = {
  id: 'PERF_004',
  pillar: 'performance',
  name: 'async operations available',
  description: 'Long-running operations should offer async alternatives',
  severity: 'low',
  selfHealing: {
    impact: 'Agent can handle long operations without blocking',
    withoutThis: 'Agent may be blocked waiting for long operations',
    withThis: 'Agent can poll for results asynchronously',
  },

  check(context: CheckContext): CheckResult {
    const { api, endpoint } = context;

    // Look for async patterns in the API

    // 1. Check for webhook configuration
    const hasWebhooks = api.webhooks && Object.keys(api.webhooks).length > 0;

    // 2. Check for 202 Accepted response (async pattern)
    let has202Response = false;
    if (endpoint) {
      has202Response = endpoint.responses['202'] !== undefined;
    }

    // 3. Check for async-related operation IDs
    const endpoints = api.endpoints || [];
    const hasAsyncEndpoints = endpoints.some(
      (e) =>
        e.operationId?.toLowerCase().includes('async') ||
        e.operationId?.toLowerCase().includes('queue') ||
        e.operationId?.toLowerCase().includes('job') ||
        e.path.includes('/jobs') ||
        e.path.includes('/tasks') ||
        e.path.includes('/status')
    );

    // 4. Check for callback extension
    const hasCallbacks = endpoint?.extensions?.['callbacks'] !== undefined;

    const hasAsyncSupport = hasWebhooks || has202Response || hasAsyncEndpoints || hasCallbacks;

    if (hasAsyncSupport) {
      const details: string[] = [];
      if (hasWebhooks) details.push('webhooks configured');
      if (has202Response) details.push('202 Accepted response');
      if (hasAsyncEndpoints) details.push('async endpoints available');
      if (hasCallbacks) details.push('callbacks defined');

      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Async patterns available: ${details.join(', ')}`,
        details: { hasWebhooks, has202Response, hasAsyncEndpoints, hasCallbacks },
      };
    }

    return {
      id: this.id,
      status: 'passed', // Low severity - not a failure
      severity: this.severity,
      message: 'No async patterns detected (may not be needed for this API)',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Consider adding async operation support',
      example: `# Pattern 1: 202 Accepted with polling
POST /reports:
  responses:
    '202':
      description: Report generation started
      content:
        application/json:
          schema:
            type: object
            properties:
              jobId:
                type: string
              statusUrl:
                type: string
                format: uri

GET /jobs/{jobId}:
  responses:
    '200':
      description: Job status
      content:
        application/json:
          schema:
            type: object
            properties:
              status:
                type: string
                enum: [pending, processing, completed, failed]
              resultUrl:
                type: string
                format: uri

# Pattern 2: Webhooks
webhooks:
  reportComplete:
    post:
      summary: Report generation completed
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                jobId:
                  type: string
                reportUrl:
                  type: string`,
    };
  },
};

export const performanceChecks: Check[] = [PERF_001, PERF_002, PERF_003, PERF_004];
