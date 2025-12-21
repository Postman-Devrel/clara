/**
 * Unit tests for checks
 */

import { describe, it, expect } from '@jest/globals';
import { META_001, META_002, META_003 } from '../../src/analyzer/checks/metadata.js';
import { ERR_001, ERR_002 } from '../../src/analyzer/checks/errors.js';
import { PRED_001 } from '../../src/analyzer/checks/predictability.js';
import { NAME_003 } from '../../src/analyzer/checks/naming.js';
import type { NormalizedAPI, NormalizedEndpoint, CheckContext } from '../../src/types/index.js';

// Helper to create a minimal API context
function createContext(endpointOverrides: Partial<NormalizedEndpoint> = {}): CheckContext {
  const endpoint: NormalizedEndpoint = {
    path: '/test',
    method: 'GET',
    parameters: [],
    responses: {},
    ...endpointOverrides,
  };

  const api: NormalizedAPI = {
    info: { title: 'Test API', version: '1.0.0' },
    servers: [],
    endpoints: [endpoint],
    securitySchemes: {},
    components: {},
    raw: {},
  };

  return { api, endpoint };
}

describe('Metadata Checks', () => {
  describe('META_001: operationId present', () => {
    it('should pass when operationId is present', () => {
      const context = createContext({ operationId: 'listUsers' });
      const result = META_001.check(context);

      expect(result.status).toBe('passed');
      expect(result.id).toBe('META_001');
    });

    it('should fail when operationId is missing', () => {
      const context = createContext({ operationId: undefined });
      const result = META_001.check(context);

      expect(result.status).toBe('failed');
      expect(result.severity).toBe('critical');
    });

    it('should generate a fix suggestion', () => {
      const context = createContext({ path: '/users/{id}', method: 'GET' });
      const result = META_001.check(context);
      const fix = META_001.generateFix!(context, result);

      expect(fix.description).toContain('operationId');
      expect(fix.example).toBeDefined();
    });
  });

  describe('META_002: operationId descriptive', () => {
    it('should pass for descriptive camelCase operationId', () => {
      const context = createContext({ operationId: 'listAllUsers' });
      const result = META_002.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail for too short operationId', () => {
      const context = createContext({ operationId: 'get' });
      const result = META_002.check(context);

      expect(result.status).toBe('failed');
    });

    it('should fail for generic operationId', () => {
      const context = createContext({ operationId: 'operation1' });
      const result = META_002.check(context);

      expect(result.status).toBe('failed');
    });

    it('should skip if no operationId', () => {
      const context = createContext({ operationId: undefined });
      const result = META_002.check(context);

      expect(result.status).toBe('skipped');
    });
  });

  describe('META_003: summary present', () => {
    it('should pass when summary is present', () => {
      const context = createContext({ summary: 'List all users' });
      const result = META_003.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail when summary is missing', () => {
      const context = createContext({ summary: undefined });
      const result = META_003.check(context);

      expect(result.status).toBe('failed');
    });

    it('should fail when summary is empty', () => {
      const context = createContext({ summary: '   ' });
      const result = META_003.check(context);

      expect(result.status).toBe('failed');
    });
  });
});

describe('Error Checks', () => {
  describe('ERR_001: 4xx responses documented', () => {
    it('should pass when 4xx responses are documented', () => {
      const context = createContext({
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '404': { description: 'Not Found' },
        },
      });
      const result = ERR_001.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail when no 4xx responses documented', () => {
      const context = createContext({
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: {
          '200': { description: 'Success' },
        },
      });
      const result = ERR_001.check(context);

      expect(result.status).toBe('failed');
    });

    it('should warn about missing 404 for path parameters', () => {
      const context = createContext({
        parameters: [{ name: 'id', in: 'path', required: true }],
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
        },
      });
      const result = ERR_001.check(context);

      expect(result.status).toBe('warning');
      expect(result.message).toContain('404');
    });
  });

  describe('ERR_002: error schema defined', () => {
    it('should pass when error schema has code and message', () => {
      const context = createContext({
        responses: {
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      });
      const result = ERR_002.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail when error schema missing code field', () => {
      const context = createContext({
        responses: {
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      });
      const result = ERR_002.check(context);

      expect(result.status).toBe('failed');
    });

    it('should skip when no error responses defined', () => {
      const context = createContext({
        responses: {
          '200': { description: 'Success' },
        },
      });
      const result = ERR_002.check(context);

      expect(result.status).toBe('skipped');
    });
  });
});

describe('Predictability Checks', () => {
  describe('PRED_001: response schema defined', () => {
    it('should pass when response schema is defined', () => {
      const context = createContext({
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      });
      const result = PRED_001.check(context);

      expect(result.status).toBe('passed');
    });

    it('should pass for 204 No Content without schema', () => {
      const context = createContext({
        responses: {
          '204': { description: 'No Content' },
        },
      });
      const result = PRED_001.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail when no success response defined', () => {
      const context = createContext({
        responses: {
          '400': { description: 'Bad Request' },
        },
      });
      const result = PRED_001.check(context);

      expect(result.status).toBe('failed');
    });

    it('should fail when schema is missing from 200 response', () => {
      const context = createContext({
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {},
            },
          },
        },
      });
      const result = PRED_001.check(context);

      expect(result.status).toBe('failed');
    });
  });
});

describe('Naming Checks', () => {
  describe('NAME_003: HTTP method semantics', () => {
    it('should pass for GET without request body', () => {
      const context = createContext({
        method: 'GET',
        requestBody: undefined,
      });
      const result = NAME_003.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail for GET with request body', () => {
      const context = createContext({
        method: 'GET',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      });
      const result = NAME_003.check(context);

      expect(result.status).toBe('failed');
    });

    it('should pass for PUT to specific resource', () => {
      const context = createContext({
        path: '/users/{id}',
        method: 'PUT',
      });
      const result = NAME_003.check(context);

      expect(result.status).toBe('passed');
    });

    it('should fail for PUT to collection endpoint', () => {
      const context = createContext({
        path: '/users',
        method: 'PUT',
      });
      const result = NAME_003.check(context);

      expect(result.status).toBe('failed');
    });
  });
});
