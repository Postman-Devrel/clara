/**
 * Discoverability Checks - Help AI agents find and understand the API
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * DISC_001: OpenAPI version supported
 * High - Agent can parse the spec
 */
export const DISC_001: Check = {
  id: 'DISC_001',
  pillar: 'discoverability',
  name: 'OpenAPI version supported',
  description: 'API should use a well-supported OpenAPI version',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can parse and understand the API spec',
    withoutThis: 'Agent may not be able to read the spec correctly',
    withThis: 'Agent can use standard tooling to parse the spec',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    const version = api.openApiVersion;

    if (!version) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'OpenAPI version not detected',
      };
    }

    // Check for supported versions
    const supportedVersions = ['2.0', '3.0', '3.1'];
    const majorMinor = version.split('.').slice(0, 2).join('.');

    const isSupported = supportedVersions.some((v) => majorMinor.startsWith(v.split('.')[0]!));

    if (!isSupported) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: `OpenAPI version ${version} may not be well-supported`,
        details: { version, supportedVersions },
      };
    }

    // Check for recommended (modern) version
    const isModern = majorMinor === '3.0' || majorMinor === '3.1';

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: isModern
        ? `Using modern OpenAPI ${version}`
        : `Using OpenAPI ${version} (consider upgrading to 3.x for better tooling support)`,
      details: { version, isModern },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use a well-supported OpenAPI version',
      example: `openapi: "3.0.3"  # or "3.1.0" for latest features

# Benefits of OpenAPI 3.x:
# - Better JSON Schema support
# - Multiple servers with variables
# - Improved security definitions
# - Callbacks and webhooks support`,
    };
  },
};

/**
 * DISC_002: server URL in spec
 * High - Agent knows where to send requests
 */
export const DISC_002: Check = {
  id: 'DISC_002',
  pillar: 'discoverability',
  name: 'server URL in spec',
  description: 'The API spec should include server URLs',
  severity: 'high',
  selfHealing: {
    impact: 'Agent knows where to send API requests',
    withoutThis: 'Agent cannot determine the API base URL',
    withThis: 'Agent can automatically configure request destinations',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    if (!api.servers || api.servers.length === 0) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'No server URLs defined in spec',
      };
    }

    const servers = api.servers;
    const hasValidUrl = servers.some((s) => {
      try {
        // Check if URL is valid (either absolute or relative)
        if (s.url.startsWith('/')) return true;
        new URL(s.url);
        return true;
      } catch {
        return false;
      }
    });

    if (!hasValidUrl) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'Server URLs defined but none are valid',
        details: { servers: servers.map((s) => s.url) },
      };
    }

    // Check for environment indicators (production, staging, etc.)
    const hasProduction = servers.some(
      (s) =>
        s.url.includes('api.') ||
        s.description?.toLowerCase().includes('production') ||
        !s.url.includes('sandbox') && !s.url.includes('staging') && !s.url.includes('dev')
    );

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `${servers.length} server URL(s) defined${hasProduction ? ' (includes production)' : ''}`,
      details: { servers: servers.map((s) => ({ url: s.url, description: s.description })) },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add server URLs to the spec',
      example: `servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://sandbox.api.example.com/v1
    description: Sandbox server for testing`,
    };
  },
};

/**
 * DISC_003: contact info present
 * Low - Agent can report issues
 */
export const DISC_003: Check = {
  id: 'DISC_003',
  pillar: 'discoverability',
  name: 'contact info present',
  description: 'API spec should include contact information',
  severity: 'low',
  selfHealing: {
    impact: 'Agent can escalate issues to API maintainers',
    withoutThis: 'Agent cannot report problems or get help',
    withThis: 'Agent can log contact info for human follow-up on issues',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    const contact = api.info.contact;

    if (!contact) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'No contact information in API spec',
      };
    }

    const hasEmail = !!contact.email;
    const hasUrl = !!contact.url;
    const hasName = !!contact.name;

    if (!hasEmail && !hasUrl) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'Contact info present but missing email or URL',
        details: { contact },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `Contact info present: ${[hasName && contact.name, hasEmail && contact.email, hasUrl && contact.url].filter(Boolean).join(', ')}`,
      details: { contact },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Add contact information to the API spec',
      example: `info:
  contact:
    name: API Support
    email: api-support@example.com
    url: https://developer.example.com/support`,
    };
  },
};

/**
 * DISC_004: API title descriptive
 * Medium - Agent identifies the API
 */
export const DISC_004: Check = {
  id: 'DISC_004',
  pillar: 'discoverability',
  name: 'API title descriptive',
  description: 'API should have a clear, descriptive title',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can identify and reference the API',
    withoutThis: 'Agent cannot distinguish this API from others',
    withThis: 'Agent has clear name for logging and reporting',
  },

  check(context: CheckContext): CheckResult {
    const { api } = context;

    const title = api.info.title;

    if (!title || title.trim().length === 0) {
      return {
        id: this.id,
        status: 'failed',
        severity: this.severity,
        message: 'API has no title',
      };
    }

    const trimmedTitle = title.trim();

    // Check for generic/placeholder titles
    const genericTitles = [
      'api', 'my api', 'sample api', 'test api', 'example api',
      'swagger', 'openapi', 'rest api', 'new api', 'untitled',
    ];

    if (genericTitles.includes(trimmedTitle.toLowerCase())) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `API title "${trimmedTitle}" is too generic`,
        details: { title: trimmedTitle },
      };
    }

    // Check for reasonable length
    if (trimmedTitle.length < 3) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: `API title "${trimmedTitle}" is too short`,
        details: { title: trimmedTitle },
      };
    }

    if (trimmedTitle.length > 100) {
      return {
        id: this.id,
        status: 'warning',
        severity: this.severity,
        message: 'API title is too long (> 100 characters)',
        details: { title: trimmedTitle, length: trimmedTitle.length },
      };
    }

    return {
      id: this.id,
      status: 'passed',
      severity: this.severity,
      message: `API title: "${trimmedTitle}"`,
      details: { title: trimmedTitle },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use a clear, descriptive API title',
      example: `info:
  title: Pet Store API
  # or
  title: Acme Corp Payment Gateway
  # or
  title: User Management Service v2`,
    };
  },
};

export const discoverabilityChecks: Check[] = [DISC_001, DISC_002, DISC_003, DISC_004];
