/**
 * Unit tests for parser
 */

import { describe, it, expect } from '@jest/globals';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFile, detectInputType } from '../../src/parser/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

describe('Parser', () => {
  describe('parseFile', () => {
    it('should parse a valid OpenAPI 3.x spec', async () => {
      const result = await parseFile(join(fixturesDir, 'petstore-minimal.json'));

      expect(result.format).toBe('openapi-3');
      expect(result.normalized.info.title).toBe('Petstore API');
      expect(result.normalized.info.version).toBe('1.0.0');
    });

    it('should normalize endpoints correctly', async () => {
      const result = await parseFile(join(fixturesDir, 'petstore-minimal.json'));

      expect(result.normalized.endpoints.length).toBe(4);

      const listPets = result.normalized.endpoints.find(
        (e) => e.path === '/pets' && e.method === 'GET'
      );
      expect(listPets).toBeDefined();
      expect(listPets?.operationId).toBe('listPets');
      expect(listPets?.summary).toBe('List all pets');
    });

    it('should normalize parameters', async () => {
      const result = await parseFile(join(fixturesDir, 'petstore-minimal.json'));

      const listPets = result.normalized.endpoints.find(
        (e) => e.path === '/pets' && e.method === 'GET'
      );

      expect(listPets?.parameters.length).toBe(2);

      const limitParam = listPets?.parameters.find((p) => p.name === 'limit');
      expect(limitParam?.in).toBe('query');
      expect(limitParam?.schema?.type).toBe('integer');
    });

    it('should normalize servers', async () => {
      const result = await parseFile(join(fixturesDir, 'petstore-minimal.json'));

      expect(result.normalized.servers.length).toBe(1);
      expect(result.normalized.servers[0]?.url).toBe('https://api.petstore.io/v1');
    });

    it('should throw for non-existent file', async () => {
      await expect(parseFile('/nonexistent/path.json')).rejects.toThrow();
    });
  });

  describe('detectInputType', () => {
    it('should detect file paths', () => {
      expect(detectInputType('./openapi.json')).toEqual({
        type: 'file',
        path: './openapi.json',
      });

      expect(detectInputType('/absolute/path/spec.yaml')).toEqual({
        type: 'file',
        path: '/absolute/path/spec.yaml',
      });
    });

    it('should detect URLs', () => {
      expect(detectInputType('https://api.example.com/openapi.json')).toEqual({
        type: 'url',
        url: 'https://api.example.com/openapi.json',
      });

      expect(detectInputType('http://localhost:3000/spec.json')).toEqual({
        type: 'url',
        url: 'http://localhost:3000/spec.json',
      });
    });

    it('should detect Postman collection IDs', () => {
      expect(detectInputType('col_abc123')).toEqual({
        type: 'postman-collection',
        collectionId: 'col_abc123',
      });
    });

    it('should detect Postman workspace IDs', () => {
      expect(detectInputType('ws_abc123')).toEqual({
        type: 'postman-workspace',
        workspaceId: 'ws_abc123',
      });
    });
  });
});
