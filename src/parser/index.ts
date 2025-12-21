/**
 * Parser module - Entry point for parsing various API specification formats
 */

import { existsSync } from 'fs';
import { ClaraParseError } from '../errors.js';
import type { InputSource, ParsedInput } from '../types/index.js';
import { parseOpenAPIFile, parseOpenAPIUrl } from './openapi.js';
import { normalizeOpenAPI } from './normalize.js';

/**
 * Parse a spec from various sources
 */
export async function parseSpec(source: InputSource): Promise<ParsedInput> {
  switch (source.type) {
    case 'file':
      return parseFile(source.path);
    case 'url':
      return parseUrl(source.url);
    case 'postman-collection':
      throw new ClaraParseError('Postman Collection parsing not yet implemented', {
        collectionId: source.collectionId,
      });
    case 'postman-workspace':
      throw new ClaraParseError('Postman Workspace parsing not yet implemented', {
        workspaceId: source.workspaceId,
      });
  }
}

/**
 * Parse an OpenAPI spec from a file path
 */
export async function parseFile(filePath: string): Promise<ParsedInput> {
  if (!existsSync(filePath)) {
    throw new ClaraParseError(`File not found: ${filePath}`, { path: filePath });
  }

  const result = await parseOpenAPIFile(filePath);
  const normalized = normalizeOpenAPI(result);

  return {
    source: { type: 'file', path: filePath },
    format: result.version === '2.0' ? 'openapi-2' : 'openapi-3',
    normalized,
  };
}

/**
 * Parse an OpenAPI spec from a URL
 */
export async function parseUrl(url: string): Promise<ParsedInput> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new ClaraParseError(`Invalid URL: ${url}`, { url });
  }

  const result = await parseOpenAPIUrl(url);
  const normalized = normalizeOpenAPI(result);

  return {
    source: { type: 'url', url },
    format: result.version === '2.0' ? 'openapi-2' : 'openapi-3',
    normalized,
  };
}

/**
 * Detect input type from a string (file path, URL, or Postman ID)
 */
export function detectInputType(input: string): InputSource {
  // Check if it's a URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return { type: 'url', url: input };
  }

  // Check if it's a Postman Collection ID (format: col_xxx or just collection UID)
  if (input.startsWith('col_') || /^\d+-[a-f0-9-]+$/.test(input)) {
    return { type: 'postman-collection', collectionId: input };
  }

  // Check if it's a Postman Workspace ID
  if (input.startsWith('ws_')) {
    return { type: 'postman-workspace', workspaceId: input };
  }

  // Default to file path
  return { type: 'file', path: input };
}

export { normalizeOpenAPI } from './normalize.js';
export type { ParseResult } from './openapi.js';
