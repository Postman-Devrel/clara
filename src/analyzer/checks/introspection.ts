/**
 * Introspection Checks - Complete parameter and schema information for AI agents
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * INTRO_001: parameter types defined
 * Critical - Agent can't construct valid requests without type information
 */
export const INTRO_001: Check = {
  id: 'INTRO_001',
  pillar: 'introspection',
  name: 'parameter types defined',
  description: 'All parameters should have their types defined',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can construct valid request parameters',
    withoutThis: 'Agent must guess parameter types, leading to errors',
    withThis: 'Agent knows exact type requirements for each parameter',
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

    if (endpoint.parameters.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No parameters to check',
      };
    }

    const missingTypes: string[] = [];

    for (const param of endpoint.parameters) {
      if (!param.schema?.type) {
        missingTypes.push(`${param.in}:${param.name}`);
      }
    }

    const passed = missingTypes.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'failed',
      severity: this.severity,
      message: passed
        ? `All ${endpoint.parameters.length} parameters have types defined`
        : `Parameters missing type definition: ${missingTypes.join(', ')}`,
      details: passed ? undefined : { missingTypes },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const missingTypes = (result.details?.missingTypes as string[]) || [];

    return {
      description: 'Add type definitions to all parameters',
      example: `schema:
  type: string  # or integer, boolean, array, object
  format: uuid  # optional: uuid, email, date-time, etc.`,
      before: missingTypes.length > 0 ? `Parameters: ${missingTypes.join(', ')}` : undefined,
    };
  },
};

/**
 * INTRO_003: required parameters marked
 * Critical - Agent needs to know what must be provided
 */
export const INTRO_003: Check = {
  id: 'INTRO_003',
  pillar: 'introspection',
  name: 'required parameters marked',
  description: 'Parameters should explicitly indicate whether they are required',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent knows which parameters must be provided',
    withoutThis: 'Agent may omit required parameters or include unnecessary ones',
    withThis: 'Agent can construct minimal valid requests with all required data',
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

    // Path parameters are always required by definition
    const nonPathParams = endpoint.parameters.filter((p) => p.in !== 'path');

    if (nonPathParams.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No non-path parameters to check (path params are implicitly required)',
      };
    }

    // Check that required field is explicitly set (not undefined)
    const ambiguousParams: string[] = [];

    for (const param of nonPathParams) {
      if (param.required === undefined) {
        ambiguousParams.push(`${param.in}:${param.name}`);
      }
    }

    const passed = ambiguousParams.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `All parameters have explicit required status`
        : `Parameters with ambiguous required status: ${ambiguousParams.join(', ')}`,
      details: passed ? undefined : { ambiguousParams },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Explicitly set required: true or required: false for all parameters',
      example: `parameters:
  - name: userId
    in: query
    required: true  # Explicitly mark as required
    schema:
      type: string`,
    };
  },
};

/**
 * INTRO_006: enum values listed
 * Critical - Agent needs to know all valid options
 */
export const INTRO_006: Check = {
  id: 'INTRO_006',
  pillar: 'introspection',
  name: 'enum values listed',
  description: 'Parameters with constrained values should list all valid options as enum',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent knows all valid options for constrained parameters',
    withoutThis: 'Agent must guess valid values or make trial-and-error requests',
    withThis: 'Agent can select from known valid values',
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

    // Look for parameters that appear to need enums based on naming
    const suspiciousParams: string[] = [];
    const enumParams: string[] = [];

    // Common parameter names that typically have constrained values
    const enumIndicators = [
      'status', 'state', 'type', 'kind', 'category', 'role', 'level',
      'priority', 'severity', 'order', 'sort', 'direction', 'format',
      'mode', 'action', 'operation', 'method', 'filter'
    ];

    for (const param of endpoint.parameters) {
      const name = param.name.toLowerCase();
      const hasEnum = param.schema?.enum && param.schema.enum.length > 0;

      if (hasEnum) {
        enumParams.push(param.name);
      } else if (enumIndicators.some((indicator) => name.includes(indicator))) {
        // This parameter name suggests it should have an enum
        suspiciousParams.push(param.name);
      }
    }

    // Also check request body for enum-like fields
    if (endpoint.requestBody?.content) {
      for (const [, mediaType] of Object.entries(endpoint.requestBody.content)) {
        if (mediaType.schema?.properties) {
          for (const [propName, propSchema] of Object.entries(mediaType.schema.properties)) {
            const name = propName.toLowerCase();
            const hasEnum = propSchema.enum && propSchema.enum.length > 0;

            if (hasEnum) {
              enumParams.push(`body.${propName}`);
            } else if (enumIndicators.some((indicator) => name.includes(indicator))) {
              suspiciousParams.push(`body.${propName}`);
            }
          }
        }
      }
    }

    if (suspiciousParams.length === 0 && enumParams.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No enum-like parameters detected',
      };
    }

    const passed = suspiciousParams.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `${enumParams.length} parameters have enum values defined`
        : `Parameters that may need enum values: ${suspiciousParams.join(', ')}`,
      details: { enumParams, suspiciousParams },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const suspicious = (result.details?.suspiciousParams as string[]) || [];

    return {
      description: 'Add enum values for parameters with constrained options',
      example: `schema:
  type: string
  enum:
    - active
    - inactive
    - pending`,
      before: suspicious.length > 0 ? `Parameters: ${suspicious.join(', ')}` : undefined,
    };
  },
};

/**
 * INTRO_002: parameter descriptions
 * High - Agent benefits from understanding parameter purpose
 */
export const INTRO_002: Check = {
  id: 'INTRO_002',
  pillar: 'introspection',
  name: 'parameter descriptions',
  description: 'Parameters should have descriptions explaining their purpose',
  severity: 'high',
  selfHealing: {
    impact: 'Agent understands parameter purpose and usage',
    withoutThis: 'Agent must infer parameter meaning from name alone',
    withThis: 'Agent has clear guidance on how to use each parameter',
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

    if (endpoint.parameters.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No parameters to check',
      };
    }

    const missingDescriptions: string[] = [];

    for (const param of endpoint.parameters) {
      if (!param.description || param.description.trim().length === 0) {
        missingDescriptions.push(`${param.in}:${param.name}`);
      }
    }

    const passed = missingDescriptions.length === 0;
    const partial = missingDescriptions.length < endpoint.parameters.length;

    return {
      id: this.id,
      status: passed ? 'passed' : partial ? 'warning' : 'failed',
      severity: this.severity,
      message: passed
        ? `All ${endpoint.parameters.length} parameters have descriptions`
        : `Parameters missing descriptions: ${missingDescriptions.join(', ')}`,
      details: passed ? undefined : { missingDescriptions },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const missing = (result.details?.missingDescriptions as string[]) || [];

    return {
      description: 'Add descriptions to all parameters',
      example: `parameters:
  - name: userId
    in: path
    description: The unique identifier of the user to retrieve
    required: true
    schema:
      type: string`,
      before: missing.length > 0 ? `Parameters: ${missing.join(', ')}` : undefined,
    };
  },
};

/**
 * INTRO_004: request examples
 * High - Agent can construct valid requests from examples
 */
export const INTRO_004: Check = {
  id: 'INTRO_004',
  pillar: 'introspection',
  name: 'request examples',
  description: 'Request bodies should include examples for AI agents to reference',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can construct valid request payloads from examples',
    withoutThis: 'Agent must construct requests from schema alone, prone to errors',
    withThis: 'Agent has concrete examples to model requests after',
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

    // Only applies to endpoints with request bodies
    if (!endpoint.requestBody?.content) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No request body to check',
      };
    }

    const contentTypes = Object.keys(endpoint.requestBody.content);
    const missingExamples: string[] = [];

    for (const [contentType, mediaType] of Object.entries(endpoint.requestBody.content)) {
      const hasExample = mediaType.example !== undefined;
      const hasExamples = mediaType.examples && Object.keys(mediaType.examples).length > 0;
      const hasSchemaExample = mediaType.schema?.example !== undefined;

      if (!hasExample && !hasExamples && !hasSchemaExample) {
        missingExamples.push(contentType);
      }
    }

    const passed = missingExamples.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'failed',
      severity: this.severity,
      message: passed
        ? `Request body has examples for ${contentTypes.length} content type(s)`
        : `Request body missing examples for: ${missingExamples.join(', ')}`,
      details: passed ? undefined : { missingExamples },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add examples to request body content types',
      example: `requestBody:
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/Pet'
      example:
        id: 1
        name: "Fluffy"
        status: "available"`,
    };
  },
};

/**
 * INTRO_005: response examples
 * High - Agent can understand response structure from examples
 */
export const INTRO_005: Check = {
  id: 'INTRO_005',
  pillar: 'introspection',
  name: 'response examples',
  description: 'Responses should include examples for AI agents to understand output format',
  severity: 'high',
  selfHealing: {
    impact: 'Agent understands response structure through concrete examples',
    withoutThis: 'Agent must parse schema to understand response format',
    withThis: 'Agent can quickly identify expected response shape',
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

    const responses = Object.entries(endpoint.responses);
    if (responses.length === 0) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'No responses defined',
      };
    }

    const missingExamples: string[] = [];
    let hasAnyContent = false;

    for (const [statusCode, response] of responses) {
      if (!response.content) continue;
      hasAnyContent = true;

      for (const [contentType, mediaType] of Object.entries(response.content)) {
        const hasExample = mediaType.example !== undefined;
        const hasExamples = mediaType.examples && Object.keys(mediaType.examples).length > 0;
        const hasSchemaExample = mediaType.schema?.example !== undefined;

        if (!hasExample && !hasExamples && !hasSchemaExample) {
          missingExamples.push(`${statusCode}:${contentType}`);
        }
      }
    }

    if (!hasAnyContent) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No response content to check',
      };
    }

    const passed = missingExamples.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? 'All responses with content have examples'
        : `Responses missing examples: ${missingExamples.join(', ')}`,
      details: passed ? undefined : { missingExamples },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add examples to response content types',
      example: `responses:
  '200':
    description: Successful response
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Pet'
        example:
          id: 1
          name: "Fluffy"
          status: "available"`,
    };
  },
};

/**
 * INTRO_007: format specified
 * Medium - Agent benefits from knowing data formats
 */
export const INTRO_007: Check = {
  id: 'INTRO_007',
  pillar: 'introspection',
  name: 'format specified',
  description: 'String parameters should specify format when applicable (uuid, email, date-time, etc.)',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can generate correctly formatted values',
    withoutThis: 'Agent may provide incorrectly formatted strings',
    withThis: 'Agent knows exact format requirements for string values',
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

    // Check parameters for missing formats
    const missingFormats: string[] = [];

    // Common parameter names that typically need format hints
    const formatIndicators: Record<string, string[]> = {
      'date-time': ['date', 'time', 'timestamp', 'created', 'updated', 'modified', 'expires'],
      'email': ['email', 'mail'],
      'uuid': ['id', 'uuid', 'guid'],
      'uri': ['url', 'uri', 'link', 'href', 'website'],
      'ipv4': ['ip', 'ipv4', 'ipaddress'],
      'ipv6': ['ipv6'],
    };

    for (const param of endpoint.parameters) {
      const schema = param.schema;
      if (!schema || schema.type !== 'string') continue;
      if (schema.format) continue; // Already has format

      const name = param.name.toLowerCase();

      for (const [format, indicators] of Object.entries(formatIndicators)) {
        if (indicators.some((ind) => name.includes(ind))) {
          missingFormats.push(`${param.name} (suggested: ${format})`);
          break;
        }
      }
    }

    // Also check request body properties
    if (endpoint.requestBody?.content) {
      for (const [, mediaType] of Object.entries(endpoint.requestBody.content)) {
        if (!mediaType.schema?.properties) continue;

        for (const [propName, propSchema] of Object.entries(mediaType.schema.properties)) {
          if (propSchema.type !== 'string' || propSchema.format) continue;

          const name = propName.toLowerCase();

          for (const [format, indicators] of Object.entries(formatIndicators)) {
            if (indicators.some((ind) => name.includes(ind))) {
              missingFormats.push(`body.${propName} (suggested: ${format})`);
              break;
            }
          }
        }
      }
    }

    if (missingFormats.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No format hints needed or all formats specified',
      };
    }

    return {
      id: this.id,
      status: 'warning',
      severity: this.severity,
      message: `Parameters that may benefit from format specification: ${missingFormats.join(', ')}`,
      details: { missingFormats },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add format specification to string parameters',
      example: `schema:
  type: string
  format: uuid  # Common formats: uuid, email, date-time, uri, ipv4, ipv6`,
    };
  },
};

/**
 * INTRO_008: pattern specified
 * Medium - Agent can validate values before sending
 */
export const INTRO_008: Check = {
  id: 'INTRO_008',
  pillar: 'introspection',
  name: 'pattern specified',
  description: 'String parameters with specific formats should include regex patterns',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can validate values before making requests',
    withoutThis: 'Agent discovers invalid formats only through error responses',
    withThis: 'Agent can pre-validate values to avoid unnecessary API calls',
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

    const missingPatterns: string[] = [];
    const hasPatterns: string[] = [];

    // Formats that would benefit from patterns
    const formatsThatNeedPatterns = ['uuid', 'email', 'ipv4', 'ipv6', 'hostname'];

    for (const param of endpoint.parameters) {
      const schema = param.schema;
      if (!schema || schema.type !== 'string') continue;

      if (schema.pattern) {
        hasPatterns.push(param.name);
      } else if (schema.format && formatsThatNeedPatterns.includes(schema.format)) {
        // Has format but no pattern - could benefit from pattern
        missingPatterns.push(`${param.name} (format: ${schema.format})`);
      }
    }

    if (missingPatterns.length === 0 && hasPatterns.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No parameters requiring pattern validation detected',
      };
    }

    if (missingPatterns.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `${hasPatterns.length} parameter(s) have patterns defined`,
      };
    }

    return {
      id: this.id,
      status: 'warning',
      severity: this.severity,
      message: `Parameters that could benefit from pattern validation: ${missingPatterns.join(', ')}`,
      details: { missingPatterns, hasPatterns },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add pattern validation to formatted string parameters',
      example: `schema:
  type: string
  format: uuid
  pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"`,
    };
  },
};

export const introspectionChecks: Check[] = [
  INTRO_001,
  INTRO_002,
  INTRO_003,
  INTRO_004,
  INTRO_005,
  INTRO_006,
  INTRO_007,
  INTRO_008,
];
