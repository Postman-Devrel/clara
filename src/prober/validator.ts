/**
 * Response Validator for Clara Prober
 *
 * Validates API responses against OpenAPI schemas using AJV.
 * Also evaluates the quality of error responses for AI agent consumption.
 */

import { createRequire } from 'module';
import type { Schema } from '../types/index.js';
import type {
  ProbeResponse,
  SchemaValidationResult,
  SchemaValidationError,
  ErrorQualityResult,
} from './types.js';

// Create require for CommonJS modules in ESM context
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

interface AjvError {
  instancePath: string;
  message?: string;
  keyword: string;
  params: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AjvInstance = any;

export class ResponseValidator {
  private ajv: AjvInstance;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Validate response body against a JSON Schema
   */
  validateSchema(body: unknown, schema: Schema): SchemaValidationResult {
    // Convert OpenAPI schema to JSON Schema compatible format
    const jsonSchema = this.toJsonSchema(schema);

    try {
      const validate = this.ajv.compile(jsonSchema);
      const valid = validate(body);

      if (valid) {
        return { valid: true };
      }

      const errors: SchemaValidationError[] = (validate.errors || []).map(
        (err: AjvError) => ({
          path: err.instancePath || '/',
          message: err.message || 'Validation failed',
          keyword: err.keyword,
          params: err.params,
        })
      );

      return { valid: false, errors };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: `Schema compilation error: ${(error as Error).message}`,
            keyword: 'schema',
          },
        ],
      };
    }
  }

  /**
   * Evaluate the quality of an error response for AI agent consumption
   */
  evaluateErrorResponse(response: ProbeResponse): ErrorQualityResult {
    const feedback: string[] = [];
    let score = 0;

    const body = response.body as Record<string, unknown> | null;

    // Check if body is an object
    if (!body || typeof body !== 'object') {
      return {
        hasErrorCode: false,
        hasMessage: false,
        messageIsHelpful: false,
        identifiesField: false,
        suggestsFix: false,
        hasDocUrl: false,
        score: 0,
        feedback: ['Error response is not a JSON object'],
      };
    }

    // Check for error code
    const hasErrorCode = this.hasErrorCode(body);
    if (hasErrorCode) {
      score += 25;
    } else {
      feedback.push('Missing machine-readable error code');
    }

    // Check for message
    const hasMessage = this.hasMessage(body);
    if (hasMessage) {
      score += 15;
    } else {
      feedback.push('Missing error message');
    }

    // Check if message is helpful (not generic)
    const messageIsHelpful = hasMessage && this.isMessageHelpful(body);
    if (messageIsHelpful) {
      score += 20;
    } else if (hasMessage) {
      feedback.push('Error message is too generic');
    }

    // Check if it identifies the problematic field (for validation errors)
    const identifiesField = this.identifiesField(body, response.statusCode);
    if (identifiesField) {
      score += 20;
    } else if (response.statusCode === 400 || response.statusCode === 422) {
      feedback.push('Validation error does not identify problematic field');
    }

    // Check if it suggests a fix
    const suggestsFix = this.suggestsFix(body);
    if (suggestsFix) {
      score += 10;
    } else {
      feedback.push('Error does not suggest how to fix the issue');
    }

    // Check for documentation URL
    const hasDocUrl = this.hasDocUrl(body);
    if (hasDocUrl) {
      score += 10;
    } else {
      feedback.push('No documentation URL for more information');
    }

    return {
      hasErrorCode,
      hasMessage,
      messageIsHelpful,
      identifiesField,
      suggestsFix,
      hasDocUrl,
      score,
      feedback,
    };
  }

  /**
   * Check if the error response has a machine-readable code
   */
  private hasErrorCode(body: Record<string, unknown>): boolean {
    const codeFields = ['code', 'error_code', 'errorCode', 'error', 'type'];

    for (const field of codeFields) {
      const value = body[field];
      if (typeof value === 'string' && value.length > 0) {
        // Check it's not just a generic message
        if (!value.includes(' ') || value === value.toUpperCase()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if the error response has a message
   */
  private hasMessage(body: Record<string, unknown>): boolean {
    const messageFields = ['message', 'error', 'detail', 'details', 'msg'];

    for (const field of messageFields) {
      const value = body[field];
      if (typeof value === 'string' && value.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the error message is helpful (not too generic)
   */
  private isMessageHelpful(body: Record<string, unknown>): boolean {
    const message = this.extractMessage(body);
    if (!message) return false;

    const genericMessages = [
      'error',
      'failed',
      'invalid',
      'bad request',
      'internal error',
      'server error',
      'something went wrong',
      'an error occurred',
      'request failed',
      'validation failed',
      'not found',
      'unauthorized',
      'forbidden',
    ];

    const lowerMessage = message.toLowerCase().trim();

    // Too short to be helpful
    if (lowerMessage.length < 10) {
      return false;
    }

    // Check if it's just a generic message
    for (const generic of genericMessages) {
      if (lowerMessage === generic) {
        return false;
      }
    }

    // Has specific details if it contains quotes, numbers, or specific words
    if (
      message.includes('"') ||
      message.includes("'") ||
      /\d/.test(message) ||
      message.includes('must') ||
      message.includes('should') ||
      message.includes('expected') ||
      message.includes('received')
    ) {
      return true;
    }

    // At least moderately specific if longer than 20 chars
    return message.length > 20;
  }

  /**
   * Check if the error identifies the problematic field
   */
  private identifiesField(
    body: Record<string, unknown>,
    statusCode: number
  ): boolean {
    // Only relevant for validation errors
    if (statusCode !== 400 && statusCode !== 422) {
      return true; // Not applicable
    }

    // Check for common field identification patterns
    const fieldIndicators = [
      'field',
      'property',
      'path',
      'location',
      'loc',
      'param',
      'parameter',
    ];

    // Check top-level
    for (const indicator of fieldIndicators) {
      if (indicator in body) {
        return true;
      }
    }

    // Check in detail/details array
    const details = body.detail || body.details || body.errors;
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (typeof detail === 'object' && detail !== null) {
          for (const indicator of fieldIndicators) {
            if (indicator in detail) {
              return true;
            }
          }
        }
      }
    }

    // Check if message contains a field reference
    const message = this.extractMessage(body);
    if (message) {
      // Look for quoted field names or dot notation
      if (
        /"[a-z_]+"/.test(message) ||
        /'[a-z_]+'/.test(message) ||
        /\.[a-z_]+/.test(message)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the error suggests a fix
   */
  private suggestsFix(body: Record<string, unknown>): boolean {
    const message = this.extractMessage(body);
    if (!message) return false;

    const fixIndicators = [
      'should be',
      'must be',
      'expected',
      'try',
      'use',
      'provide',
      'include',
      'required',
      'allowed',
      'valid values',
      'example',
      'e.g.',
      'such as',
      'like',
    ];

    const lowerMessage = message.toLowerCase();
    for (const indicator of fixIndicators) {
      if (lowerMessage.includes(indicator)) {
        return true;
      }
    }

    // Check for "expected vs received" pattern
    if ('expected' in body || 'received' in body || 'actual' in body) {
      return true;
    }

    return false;
  }

  /**
   * Check if error includes documentation URL
   */
  private hasDocUrl(body: Record<string, unknown>): boolean {
    const urlFields = [
      'docs',
      'documentation',
      'help',
      'more_info',
      'moreInfo',
      'doc_url',
      'docUrl',
      'link',
      'url',
    ];

    for (const field of urlFields) {
      const value = body[field];
      if (typeof value === 'string' && value.startsWith('http')) {
        return true;
      }
    }

    // Check message for URLs
    const message = this.extractMessage(body);
    if (message && /https?:\/\//.test(message)) {
      return true;
    }

    return false;
  }

  /**
   * Extract the main error message from the body
   */
  private extractMessage(body: Record<string, unknown>): string | null {
    const messageFields = ['message', 'error', 'detail', 'msg'];

    for (const field of messageFields) {
      const value = body[field];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  /**
   * Convert OpenAPI schema to JSON Schema compatible format
   */
  private toJsonSchema(schema: Schema): object {
    // Deep clone to avoid mutating original
    const cloned = JSON.parse(JSON.stringify(schema));

    // Handle OpenAPI 3.0 nullable
    this.transformNullable(cloned);

    return cloned;
  }

  /**
   * Transform OpenAPI nullable to JSON Schema compatible format
   */
  private transformNullable(schema: Record<string, unknown>): void {
    if (schema.nullable === true && schema.type) {
      // Convert to type array with null
      schema.type = [schema.type, 'null'];
      delete schema.nullable;
    }

    // Recurse into nested schemas
    if (schema.properties && typeof schema.properties === 'object') {
      for (const prop of Object.values(
        schema.properties as Record<string, Record<string, unknown>>
      )) {
        this.transformNullable(prop);
      }
    }

    if (schema.items && typeof schema.items === 'object') {
      this.transformNullable(schema.items as Record<string, unknown>);
    }

    for (const key of ['allOf', 'oneOf', 'anyOf']) {
      if (Array.isArray(schema[key])) {
        for (const subSchema of schema[key] as Record<string, unknown>[]) {
          this.transformNullable(subSchema);
        }
      }
    }
  }
}
