/**
 * Error Checks - Rich error semantics for AI agent self-healing
 */

import type { Check, CheckContext, CheckResult, Fix, Schema } from '../../types/index.js';

/**
 * ERR_001: 4xx responses documented
 * Critical - Agent must know what errors to expect
 */
export const ERR_001: Check = {
  id: 'ERR_001',
  pillar: 'errors',
  name: '4xx responses documented',
  description: 'Operations should document expected client error responses (4xx)',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent knows what client errors to expect and handle',
    withoutThis: 'Agent cannot anticipate or prepare for error conditions',
    withThis: 'Agent can implement proper error handling for known error cases',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const responses = endpoint.responses;
    const errorCodes = Object.keys(responses).filter((code) => {
      const numCode = parseInt(code, 10);
      return numCode >= 400 && numCode < 500;
    });

    // At minimum, should document 400 (bad request) for any operation with parameters/body
    const hasInputs = endpoint.parameters.length > 0 || endpoint.requestBody;
    const needs400 = hasInputs && !errorCodes.includes('400');

    // Should document 401 if there's security defined
    const hasSecurity = endpoint.security && endpoint.security.length > 0;
    const needs401 = hasSecurity && !errorCodes.includes('401');

    // Should document 404 for operations with path parameters
    const hasPathParams = endpoint.parameters.some((p) => p.in === 'path');
    const needs404 = hasPathParams && !errorCodes.includes('404');

    const issues: string[] = [];
    if (needs400) issues.push('Missing 400 response for operation with inputs');
    if (needs401) issues.push('Missing 401 response for secured operation');
    if (needs404) issues.push('Missing 404 response for operation with path parameters');

    const passed = issues.length === 0 && errorCodes.length > 0;

    return {
      id: this.id,
      status: passed ? 'passed' : errorCodes.length > 0 ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? `4xx responses documented: ${errorCodes.join(', ')}`
        : errorCodes.length > 0
          ? `Partial 4xx documentation (${errorCodes.join(', ')}): ${issues.join('; ')}`
          : `No 4xx responses documented for ${endpoint.method} ${endpoint.path}`,
      details: { documented: errorCodes, issues },
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    const { endpoint } = context;
    const suggestions: string[] = [];

    if (endpoint?.parameters.length || endpoint?.requestBody) {
      suggestions.push('400: Bad Request - Invalid input parameters');
    }
    if (endpoint?.security?.length) {
      suggestions.push('401: Unauthorized - Authentication required');
      suggestions.push('403: Forbidden - Insufficient permissions');
    }
    if (endpoint?.parameters.some((p) => p.in === 'path')) {
      suggestions.push('404: Not Found - Resource does not exist');
    }

    return {
      description: 'Document expected 4xx error responses',
      example: suggestions.length > 0 ? suggestions.join('\n') : '400: Bad Request\n401: Unauthorized\n404: Not Found',
    };
  },
};

/**
 * ERR_002: error schema defined
 * Critical - Agent needs structured error format
 */
export const ERR_002: Check = {
  id: 'ERR_002',
  pillar: 'errors',
  name: 'error schema defined',
  description: 'Error responses should have a defined schema with code and message fields',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can parse and understand error responses',
    withoutThis: 'Agent receives unstructured error data it cannot interpret',
    withThis: 'Agent can extract error code and message for decision making',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const responses = endpoint.responses;
    const errorResponses = Object.entries(responses).filter(([code]) => {
      const numCode = parseInt(code, 10);
      return numCode >= 400 && numCode < 600;
    });

    if (errorResponses.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No error responses defined (see ERR_001)',
      };
    }

    const issues: string[] = [];
    let hasGoodSchema = false;

    for (const [code, response] of errorResponses) {
      const content = response.content;
      if (!content) {
        issues.push(`${code}: No content defined`);
        continue;
      }

      // Check JSON content type
      const jsonContent = content['application/json'] || content['application/problem+json'];
      if (!jsonContent?.schema) {
        issues.push(`${code}: No schema defined for JSON response`);
        continue;
      }

      // Check for error code and message fields
      const schema = jsonContent.schema;
      const hasCodeField = hasField(schema, ['code', 'error_code', 'errorCode', 'type', 'error']);
      const hasMessageField = hasField(schema, ['message', 'error_message', 'errorMessage', 'description', 'detail']);

      if (!hasCodeField) {
        issues.push(`${code}: Schema missing error code field`);
      }
      if (!hasMessageField) {
        issues.push(`${code}: Schema missing error message field`);
      }

      if (hasCodeField && hasMessageField) {
        hasGoodSchema = true;
      }
    }

    const passed = hasGoodSchema && issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : hasGoodSchema ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? 'Error schemas properly defined with code and message fields'
        : `Error schema issues: ${issues.join('; ')}`,
      details: { issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Define a structured error schema with code and message fields',
      example: `{
  "type": "object",
  "required": ["code", "message"],
  "properties": {
    "code": {
      "type": "string",
      "description": "Machine-readable error code",
      "example": "VALIDATION_ERROR"
    },
    "message": {
      "type": "string",
      "description": "Human-readable error message"
    },
    "details": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "message": { "type": "string" },
          "expected": { "type": "string" },
          "received": { "type": "string" }
        }
      }
    }
  }
}`,
    };
  },
};

/**
 * ERR_003: error code field
 * Critical - Agent needs machine-readable error codes
 */
export const ERR_003: Check = {
  id: 'ERR_003',
  pillar: 'errors',
  name: 'error code field',
  description: 'Error responses should include a machine-readable error code',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can programmatically identify specific error types',
    withoutThis: 'Agent must parse human-readable messages to understand errors',
    withThis: 'Agent can switch on error codes to handle specific cases',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const errorSchemas = getErrorSchemas(endpoint.responses);
    if (errorSchemas.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No error response schemas to check',
      };
    }

    const withCodeField = errorSchemas.filter(({ schema }) =>
      hasField(schema, ['code', 'error_code', 'errorCode', 'type', 'error', 'status'])
    );

    const passed = withCodeField.length === errorSchemas.length;

    return {
      id: this.id,
      status: passed ? 'passed' : withCodeField.length > 0 ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? 'All error responses have code field'
        : `${withCodeField.length}/${errorSchemas.length} error responses have code field`,
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add a machine-readable error code field to error responses',
      example: `code:
  type: string
  description: Machine-readable error code
  enum:
    - VALIDATION_ERROR
    - NOT_FOUND
    - UNAUTHORIZED
    - RATE_LIMITED`,
    };
  },
};

/**
 * ERR_004: error message field
 * High - Agent can log/report human-readable message
 */
export const ERR_004: Check = {
  id: 'ERR_004',
  pillar: 'errors',
  name: 'error message field',
  description: 'Error responses should include a human-readable message',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can log and report meaningful error information',
    withoutThis: 'Agent has no human-readable context for errors',
    withThis: 'Agent can provide helpful error messages to users',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const errorSchemas = getErrorSchemas(endpoint.responses);
    if (errorSchemas.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No error response schemas to check',
      };
    }

    const withMessageField = errorSchemas.filter(({ schema }) =>
      hasField(schema, ['message', 'error_message', 'errorMessage', 'description', 'detail', 'title'])
    );

    const passed = withMessageField.length === errorSchemas.length;

    return {
      id: this.id,
      status: passed ? 'passed' : withMessageField.length > 0 ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? 'All error responses have message field'
        : `${withMessageField.length}/${errorSchemas.length} error responses have message field`,
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add a human-readable message field to error responses',
      example: `message:
  type: string
  description: Human-readable error description
  example: "The email field must be a valid email address"`,
    };
  },
};

/**
 * ERR_005: error details field
 * High - Agent needs field-level validation info
 */
export const ERR_005: Check = {
  id: 'ERR_005',
  pillar: 'errors',
  name: 'error details field',
  description: 'Validation errors should include field-level details',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can identify exactly which fields have errors',
    withoutThis: 'Agent must guess which input caused the error',
    withThis: 'Agent can fix specific fields that caused validation errors',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    // Only relevant for endpoints with request bodies or parameters
    const hasInputs = endpoint.requestBody || endpoint.parameters.length > 0;
    if (!hasInputs) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No inputs to validate',
      };
    }

    const response400 = endpoint.responses['400'] || endpoint.responses['422'];
    if (!response400?.content) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No 400/422 response defined',
      };
    }

    const jsonContent = response400.content['application/json'] || response400.content['application/problem+json'];
    if (!jsonContent?.schema) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'Validation error response has no schema',
      };
    }

    const hasDetails = hasField(jsonContent.schema, ['details', 'errors', 'fields', 'violations', 'invalid_params']);

    return {
      id: this.id,
      status: hasDetails ? 'passed' : 'warning',
      severity: this.severity,
      message: hasDetails
        ? 'Validation error response includes details field'
        : 'Validation error response missing field-level details',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add a details array for field-level validation errors',
      example: `details:
  type: array
  items:
    type: object
    properties:
      field:
        type: string
        description: The field that caused the error
      message:
        type: string
        description: What was wrong with this field`,
    };
  },
};

/**
 * ERR_006: expected vs received
 * High - Agent knows exactly how to fix input
 */
export const ERR_006: Check = {
  id: 'ERR_006',
  pillar: 'errors',
  name: 'expected vs received',
  description: 'Validation errors should show expected vs received values',
  severity: 'high',
  selfHealing: {
    impact: 'Agent knows exactly what value was expected',
    withoutThis: 'Agent knows something is wrong but not how to fix it',
    withThis: 'Agent can correct input to match expected format',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const response400 = endpoint.responses['400'] || endpoint.responses['422'];
    if (!response400?.content) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No validation error response defined',
      };
    }

    const jsonContent = response400.content['application/json'] || response400.content['application/problem+json'];
    if (!jsonContent?.schema) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Validation error response has no schema',
      };
    }

    // Check if the schema or its nested details have expected/received fields
    const schema = jsonContent.schema;
    const hasExpectedReceived = hasNestedField(schema, ['expected', 'received', 'actual', 'required_format']);

    return {
      id: this.id,
      status: hasExpectedReceived ? 'passed' : 'warning',
      severity: this.severity,
      message: hasExpectedReceived
        ? 'Error response includes expected/received information'
        : 'Consider adding expected vs received values to validation errors',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Include expected and received values in validation errors',
      example: `details:
  type: array
  items:
    type: object
    properties:
      field:
        type: string
      expected:
        type: string
        description: The expected format or value
      received:
        type: string
        description: The actual value that was provided`,
    };
  },
};

/**
 * ERR_007: retry guidance
 * Medium - Agent knows when/how to retry
 */
export const ERR_007: Check = {
  id: 'ERR_007',
  pillar: 'errors',
  name: 'retry guidance',
  description: 'Error responses should indicate if/when retrying is appropriate',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent knows whether to retry and when',
    withoutThis: 'Agent may retry non-retryable errors or wait too long',
    withThis: 'Agent implements optimal retry strategy',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    // Check for 429 (rate limit) and 503 (service unavailable) responses
    const response429 = endpoint.responses['429'];
    const response503 = endpoint.responses['503'];

    const hasRetryableErrors = response429 || response503;
    if (!hasRetryableErrors) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No retryable error responses defined (429, 503)',
      };
    }

    // Check for Retry-After header in retryable responses
    const has429RetryHeader = response429?.headers?.['Retry-After'] || response429?.headers?.['retry-after'];
    const has503RetryHeader = response503?.headers?.['Retry-After'] || response503?.headers?.['retry-after'];

    const issues: string[] = [];
    if (response429 && !has429RetryHeader) {
      issues.push('429 response missing Retry-After header');
    }
    if (response503 && !has503RetryHeader) {
      issues.push('503 response missing Retry-After header');
    }

    // Also check if error schema has retry-related fields
    const errorSchemas = getErrorSchemas(endpoint.responses);
    const hasRetryField = errorSchemas.some(({ schema }) =>
      hasField(schema, ['retry_after', 'retryAfter', 'retry_in', 'retryable'])
    );

    const passed = issues.length === 0 || hasRetryField;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? 'Retry guidance available for retryable errors'
        : `Missing retry guidance: ${issues.join('; ')}`,
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add Retry-After header to retryable error responses',
      example: `'429':
  description: Rate limit exceeded
  headers:
    Retry-After:
      description: Seconds to wait before retrying
      schema:
        type: integer
        example: 60`,
    };
  },
};

/**
 * ERR_008: error documentation link
 * Low - Agent can fetch more context
 */
export const ERR_008: Check = {
  id: 'ERR_008',
  pillar: 'errors',
  name: 'error documentation link',
  description: 'Error responses should link to documentation for more details',
  severity: 'low',
  selfHealing: {
    impact: 'Agent can fetch detailed error documentation',
    withoutThis: 'Agent has limited context about error resolution',
    withThis: 'Agent can retrieve comprehensive error handling guidance',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    const errorSchemas = getErrorSchemas(endpoint.responses);
    if (errorSchemas.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No error response schemas to check',
      };
    }

    const withDocsLink = errorSchemas.filter(({ schema }) =>
      hasField(schema, ['documentation_url', 'docs_url', 'help_url', 'more_info', 'type']) // type is often a URL in RFC 7807
    );

    const passed = withDocsLink.length > 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? 'Error responses include documentation links'
        : 'Consider adding documentation URLs to error responses',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add a documentation URL field to error responses',
      example: `documentation_url:
  type: string
  format: uri
  description: Link to documentation about this error
  example: "https://docs.example.com/errors/VALIDATION_ERROR"`,
    };
  },
};

/**
 * Helper function to check if a schema has a field with one of the given names
 */
function hasField(schema: Schema, fieldNames: string[]): boolean {
  if (!schema.properties) {
    // Check if it's wrapped in allOf/oneOf/anyOf
    const composites = [...(schema.allOf || []), ...(schema.oneOf || []), ...(schema.anyOf || [])];
    for (const composite of composites) {
      if (hasField(composite, fieldNames)) {
        return true;
      }
    }
    return false;
  }

  const propNames = Object.keys(schema.properties).map((n) => n.toLowerCase());
  return fieldNames.some((name) => propNames.includes(name.toLowerCase()));
}

/**
 * Check nested schemas (like details array items) for fields
 */
function hasNestedField(schema: Schema, fieldNames: string[]): boolean {
  if (hasField(schema, fieldNames)) return true;

  // Check nested properties
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasNestedField(prop, fieldNames)) return true;
      // Check array items
      if (prop.items && hasNestedField(prop.items, fieldNames)) return true;
    }
  }

  // Check array items at top level
  if (schema.items && hasNestedField(schema.items, fieldNames)) return true;

  return false;
}

/**
 * Get all error response schemas from responses object
 */
function getErrorSchemas(responses: Record<string, import('../../types/index.js').Response>): Array<{ code: string; schema: Schema }> {
  const result: Array<{ code: string; schema: Schema }> = [];

  for (const [code, response] of Object.entries(responses)) {
    const numCode = parseInt(code, 10);
    if (numCode >= 400 && numCode < 600) {
      const content = response.content;
      if (content) {
        const jsonContent = content['application/json'] || content['application/problem+json'];
        if (jsonContent?.schema) {
          result.push({ code, schema: jsonContent.schema });
        }
      }
    }
  }

  return result;
}

// ============================================
// Live Error Handling Checks (require probing)
// ============================================

/**
 * LIVE_ERR_001: Invalid JSON handling
 * Critical - Agent needs clear feedback when sending malformed data
 */
export const LIVE_ERR_001: Check = {
  id: 'LIVE_ERR_001',
  pillar: 'errors',
  name: 'invalid JSON handling',
  description: 'API should return 400 with clear message for malformed JSON',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can identify and fix malformed request bodies',
    withoutThis: 'Agent cannot determine why request failed - may retry infinitely',
    withThis: 'Agent knows request body was malformed and can attempt to fix it',
  },
  requires: {
    liveProbing: true,
  },

  check(context: CheckContext): CheckResult {
    const { endpoint, malformationResults } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    if (!malformationResults || malformationResults.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag with --sandbox for write operations',
      };
    }

    const invalidJsonTest = malformationResults.find((r) => r.type === 'invalid-json');
    if (!invalidJsonTest) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No request body to test with invalid JSON',
      };
    }

    const { response, evaluation, errorQuality } = invalidJsonTest;

    // Check status code
    if (response.statusCode !== 400) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: `Invalid JSON returned ${response.statusCode} instead of 400`,
        details: {
          expectedStatus: 400,
          actualStatus: response.statusCode,
          responseBody: response.body,
        },
      };
    }

    // Check error quality
    if (errorQuality && !errorQuality.hasMessage) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Invalid JSON returns 400 but no error message',
        details: {
          score: evaluation.score,
          feedback: evaluation.feedback,
        },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Invalid JSON properly rejected with 400 (quality score: ${errorQuality?.score ?? 'N/A'}/100)`,
      details: {
        score: evaluation.score,
        errorQualityScore: errorQuality?.score,
      },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    if (result.details?.actualStatus === 500) {
      return {
        description: 'Add JSON parsing error handling to return 400 instead of 500',
        example: `try {
  const body = JSON.parse(request.body);
} catch (e) {
  return Response.json({
    code: "INVALID_JSON",
    message: "Request body is not valid JSON",
    details: { parseError: e.message }
  }, { status: 400 });
}`,
      };
    }
    return {
      description: 'Return 400 Bad Request for malformed JSON',
      example: `{
  "code": "INVALID_JSON",
  "message": "Request body is not valid JSON"
}`,
    };
  },
};

/**
 * LIVE_ERR_002: Missing required field handling
 * Critical - Agent needs to know which field is missing
 */
export const LIVE_ERR_002: Check = {
  id: 'LIVE_ERR_002',
  pillar: 'errors',
  name: 'missing field identification',
  description: 'API should identify which required field is missing',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can add the specific missing field',
    withoutThis: 'Agent must guess which field to add',
    withThis: 'Agent knows exactly which field to add to fix the request',
  },
  requires: {
    liveProbing: true,
  },

  check(context: CheckContext): CheckResult {
    const { endpoint, malformationResults } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    if (!malformationResults || malformationResults.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag with --sandbox for write operations',
      };
    }

    const missingFieldTest = malformationResults.find((r) => r.type === 'missing-required');
    if (!missingFieldTest) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No required fields to test',
      };
    }

    const { response, evaluation, errorQuality } = missingFieldTest;

    // Check status code (400 or 422)
    if (response.statusCode !== 400 && response.statusCode !== 422) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: `Missing required field returned ${response.statusCode} instead of 400/422`,
        details: {
          expectedStatus: [400, 422],
          actualStatus: response.statusCode,
        },
      };
    }

    // Check if field is identified
    if (errorQuality && !errorQuality.identifiesField) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'Missing field error does not identify which field is missing',
        details: {
          responseBody: response.body,
          feedback: errorQuality.feedback,
        },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Missing required field properly identified (quality score: ${errorQuality?.score ?? 'N/A'}/100)`,
      details: {
        score: evaluation.score,
        errorQualityScore: errorQuality?.score,
      },
    };
  },

  generateFix(): Fix {
    return {
      description: 'Include field name in validation error response',
      example: `{
  "code": "VALIDATION_ERROR",
  "message": "Missing required field",
  "details": [{
    "field": "email",
    "message": "email is required"
  }]
}`,
    };
  },
};

/**
 * LIVE_ERR_003: Wrong type handling
 * High - Agent needs to know the expected type
 */
export const LIVE_ERR_003: Check = {
  id: 'LIVE_ERR_003',
  pillar: 'errors',
  name: 'type mismatch identification',
  description: 'API should identify type mismatches with expected vs received types',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can convert value to correct type',
    withoutThis: 'Agent must guess the expected type',
    withThis: 'Agent knows the expected type and can convert accordingly',
  },
  requires: {
    liveProbing: true,
  },

  check(context: CheckContext): CheckResult {
    const { endpoint, malformationResults } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    if (!malformationResults || malformationResults.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag with --sandbox for write operations',
      };
    }

    const wrongTypeTest = malformationResults.find((r) => r.type === 'wrong-type');
    if (!wrongTypeTest) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No typed fields to test',
      };
    }

    const { response, evaluation, errorQuality } = wrongTypeTest;

    // Check status code (400 or 422)
    if (response.statusCode !== 400 && response.statusCode !== 422) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: `Type mismatch returned ${response.statusCode} instead of 400/422`,
        details: {
          expectedStatus: [400, 422],
          actualStatus: response.statusCode,
        },
      };
    }

    // Check if error suggests fix (mentions expected type)
    if (errorQuality && !errorQuality.suggestsFix) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Type mismatch error does not indicate expected type',
        details: {
          responseBody: response.body,
          feedback: errorQuality.feedback,
        },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Type mismatch properly handled with expected type info (quality score: ${errorQuality?.score ?? 'N/A'}/100)`,
      details: {
        score: evaluation.score,
        errorQualityScore: errorQuality?.score,
      },
    };
  },

  generateFix(): Fix {
    return {
      description: 'Include expected and received types in validation error',
      example: `{
  "code": "TYPE_ERROR",
  "message": "Invalid type for field 'age'",
  "details": [{
    "field": "age",
    "expected": "integer",
    "received": "string",
    "message": "age must be an integer"
  }]
}`,
    };
  },
};

/**
 * LIVE_ERR_004: Overall error response quality
 * High - Aggregate quality of error handling
 */
export const LIVE_ERR_004: Check = {
  id: 'LIVE_ERR_004',
  pillar: 'errors',
  name: 'error response quality',
  description: 'Error responses should be helpful and actionable for AI agents',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can consistently recover from errors',
    withoutThis: 'Agent error handling is hit or miss',
    withThis: 'Agent has reliable information to fix any error',
  },
  requires: {
    liveProbing: true,
  },

  check(context: CheckContext): CheckResult {
    const { endpoint, malformationResults } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    if (!malformationResults || malformationResults.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag with --sandbox for write operations',
      };
    }

    // Calculate average error quality score across all tests
    const testsWithQuality = malformationResults.filter((r) => r.errorQuality);
    if (testsWithQuality.length === 0) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No error responses to evaluate',
      };
    }

    const avgScore = Math.round(
      testsWithQuality.reduce((sum, r) => sum + (r.errorQuality?.score ?? 0), 0) /
        testsWithQuality.length
    );

    // Collect issues
    const issues: string[] = [];
    const allFeedback = new Set<string>();

    for (const test of testsWithQuality) {
      if (test.errorQuality) {
        if (!test.errorQuality.hasErrorCode) allFeedback.add('Missing error code');
        if (!test.errorQuality.hasMessage) allFeedback.add('Missing error message');
        if (!test.errorQuality.messageIsHelpful) allFeedback.add('Error message not helpful');
      }
    }
    issues.push(...allFeedback);

    if (avgScore >= 70) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Error handling quality score: ${avgScore}/100`,
        details: {
          averageScore: avgScore,
          testsEvaluated: testsWithQuality.length,
        },
      };
    } else if (avgScore >= 40) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `Error handling needs improvement: ${avgScore}/100`,
        details: {
          averageScore: avgScore,
          testsEvaluated: testsWithQuality.length,
          issues,
        },
      };
    }

    return {
      id: this.id,
      status: 'failed',
      severity: this.severity,
      message: `Poor error handling quality: ${avgScore}/100`,
      details: {
        averageScore: avgScore,
        testsEvaluated: testsWithQuality.length,
        issues,
      },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const issues = (result.details?.issues as string[]) || [];
    const examples: string[] = [];

    if (issues.includes('Missing error code')) {
      examples.push('"code": "VALIDATION_ERROR"');
    }
    if (issues.includes('Missing error message')) {
      examples.push('"message": "Detailed description of what went wrong"');
    }

    return {
      description: 'Improve error response structure for AI consumption',
      example: `{
  ${examples.join(',\n  ') || '"code": "ERROR_CODE",\n  "message": "Clear error message"'},
  "details": [...],
  "docs": "https://api.example.com/errors/VALIDATION_ERROR"
}`,
    };
  },
};

export const errorChecks: Check[] = [
  ERR_001, ERR_002, ERR_003, ERR_004, ERR_005, ERR_006, ERR_007, ERR_008,
  LIVE_ERR_001, LIVE_ERR_002, LIVE_ERR_003, LIVE_ERR_004,
];
