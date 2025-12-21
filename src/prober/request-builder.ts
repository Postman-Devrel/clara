/**
 * Request Builder for Clara Prober
 *
 * Generates HTTP requests from OpenAPI endpoint definitions.
 * Can build both valid requests and intentionally malformed requests
 * for testing error handling.
 */

import type {
  NormalizedAPI,
  NormalizedEndpoint,
  Parameter,
  Schema,
} from '../types/index.js';
import type { ProberConfig, ProbeRequest, MalformationType } from './types.js';

export class RequestBuilder {
  private baseUrl: string;

  constructor(_api: NormalizedAPI, config: ProberConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Build a valid request from an endpoint definition
   */
  buildValidRequest(endpoint: NormalizedEndpoint): ProbeRequest {
    const url = this.buildUrl(endpoint);
    const params = this.buildQueryParams(endpoint);
    const body = this.buildRequestBody(endpoint);

    return {
      endpoint,
      url,
      method: endpoint.method,
      headers: {},
      params,
      body,
      malformation: 'none',
    };
  }

  /**
   * Build a malformed request for testing error handling
   */
  buildMalformedRequest(
    endpoint: NormalizedEndpoint,
    malformation: MalformationType
  ): ProbeRequest {
    const validRequest = this.buildValidRequest(endpoint);

    switch (malformation) {
      case 'invalid-json':
        return this.applyInvalidJson(validRequest);

      case 'missing-required':
        return this.applyMissingRequired(validRequest, endpoint);

      case 'wrong-type':
        return this.applyWrongType(validRequest, endpoint);

      case 'extra-field':
        return this.applyExtraField(validRequest);

      case 'missing-auth':
        return { ...validRequest, malformation: 'missing-auth' };

      case 'empty-body':
        return this.applyEmptyBody(validRequest);

      case 'null-required':
        return this.applyNullRequired(validRequest, endpoint);

      default:
        return { ...validRequest, malformation };
    }
  }

  /**
   * Build the full URL with path parameters resolved
   */
  private buildUrl(endpoint: NormalizedEndpoint): string {
    let path = endpoint.path;

    // Replace path parameters with generated values
    const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
    for (const param of pathParams) {
      const value = this.generateParamValue(param);
      path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
    }

    return `${this.baseUrl}${path}`;
  }

  /**
   * Build query parameters
   */
  private buildQueryParams(
    endpoint: NormalizedEndpoint
  ): Record<string, string> {
    const params: Record<string, string> = {};
    const queryParams = endpoint.parameters.filter((p) => p.in === 'query');

    for (const param of queryParams) {
      // Only include required params or params with defaults
      if (param.required || param.schema?.default !== undefined) {
        const value = this.generateParamValue(param);
        params[param.name] = String(value);
      }
    }

    return params;
  }

  /**
   * Build request body from schema
   */
  private buildRequestBody(endpoint: NormalizedEndpoint): unknown | undefined {
    if (!endpoint.requestBody) return undefined;

    const content = endpoint.requestBody.content;
    const jsonContent = content['application/json'];

    if (!jsonContent?.schema) return undefined;

    // Use example if available
    if (jsonContent.example) {
      return jsonContent.example;
    }

    // Generate from schema
    return this.generateFromSchema(jsonContent.schema);
  }

  /**
   * Generate a value from a JSON Schema
   */
  generateFromSchema(schema: Schema): unknown {
    // Handle references (should be resolved, but fallback)
    if (schema.$ref) {
      return {};
    }

    // Use example if provided
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Use default if provided
    if (schema.default !== undefined) {
      return schema.default;
    }

    // Use enum if provided
    if (schema.enum && schema.enum.length > 0) {
      return schema.enum[0];
    }

    // Use const if provided
    if (schema.const !== undefined) {
      return schema.const;
    }

    // Handle composition
    if (schema.allOf && schema.allOf.length > 0) {
      const merged: Record<string, unknown> = {};
      for (const subSchema of schema.allOf) {
        const generated = this.generateFromSchema(subSchema);
        if (typeof generated === 'object' && generated !== null) {
          Object.assign(merged, generated);
        }
      }
      return merged;
    }

    if (schema.oneOf && schema.oneOf.length > 0) {
      const firstSchema = schema.oneOf[0];
      if (firstSchema) {
        return this.generateFromSchema(firstSchema);
      }
    }

    if (schema.anyOf && schema.anyOf.length > 0) {
      const firstSchema = schema.anyOf[0];
      if (firstSchema) {
        return this.generateFromSchema(firstSchema);
      }
    }

    // Generate based on type
    switch (schema.type) {
      case 'object':
        return this.generateObject(schema);

      case 'array':
        return this.generateArray(schema);

      case 'string':
        return this.generateString(schema);

      case 'integer':
      case 'number':
        return this.generateNumber(schema);

      case 'boolean':
        return true;

      case 'null':
        return null;

      default:
        // No type specified, try to infer from properties
        if (schema.properties) {
          return this.generateObject(schema);
        }
        return {};
    }
  }

  /**
   * Generate an object from schema
   */
  private generateObject(schema: Schema): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    if (!schema.properties) return obj;

    // Generate required properties first
    const required = schema.required || [];

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      // Always generate required fields, optionally generate others
      if (required.includes(key)) {
        obj[key] = this.generateFromSchema(propSchema);
      }
    }

    // Add a few non-required fields for completeness
    let nonRequiredCount = 0;
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (!required.includes(key) && nonRequiredCount < 3) {
        obj[key] = this.generateFromSchema(propSchema);
        nonRequiredCount++;
      }
    }

    return obj;
  }

  /**
   * Generate an array from schema
   */
  private generateArray(schema: Schema): unknown[] {
    if (!schema.items) return [];

    const minItems = schema.minItems || 1;
    const count = Math.min(minItems, 3); // Generate at most 3 items

    const arr: unknown[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(this.generateFromSchema(schema.items));
    }

    return arr;
  }

  /**
   * Generate a string value from schema
   */
  private generateString(schema: Schema): string {
    // Handle formats
    switch (schema.format) {
      case 'date':
        return new Date().toISOString().split('T')[0] ?? '2024-01-01';

      case 'date-time':
        return new Date().toISOString();

      case 'time': {
        const timePart = new Date().toISOString().split('T')[1];
        return timePart?.split('.')[0] ?? '12:00:00';
      }

      case 'email':
        return 'test@example.com';

      case 'uri':
      case 'url':
        return 'https://example.com';

      case 'uuid':
        return 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      case 'hostname':
        return 'example.com';

      case 'ipv4':
        return '192.168.1.1';

      case 'ipv6':
        return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      case 'byte':
        return Buffer.from('test').toString('base64');

      case 'binary':
        return 'binary-data';

      case 'password':
        return 'password123';

      case 'phone':
        return '+1-555-555-5555';
    }

    // Handle pattern (basic support)
    if (schema.pattern) {
      // Very basic pattern handling
      if (schema.pattern.includes('[A-Z]')) {
        return 'ABCD';
      }
      if (schema.pattern.includes('[a-z]')) {
        return 'abcd';
      }
      if (schema.pattern.includes('[0-9]')) {
        return '1234';
      }
    }

    // Respect length constraints
    const minLength = schema.minLength || 1;
    const maxLength = schema.maxLength || 50;
    const targetLength = Math.min(minLength + 10, maxLength);

    return 'test_value'.padEnd(targetLength, '_').slice(0, targetLength);
  }

  /**
   * Generate a number value from schema
   */
  private generateNumber(schema: Schema): number {
    const min = schema.minimum ?? schema.exclusiveMinimum ?? 0;
    const max = schema.maximum ?? schema.exclusiveMaximum ?? 100;

    // Adjust for exclusive bounds
    const effectiveMin =
      schema.exclusiveMinimum !== undefined ? min + 1 : min;
    const effectiveMax =
      schema.exclusiveMaximum !== undefined ? max - 1 : max;

    // Use middle of range
    let value = (effectiveMin + effectiveMax) / 2;

    // Handle multipleOf
    if (schema.multipleOf) {
      value = Math.round(value / schema.multipleOf) * schema.multipleOf;
    }

    // Return integer for integer type
    if (schema.type === 'integer') {
      return Math.round(value);
    }

    return value;
  }

  /**
   * Generate a parameter value
   */
  private generateParamValue(param: Parameter): unknown {
    if (param.example !== undefined) {
      return param.example;
    }

    if (param.schema) {
      return this.generateFromSchema(param.schema);
    }

    // Fallback based on common patterns
    const name = param.name.toLowerCase();

    if (name.includes('id')) {
      return '1';
    }
    if (name.includes('page')) {
      return '1';
    }
    if (name.includes('limit') || name.includes('size')) {
      return '10';
    }
    if (name.includes('skip') || name.includes('offset')) {
      return '0';
    }
    if (name.includes('sort')) {
      return 'created_at';
    }
    if (name.includes('order')) {
      return 'desc';
    }

    return 'test';
  }

  // ============================================
  // Malformation Strategies
  // ============================================

  private applyInvalidJson(request: ProbeRequest): ProbeRequest {
    return {
      ...request,
      body: '{invalid json, missing quotes: value}' as unknown,
      malformation: 'invalid-json',
    };
  }

  private applyMissingRequired(
    request: ProbeRequest,
    endpoint: NormalizedEndpoint
  ): ProbeRequest {
    if (!request.body || typeof request.body !== 'object') {
      return { ...request, malformation: 'missing-required' };
    }

    const schema = endpoint.requestBody?.content['application/json']?.schema;
    const required = schema?.required || [];

    const firstRequired = required[0];
    if (!firstRequired) {
      return { ...request, malformation: 'missing-required' };
    }

    // Remove first required field
    const body = { ...request.body } as Record<string, unknown>;
    delete body[firstRequired];

    return {
      ...request,
      body,
      malformation: 'missing-required',
    };
  }

  private applyWrongType(
    request: ProbeRequest,
    endpoint: NormalizedEndpoint
  ): ProbeRequest {
    if (!request.body || typeof request.body !== 'object') {
      return { ...request, malformation: 'wrong-type' };
    }

    const schema = endpoint.requestBody?.content['application/json']?.schema;
    if (!schema?.properties) {
      return { ...request, malformation: 'wrong-type' };
    }

    const body = { ...request.body } as Record<string, unknown>;

    // Find a field and swap its type
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in body) {
        if (propSchema.type === 'string') {
          body[key] = 12345; // String -> Number
        } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
          body[key] = 'not_a_number'; // Number -> String
        } else if (propSchema.type === 'boolean') {
          body[key] = 'not_a_boolean'; // Boolean -> String
        } else if (propSchema.type === 'array') {
          body[key] = 'not_an_array'; // Array -> String
        } else if (propSchema.type === 'object') {
          body[key] = 'not_an_object'; // Object -> String
        }
        break;
      }
    }

    return {
      ...request,
      body,
      malformation: 'wrong-type',
    };
  }

  private applyExtraField(request: ProbeRequest): ProbeRequest {
    if (!request.body || typeof request.body !== 'object') {
      return {
        ...request,
        body: { __clara_unknown_field__: 'unexpected_value' },
        malformation: 'extra-field',
      };
    }

    return {
      ...request,
      body: {
        ...(request.body as object),
        __clara_unknown_field__: 'unexpected_value',
      },
      malformation: 'extra-field',
    };
  }

  private applyEmptyBody(request: ProbeRequest): ProbeRequest {
    return {
      ...request,
      body: undefined,
      malformation: 'empty-body',
    };
  }

  private applyNullRequired(
    request: ProbeRequest,
    endpoint: NormalizedEndpoint
  ): ProbeRequest {
    if (!request.body || typeof request.body !== 'object') {
      return { ...request, malformation: 'null-required' };
    }

    const schema = endpoint.requestBody?.content['application/json']?.schema;
    const required = schema?.required || [];

    const firstRequired = required[0];
    if (!firstRequired) {
      return { ...request, malformation: 'null-required' };
    }

    // Set first required field to null
    const body = { ...request.body } as Record<string, unknown>;
    body[firstRequired] = null;

    return {
      ...request,
      body,
      malformation: 'null-required',
    };
  }
}
