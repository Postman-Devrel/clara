/**
 * Clara Live Prober
 *
 * Tests live API endpoints to validate behavior matches specification.
 * Sends both valid and malformed requests to test error handling.
 */

import type {
  NormalizedAPI,
  NormalizedEndpoint,
  LiveResponse,
  Schema,
} from '../types/index.js';
import { ProberClient } from './client.js';
import { RequestBuilder } from './request-builder.js';
import { ResponseValidator } from './validator.js';
import type {
  ProberConfig,
  ProbeResult,
  EndpointProbeReport,
  MalformationType,
  MalformationResult,
  ProbeResponse,
} from './types.js';

export * from './types.js';

export class Prober {
  private client: ProberClient;
  private validator: ResponseValidator;
  private config: ProberConfig;

  constructor(config: ProberConfig) {
    this.config = config;
    this.client = new ProberClient(config);
    this.validator = new ResponseValidator();
  }

  /**
   * Probe a single endpoint with valid and malformed requests
   */
  async probeEndpoint(
    endpoint: NormalizedEndpoint,
    api: NormalizedAPI
  ): Promise<EndpointProbeReport> {
    const builder = new RequestBuilder(api, this.config);
    const probes: ProbeResult[] = [];

    // 1. Send valid request
    const validResult = await this.probeWithValidRequest(
      endpoint,
      api,
      builder
    );
    probes.push(validResult);

    // 2. Send malformed requests (only for endpoints with request bodies)
    if (this.shouldTestMalformations(endpoint)) {
      const malformations = this.getMalformationsFor(endpoint);

      for (const malformation of malformations) {
        const result = await this.probeWithMalformation(
          endpoint,
          api,
          builder,
          malformation
        );
        probes.push(result);
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(probes, validResult);

    return {
      endpoint,
      probes,
      summary,
    };
  }

  /**
   * Probe all endpoints in an API
   */
  async probeAll(
    api: NormalizedAPI,
    options?: { onProgress?: (completed: number, total: number) => void }
  ): Promise<Map<string, EndpointProbeReport>> {
    const results = new Map<string, EndpointProbeReport>();
    const total = api.endpoints.length;
    let completed = 0;

    for (const endpoint of api.endpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      const report = await this.probeEndpoint(endpoint, api);
      results.set(key, report);

      completed++;
      options?.onProgress?.(completed, total);
    }

    return results;
  }

  /**
   * Get a LiveResponse for a single endpoint (for check context)
   */
  async getLiveResponse(
    endpoint: NormalizedEndpoint,
    api: NormalizedAPI
  ): Promise<LiveResponse | undefined> {
    try {
      const builder = new RequestBuilder(api, this.config);
      const request = builder.buildValidRequest(endpoint);
      const response = await this.client.send(request);

      if (response.error) {
        return undefined;
      }

      return {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
        responseTime: response.responseTimeMs,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Run malformation tests for an endpoint and return results for checks
   */
  async runMalformationTests(
    endpoint: NormalizedEndpoint,
    api: NormalizedAPI
  ): Promise<import('../types/index.js').MalformationTestResult[]> {
    const results: import('../types/index.js').MalformationTestResult[] = [];
    const builder = new RequestBuilder(api, this.config);

    // Determine which malformations to test
    const malformations = this.getMalformationsFor(endpoint);

    for (const malformation of malformations) {
      try {
        const probeResult = await this.probeWithMalformation(
          endpoint,
          api,
          builder,
          malformation
        );

        // Convert to MalformationTestResult format
        results.push({
          type: malformation as import('../types/index.js').MalformationType,
          request: {
            method: probeResult.request.method,
            url: probeResult.request.url,
            body: probeResult.request.body,
          },
          response: {
            statusCode: probeResult.response.statusCode,
            body: probeResult.response.body,
            responseTimeMs: probeResult.response.responseTimeMs,
          },
          evaluation: {
            passed: probeResult.malformationResult?.passed ?? false,
            score: probeResult.malformationResult?.score ?? 0,
            expectedBehavior: probeResult.malformationResult?.expectedBehavior ?? '',
            actualBehavior: probeResult.malformationResult?.actualBehavior ?? '',
            feedback: probeResult.malformationResult?.feedback ?? '',
          },
          errorQuality: probeResult.validation.errorQuality
            ? {
                hasErrorCode: probeResult.validation.errorQuality.hasErrorCode,
                hasMessage: probeResult.validation.errorQuality.hasMessage,
                messageIsHelpful: probeResult.validation.errorQuality.messageIsHelpful,
                identifiesField: probeResult.validation.errorQuality.identifiesField,
                suggestsFix: probeResult.validation.errorQuality.suggestsFix,
                hasDocUrl: probeResult.validation.errorQuality.hasDocUrl,
                score: probeResult.validation.errorQuality.score,
                feedback: probeResult.validation.errorQuality.feedback,
              }
            : undefined,
        });
      } catch {
        // Skip failed malformation tests
      }
    }

    return results;
  }

  /**
   * Send a valid request and validate the response
   */
  private async probeWithValidRequest(
    endpoint: NormalizedEndpoint,
    _api: NormalizedAPI,
    builder: RequestBuilder
  ): Promise<ProbeResult> {
    const request = builder.buildValidRequest(endpoint);
    const response = await this.client.send(request);

    // Validate response against schema
    let schemaValid: boolean | null = null;
    let schemaErrors: ProbeResult['validation']['schemaErrors'];

    const responseSchema = this.getResponseSchema(endpoint, response.statusCode);
    if (responseSchema && response.body !== null) {
      const validation = this.validator.validateSchema(
        response.body,
        responseSchema
      );
      schemaValid = validation.valid;
      schemaErrors = validation.errors;
    }

    return {
      endpoint,
      request,
      response,
      validation: {
        schemaValid,
        schemaErrors,
      },
    };
  }

  /**
   * Send a malformed request and evaluate error handling
   */
  private async probeWithMalformation(
    endpoint: NormalizedEndpoint,
    _api: NormalizedAPI,
    builder: RequestBuilder,
    malformation: MalformationType
  ): Promise<ProbeResult> {
    const request = builder.buildMalformedRequest(endpoint, malformation);
    const response = await this.client.send(request);

    // Evaluate error response quality
    const errorQuality =
      response.statusCode >= 400
        ? this.validator.evaluateErrorResponse(response)
        : undefined;

    // Evaluate malformation handling
    const malformationResult = this.evaluateMalformation(
      malformation,
      response
    );

    return {
      endpoint,
      request,
      response,
      validation: {
        schemaValid: null, // Not applicable for malformed requests
        errorQuality,
      },
      malformationResult,
    };
  }

  /**
   * Determine which malformations to test for an endpoint
   */
  private getMalformationsFor(endpoint: NormalizedEndpoint): MalformationType[] {
    const malformations: MalformationType[] = [];

    const hasRequestBody = !!endpoint.requestBody;
    const hasRequiredFields =
      endpoint.requestBody?.content['application/json']?.schema?.required
        ?.length ?? 0 > 0;

    // Always test missing auth if endpoint has security requirements
    if (endpoint.security && endpoint.security.length > 0) {
      malformations.push('missing-auth');
    }

    if (hasRequestBody) {
      malformations.push('invalid-json');
      malformations.push('extra-field');

      if (hasRequiredFields) {
        malformations.push('missing-required');
        malformations.push('null-required');
      }

      malformations.push('wrong-type');
    }

    return malformations;
  }

  /**
   * Check if we should test malformations for this endpoint
   */
  private shouldTestMalformations(endpoint: NormalizedEndpoint): boolean {
    // Skip safe methods without request body in non-sandbox mode
    if (!this.config.sandbox && ['DELETE', 'PUT', 'PATCH'].includes(endpoint.method)) {
      // Only test if we have a request body
      return !!endpoint.requestBody;
    }

    return (
      !!endpoint.requestBody ||
      !!(endpoint.security && endpoint.security.length > 0)
    );
  }

  /**
   * Evaluate how well the API handled a malformed request
   */
  private evaluateMalformation(
    type: MalformationType,
    response: ProbeResponse
  ): MalformationResult {
    const expectations = MALFORMATION_EXPECTATIONS[type];

    const isExpectedStatus = expectations.expectedStatusCodes.includes(
      response.statusCode
    );

    let score = 0;
    const feedback: string[] = [];

    // Check status code
    if (isExpectedStatus) {
      score += 40;
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      score += 20; // At least it's a client error
      feedback.push(
        `Expected status ${expectations.expectedStatusCodes.join(' or ')}, got ${response.statusCode}`
      );
    } else {
      feedback.push(
        `Expected ${expectations.expectedStatusCodes.join(' or ')}, got ${response.statusCode}`
      );
    }

    // Check error response quality
    if (response.statusCode >= 400) {
      const quality = this.validator.evaluateErrorResponse(response);
      score += Math.round(quality.score * 0.6); // 60% weight on error quality
      feedback.push(...quality.feedback);
    }

    return {
      type,
      passed: score >= 60,
      score,
      expectedBehavior: expectations.expectedBehavior,
      actualBehavior: `${response.statusCode} ${response.statusText}`,
      feedback: feedback.join('; ') || 'Good error handling',
    };
  }

  /**
   * Get the response schema for a given status code
   */
  private getResponseSchema(
    endpoint: NormalizedEndpoint,
    statusCode: number
  ): Schema | undefined {
    // Try exact match
    const exactMatch = endpoint.responses[String(statusCode)];
    if (exactMatch?.content?.['application/json']?.schema) {
      return exactMatch.content['application/json'].schema;
    }

    // Try wildcard (2XX, 4XX, etc.)
    const wildcardKey = `${Math.floor(statusCode / 100)}XX`;
    const wildcardMatch = endpoint.responses[wildcardKey];
    if (wildcardMatch?.content?.['application/json']?.schema) {
      return wildcardMatch.content['application/json'].schema;
    }

    // Try default
    const defaultMatch = endpoint.responses['default'];
    if (defaultMatch?.content?.['application/json']?.schema) {
      return defaultMatch.content['application/json'].schema;
    }

    return undefined;
  }

  /**
   * Calculate summary statistics for an endpoint probe
   */
  private calculateSummary(
    probes: ProbeResult[],
    validProbe: ProbeResult
  ): EndpointProbeReport['summary'] {
    const responseTimes = probes
      .filter((p) => !p.response.timedOut && !p.response.error)
      .map((p) => p.response.responseTimeMs);

    const malformationScores = probes
      .filter((p) => p.malformationResult)
      .map((p) => p.malformationResult!.score);

    return {
      reachable: !validProbe.response.error && !validProbe.response.timedOut,
      validRequestPassed:
        validProbe.response.statusCode >= 200 &&
        validProbe.response.statusCode < 300,
      responseMatchesSchema: validProbe.validation.schemaValid ?? true,
      errorHandlingScore:
        malformationScores.length > 0
          ? Math.round(
              malformationScores.reduce((a, b) => a + b, 0) /
                malformationScores.length
            )
          : 100,
      avgResponseTimeMs:
        responseTimes.length > 0
          ? Math.round(
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            )
          : 0,
      p95ResponseTimeMs:
        responseTimes.length > 0
          ? responseTimes.sort((a, b) => a - b)[
              Math.floor(responseTimes.length * 0.95)
            ] ?? 0
          : 0,
    };
  }
}

/**
 * Expected behaviors for each malformation type
 */
const MALFORMATION_EXPECTATIONS: Record<
  MalformationType,
  { expectedStatusCodes: number[]; expectedBehavior: string }
> = {
  none: {
    expectedStatusCodes: [200, 201, 204],
    expectedBehavior: 'Success response',
  },
  'invalid-json': {
    expectedStatusCodes: [400],
    expectedBehavior: '400 Bad Request with JSON parse error message',
  },
  'missing-required': {
    expectedStatusCodes: [400, 422],
    expectedBehavior: '400/422 identifying the missing required field',
  },
  'wrong-type': {
    expectedStatusCodes: [400, 422],
    expectedBehavior: '400/422 identifying the type mismatch',
  },
  'extra-field': {
    expectedStatusCodes: [200, 201, 400, 422],
    expectedBehavior: 'Accept or reject with clear message about unknown field',
  },
  'missing-auth': {
    expectedStatusCodes: [401, 403],
    expectedBehavior: '401 Unauthorized or 403 Forbidden',
  },
  'invalid-path-param': {
    expectedStatusCodes: [400, 404, 422],
    expectedBehavior: '400/404/422 with clear error about invalid path parameter',
  },
  'boundary-value': {
    expectedStatusCodes: [400, 422],
    expectedBehavior: '400/422 identifying the out-of-bounds value',
  },
  'empty-body': {
    expectedStatusCodes: [400, 422],
    expectedBehavior: '400/422 indicating request body is required',
  },
  'null-required': {
    expectedStatusCodes: [400, 422],
    expectedBehavior: '400/422 indicating field cannot be null',
  },
};
