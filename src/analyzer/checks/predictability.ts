/**
 * Predictability Checks - Ensure consistent, predictable API behavior for AI agents
 */

import type { Check, CheckContext, CheckResult, Fix, Schema } from '../../types/index.js';

/**
 * PRED_001: response schema defined
 * Critical - Agent can parse responses
 */
export const PRED_001: Check = {
  id: 'PRED_001',
  pillar: 'predictability',
  name: 'response schema defined',
  description: 'Success responses should have a defined schema',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can parse and validate response structure',
    withoutThis: 'Agent receives unstructured data it cannot reliably parse',
    withThis: 'Agent knows exact response structure and can extract data',
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

    // Check success responses (2xx)
    const successCodes = Object.keys(endpoint.responses).filter((code) => {
      const numCode = parseInt(code, 10);
      return numCode >= 200 && numCode < 300;
    });

    if (successCodes.length === 0) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: `No success responses defined for ${endpoint.method} ${endpoint.path}`,
      };
    }

    const issues: string[] = [];
    let hasSchema = false;

    for (const code of successCodes) {
      const response = endpoint.responses[code];
      if (!response) continue;

      // 204 No Content doesn't need a schema
      if (code === '204') {
        hasSchema = true;
        continue;
      }

      const content = response.content;
      if (!content) {
        issues.push(`${code}: No content defined`);
        continue;
      }

      // Check for JSON response
      const jsonContent = content['application/json'];
      if (!jsonContent) {
        // Check for other content types
        const hasOtherContent = Object.keys(content).length > 0;
        if (hasOtherContent) {
          hasSchema = true; // Has content, just not JSON
        } else {
          issues.push(`${code}: No JSON content type defined`);
        }
        continue;
      }

      if (!jsonContent.schema) {
        issues.push(`${code}: JSON response missing schema`);
        continue;
      }

      // Check schema has some structure
      const schema = jsonContent.schema;
      if (!schema.type && !schema.properties && !schema.$ref && !schema.allOf && !schema.oneOf) {
        issues.push(`${code}: Schema is empty or undefined`);
        continue;
      }

      hasSchema = true;
    }

    const passed = hasSchema && issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : hasSchema ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? `Response schemas defined for: ${successCodes.join(', ')}`
        : `Response schema issues: ${issues.join('; ')}`,
      details: { successCodes, issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Define a schema for success responses',
      example: `responses:
  '200':
    description: Successful response
    content:
      application/json:
        schema:
          type: object
          properties:
            id:
              type: string
            name:
              type: string
            createdAt:
              type: string
              format: date-time`,
    };
  },
};

/**
 * PRED_006: idempotency documented
 * High - Agent knows safe retry behavior
 */
export const PRED_006: Check = {
  id: 'PRED_006',
  pillar: 'predictability',
  name: 'idempotency documented',
  description: 'Non-GET operations should document idempotency behavior',
  severity: 'high',
  selfHealing: {
    impact: 'Agent knows which operations are safe to retry',
    withoutThis: 'Agent may cause duplicate operations or data corruption on retry',
    withThis: 'Agent can implement safe retry logic based on idempotency guarantees',
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

    // GET, HEAD, OPTIONS are inherently idempotent
    if (['GET', 'HEAD', 'OPTIONS'].includes(endpoint.method)) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `${endpoint.method} is inherently idempotent`,
      };
    }

    // PUT and DELETE are typically idempotent
    if (['PUT', 'DELETE'].includes(endpoint.method)) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `${endpoint.method} is typically idempotent by convention`,
      };
    }

    // POST and PATCH need explicit idempotency documentation
    const hasIdempotencyKey = endpoint.parameters.some(
      (p) =>
        p.name.toLowerCase().includes('idempotency') ||
        p.name.toLowerCase().includes('idempotent') ||
        p.name.toLowerCase() === 'x-idempotency-key' ||
        p.name.toLowerCase() === 'idempotency-key'
    );

    const descriptionMentions =
      (endpoint.description?.toLowerCase().includes('idempoten') ||
        endpoint.summary?.toLowerCase().includes('idempoten')) ??
      false;

    const hasExtension = endpoint.extensions?.['x-idempotent'] !== undefined;

    const hasIdempotencyInfo = hasIdempotencyKey || descriptionMentions || hasExtension;

    return {
      id: this.id,
      status: hasIdempotencyInfo ? 'passed' : 'warning',
      severity: this.severity,
      message: hasIdempotencyInfo
        ? `Idempotency documented for ${endpoint.method} ${endpoint.path}`
        : `${endpoint.method} ${endpoint.path} should document idempotency behavior`,
      details: { hasIdempotencyKey, descriptionMentions, hasExtension },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Document idempotency behavior for this operation',
      example: `# Option 1: Add idempotency key parameter
parameters:
  - name: Idempotency-Key
    in: header
    description: Unique key to ensure idempotent operation
    required: false
    schema:
      type: string

# Option 2: Document in description
description: |
  Creates a new order.

  **Idempotency**: This operation supports idempotency via the
  Idempotency-Key header. Requests with the same key will return
  the same response without creating duplicate orders.

# Option 3: Use extension
x-idempotent: true`,
    };
  },
};

/**
 * PRED_002: response matches schema
 * Critical - Requires live probing to verify
 */
export const PRED_002: Check = {
  id: 'PRED_002',
  pillar: 'predictability',
  name: 'response matches schema',
  description: 'Actual API responses should match the documented schema',
  severity: 'critical',
  requires: {
    liveProbing: true,
  },
  selfHealing: {
    impact: 'Agent receives data exactly as documented',
    withoutThis: 'Agent may encounter undocumented fields or missing data',
    withThis: 'Agent can rely on schema to parse all responses correctly',
  },

  check(context: CheckContext): CheckResult {
    const { endpoint, liveResponse } = context;
    if (!endpoint) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No endpoint in context',
      };
    }

    // This check requires live probing
    if (!liveResponse) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Live probing required - use --probe flag to enable',
      };
    }

    // When live probing is implemented, this will compare actual response to schema
    // For now, return skipped with explanation
    return {
      id: this.id,
      status: 'skipped',
      severity: this.severity,
      message: 'Live response validation not yet implemented',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Ensure API responses match the documented schema',
      example: `Run clara with --probe flag to validate live responses:
  clara analyze spec.json --probe --base-url https://api.example.com`,
    };
  },
};

/**
 * PRED_003: pagination documented
 * High - Agent can navigate large result sets
 */
export const PRED_003: Check = {
  id: 'PRED_003',
  pillar: 'predictability',
  name: 'pagination documented',
  description: 'List endpoints should document pagination parameters and response structure',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can retrieve complete data sets through pagination',
    withoutThis: 'Agent may miss data beyond the first page or make inefficient requests',
    withThis: 'Agent knows how to paginate through all results',
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

    // Only applies to GET endpoints that likely return lists
    if (endpoint.method !== 'GET') {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'Not a GET endpoint - pagination check not applicable',
      };
    }

    // Check if this is a list endpoint (no ID in final path segment)
    const pathSegments = endpoint.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const isListEndpoint = lastSegment && !lastSegment.startsWith('{');

    // Also check operationId for hints
    const opId = (endpoint.operationId || '').toLowerCase();
    const looksLikeList =
      isListEndpoint ||
      opId.startsWith('list') ||
      opId.startsWith('getall') ||
      opId.includes('list') ||
      opId.startsWith('search') ||
      opId.startsWith('query');

    if (!looksLikeList) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'Not a list endpoint - pagination check not applicable',
      };
    }

    // Look for pagination parameters
    const paginationParams = ['page', 'offset', 'skip', 'cursor', 'after', 'before', 'limit', 'size', 'per_page', 'pagesize'];
    const foundPaginationParams = endpoint.parameters.filter((p) =>
      paginationParams.some((pp) => p.name.toLowerCase().includes(pp))
    );

    // Look for pagination in response schema
    let hasPaginationInResponse = false;
    const successResponse = endpoint.responses['200'];
    if (successResponse?.content?.['application/json']?.schema) {
      const schema = successResponse.content['application/json'].schema;
      const props = schema.properties || {};
      const propNames = Object.keys(props).map((k) => k.toLowerCase());

      hasPaginationInResponse =
        propNames.some((p) => ['page', 'total', 'count', 'next', 'previous', 'cursor', 'hasmore', 'has_more', 'nextcursor', 'next_cursor'].includes(p)) ||
        !!(props.meta && typeof props.meta === 'object') ||
        !!(props.pagination && typeof props.pagination === 'object');
    }

    const hasPagination = foundPaginationParams.length > 0 || hasPaginationInResponse;

    if (hasPagination) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Pagination documented: ${foundPaginationParams.map((p) => p.name).join(', ')}${hasPaginationInResponse ? ' (response includes pagination info)' : ''}`,
        details: {
          paginationParams: foundPaginationParams.map((p) => p.name),
          hasPaginationInResponse,
        },
      };
    }

    return {
      id: this.id,
      status: 'warning',
      severity: this.severity,
      message: `List endpoint ${endpoint.path} should document pagination`,
      details: { isListEndpoint: looksLikeList },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Document pagination parameters for list endpoints',
      example: `parameters:
  - name: page
    in: query
    description: Page number (1-indexed)
    schema:
      type: integer
      default: 1
  - name: limit
    in: query
    description: Number of items per page
    schema:
      type: integer
      default: 20
      maximum: 100

responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              type: array
              items:
                $ref: '#/components/schemas/Item'
            pagination:
              type: object
              properties:
                page:
                  type: integer
                totalPages:
                  type: integer
                totalItems:
                  type: integer
                hasMore:
                  type: boolean`,
    };
  },
};

/**
 * PRED_004: consistent response wrapper
 * Medium - Agent can parse responses uniformly
 */
export const PRED_004: Check = {
  id: 'PRED_004',
  pillar: 'predictability',
  name: 'consistent response wrapper',
  description: 'Responses should use a consistent wrapper structure across endpoints',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can use uniform parsing logic across all endpoints',
    withoutThis: 'Agent must implement different parsing logic for each endpoint',
    withThis: 'Agent can extract data using consistent response structure',
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

    // This check is most meaningful across multiple endpoints
    // For single endpoint context, we check if it uses a wrapper pattern
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (!successResponse?.content?.['application/json']?.schema) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No JSON response schema to analyze',
      };
    }

    const schema = successResponse.content['application/json'].schema;
    const props = schema.properties || {};
    const propNames = Object.keys(props);

    // Common wrapper patterns
    const wrapperPatterns = [
      ['data'], // { data: ... }
      ['data', 'meta'], // { data: ..., meta: ... }
      ['data', 'error'], // { data: ..., error: ... }
      ['result'], // { result: ... }
      ['results'], // { results: ... }
      ['items'], // { items: ... }
      ['response'], // { response: ... }
    ];

    const usesWrapper = wrapperPatterns.some((pattern) =>
      pattern.every((p) => propNames.map((n) => n.toLowerCase()).includes(p.toLowerCase()))
    );

    // Check if it returns raw array (not wrapped)
    const returnsRawArray = schema.type === 'array';

    if (returnsRawArray) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Response returns raw array - consider wrapping in object for extensibility',
        details: { structure: 'array' },
      };
    }

    if (usesWrapper) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Response uses wrapper pattern with properties: ${propNames.slice(0, 5).join(', ')}`,
        details: { structure: 'wrapped', properties: propNames },
      };
    }

    // Not necessarily wrong, just check if it's a simple object response
    if (schema.type === 'object' && propNames.length > 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'Response returns object (single resource)',
        details: { structure: 'object', properties: propNames },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: 'Response structure analyzed',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use a consistent response wrapper pattern',
      example: `# Recommended wrapper pattern
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              # Actual response data here
              $ref: '#/components/schemas/Resource'
            meta:
              type: object
              properties:
                requestId:
                  type: string
                timestamp:
                  type: string
                  format: date-time

# Benefits:
# - Consistent structure for agents to parse
# - Room for metadata without breaking changes
# - Can add pagination info to meta for lists`,
    };
  },
};

/**
 * PRED_005: nullable fields marked
 * Medium - Agent handles null values correctly
 */
export const PRED_005: Check = {
  id: 'PRED_005',
  pillar: 'predictability',
  name: 'nullable fields marked',
  description: 'Fields that can be null should be explicitly marked as nullable',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent handles null values correctly',
    withoutThis: 'Agent may fail when encountering unexpected null values',
    withThis: 'Agent knows which fields to check for null before processing',
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

    const fieldsAnalyzed: string[] = [];
    const nullableFields: string[] = [];
    const suspiciousFields: string[] = [];

    // Fields that commonly are nullable but often not marked
    const commonlyNullable = [
      'deleted', 'deletedAt', 'deleted_at',
      'updated', 'updatedAt', 'updated_at',
      'parent', 'parentId', 'parent_id',
      'description', 'note', 'notes', 'comment', 'comments',
      'avatar', 'image', 'photo', 'picture',
      'phone', 'phoneNumber', 'phone_number',
      'address', 'address2', 'city', 'state', 'zip', 'country',
      'middle', 'middleName', 'middle_name',
      'suffix', 'prefix',
      'metadata', 'meta', 'extra', 'custom',
      'endDate', 'end_date', 'completedAt', 'completed_at',
    ];

    // Check response schema
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (successResponse?.content?.['application/json']?.schema) {
      const schema = successResponse.content['application/json'].schema;
      analyzeSchemaForNullable(schema, '', fieldsAnalyzed, nullableFields, suspiciousFields, commonlyNullable);
    }

    // Check request body schema
    if (endpoint.requestBody?.content?.['application/json']?.schema) {
      const schema = endpoint.requestBody.content['application/json'].schema;
      analyzeSchemaForNullable(schema, 'request.', fieldsAnalyzed, nullableFields, suspiciousFields, commonlyNullable);
    }

    if (fieldsAnalyzed.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No fields to analyze for nullable markers',
      };
    }

    if (suspiciousFields.length > 0) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `Fields that may need nullable: ${suspiciousFields.slice(0, 5).join(', ')}${suspiciousFields.length > 5 ? '...' : ''}`,
        details: { suspiciousFields, nullableFields, fieldsAnalyzed: fieldsAnalyzed.length },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Analyzed ${fieldsAnalyzed.length} fields; ${nullableFields.length} marked nullable`,
      details: { nullableFields, fieldsAnalyzed: fieldsAnalyzed.length },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const suspicious = (result.details?.suspiciousFields as string[]) || [];

    return {
      description: 'Mark nullable fields explicitly in the schema',
      example: `schema:
  type: object
  properties:
    id:
      type: string
    deletedAt:
      type: string
      format: date-time
      nullable: true  # Explicitly mark as nullable
    middleName:
      type: string
      nullable: true
    parentId:
      type: string
      nullable: true`,
      before: suspicious.length > 0 ? `Potentially nullable fields: ${suspicious.join(', ')}` : undefined,
    };
  },
};

function analyzeSchemaForNullable(
  schema: Schema,
  prefix: string,
  fieldsAnalyzed: string[],
  nullableFields: string[],
  suspiciousFields: string[],
  commonlyNullable: string[]
): void {
  if (!schema.properties) return;

  const properties = schema.properties;

  for (const [name, propSchema] of Object.entries(properties)) {
    const fullName = prefix + name;
    fieldsAnalyzed.push(fullName);

    if (propSchema.nullable === true) {
      nullableFields.push(fullName);
    } else {
      // Check if this field name commonly is nullable
      const lowerName = name.toLowerCase();
      if (commonlyNullable.some((cn) => lowerName === cn.toLowerCase())) {
        suspiciousFields.push(fullName);
      }
    }

    // Recurse into nested objects
    if (propSchema.properties) {
      analyzeSchemaForNullable(
        propSchema,
        fullName + '.',
        fieldsAnalyzed,
        nullableFields,
        suspiciousFields,
        commonlyNullable
      );
    }
  }
}

export const predictabilityChecks: Check[] = [PRED_001, PRED_002, PRED_003, PRED_004, PRED_005, PRED_006];
