/**
 * Naming Checks - Consistent naming conventions for AI agent predictability
 */

import type { Check, CheckContext, CheckResult, Fix } from '../../types/index.js';

/**
 * NAME_001: consistent casing
 * High - Agent can predict field names
 */
export const NAME_001: Check = {
  id: 'NAME_001',
  pillar: 'naming',
  name: 'consistent casing',
  description: 'Field and property names should use consistent casing (camelCase, snake_case, etc.)',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can predict field name casing',
    withoutThis: 'Agent must handle multiple casing styles, increasing complexity',
    withThis: 'Agent can reliably construct field names following one convention',
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

    const fieldNames: string[] = [];

    // Collect parameter names
    for (const param of endpoint.parameters) {
      fieldNames.push(param.name);
    }

    // Collect request body property names
    if (endpoint.requestBody?.content) {
      for (const [, mediaType] of Object.entries(endpoint.requestBody.content)) {
        if (mediaType.schema?.properties) {
          fieldNames.push(...Object.keys(mediaType.schema.properties));
        }
      }
    }

    // Collect response property names (from 200 response)
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (successResponse?.content) {
      for (const [, mediaType] of Object.entries(successResponse.content)) {
        if (mediaType.schema?.properties) {
          fieldNames.push(...Object.keys(mediaType.schema.properties));
        }
        // Also check array items
        if (mediaType.schema?.items?.properties) {
          fieldNames.push(...Object.keys(mediaType.schema.items.properties));
        }
      }
    }

    if (fieldNames.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No field names to analyze',
      };
    }

    // Detect casing styles
    const styles = detectCasingStyles(fieldNames);
    const dominantStyle = findDominantStyle(styles);
    const inconsistent = findInconsistentFields(fieldNames, dominantStyle);

    const passed = inconsistent.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `Consistent ${dominantStyle} casing detected across ${fieldNames.length} fields`
        : `Inconsistent casing: dominant style is ${dominantStyle}, but found: ${inconsistent.slice(0, 5).join(', ')}${inconsistent.length > 5 ? '...' : ''}`,
      details: { dominantStyle, inconsistent, styles },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    const dominantStyle = (result.details?.dominantStyle as string) || 'camelCase';
    const inconsistent = (result.details?.inconsistent as string[]) || [];

    return {
      description: `Use consistent ${dominantStyle} casing for all field names`,
      example: `# Convert to ${dominantStyle}:
${inconsistent.slice(0, 3).map((f) => `${f} → ${convertToStyle(f, dominantStyle)}`).join('\n')}`,
    };
  },
};

/**
 * NAME_003: HTTP method semantics
 * Critical - Agent knows operation side effects
 */
export const NAME_003: Check = {
  id: 'NAME_003',
  pillar: 'naming',
  name: 'HTTP method semantics',
  description: 'HTTP methods should be used according to their semantic meaning',
  severity: 'critical',
  selfHealing: {
    impact: 'Agent understands operation side effects from HTTP method',
    withoutThis: 'Agent cannot infer if operation is safe to retry or has side effects',
    withThis: 'Agent knows GET is safe, POST creates, PUT replaces, DELETE removes',
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

    const issues: string[] = [];
    const method = endpoint.method;
    const path = endpoint.path.toLowerCase();
    const operationId = (endpoint.operationId || '').toLowerCase();

    // Check for semantic violations
    switch (method) {
      case 'GET':
        // GET should not have a request body
        if (endpoint.requestBody) {
          issues.push('GET request has a request body (should be idempotent with no side effects)');
        }
        // GET with action verbs suggests it might modify data
        if (hasActionVerb(operationId, ['create', 'delete', 'update', 'remove', 'add'])) {
          issues.push(`GET operation "${operationId}" suggests data modification`);
        }
        break;

      case 'POST':
        // POST to a resource with ID might be wrong (should be PUT/PATCH)
        if (path.match(/\/\{[^}]+\}$/) && !path.includes('/action')) {
          // Exception: actions on resources are fine (e.g., /users/{id}/activate)
          const lastSegment = path.split('/').pop() || '';
          if (lastSegment.startsWith('{')) {
            issues.push('POST to specific resource ID (consider PUT for replace, PATCH for update)');
          }
        }
        break;

      case 'PUT':
        // PUT should be to a specific resource
        if (!path.match(/\/\{[^}]+\}/) && !path.endsWith('/')) {
          // Exception: singleton resources
          if (!['config', 'settings', 'profile', 'preferences'].some((s) => path.includes(s))) {
            issues.push('PUT to collection endpoint (PUT should target specific resource)');
          }
        }
        break;

      case 'DELETE':
        // DELETE should not require a request body typically
        if (endpoint.requestBody?.required) {
          issues.push('DELETE requires request body (unusual, consider query parameters)');
        }
        break;

      case 'PATCH':
        // PATCH should be to a specific resource
        if (!path.match(/\/\{[^}]+\}/)) {
          issues.push('PATCH to collection endpoint (PATCH should target specific resource)');
        }
        break;
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'failed',
      severity: this.severity,
      message: passed
        ? `${method} ${endpoint.path} follows HTTP method semantics`
        : `HTTP semantic issues: ${issues.join('; ')}`,
      details: passed ? undefined : { issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use HTTP methods according to their semantic meaning',
      example: `HTTP Method Semantics:
- GET: Retrieve data (safe, idempotent, no body)
- POST: Create new resource (not idempotent)
- PUT: Replace entire resource (idempotent)
- PATCH: Partial update (may not be idempotent)
- DELETE: Remove resource (idempotent)`,
    };
  },
};

// Helper functions

function detectCasingStyles(names: string[]): Record<string, number> {
  const styles: Record<string, number> = {
    camelCase: 0,
    snake_case: 0,
    PascalCase: 0,
    'kebab-case': 0,
    other: 0,
  };

  for (const name of names) {
    if (/^[a-z][a-zA-Z0-9]*$/.test(name) && name.includes(name.toLowerCase()) === false) {
      styles['camelCase'] = (styles['camelCase'] ?? 0) + 1;
    } else if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) {
      styles['snake_case'] = (styles['snake_case'] ?? 0) + 1;
    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      styles['PascalCase'] = (styles['PascalCase'] ?? 0) + 1;
    } else if (/^[a-z][a-z0-9-]*$/.test(name) && name.includes('-')) {
      styles['kebab-case'] = (styles['kebab-case'] ?? 0) + 1;
    } else if (/^[a-z]+$/.test(name)) {
      // Single lowercase word - could be any style
      styles['camelCase'] = (styles['camelCase'] ?? 0) + 1;
    } else {
      styles['other'] = (styles['other'] ?? 0) + 1;
    }
  }

  return styles;
}

function findDominantStyle(styles: Record<string, number>): string {
  let dominant = 'camelCase';
  let maxCount = 0;

  for (const [style, count] of Object.entries(styles)) {
    if (style !== 'other' && count > maxCount) {
      maxCount = count;
      dominant = style;
    }
  }

  return dominant;
}

function findInconsistentFields(names: string[], dominantStyle: string): string[] {
  const inconsistent: string[] = [];

  for (const name of names) {
    const style = detectFieldStyle(name);
    if (style !== dominantStyle && style !== 'ambiguous') {
      inconsistent.push(name);
    }
  }

  return inconsistent;
}

function detectFieldStyle(name: string): string {
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) {
    return 'camelCase';
  }
  if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) {
    return 'snake_case';
  }
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    return 'PascalCase';
  }
  if (/^[a-z][a-z0-9-]*$/.test(name) && name.includes('-')) {
    return 'kebab-case';
  }
  if (/^[a-z]+$/.test(name)) {
    return 'ambiguous'; // Single word, could be any style
  }
  return 'other';
}

function convertToStyle(name: string, style: string): string {
  // Simple conversion for demonstration
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
    .split('_');

  switch (style) {
    case 'camelCase':
      return words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
    case 'snake_case':
      return words.join('_');
    case 'PascalCase':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'kebab-case':
      return words.join('-');
    default:
      return name;
  }
}

function hasActionVerb(text: string, verbs: string[]): boolean {
  return verbs.some((verb) => text.includes(verb));
}

/**
 * NAME_002: resource nouns
 * High - Resources should use nouns, not verbs
 */
export const NAME_002: Check = {
  id: 'NAME_002',
  pillar: 'naming',
  name: 'resource nouns',
  description: 'URL paths should use nouns for resources, not verbs',
  severity: 'high',
  selfHealing: {
    impact: 'Agent can predict resource structure from path',
    withoutThis: 'Agent cannot distinguish resource endpoints from action endpoints',
    withThis: 'Agent understands that paths represent resources to be manipulated',
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

    const issues: string[] = [];
    const pathSegments = endpoint.path
      .split('/')
      .filter((s) => s && !s.startsWith('{'));

    // Common action verbs that shouldn't be in REST resource paths
    const actionVerbs = [
      'get', 'fetch', 'retrieve', 'read',
      'create', 'add', 'insert', 'new',
      'update', 'modify', 'edit', 'change',
      'delete', 'remove', 'destroy',
      'list', 'find', 'search', 'query',
      'do', 'execute', 'run', 'perform',
      'send', 'submit', 'process',
    ];

    // Exceptions - these are acceptable action-style endpoints
    const actionExceptions = [
      'login', 'logout', 'signup', 'signin', 'signout', 'register',
      'activate', 'deactivate', 'enable', 'disable',
      'verify', 'validate', 'confirm',
      'reset', 'refresh', 'revoke',
      'export', 'import', 'download', 'upload',
      'actions', // explicitly named actions collection
    ];

    for (const segment of pathSegments) {
      const lowerSegment = segment.toLowerCase();

      // Skip version segments
      if (/^v\d+$/.test(lowerSegment)) continue;

      // Check if segment is a verb (but not an accepted exception)
      if (actionVerbs.some((v) => lowerSegment === v)) {
        if (!actionExceptions.some((e) => lowerSegment.includes(e))) {
          issues.push(`"/${segment}" is a verb, consider using a noun resource`);
        }
      }
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `Path ${endpoint.path} uses noun resources appropriately`
        : `Path may use verbs instead of nouns: ${issues.join('; ')}`,
      details: passed ? undefined : { issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use nouns for resource paths, let HTTP methods convey the action',
      example: `REST Resource Naming:
- /getUsers → /users (GET)
- /createUser → /users (POST)
- /deleteUser/{id} → /users/{id} (DELETE)
- /updateUser/{id} → /users/{id} (PUT/PATCH)`,
    };
  },
};

/**
 * NAME_004: plural collections
 * Medium - Collection resources should use plural nouns
 */
export const NAME_004: Check = {
  id: 'NAME_004',
  pillar: 'naming',
  name: 'plural collections',
  description: 'Collection endpoints should use plural nouns',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can distinguish collections from singletons',
    withoutThis: 'Agent cannot predict if path returns array or single object',
    withThis: 'Agent knows plural paths return collections, singular paths return items',
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

    const issues: string[] = [];
    const pathSegments = endpoint.path.split('/').filter(Boolean);

    // Common singular/plural pairs and irregulars
    const singularToPlural: Record<string, string> = {
      user: 'users',
      item: 'items',
      product: 'products',
      order: 'orders',
      customer: 'customers',
      category: 'categories',
      company: 'companies',
      person: 'people',
      child: 'children',
      status: 'statuses',
      address: 'addresses',
    };

    // Singletons that are okay to be singular
    const singletonResources = [
      'me', 'self', 'current', 'config', 'settings', 'profile',
      'health', 'status', 'info', 'metadata', 'preferences',
    ];

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]!.toLowerCase();

      // Skip path parameters, version segments
      if (segment.startsWith('{') || /^v\d+$/.test(segment)) continue;

      // Skip singletons
      if (singletonResources.some((s) => segment.includes(s))) continue;

      // Check if this is a collection context (not followed by a path param)
      const nextSegment = pathSegments[i + 1];
      const isCollection = !nextSegment || nextSegment.startsWith('{');

      if (isCollection) {
        // Check if singular when it should be plural
        const expectedPlural = singularToPlural[segment];
        if (expectedPlural) {
          issues.push(`"/${segment}" should be "/${expectedPlural}" (collection)`);
        }
      }
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `Path ${endpoint.path} uses appropriate plural/singular naming`
        : `Potential singular/plural issues: ${issues.join('; ')}`,
      details: passed ? undefined : { issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use plural nouns for collection endpoints',
      example: `Collection Naming:
- /user → /users (collection)
- /users/{id} → correct (item in collection)
- /me, /settings, /profile → correct (singleton)`,
    };
  },
};

/**
 * NAME_005: avoid abbreviations
 * Medium - Avoid unclear abbreviations in names
 */
export const NAME_005: Check = {
  id: 'NAME_005',
  pillar: 'naming',
  name: 'avoid abbreviations',
  description: 'Avoid unclear abbreviations that AI agents may not understand',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent can understand field and parameter names',
    withoutThis: 'Agent may misinterpret abbreviated names',
    withThis: 'Agent has clear, readable names to work with',
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

    const issues: string[] = [];

    // Common problematic abbreviations and their expansions
    const problematicAbbreviations: Record<string, string> = {
      usr: 'user',
      msg: 'message',
      pwd: 'password',
      addr: 'address',
      amt: 'amount',
      qty: 'quantity',
      num: 'number',
      cnt: 'count',
      desc: 'description',
      cat: 'category',
      dt: 'date',
      tm: 'time',
      val: 'value',
      cust: 'customer',
      prod: 'product',
      idx: 'index',
      pos: 'position',
      len: 'length',
      sz: 'size',
      buf: 'buffer',
      tmp: 'temporary',
      cfg: 'config',
      max: 'maximum',
      min: 'minimum',
      avg: 'average',
      ref: 'reference',
      attr: 'attribute',
      prop: 'property',
      obj: 'object',
      arr: 'array',
      fn: 'function',
      cb: 'callback',
      ret: 'return',
      resp: 'response',
      req: 'request',
      err: 'error',
    };

    // Acceptable abbreviations (well-known)
    const acceptableAbbreviations = [
      'id', 'url', 'uri', 'api', 'uuid', 'html', 'css', 'json', 'xml',
      'http', 'https', 'ftp', 'ssh', 'ssl', 'tls', 'ip', 'dns', 'tcp', 'udp',
      'pdf', 'csv', 'sql', 'db', 'os', 'cpu', 'ram', 'io',
    ];

    const namesToCheck: Array<{ name: string; source: string }> = [];

    // Collect parameter names
    for (const param of endpoint.parameters) {
      namesToCheck.push({ name: param.name, source: 'parameter' });
    }

    // Collect request body property names
    if (endpoint.requestBody?.content) {
      for (const [, mediaType] of Object.entries(endpoint.requestBody.content)) {
        if (mediaType.schema?.properties) {
          for (const propName of Object.keys(mediaType.schema.properties)) {
            namesToCheck.push({ name: propName, source: 'request body' });
          }
        }
      }
    }

    // Check each name
    for (const { name, source } of namesToCheck) {
      const lowerName = name.toLowerCase();

      // Skip acceptable abbreviations
      if (acceptableAbbreviations.includes(lowerName)) continue;

      // Check for problematic abbreviations
      for (const [abbrev, expansion] of Object.entries(problematicAbbreviations)) {
        if (lowerName === abbrev || lowerName.endsWith(abbrev) || lowerName.startsWith(abbrev)) {
          // Verify it's actually the abbreviation, not part of a longer word
          const pattern = new RegExp(`(^|[_-])${abbrev}([_-]|$)`, 'i');
          if (pattern.test(name) || name.toLowerCase() === abbrev) {
            issues.push(`${source} "${name}" uses abbreviation "${abbrev}" (consider "${expansion}")`);
            break;
          }
        }
      }
    }

    if (namesToCheck.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No names to check for abbreviations',
      };
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? 'Names use clear, non-abbreviated terms'
        : `Found potentially unclear abbreviations: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`,
      details: passed ? undefined : { issues },
    };
  },

  generateFix(_context: CheckContext, _result: CheckResult): Fix {
    return {
      description: 'Use full, descriptive names instead of abbreviations',
      example: `Avoid Abbreviations:
- usr → user
- msg → message
- qty → quantity
- desc → description

Acceptable abbreviations: id, url, api, uuid, json, xml`,
    };
  },
};

/**
 * NAME_006: path parameter naming
 * Medium - Path parameters should have descriptive names
 */
export const NAME_006: Check = {
  id: 'NAME_006',
  pillar: 'naming',
  name: 'path parameter naming',
  description: 'Path parameters should have descriptive names indicating their purpose',
  severity: 'medium',
  selfHealing: {
    impact: 'Agent understands what value to provide for path parameters',
    withoutThis: 'Agent may not know what type of ID or value is expected',
    withThis: 'Agent can clearly identify what parameter value is needed',
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

    const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
    if (pathParams.length === 0) {
      return {
        id: this.id,
        status: 'passed',
        severity: this.severity,
        message: 'No path parameters to check',
      };
    }

    const issues: string[] = [];

    // Generic/vague parameter names that should be more specific
    const vaguenames = ['id', 'key', 'value', 'param', 'arg', 'data', 'item', 'name'];

    for (const param of pathParams) {
      const lowerName = param.name.toLowerCase();

      // Check for single-letter parameter names
      if (param.name.length === 1) {
        issues.push(`"${param.name}" is too short - use descriptive name like "userId" or "orderId"`);
        continue;
      }

      // Check for generic names that don't indicate what resource they identify
      if (vaguenames.includes(lowerName)) {
        // Look at path to determine what the parameter likely refers to
        const pathParts = endpoint.path.split('/');
        const paramIndex = pathParts.findIndex((p) => p === `{${param.name}}`);
        const precedingResource = pathParts[paramIndex - 1];

        if (precedingResource && !precedingResource.startsWith('{')) {
          const suggestion = `${precedingResource.replace(/s$/, '')}Id`;
          issues.push(`"${param.name}" is generic - consider "${suggestion}" for clarity`);
        } else {
          issues.push(`"${param.name}" is generic - use more descriptive name like "userId", "orderId"`);
        }
      }

      // Check that param name relates to the preceding resource
      const pathParts = endpoint.path.split('/');
      const paramIndex = pathParts.findIndex((p) => p === `{${param.name}}`);
      const precedingResource = pathParts[paramIndex - 1];

      if (precedingResource && !precedingResource.startsWith('{')) {
        const resourceRoot = precedingResource.replace(/s$/, '').toLowerCase();
        const paramRoot = param.name.toLowerCase().replace(/id$/i, '');

        // If param name doesn't relate to the resource at all, it might be confusing
        if (paramRoot.length > 2 && !paramRoot.includes(resourceRoot) && !resourceRoot.includes(paramRoot)) {
          // This might be intentional (e.g., /users/{orgId}/...) so just warn
          // Only flag if it's a generic name
          if (vaguenames.includes(lowerName)) {
            issues.push(`"${param.name}" in /${precedingResource} context - consider "${resourceRoot}Id"`);
          }
        }
      }
    }

    const passed = issues.length === 0;

    return {
      id: this.id,
      status: passed ? 'passed' : 'warning',
      severity: this.severity,
      message: passed
        ? `Path parameters have descriptive names`
        : `Path parameter naming issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`,
      details: passed ? undefined : { issues, pathParams: pathParams.map((p) => p.name) },
    };
  },

  generateFix(_context: CheckContext, result: CheckResult): Fix {
    return {
      description: 'Use descriptive names for path parameters that indicate their purpose',
      example: `Path Parameter Naming:
- /users/{id} → /users/{userId}
- /orders/{key} → /orders/{orderId}
- /items/{n} → /items/{itemId}

Good: /users/{userId}/orders/{orderId}`,
      before: result.details?.pathParams ? `Current: ${(result.details.pathParams as string[]).join(', ')}` : undefined,
    };
  },
};

export const namingChecks: Check[] = [NAME_001, NAME_002, NAME_003, NAME_004, NAME_005, NAME_006];
