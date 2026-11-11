/**
 * AGENT SHIELD DATABASE SEED COMMAND (Stage 12)
 *
 * Usage:
 *   npm run seed
 *   node scripts/seed-command.ts
 *   node scripts/seed-command.ts --reset
 *
 * Populates the SQLite database (data/agent-shield.db) with a complete,
 * production-like baseline environment:
 * - 6 Multi-tenant accounts across 5 RBAC roles (Argon2id hashed)
 * - 4 Workspaces (Production, Sandbox, Staging, External)
 * - 3 Real agents with scoped Function-Call Access Keys
 * - Comprehensive policy guardrails (spending ceilings, allowlists, sensitive data)
 * - Immutable SHA-256 hash-chained audit ledger from genesis
 * - Incident dossiers with 7-step forensic timelines and redacted payloads
 * - Approvals queue records with 1 yoctoNEAR cryptographic requirements
 * - Community threat intelligence reports with public sanitized summaries
 * - Initial cryptographic audit root anchored on NEAR Testnet
 */

import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';
import { defaultAnchorService } from '../src/lib/near/anchor-service.ts';

async function main() {
  console.log('======================================================================');
  console.log('  AGENT SHIELD DATABASE SEED COMMAND');
  console.log('  Deterministic Multi-Tenant Baseline Provisioning');
  console.log('======================================================================\n');

  const db = getDatabase();

  const shouldReset = process.argv.includes('--reset') || process.env.RESET_DB === 'true';
  if (shouldReset) {
    console.log('🔄 [--reset] Clearing existing database tables...');
    resetDatabase(db);
    console.log('   Existing data cleared.\n');
  }

  console.log('1. Executing deterministic database seed...');
  await seedDatabase(db);
  console.log('   [SUCCESS] SQLite schema and records provisioned.\n');

  console.log('2. Anchoring baseline workspace audit root on NEAR Testnet...');
  try {
    const anchor = await defaultAnchorService.anchorWorkspaceAuditRoot(
      db,
      'ws-treasury',
      'system:seed-provisioner'
    );
    console.log(`   [ANCHORED] Contract:     ${anchor.contractId}`);
    console.log(`   [ANCHORED] Sequence #:   #${anchor.sequenceNumber}`);
    console.log(`   [ANCHORED] Root Hash:    ${anchor.rootHash}`);
    console.log(`   [ANCHORED] Block Height: #${anchor.blockHeight.toLocaleString()}`);
    console.log(`   [ANCHORED] Tx Hash:      ${anchor.transactionHash}`);
    console.log(`   [EXPLORER] URL:          ${anchor.explorerUrl}\n`);
  } catch (err: any) {
    console.warn('   [NOTICE] On-chain testnet anchor ping skipped (offline or rate limited):', err.message);
  }

  // Query counts for CLI summary
  const counts = {
    accounts: (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as any).c,
    workspaces: (db.prepare('SELECT COUNT(*) as c FROM workspaces').get() as any).c,
    agents: (db.prepare('SELECT COUNT(*) as c FROM agents').get() as any).c,
    policies: (db.prepare('SELECT COUNT(*) as c FROM policies').get() as any).c,
    auditLogs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any).c,
    alerts: (db.prepare('SELECT COUNT(*) as c FROM alerts').get() as any).c,
    incidents: (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as any).c,
    approvals: (db.prepare('SELECT COUNT(*) as c FROM approvals').get() as any).c,
    threatReports: (db.prepare('SELECT COUNT(*) as c FROM threat_reports').get() as any).c,
    nearAnchors: (db.prepare('SELECT COUNT(*) as c FROM near_anchors').get() as any).c
  };

  console.log('3. Database Provisioning Inventory:');
  console.log('----------------------------------------------------------------------');
  console.log(`👥 Accounts:              ${counts.accounts} (All passwords: 'Password123!')`);
  console.log(`🏢 Workspaces:            ${counts.workspaces} (ws-treasury, ws-storefront, ws-research, ws-external)`);
  console.log(`🤖 Monitored Agents:      ${counts.agents} (treasury-v1.testnet, refund-bot.testnet, crawler-01.testnet)`);
  console.log(`🛡️ Security Policies:     ${counts.policies} (Ceilings, Allowlists, Sensitive Data)`);
  console.log(`🔗 Audit Ledger Blocks:   ${counts.auditLogs} (Cryptographically chained SHA-256)`);
  console.log(`🚨 Security Alerts:       ${counts.alerts}`);
  console.log(`📋 Incident Dossiers:     ${counts.incidents}`);
  console.log(`⏳ Approvals Queue:       ${counts.approvals}`);
  console.log(`🌐 Threat Intel Reports:  ${counts.threatReports}`);
  console.log(`⚓ NEAR On-Chain Anchors: ${counts.nearAnchors}`);
  console.log('----------------------------------------------------------------------\n');

  console.log('4. Demo Credentials for Dashboard Testing (http://localhost:3000):');
  console.log('   - Owner:      operator@agentshield.testnet   (Password123!)');
  console.log('   - Admin:      admin@agentshield.testnet      (Password123!)');
  console.log('   - Analyst:    analyst@agentshield.testnet    (Password123!)');
  console.log('   - Moderator:  moderator@agentshield.testnet  (Password123!)');
  console.log('   - Auditor:    viewer@agentshield.testnet     (Password123!)');
  console.log('   - NEAR Auth:  operator.testnet            (Passwordless)\n');

  console.log('======================================================================');
  console.log('  SEED COMPLETE: Database ready for demo execution & production audit');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('[FATAL] Database seed failed:', err);
  process.exit(1);
});

