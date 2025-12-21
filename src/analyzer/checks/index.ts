/**
 * Check Registry - All Clara checks
 */

import type { Check, Pillar } from '../../types/index.js';

// Import checks from each pillar
import { metadataChecks, META_001, META_002, META_003, META_004, META_005, META_006 } from './metadata.js';
import {
  errorChecks,
  ERR_001,
  ERR_002,
  ERR_003,
  ERR_004,
  ERR_005,
  ERR_006,
  ERR_007,
  ERR_008,
  LIVE_ERR_001,
  LIVE_ERR_002,
  LIVE_ERR_003,
  LIVE_ERR_004,
} from './errors.js';
import {
  introspectionChecks,
  INTRO_001,
  INTRO_002,
  INTRO_003,
  INTRO_004,
  INTRO_005,
  INTRO_006,
  INTRO_007,
  INTRO_008,
} from './introspection.js';
import { namingChecks, NAME_001, NAME_002, NAME_003, NAME_004, NAME_005, NAME_006 } from './naming.js';
import {
  predictabilityChecks,
  PRED_001,
  PRED_002,
  PRED_003,
  PRED_004,
  PRED_005,
  PRED_006,
} from './predictability.js';
import { discoverabilityChecks, DISC_001, DISC_002, DISC_003, DISC_004 } from './discoverability.js';
import {
  documentationChecks,
  DOC_001,
  DOC_002,
  DOC_003,
  DOC_004,
  DOC_005,
  DOC_006,
} from './documentation.js';
import { performanceChecks, PERF_001, PERF_002, PERF_003, PERF_004 } from './performance.js';

/**
 * All registered checks
 */
export const checks: Check[] = [
  ...metadataChecks,
  ...errorChecks,
  ...introspectionChecks,
  ...namingChecks,
  ...predictabilityChecks,
  ...documentationChecks,
  ...performanceChecks,
  ...discoverabilityChecks,
];

/**
 * Get a check by its ID
 */
export function getCheckById(id: string): Check | undefined {
  return checks.find((c) => c.id === id);
}

/**
 * Get all checks for a specific pillar
 */
export function getChecksByPillar(pillar: Pillar): Check[] {
  return checks.filter((c) => c.pillar === pillar);
}

/**
 * Get check counts by pillar
 */
export function getCheckCountsByPillar(): Record<Pillar, number> {
  const counts: Record<Pillar, number> = {
    metadata: 0,
    errors: 0,
    introspection: 0,
    naming: 0,
    predictability: 0,
    documentation: 0,
    performance: 0,
    discoverability: 0,
  };

  for (const check of checks) {
    counts[check.pillar]++;
  }

  return counts;
}

// Re-export individual checks for direct access
export {
  // Metadata
  META_001,
  META_002,
  META_003,
  META_004,
  META_005,
  META_006,
  // Errors
  ERR_001,
  ERR_002,
  ERR_003,
  ERR_004,
  ERR_005,
  ERR_006,
  ERR_007,
  ERR_008,
  // Live Errors (require probing)
  LIVE_ERR_001,
  LIVE_ERR_002,
  LIVE_ERR_003,
  LIVE_ERR_004,
  // Introspection
  INTRO_001,
  INTRO_002,
  INTRO_003,
  INTRO_004,
  INTRO_005,
  INTRO_006,
  INTRO_007,
  INTRO_008,
  // Naming
  NAME_001,
  NAME_002,
  NAME_003,
  NAME_004,
  NAME_005,
  NAME_006,
  // Predictability
  PRED_001,
  PRED_002,
  PRED_003,
  PRED_004,
  PRED_005,
  PRED_006,
  // Documentation
  DOC_001,
  DOC_002,
  DOC_003,
  DOC_004,
  DOC_005,
  DOC_006,
  // Performance
  PERF_001,
  PERF_002,
  PERF_003,
  PERF_004,
  // Discoverability
  DISC_001,
  DISC_002,
  DISC_003,
  DISC_004,
};

// Re-export pillar check arrays
export {
  metadataChecks,
  errorChecks,
  introspectionChecks,
  namingChecks,
  predictabilityChecks,
  documentationChecks,
  performanceChecks,
  discoverabilityChecks,
};
