/**
 * Unit tests for scoring calculator
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateScore,
  generateSummary,
  calculateEndpointScore,
  determineEndpointStatus,
} from '../../src/analyzer/scoring.js';
import type { CheckResult } from '../../src/types/index.js';

describe('Scoring Calculator', () => {
  describe('calculateScore', () => {
    it('should return 100 for empty results', () => {
      expect(calculateScore([])).toBe(100);
    });

    it('should return 100 when all checks pass', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_003', status: 'passed', severity: 'medium', message: 'Passed' },
      ];
      expect(calculateScore(results)).toBe(100);
    });

    it('should return 0 when all checks fail', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'failed', severity: 'critical', message: 'Failed' },
        { id: 'TEST_002', status: 'failed', severity: 'high', message: 'Failed' },
      ];
      expect(calculateScore(results)).toBe(0);
    });

    it('should weight critical failures more heavily', () => {
      // One critical pass, one critical fail
      const results1: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'critical', message: 'Failed' },
      ];
      expect(calculateScore(results1)).toBe(50);

      // One low pass, one low fail - same percentage but lower impact
      const results2: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'low', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'low', message: 'Failed' },
      ];
      expect(calculateScore(results2)).toBe(50);
    });

    it('should correctly calculate weighted scores', () => {
      // Critical (4) + High (2) = 6 total weight
      // Critical passed = 4, High failed = 0
      // Score = (4/6) * 100 = 66.67 -> 67
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'high', message: 'Failed' },
      ];
      expect(calculateScore(results)).toBe(67);
    });
  });

  describe('generateSummary', () => {
    it('should count passed, failed, and warnings correctly', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'medium', message: 'Passed' },
        { id: 'TEST_002', status: 'passed', severity: 'medium', message: 'Passed' },
        { id: 'TEST_003', status: 'failed', severity: 'high', message: 'Failed' },
        { id: 'TEST_004', status: 'warning', severity: 'low', message: 'Warning' },
      ];

      const summary = generateSummary(results, 5);

      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.totalEndpoints).toBe(5);
    });

    it('should count critical failures', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'failed', severity: 'critical', message: 'Failed' },
        { id: 'TEST_002', status: 'failed', severity: 'critical', message: 'Failed' },
        { id: 'TEST_003', status: 'failed', severity: 'high', message: 'Failed' },
      ];

      const summary = generateSummary(results, 1);

      expect(summary.criticalFailures).toBe(2);
    });

    it('should mark as agent ready when score >= 70 and no critical failures', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_003', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_004', status: 'failed', severity: 'low', message: 'Failed' },
      ];

      const summary = generateSummary(results, 1);

      expect(summary.agentReady).toBe(true);
      expect(summary.overallScore).toBeGreaterThanOrEqual(70);
    });

    it('should not be agent ready with critical failures even if score is high', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_002', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_003', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_004', status: 'failed', severity: 'critical', message: 'Failed' },
      ];

      const summary = generateSummary(results, 1);

      expect(summary.agentReady).toBe(false);
      expect(summary.criticalFailures).toBe(1);
    });
  });

  describe('calculateEndpointScore', () => {
    it('should calculate score for endpoint results', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'medium', message: 'Failed' },
      ];

      const score = calculateEndpointScore(results);

      // Critical (4) passed, Medium (1) failed
      // Score = (4/5) * 100 = 80
      expect(score).toBe(80);
    });
  });

  describe('determineEndpointStatus', () => {
    it('should return passed when all checks pass', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'passed', severity: 'high', message: 'Passed' },
      ];

      expect(determineEndpointStatus(results)).toBe('passed');
    });

    it('should return failed when critical check fails', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'high', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'critical', message: 'Failed' },
      ];

      expect(determineEndpointStatus(results)).toBe('failed');
    });

    it('should return warning when non-critical check fails', () => {
      const results: CheckResult[] = [
        { id: 'TEST_001', status: 'passed', severity: 'critical', message: 'Passed' },
        { id: 'TEST_002', status: 'failed', severity: 'medium', message: 'Failed' },
      ];

      expect(determineEndpointStatus(results)).toBe('warning');
    });
  });
});
