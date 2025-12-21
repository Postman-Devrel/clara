/**
 * Documentation Checks - Ensure API documentation is complete for AI agents
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * DOC_001: API description present
 * High - Agent understands API purpose
 */
export const DOC_001: Check = {
  id: 'DOC_001',
  pillar: 'documentation',
  name: 'API description present',
  description: 'API should have a description explaining its purpose and capabilities',
  severity: 'high',
  selfHealing: {
    impact: 'Agent understands what the API does',
    withoutThis: 'Agent cannot determine if API is appropriate for task',
    withThis: 'Agent can decide if API fits its needs before exploring endpoints',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    if (!api.info.description || api.info.description.trim().length === 0) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'API has no description',
      };
    }

    const description = api.info.description.trim();
    const isSubstantial = description.length >= 50;

    return {
      id: this.id,
      status: isSubstantial ? 'passed' : 'warning',
      severity: this.severity,
      message: isSubstantial
        ? `API has substantial description (${description.length} chars)`
        : `API description is brief (${description.length} chars) - consider expanding`,
      details: { descriptionLength: description.length },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add a comprehensive API description',
      example: `info:
  title: Pet Store API
  description: |
    The Pet Store API enables management of pets, orders, and inventory.

    ## Key Features
    - Browse available pets by status or category
    - Place and track orders
    - Manage store inventory

    ## Authentication
    Most endpoints require an API key passed in the X-API-Key header.

    ## Rate Limits
    - 1000 requests per hour for free tier
    - 10000 requests per hour for premium tier`,
    };
  },
};

/**
 * DOC_002: External docs linked
 * Medium - Agent can access additional documentation
 */
export const DOC_002: Check = {
  id: 'DOC_002',
  pillar: 'documentation',
  name: 'external docs linked',
  description: 'API should link to external documentation for detailed guides',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can access comprehensive documentation',
    withoutThis: 'Agent limited to information in spec alone',
    withThis: 'Agent can fetch additional context from documentation site',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    const externalDocs = api.externalDocs;

    if (!externalDocs || !externalDocs.url) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'No external documentation linked',
      };
    }

    const hasDescription = !!externalDocs.description;

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `External docs: ${externalDocs.url}${hasDescription ? ` - ${externalDocs.description}` : ''}`,
      details: { externalDocs },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add link to external documentation',
      example: `externalDocs:
  description: Full API documentation and guides
  url: https://developer.example.com/docs`,
    };
  },
};

/**
 * DOC_003: Authentication documented
 * Critical - Agent knows how to authenticate
 */
export const DOC_003: Check = {
  id: 'DOC_003',
  pillar: 'documentation',
  name: 'authentication documented',
  description: 'API authentication methods should be clearly documented',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can authenticate API requests',
    withoutThis: 'Agent cannot access protected endpoints',
    withThis: 'Agent knows exactly how to authenticate requests',
  },

  check(context: CheckContext): CheckResult {
    const { api, endpoint } = context;

    // Check for security schemes at API level
    const securitySchemes = api.securitySchemes;
    const hasSecuritySchemes = securitySchemes && Object.keys(securitySchemes).length > 0;

    // If checking at endpoint level, check endpoint security
    if (endpoint) {
      const endpointSecurity = endpoint.security;

      // If endpoint has empty security array, it's intentionally public
      if (endpointSecurity && endpointSecurity.length === 0) {
        return {
          id: this.id,
          status: 'passed',
          severity: this.severity,
          message: 'Endpoint is explicitly public (no auth required)',
        };
      }

      // If endpoint has security requirements
      if (endpointSecurity && endpointSecurity.length > 0) {
        const schemes = endpointSecurity.flatMap((s) => Object.keys(s));
        return {
          id: this.id,
          status: 'passed',
          severity: this.severity,
          message: `Endpoint uses auth: ${schemes.join(', ')}`,
          details: { security: endpointSecurity },
        };
      }
    }

    // Fall back to API-level security
    if (!hasSecuritySchemes) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'No security schemes defined - API may be public or auth is undocumented',
      };
    }

    const schemes = Object.entries(securitySchemes).map(([name, scheme]) => ({
      name,
      type: scheme.type,
      description: scheme.description,
    }));

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Security schemes defined: ${schemes.map((s) => `${s.name} (${s.type})`).join(', ')}`,
      details: { securitySchemes: schemes },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Document API authentication methods',
      example: `components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login

security:
  - ApiKeyAuth: []`,
    };
  },
};

/**
 * DOC_004: Spec matches documentation
 * High - Requires Parallel AI to verify
 */
export const DOC_004: Check = {
  id: 'DOC_004',
  pillar: 'documentation',
  name: 'spec matches documentation',
  description: 'OpenAPI spec should match external documentation',
  severity: 'high',
  requires: {
    parallelAi: true,
  },
  selfHealing: {
    impact: 'Agent has consistent information across sources',
    withoutThis: 'Agent may have conflicting information from spec vs docs',
    withThis: 'Agent can trust spec matches official documentation',
  },

  check(context: CheckContext): CheckResult {
    const { parallelDocs, endpoint } = context;

    // Skip if no parallel docs context
    if (!parallelDocs) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'Parallel AI integration required - use --parallel-key flag',
      };
    }

    // Skip if docs not found
    if (!parallelDocs.found) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `Documentation not found for ${endpoint?.method ?? ''} ${endpoint?.path ?? 'endpoint'}`,
        details: {
          confidence: parallelDocs.confidence,
        },
      };
    }

    // Check comparison results
    if (!parallelDocs.comparison) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Documentation found but comparison not performed',
        details: { url: parallelDocs.url },
      };
    }

    const { comparison } = parallelDocs;
    const criticalDiscrepancies = comparison.discrepancies.filter(
      (d) => d.severity === 'critical' || d.severity === 'high'
    );

    if (comparison.match && criticalDiscrepancies.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Spec matches documentation (${comparison.confidence}% confidence)`,
        details: {
          url: parallelDocs.url,
          confidence: comparison.confidence,
          discrepancyCount: comparison.discrepancies.length,
        },
      };
    }

    // Failed - has significant discrepancies
    const discrepancySummary = criticalDiscrepancies
      .slice(0, 3)
      .map((d) => d.message)
      .join('; ');

    return {
      id: this.id,
      status: 'failed',
      severity: this.severity,
      message: `Spec/docs mismatch: ${discrepancySummary || 'discrepancies found'}`,
      details: {
        url: parallelDocs.url,
        confidence: comparison.confidence,
        discrepancies: comparison.discrepancies,
      },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const discrepancies =
      (result.details?.discrepancies as Array<{
        field: string;
        specValue?: string;
        docsValue?: string;
        message: string;
      }>) || [];

    const fixExamples = discrepancies
      .slice(0, 3)
      .map((d) => `- ${d.field}: Update spec or docs to match (${d.message})`)
      .join('\n');

    return {
      description: 'Align OpenAPI spec with external documentation',
      example:
        fixExamples || 'Review discrepancies and update spec or documentation to match',
    };
  },
};

/**
 * DOC_005: Terms of service linked
 * Low - Agent knows usage terms
 */
export const DOC_005: Check = {
  id: 'DOC_005',
  pillar: 'documentation',
  name: 'terms of service linked',
  description: 'API should link to terms of service',
  severity: 'low',
  selfHealing: {
    impact: 'Agent can reference usage terms',
    withoutThis: 'Agent may unknowingly violate usage terms',
    withThis: 'Agent can check terms before potentially restricted operations',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    if (!api.info.termsOfService) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'No terms of service linked',
      };
    }

    // Validate it's a URL
    try {
      new URL(api.info.termsOfService);
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: `Terms of service: ${api.info.termsOfService}`,
        details: { termsOfService: api.info.termsOfService },
      };
    } catch {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `Terms of service present but not a valid URL: ${api.info.termsOfService}`,
      };
    }
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add terms of service link',
      example: `info:
  termsOfService: https://example.com/terms`,
    };
  },
};

/**
 * DOC_006: License specified
 * Low - Agent knows usage rights
 */
export const DOC_006: Check = {
  id: 'DOC_006',
  pillar: 'documentation',
  name: 'license specified',
  description: 'API should specify its license',
  severity: 'low',
  selfHealing: {
    impact: 'Agent knows API usage rights',
    withoutThis: 'Agent cannot determine if usage is permitted',
    withThis: 'Agent can verify usage complies with license terms',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    const license = api.info.license;

    if (!license) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'No license specified',
      };
    }

    const hasName = !!license.name;
    const hasUrl = !!license.url;

    if (!hasName) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'License specified but missing name',
        details: { license },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `License: ${license.name}${hasUrl ? ` (${license.url})` : ''}`,
      details: { license },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add license information',
      example: `info:
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0`,
    };
  },
};

export const documentationChecks: Check[] = [
  DOC_001,
  DOC_002,
  DOC_003,
  DOC_004,
  DOC_005,
  DOC_006,
];
