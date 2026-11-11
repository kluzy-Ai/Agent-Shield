/**
 * AGENT SHIELD: ONE-COMMAND MASTER DEMO SCRIPT (Stage 12)
 *
 * Runs all PRD scenarios and track demonstrations in sequence:
 * (a) Refund abuse held for approval
 * (b) Prompt injection via a webpage flagged and blocked at the control point
 * (c) Unauthorized data transfer blocked by the gateway
 * (d) Overnight activity with a morning summary
 * (e) Research contribution through the redaction and review pipeline
 * (f) Prompt-injected NEAR payment agent stopped from paying bad address (Track 06 Demo)
 * (g) Observe-only agent run proving "observed, not blocked"
 *
 * Usage:
 *   npm run demo
 *   node scripts/simulations/run-all-scenarios.ts
 */

import runScenarioA from './scenario-a-refund-approval.ts';
import runScenarioB from './scenario-b-webpage-prompt-injection.ts';
import runScenarioC from './scenario-c-gateway-data-exfil.ts';
import runScenarioD from './scenario-d-overnight-morning-summary.ts';
import runScenarioE from './scenario-e-threat-intel-pipeline.ts';
import runScenarioF from './scenario-f-near-payment-drain.ts';
import runObserveOnlyDemo from './observe-only-demo.ts';

async function main() {
  console.log('######################################################################');
  console.log('#                                                                    #');
  console.log('#        AGENT SHIELD: END-TO-END AUTONOMOUS SECURITY DEMO           #');
  console.log('#      Autonomous AI Agent Security & Guardrails on NEAR Protocol    #');
  console.log('#                                                                    #');
  console.log('######################################################################\n');

  const startTime = Date.now();
  const results: { scenario: string; label: string; passed: boolean }[] = [];

  // Scenario (a)
  try {
    await runScenarioA();
    results.push({ scenario: 'Scenario (a)', label: 'Refund abuse held for approval', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (a) failed:', err.message);
    results.push({ scenario: 'Scenario (a)', label: 'Refund abuse held for approval', passed: false });
  }

  // Scenario (b)
  try {
    await runScenarioB();
    results.push({ scenario: 'Scenario (b)', label: 'Webpage prompt injection blocked at control point', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (b) failed:', err.message);
    results.push({ scenario: 'Scenario (b)', label: 'Webpage prompt injection blocked at control point', passed: false });
  }

  // Scenario (c)
  try {
    await runScenarioC();
    results.push({ scenario: 'Scenario (c)', label: 'Unauthorized data transfer blocked by gateway', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (c) failed:', err.message);
    results.push({ scenario: 'Scenario (c)', label: 'Unauthorized data transfer blocked by gateway', passed: false });
  }

  // Scenario (d)
  try {
    await runScenarioD();
    results.push({ scenario: 'Scenario (d)', label: 'Overnight activity with morning summary', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (d) failed:', err.message);
    results.push({ scenario: 'Scenario (d)', label: 'Overnight activity with morning summary', passed: false });
  }

  // Scenario (e)
  try {
    await runScenarioE();
    results.push({ scenario: 'Scenario (e)', label: 'Research contribution redaction & review pipeline', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (e) failed:', err.message);
    results.push({ scenario: 'Scenario (e)', label: 'Research contribution redaction & review pipeline', passed: false });
  }

  // Scenario (f) - Track 06 Flagship Demo
  try {
    await runScenarioF();
    results.push({ scenario: 'Scenario (f)', label: 'Track 06 Demo: Injected payment agent stopped', passed: true });
  } catch (err: any) {
    console.error('❌ Scenario (f) failed:', err.message);
    results.push({ scenario: 'Scenario (f)', label: 'Track 06 Demo: Injected payment agent stopped', passed: false });
  }

  // Observe-Only Agent Run
  try {
    await runObserveOnlyDemo();
    results.push({ scenario: 'Observe-Only', label: 'Observe-only agent run ("Observed, not blocked")', passed: true });
  } catch (err: any) {
    console.error('❌ Observe-Only demo failed:', err.message);
    results.push({ scenario: 'Observe-Only', label: 'Observe-only agent run ("Observed, not blocked")', passed: false });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n======================================================================');
  console.log('              AGENT SHIELD SCENARIO EXECUTION MATRIX                  ');
  console.log('======================================================================');
  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} | ${r.scenario.padEnd(14)} | ${r.label}`);
  }
  console.log('----------------------------------------------------------------------');
  const allPassed = results.every((r) => r.passed);
  console.log(`  OVERALL STATUS:   ${allPassed ? 'ALL 7 SCENARIOS PASSED (100%)' : 'SOME SCENARIOS FAILED'}`);
  console.log(`  EXECUTION TIME:   ${durationSec}s`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL] Demo execution crashed:', err);
  process.exit(1);
});

