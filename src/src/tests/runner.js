#!/usr/bin/env node
/**
 * Master Automated Test Suite Runner
 * MN Alerts Creator Streaming & Engagement Platform
 *
 * Usage:
 *   node src/tests/runner.js
 *   node src/tests/runner.js --tier=0
 *   node src/tests/runner.js --tier=1
 *   node src/tests/runner.js --tier=2
 *   node src/tests/runner.js --tier=3
 *   node src/tests/runner.js --tier=4
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIERS = [
  { id: 0, name: 'Tier 0: Milestone 0 Foundational Deliverables & Catalog Integrity', file: 'tier0_m0_foundational_deliverables.test.js' },
  { id: 1, name: 'Tier 1: Feature Coverage & Contracts', file: 'tier1_feature_coverage.test.js' },
  { id: 2, name: 'Tier 2: Boundary, Adversarial & Extreme Inputs', file: 'tier2_boundary_corner_cases.test.js' },
  { id: 3, name: 'Tier 3: Cross-Feature Interactions', file: 'tier3_cross_feature_interactions.test.js' },
  { id: 4, name: 'Tier 4: Real-World Broadcast Scenarios', file: 'tier4_real_world_scenarios.test.js' },
];

console.log('\n======================================================================');
console.log('  🎯 MN ALERTS CREATOR STREAMING PLATFORM — AUTOMATED TEST RUNNER');
console.log('  Target: /media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src');
console.log('======================================================================\n');

// Parse CLI flags
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith('--tier='));
const targetTier = tierArg !== undefined ? parseInt(tierArg.split('=')[1], 10) : null;

const tiersToRun = targetTier !== null
  ? TIERS.filter((t) => t.id === targetTier)
  : TIERS;

if (tiersToRun.length === 0) {
  console.error(`❌ Unknown tier specified: ${targetTier}. Available tiers: 0, 1, 2, 3, 4.`);
  process.exit(1);
}

console.log(`📋 Scheduled Test Suites (${tiersToRun.length} tiers):`);
for (const t of tiersToRun) {
  console.log(`   - [Tier ${t.id}] ${t.name} (${t.file})`);
}
console.log('\n--- Executing Test Suites ---\n');

try {
  for (const t of tiersToRun) {
    const fullPath = path.resolve(__dirname, t.file);
    await import(fullPath);
  }
} catch (err) {
  console.error('\n❌ Fatal error during test execution:', err);
  process.exit(1);
}
