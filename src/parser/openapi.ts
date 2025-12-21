/**
 * OpenAPI Parser - Handles both OpenAPI 2.x (Swagger) and 3.x specs
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { ClaraParseError } from '../errors.js';

export type OpenAPIDocument = OpenAPIV2.Document | OpenAPIV3.Document | OpenAPIV3_1.Document;

export interface ParseResult {
  document: OpenAPIDocument;
  version: '2.0' | '3.0' | '3.1';
  sourcePath: string;
}

/**
 * Detect OpenAPI version from document
 */
export function detectVersion(doc: OpenAPI.Document): '2.0' | '3.0' | '3.1' {
  if ('swagger' in doc && doc.swagger === '2.0') {
    return '2.0';
  }
  if ('openapi' in doc) {
    if (doc.openapi.startsWith('3.1')) {
      return '3.1';
    }
    if (doc.openapi.startsWith('3.0')) {
      return '3.0';
    }
  }
  throw new ClaraParseError('Unable to detect OpenAPI version', {
    swagger: 'swagger' in doc ? doc.swagger : undefined,
    openapi: 'openapi' in doc ? doc.openapi : undefined,
  });
}

/**
 * Parse an OpenAPI spec from a file path
 */
export async function parseOpenAPIFile(filePath: string): Promise<ParseResult> {
  try {
    const api = await SwaggerParser.dereference(filePath);
    const version = detectVersion(api as OpenAPI.Document);

    return {
      document: api as OpenAPIDocument,
      version,
      sourcePath: filePath,
    };
  } catch (error) {
    throw new ClaraParseError(`Failed to parse OpenAPI spec: ${filePath}`, {
      cause: error,
      path: filePath,
    });
  }
}

/**
 * Parse an OpenAPI spec from a URL
 */
export async function parseOpenAPIUrl(url: string): Promise<ParseResult> {
  try {
    const api = await SwaggerParser.dereference(url);
    const version = detectVersion(api as OpenAPI.Document);

    return {
      document: api as OpenAPIDocument,
      version,
      sourcePath: url,
    };
  } catch (error) {
    throw new ClaraParseError(`Failed to fetch and parse OpenAPI spec from URL: ${url}`, {
      cause: error,
      url,
    });
  }
}

/**
 * Parse an OpenAPI spec from a string (JSON or YAML)
 */
export async function parseOpenAPIString(content: string, sourcePath = 'inline'): Promise<ParseResult> {
  try {
    // SwaggerParser can parse from a string if we create a mock resolver
    const api = await SwaggerParser.dereference(JSON.parse(content));
    const version = detectVersion(api as OpenAPI.Document);

    return {
      document: api as OpenAPIDocument,
      version,
      sourcePath,
    };
  } catch (jsonError) {
    // Try YAML parsing via SwaggerParser
    try {
      // For YAML, we need to use the bundle method with the content
      const yaml = await import('yaml');
      const parsed = yaml.parse(content);
      const api = await SwaggerParser.dereference(parsed);
      const version = detectVersion(api as OpenAPI.Document);

      return {
        document: api as OpenAPIDocument,
        version,
        sourcePath,
      };
    } catch (yamlError) {
      throw new ClaraParseError('Failed to parse OpenAPI spec from string', {
        jsonError,
        yamlError,
      });
    }
  }
}

/**
 * Check if a document is OpenAPI 2.x (Swagger)
 */
export function isOpenAPI2(doc: OpenAPIDocument): doc is OpenAPIV2.Document {
  return 'swagger' in doc && doc.swagger === '2.0';
}

/**
 * Check if a document is OpenAPI 3.x
 */
export function isOpenAPI3(doc: OpenAPIDocument): doc is OpenAPIV3.Document | OpenAPIV3_1.Document {
  return 'openapi' in doc;
}
