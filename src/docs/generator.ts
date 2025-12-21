/**
 * AI-Ready Documentation Generator
 *
 * Generates structured markdown documentation from OpenAPI specs,
 * optimized for AI agent consumption.
 */

import type {
  NormalizedAPI,
  NormalizedEndpoint,
  Schema,
  Parameter,
  SecurityScheme,
} from '../types/index.js';

export interface DocsGeneratorOptions {
  includeExamples?: boolean;
  includeErrorHandling?: boolean;
  groupByTag?: boolean;
  outputDir?: string;
}

export interface GeneratedDocs {
  overview: string;
  authentication: string;
  endpoints: Map<string, string>; // tag/filename -> content
  errors: string;
  quickstart: string;
  allInOne?: string; // Combined single file
}

export class DocsGenerator {
  private options: Required<DocsGeneratorOptions>;

  constructor(options: DocsGeneratorOptions = {}) {
    this.options = {
      includeExamples: options.includeExamples ?? true,
      includeErrorHandling: options.includeErrorHandling ?? true,
      groupByTag: options.groupByTag ?? true,
      outputDir: options.outputDir ?? './docs',
    };
  }

  /**
   * Generate all documentation files
   */
  generate(api: NormalizedAPI): GeneratedDocs {
    const overview = this.generateOverview(api);
    const authentication = this.generateAuthentication(api);
    const endpoints = this.generateEndpoints(api);
    const errors = this.generateErrorGuide(api);
    const quickstart = this.generateQuickstart(api);

    // Generate all-in-one file
    const allInOne = this.generateAllInOne(api, {
      overview,
      authentication,
      endpoints,
      errors,
      quickstart,
    });

    return {
      overview,
      authentication,
      endpoints,
      errors,
      quickstart,
      allInOne,
    };
  }

  /**
   * Generate a single combined markdown file
   */
  generateSingleFile(api: NormalizedAPI): string {
    return this.generate(api).allInOne ?? '';
  }

  // ============================================
  // Section Generators
  // ============================================

  private generateOverview(api: NormalizedAPI): string {
    const lines: string[] = [];

    lines.push(`# ${api.info.title}`);
    lines.push('');
    lines.push(`> Version: ${api.info.version}`);
    lines.push('');

    if (api.info.description) {
      lines.push('## Overview');
      lines.push('');
      lines.push(api.info.description);
      lines.push('');
    }

    // Base URL
    if (api.servers.length > 0) {
      lines.push('## Base URL');
      lines.push('');
      for (const server of api.servers) {
        lines.push(`- \`${server.url}\`${server.description ? ` - ${server.description}` : ''}`);
      }
      lines.push('');
    }

    // Quick stats
    lines.push('## API Summary');
    lines.push('');
    lines.push(`- **Total Endpoints:** ${api.endpoints.length}`);

    const methods = this.countMethods(api.endpoints);
    lines.push(`- **Methods:** ${Object.entries(methods).map(([m, c]) => `${c} ${m}`).join(', ')}`);

    const tags = this.getUniqueTags(api.endpoints);
    if (tags.length > 0) {
      lines.push(`- **Resources:** ${tags.join(', ')}`);
    }

    lines.push('');

    // Contact info
    if (api.info.contact) {
      lines.push('## Contact');
      lines.push('');
      if (api.info.contact.name) lines.push(`- **Name:** ${api.info.contact.name}`);
      if (api.info.contact.email) lines.push(`- **Email:** ${api.info.contact.email}`);
      if (api.info.contact.url) lines.push(`- **URL:** ${api.info.contact.url}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateAuthentication(api: NormalizedAPI): string {
    const lines: string[] = [];

    lines.push('# Authentication');
    lines.push('');

    const schemes = Object.entries(api.securitySchemes);

    if (schemes.length === 0) {
      lines.push('This API does not require authentication for public endpoints.');
      lines.push('');
      return lines.join('\n');
    }

    lines.push('This API uses the following authentication methods:');
    lines.push('');

    for (const [name, scheme] of schemes) {
      lines.push(`## ${name}`);
      lines.push('');
      lines.push(this.describeSecurityScheme(scheme));
      lines.push('');

      // Add example
      lines.push('### Example');
      lines.push('');
      lines.push('```bash');
      lines.push(this.generateAuthExample(name, scheme));
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateEndpoints(api: NormalizedAPI): Map<string, string> {
    const result = new Map<string, string>();

    if (this.options.groupByTag) {
      const byTag = this.groupEndpointsByTag(api.endpoints);

      for (const [tag, endpoints] of byTag) {
        const content = this.generateEndpointGroup(tag, endpoints, api);
        result.set(tag.toLowerCase().replace(/\s+/g, '-'), content);
      }
    } else {
      const content = this.generateEndpointGroup('All Endpoints', api.endpoints, api);
      result.set('endpoints', content);
    }

    return result;
  }

  private generateEndpointGroup(
    groupName: string,
    endpoints: NormalizedEndpoint[],
    api: NormalizedAPI
  ): string {
    const lines: string[] = [];

    lines.push(`# ${groupName}`);
    lines.push('');

    for (const endpoint of endpoints) {
      lines.push(this.generateEndpointDoc(endpoint, api));
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateEndpointDoc(endpoint: NormalizedEndpoint, api: NormalizedAPI): string {
    const lines: string[] = [];

    // Header
    const title = endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`;
    lines.push(`## ${title}`);
    lines.push('');
    lines.push(`\`${endpoint.method} ${endpoint.path}\``);
    lines.push('');

    if (endpoint.description) {
      lines.push(endpoint.description);
      lines.push('');
    }

    if (endpoint.deprecated) {
      lines.push('> **Warning:** This endpoint is deprecated.');
      lines.push('');
    }

    // Authentication
    if (endpoint.security && endpoint.security.length > 0) {
      lines.push('### Authentication');
      lines.push('');
      lines.push('This endpoint requires authentication:');
      for (const req of endpoint.security) {
        const schemes = Object.keys(req);
        lines.push(`- ${schemes.join(', ')}`);
      }
      lines.push('');
    }

    // Path Parameters
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    if (pathParams.length > 0) {
      lines.push('### Path Parameters');
      lines.push('');
      lines.push('| Name | Type | Required | Description |');
      lines.push('|------|------|----------|-------------|');
      for (const param of pathParams) {
        lines.push(this.formatParameterRow(param));
      }
      lines.push('');
    }

    // Query Parameters
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      lines.push('### Query Parameters');
      lines.push('');
      lines.push('| Name | Type | Required | Description |');
      lines.push('|------|------|----------|-------------|');
      for (const param of queryParams) {
        lines.push(this.formatParameterRow(param));
      }
      lines.push('');
    }

    // Request Body
    if (endpoint.requestBody) {
      lines.push('### Request Body');
      lines.push('');
      if (endpoint.requestBody.description) {
        lines.push(endpoint.requestBody.description);
        lines.push('');
      }

      const jsonContent = endpoint.requestBody.content['application/json'];
      if (jsonContent?.schema) {
        lines.push('**Content-Type:** `application/json`');
        lines.push('');

        if (jsonContent.schema.properties) {
          lines.push('| Field | Type | Required | Description |');
          lines.push('|-------|------|----------|-------------|');
          const required = jsonContent.schema.required || [];
          for (const [name, prop] of Object.entries(jsonContent.schema.properties)) {
            const isRequired = required.includes(name);
            lines.push(this.formatSchemaPropertyRow(name, prop, isRequired));
          }
          lines.push('');
        }

        if (this.options.includeExamples) {
          const example = this.generateExample(jsonContent.schema);
          lines.push('**Example:**');
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(example, null, 2));
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Responses
    lines.push('### Responses');
    lines.push('');

    for (const [code, response] of Object.entries(endpoint.responses)) {
      lines.push(`#### ${code} ${response.description}`);
      lines.push('');

      const jsonContent = response.content?.['application/json'];
      if (jsonContent?.schema && this.options.includeExamples) {
        const example = this.generateExample(jsonContent.schema);
        lines.push('```json');
        lines.push(JSON.stringify(example, null, 2));
        lines.push('```');
        lines.push('');
      }
    }

    // Example Request
    if (this.options.includeExamples) {
      lines.push('### Example Request');
      lines.push('');
      lines.push('```bash');
      lines.push(this.generateCurlExample(endpoint, api));
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateErrorGuide(_api: NormalizedAPI): string {
    const lines: string[] = [];

    lines.push('# Error Handling');
    lines.push('');
    lines.push('This guide describes how to handle errors returned by the API.');
    lines.push('');

    lines.push('## HTTP Status Codes');
    lines.push('');
    lines.push('| Code | Meaning | Action |');
    lines.push('|------|---------|--------|');
    lines.push('| 400 | Bad Request | Check request body and parameters |');
    lines.push('| 401 | Unauthorized | Verify authentication credentials |');
    lines.push('| 403 | Forbidden | Check permissions for this resource |');
    lines.push('| 404 | Not Found | Verify the resource ID exists |');
    lines.push('| 422 | Validation Error | Fix the validation issues in request |');
    lines.push('| 429 | Rate Limited | Wait and retry with backoff |');
    lines.push('| 500 | Server Error | Retry later, contact support if persists |');
    lines.push('');

    lines.push('## Error Response Format');
    lines.push('');
    lines.push('Error responses follow this structure:');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify({
      code: 'ERROR_CODE',
      message: 'Human-readable error description',
      details: [
        {
          field: 'field_name',
          message: 'What was wrong with this field',
        },
      ],
    }, null, 2));
    lines.push('```');
    lines.push('');

    lines.push('## Handling Errors Programmatically');
    lines.push('');
    lines.push('```javascript');
    lines.push(`async function callAPI(endpoint, options) {
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 400:
      case 422:
        // Validation error - check error.details for field-level issues
        console.error('Validation failed:', error.details);
        break;
      case 401:
        // Re-authenticate
        await refreshToken();
        return callAPI(endpoint, options);
      case 429:
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        return callAPI(endpoint, options);
      default:
        throw new Error(error.message);
    }
  }

  return response.json();
}`);
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  private generateQuickstart(api: NormalizedAPI): string {
    const lines: string[] = [];

    lines.push('# Quickstart Guide');
    lines.push('');
    lines.push(`Get started with the ${api.info.title} in minutes.`);
    lines.push('');

    // Step 1: Base URL
    lines.push('## 1. Set Up Your Environment');
    lines.push('');
    if (api.servers.length > 0) {
      const server = api.servers[0];
      lines.push('```bash');
      lines.push(`export API_BASE_URL="${server?.url}"`);
      lines.push('```');
    }
    lines.push('');

    // Step 2: Authentication
    const schemes = Object.entries(api.securitySchemes);
    if (schemes.length > 0) {
      lines.push('## 2. Authenticate');
      lines.push('');
      const [name, scheme] = schemes[0] ?? ['api_key', { type: 'apiKey' }];
      lines.push('```bash');
      lines.push(this.generateAuthExample(name, scheme as SecurityScheme));
      lines.push('```');
      lines.push('');
    }

    // Step 3: Make First Request
    lines.push('## 3. Make Your First Request');
    lines.push('');
    const getEndpoint = api.endpoints.find(e => e.method === 'GET' && !e.path.includes('{'));
    if (getEndpoint) {
      lines.push('```bash');
      lines.push(this.generateCurlExample(getEndpoint, api));
      lines.push('```');
    } else {
      lines.push('See the endpoint documentation for example requests.');
    }
    lines.push('');

    // Step 4: Handle Errors
    lines.push('## 4. Handle Errors');
    lines.push('');
    lines.push('Always check the response status code and handle errors appropriately.');
    lines.push('See the [Error Handling](./errors.md) guide for details.');
    lines.push('');

    return lines.join('\n');
  }

  private generateAllInOne(
    api: NormalizedAPI,
    parts: Omit<GeneratedDocs, 'allInOne'>
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${api.info.title} - API Documentation`);
    lines.push('');
    lines.push(`> Generated by Clara - AI-Ready API Documentation`);
    lines.push(`> Version: ${api.info.version}`);
    lines.push('');

    // Table of Contents
    lines.push('## Table of Contents');
    lines.push('');
    lines.push('- [Overview](#overview)');
    lines.push('- [Authentication](#authentication)');
    lines.push('- [Quickstart](#quickstart)');
    lines.push('- [Endpoints](#endpoints)');
    lines.push('- [Error Handling](#error-handling)');
    lines.push('');

    // Overview section (strip the header since we'll add our own)
    lines.push('## Overview');
    lines.push('');
    lines.push(parts.overview.replace(/^# .+\n/, ''));

    // Authentication
    lines.push(parts.authentication);

    // Quickstart
    lines.push(parts.quickstart);

    // Endpoints
    lines.push('# Endpoints');
    lines.push('');
    for (const [_tag, content] of parts.endpoints) {
      // Strip the main header and add as subsection
      lines.push(content.replace(/^# /, '## '));
    }

    // Error Handling
    lines.push(parts.errors);

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Documentation generated by Clara - AI Agent API Readiness Analyzer*');

    return lines.join('\n');
  }

  // ============================================
  // Helpers
  // ============================================

  private countMethods(endpoints: NormalizedEndpoint[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const ep of endpoints) {
      counts[ep.method] = (counts[ep.method] || 0) + 1;
    }
    return counts;
  }

  private getUniqueTags(endpoints: NormalizedEndpoint[]): string[] {
    const tags = new Set<string>();
    for (const ep of endpoints) {
      if (ep.tags) {
        for (const tag of ep.tags) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags);
  }

  private groupEndpointsByTag(
    endpoints: NormalizedEndpoint[]
  ): Map<string, NormalizedEndpoint[]> {
    const groups = new Map<string, NormalizedEndpoint[]>();

    for (const endpoint of endpoints) {
      const tag = endpoint.tags?.[0] || 'Other';
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag)!.push(endpoint);
    }

    return groups;
  }

  private describeSecurityScheme(scheme: SecurityScheme): string {
    switch (scheme.type) {
      case 'apiKey':
        return `API Key authentication via ${scheme.in} parameter \`${scheme.name}\`.`;
      case 'http':
        if (scheme.scheme === 'bearer') {
          return `Bearer token authentication. Include the token in the Authorization header.`;
        }
        return `HTTP ${scheme.scheme} authentication.`;
      case 'oauth2':
        return `OAuth 2.0 authentication. See flows below for supported grant types.`;
      case 'openIdConnect':
        return `OpenID Connect authentication. Discovery URL: ${scheme.openIdConnectUrl}`;
      default:
        return scheme.description || 'Authentication required.';
    }
  }

  private generateAuthExample(name: string, scheme: SecurityScheme): string {
    switch (scheme.type) {
      case 'apiKey':
        if (scheme.in === 'header') {
          return `curl -H "${scheme.name}: YOUR_API_KEY" $API_BASE_URL/endpoint`;
        }
        return `curl "$API_BASE_URL/endpoint?${scheme.name}=YOUR_API_KEY"`;
      case 'http':
        if (scheme.scheme === 'bearer') {
          return `curl -H "Authorization: Bearer YOUR_TOKEN" $API_BASE_URL/endpoint`;
        }
        return `curl -u username:password $API_BASE_URL/endpoint`;
      default:
        return `# See ${name} authentication documentation`;
    }
  }

  private formatParameterRow(param: Parameter): string {
    const type = param.schema?.type || 'string';
    const required = param.required ? 'Yes' : 'No';
    const desc = param.description || '-';
    return `| ${param.name} | ${type} | ${required} | ${desc} |`;
  }

  private formatSchemaPropertyRow(name: string, schema: Schema, required: boolean): string {
    const type = schema.type || 'any';
    const desc = schema.description || '-';
    return `| ${name} | ${type} | ${required ? 'Yes' : 'No'} | ${desc} |`;
  }

  private generateExample(schema: Schema): unknown {
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    switch (schema.type) {
      case 'string':
        if (schema.format === 'date') return '2024-01-15';
        if (schema.format === 'date-time') return '2024-01-15T10:30:00Z';
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uuid') return 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        return 'string';
      case 'integer':
      case 'number':
        return schema.minimum ?? 1;
      case 'boolean':
        return true;
      case 'array':
        if (schema.items) {
          return [this.generateExample(schema.items)];
        }
        return [];
      case 'object':
        if (schema.properties) {
          const obj: Record<string, unknown> = {};
          for (const [key, prop] of Object.entries(schema.properties)) {
            obj[key] = this.generateExample(prop);
          }
          return obj;
        }
        return {};
      default:
        return null;
    }
  }

  private generateCurlExample(endpoint: NormalizedEndpoint, api: NormalizedAPI): string {
    const baseUrl = api.servers[0]?.url || 'https://api.example.com';
    let path = endpoint.path;

    // Replace path parameters with examples
    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    for (const param of pathParams) {
      const value = param.example || param.schema?.example || '1';
      path = path.replace(`{${param.name}}`, String(value));
    }

    const parts: string[] = ['curl'];

    // Method
    if (endpoint.method !== 'GET') {
      parts.push(`-X ${endpoint.method}`);
    }

    // Headers
    parts.push('-H "Content-Type: application/json"');

    // Auth placeholder
    if (endpoint.security && endpoint.security.length > 0) {
      parts.push('-H "Authorization: Bearer $TOKEN"');
    }

    // Request body
    if (endpoint.requestBody) {
      const jsonContent = endpoint.requestBody.content['application/json'];
      if (jsonContent?.schema) {
        const example = this.generateExample(jsonContent.schema);
        parts.push(`-d '${JSON.stringify(example)}'`);
      }
    }

    // URL
    parts.push(`"${baseUrl}${path}"`);

    return parts.join(' \\\n  ');
  }
}
