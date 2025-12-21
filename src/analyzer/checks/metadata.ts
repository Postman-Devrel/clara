/**
 * Metadata Checks - Machine-consumable metadata for AI agents
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * META_001: operationId present
 * Critical - Agent cannot reference operations without unique IDs
 */
export const META_001: Check = {
  id: 'META_001',
  pillar: 'metadata',
  name: 'operationId present',
  description: 'Every operation should have a unique operationId for AI agents to reference',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent can reference and track specific operations',
    withoutThis: 'Agent cannot reliably identify or reference specific API operations',
    withThis: 'Agent can programmatically reference operations by their unique ID',
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

    const hasOperationId = !!endpoint.operationId;

    return {
      id: this.id,
      status: hasOperationId ? 'passed' : 'failed',
      severity: this.severity,
      message: hasOperationId
        ? `operationId present: ${endpoint.operationId}`
        : `Missing operationId for ${endpoint.method} ${endpoint.path}`,
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    const { endpoint } = context;
    if (!endpoint) {
      return { description: 'Add operationId to the operation' };
    }

    // Generate a suggested operationId based on method and path
    const pathParts = endpoint.path
      .split('/')
      .filter(Boolean)
      .map((part) => {
        // Handle path parameters like {id}
        if (part.startsWith('{') && part.endsWith('}')) {
          return 'By' + capitalize(part.slice(1, -1));
        }
        return capitalize(part);
      });

    const methodPrefixes: Record<string, string> = {
      GET: pathParts.length > 1 && pathParts[pathParts.length - 1]?.startsWith('By') ? 'get' : 'list',
      POST: 'create',
      PUT: 'update',
      PATCH: 'patch',
      DELETE: 'delete',
    };

    const prefix = methodPrefixes[endpoint.method] || endpoint.method.toLowerCase();
    const suggestedId = prefix + pathParts.join('');

    return {
      description: 'Add a unique operationId to identify this operation',
      example: `operationId: "${suggestedId}"`,
    };
  },
};

/**
 * META_002: operationId descriptive
 * High - Agent can infer purpose from well-named operations
 */
export const META_002: Check = {
  id: 'META_002',
  pillar: 'metadata',
  name: 'operationId descriptive',
  description: 'operationId should be descriptive and follow naming conventions',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can infer operation purpose from ID',
    withoutThis: 'Agent must rely on descriptions to understand operation purpose',
    withThis: 'Agent can quickly understand operation intent from its ID',
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

    if (!endpoint.operationId) {
      return {
        id: this.id,
        status: 'skipped',
        severity: this.severity,
        message: 'No operationId to evaluate (see META_001)',
      };
    }

    const issues: string[] = [];

    // Check for common anti-patterns
    const id = endpoint.operationId;

    // Too short (less than 5 chars)
    if (id.length < 5) {
      issues.push('operationId is too short (< 5 characters)');
    }

    // Contains only numbers or generic names
    if (/^(op|operation|endpoint|api|get|post|put|delete|patch)\d*$/i.test(id)) {
      issues.push('operationId is too generic');
    }

    // Contains meaningless suffixes
    if (/\d{3,}$/.test(id)) {
      issues.push('operationId ends with numeric suffix');
    }

    // Check for camelCase or snake_case consistency
    const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(id);
    const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(id);
    const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(id);
    const isKebabCase = /^[a-z][a-z0-9-]*$/.test(id);

    if (!isCamelCase && !isSnakeCase && !isPascalCase && !isKebabCase) {
      issues.push('operationId does not follow a consistent naming convention');
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'failed',
      severity: this.severity,
      message: passed
        ? `operationId "${id}" is descriptive`
        : `operationId "${id}" issues: ${issues.join('; ')}`,
      details: passed ? undefined : { issues },
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use a descriptive, consistent operationId',
      example: `operationId should:
- Be descriptive (e.g., "listUsers", "createOrder", "getUserById")
- Follow camelCase convention
- Start with a verb (get, list, create, update, delete)
- Include the resource name`,
      before: context.endpoint?.operationId || 'op1',
      after: 'listUsers or getUserById',
    };
  },
};

/**
 * META_003: summary present
 * High - Agent needs concise operation description
 */
export const META_003: Check = {
  id: 'META_003',
  pillar: 'metadata',
  name: 'summary present',
  description: 'Every operation should have a summary for quick understanding',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can quickly understand operation purpose',
    withoutThis: 'Agent must parse description or infer from operationId',
    withThis: 'Agent has immediate access to concise operation summary',
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

    const hasSummary = !!endpoint.summary && endpoint.summary.trim().length > 0;

    return {
      id: this.id,
      status: hasSummary ? 'passed' : 'failed',
      severity: this.severity,
      message: hasSummary
        ? `Summary present: "${endpoint.summary}"`
        : `Missing summary for ${endpoint.method} ${endpoint.path}`,
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    const { endpoint } = context;

    return {
      description: 'Add a concise summary describing the operation',
      example: `summary: "Retrieve a list of ${endpoint?.path.split('/').filter(Boolean)[0] || 'resources'}"`,
    };
  },
};

/**
 * META_004: description present
 * Medium - Agent benefits from detailed context
 */
export const META_004: Check = {
  id: 'META_004',
  pillar: 'metadata',
  name: 'description present',
  description: 'Operations should have a detailed description explaining behavior',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent has detailed context about operation behavior',
    withoutThis: 'Agent has limited understanding of edge cases and nuances',
    withThis: 'Agent can understand complex operation behavior and edge cases',
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

    const hasDescription = !!endpoint.description && endpoint.description.trim().length > 0;
    const isSubstantial = hasDescription && endpoint.description!.trim().length >= 20;

    return {
      id: this.id,
      status: isSubstantial ? 'passed' : hasDescription ? 'warning' : 'failed',
      severity: this.severity,
      message: isSubstantial
        ? 'Description present and substantial'
        : hasDescription
          ? 'Description present but too brief (< 20 characters)'
          : `Missing description for ${endpoint.method} ${endpoint.path}`,
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    const { endpoint } = context;

    return {
      description: 'Add a detailed description explaining the operation',
      example: `description: |
  Retrieves a list of ${endpoint?.path.split('/').filter(Boolean)[0] || 'resources'}.

  This endpoint supports pagination and filtering.
  Returns an empty array if no results match.`,
    };
  },
};

/**
 * META_005: tags present
 * Medium - Agent can discover related operations
 */
export const META_005: Check = {
  id: 'META_005',
  pillar: 'metadata',
  name: 'tags present',
  description: 'Operations should be organized with tags for discoverability',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can discover related operations by tag',
    withoutThis: 'Agent must scan all operations to find related functionality',
    withThis: 'Agent can efficiently find related operations within a domain',
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

    const hasTags = !!endpoint.tags && endpoint.tags.length > 0;

    return {
      id: this.id,
      status: hasTags ? 'passed' : 'failed',
      severity: this.severity,
      message: hasTags
        ? `Tags present: ${endpoint.tags!.join(', ')}`
        : `Missing tags for ${endpoint.method} ${endpoint.path}`,
    };
  },

  generateFix(context: CheckContext, _result: CheckResult): Fix {
    const { endpoint } = context;
    const resource = endpoint?.path.split('/').filter(Boolean)[0] || 'resources';

    return {
      description: 'Add tags to organize and categorize the operation',
      example: `tags:
  - ${resource}`,
    };
  },
};

/**
 * META_006: deprecated marked
 * Low - Agent avoids deprecated operations
 */
export const META_006: Check = {
  id: 'META_006',
  pillar: 'metadata',
  name: 'deprecated marked',
  description: 'Deprecated operations should be clearly marked',
  severity: 'low',
  selfHealing: {
    impact: 'Agent avoids using deprecated operations',
    withoutThis: 'Agent may use soon-to-be-removed functionality',
    withThis: 'Agent can prefer non-deprecated alternatives',
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

    // This check passes if:
    // 1. The endpoint is not deprecated (no action needed)
    // 2. The endpoint is deprecated AND properly marked
    // It fails if we detect hints of deprecation but no explicit marking

    const isMarkedDeprecated = endpoint.deprecated === true;
    const descriptionHints = (endpoint.description || '').toLowerCase();
    const summaryHints = (endpoint.summary || '').toLowerCase();

    const hasDeprecationHints =
      descriptionHints.includes('deprecat') ||
      descriptionHints.includes('obsolete') ||
      descriptionHints.includes('legacy') ||
      summaryHints.includes('deprecat') ||
      summaryHints.includes('obsolete') ||
      summaryHints.includes('legacy');

    if (isMarkedDeprecated) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'Operation properly marked as deprecated',
      };
    }

    if (hasDeprecationHints) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Operation mentions deprecation but is not marked deprecated',
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: 'Operation is not deprecated',
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Mark deprecated operations with the deprecated flag',
      example: `deprecated: true
description: |
  **Deprecated**: Use /v2/users instead.
  This endpoint will be removed in version 3.0.`,
    };
  },
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const metadataChecks: Check[] = [META_001, META_002, META_003, META_004, META_005, META_006];
