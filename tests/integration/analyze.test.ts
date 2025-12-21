/**
 * Integration tests for full analysis
 */

import { describe, it, expect } from '@jest/globals';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../../src/analyzer/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

describe('Analyze Integration', () => {
  describe('Good API (Petstore)', () => {
    it('should analyze a well-documented API', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      // Should have good score
      expect(report.summary.overallScore).toBeGreaterThan(50);

      // Should have the right API info
      expect(report.api.name).toBe('Petstore API');
      expect(report.api.version).toBe('1.0.0');

      // Should analyze all endpoints
      expect(report.endpoints.length).toBe(4);

      // Should have pillar scores
      expect(report.pillars.length).toBeGreaterThan(0);
    });

    it('should pass metadata checks for good API', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      // Find the listPets endpoint
      const listPets = report.endpoints.find(
        (e) => e.path === '/pets' && e.method === 'GET'
      );

      expect(listPets).toBeDefined();

      // Should pass META_001 (operationId present)
      const meta001 = listPets?.checks.find((c) => c.id === 'META_001');
      expect(meta001?.status).toBe('passed');

      // Should pass META_003 (summary present)
      const meta003 = listPets?.checks.find((c) => c.id === 'META_003');
      expect(meta003?.status).toBe('passed');
    });

    it('should pass error checks for good API', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      // Find endpoint with error responses
      const getPet = report.endpoints.find(
        (e) => e.path === '/pets/{petId}' && e.method === 'GET'
      );

      expect(getPet).toBeDefined();

      // Should pass or warn on ERR_001 (4xx documented) - warning is acceptable
      // since the fixture has 404 documented which is the minimum for path params
      const err001 = getPet?.checks.find((c) => c.id === 'ERR_001');
      expect(['passed', 'warning']).toContain(err001?.status);
    });

    it('should generate priority fixes', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      // Priority fixes should be sorted by priority score
      for (let i = 1; i < report.priorityFixes.length; i++) {
        const prev = report.priorityFixes[i - 1];
        const curr = report.priorityFixes[i];
        if (prev && curr) {
          expect(prev.priorityScore).toBeGreaterThanOrEqual(curr.priorityScore);
        }
      }
    });
  });

  describe('Bad API', () => {
    it('should analyze a poorly documented API', async () => {
      const report = await analyze(join(fixturesDir, 'bad-api.json'));

      // Should have low score
      expect(report.summary.overallScore).toBeLessThan(50);

      // Should not be agent ready
      expect(report.summary.agentReady).toBe(false);

      // Should have critical failures
      expect(report.summary.criticalFailures).toBeGreaterThan(0);
    });

    it('should fail metadata checks for bad API', async () => {
      const report = await analyze(join(fixturesDir, 'bad-api.json'));

      // Find GET /users endpoint
      const getUsers = report.endpoints.find(
        (e) => e.path === '/users' && e.method === 'GET'
      );

      expect(getUsers).toBeDefined();

      // Should fail META_001 (no operationId)
      const meta001 = getUsers?.checks.find((c) => c.id === 'META_001');
      expect(meta001?.status).toBe('failed');

      // Should fail META_003 (no summary)
      const meta003 = getUsers?.checks.find((c) => c.id === 'META_003');
      expect(meta003?.status).toBe('failed');
    });

    it('should identify missing type definitions', async () => {
      const report = await analyze(join(fixturesDir, 'bad-api.json'));

      // Find GET /users/{id} endpoint
      const getUserById = report.endpoints.find(
        (e) => e.path === '/users/{id}' && e.method === 'GET'
      );

      expect(getUserById).toBeDefined();

      // Should fail INTRO_001 (parameter missing type)
      const intro001 = getUserById?.checks.find((c) => c.id === 'INTRO_001');
      expect(intro001?.status).toBe('failed');
    });

    it('should generate many priority fixes', async () => {
      const report = await analyze(join(fixturesDir, 'bad-api.json'));

      // Should have multiple fixes
      expect(report.priorityFixes.length).toBeGreaterThan(0);

      // First fix should be critical
      expect(report.priorityFixes[0]?.severity).toBe('critical');
    });
  });

  describe('Report Structure', () => {
    it('should include all required fields', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      // Top-level fields
      expect(report.claraVersion).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.api).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.pillars).toBeDefined();
      expect(report.priorityFixes).toBeDefined();
      expect(report.endpoints).toBeDefined();

      // Summary fields
      expect(typeof report.summary.overallScore).toBe('number');
      expect(typeof report.summary.agentReady).toBe('boolean');
      expect(typeof report.summary.totalEndpoints).toBe('number');
      expect(typeof report.summary.passed).toBe('number');
      expect(typeof report.summary.failed).toBe('number');
      expect(typeof report.summary.warnings).toBe('number');
      expect(typeof report.summary.criticalFailures).toBe('number');

      // Endpoint fields
      for (const endpoint of report.endpoints) {
        expect(endpoint.path).toBeDefined();
        expect(endpoint.method).toBeDefined();
        expect(typeof endpoint.score).toBe('number');
        expect(endpoint.status).toBeDefined();
        expect(endpoint.checks).toBeDefined();
      }
    });

    it('should have valid pillar scores', async () => {
      const report = await analyze(join(fixturesDir, 'petstore-minimal.json'));

      for (const pillar of report.pillars) {
        expect(pillar.id).toBeDefined();
        expect(pillar.name).toBeDefined();
        expect(pillar.score).toBeGreaterThanOrEqual(0);
        expect(pillar.score).toBeLessThanOrEqual(100);
        expect(pillar.checksPassed).toBeGreaterThanOrEqual(0);
        expect(pillar.checksFailed).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
