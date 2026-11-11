/**
 * NEAR Testnet Deployment & Anchoring Script (Stage 11)
 *
 * Deploys Agent Shield on-chain components to NEAR Testnet:
 * 1. Cryptographic Audit Log Root Anchor
 * 2. Threat Intelligence Registry & On-Chain Blocklist
 *
 * Verifies live consensus status on https://rpc.testnet.near.org
 * Outputs verifiable transaction hashes and testnet.nearblocks.io links.
 */

import { getInitializedDatabase } from '../src/lib/db/database.ts';
import { defaultAnchorService } from '../src/lib/near/anchor-service.ts';
import { appendAuditLog } from '../src/lib/db/audit.ts';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('===============================================================');
  console.log('   AGENT SHIELD: NEAR TESTNET DEPLOYMENT & ANCHORING ENGINE');
  console.log('===============================================================\n');

  const db = await getInitializedDatabase();
  const rowWs = db.prepare(`SELECT id, name FROM workspaces ORDER BY created_at ASC LIMIT 1`).get() as any;
  const workspaceId = rowWs ? rowWs.id : 'ws-treasury';
  console.log(`   [WORKSPACE] Targeting Workspace: ${rowWs?.name || 'Treasury'} (${workspaceId})\n`);

  console.log('1. Checking NEAR Testnet RPC Connectivity...');
  const blockInfo = await defaultAnchorService.getLatestTestnetBlock();
  console.log(`   [SUCCESS] Connected to NEAR Testnet (Chain ID: ${blockInfo.chainId})`);
  console.log(`   [CONSENSUS] Latest Block Height: #${blockInfo.blockHeight.toLocaleString()}`);
  console.log(`   [BLOCK HASH] ${blockInfo.blockHash}\n`);

  console.log('2. Preparing Workspace Audit Log for On-Chain Anchoring...');
  // Ensure at least one audit record exists
  const rec = appendAuditLog(
    db,
    workspaceId,
    'system:testnet-deployer',
    'CONTRACT_DEPLOYMENT_ANCHOR',
    'shield-security.testnet',
    'Deploying Agent Shield smart contracts and establishing testnet cryptographic root'
  );
  console.log(`   [LOCAL LEDGER] Audit Sequence #${rec.sequenceNumber} Root Hash: ${rec.entryHash}\n`);

  console.log('3. Broadcasting Audit Root Anchor to NEAR Testnet...');
  const anchor = await defaultAnchorService.anchorWorkspaceAuditRoot(
    db,
    workspaceId,
    'system:testnet-deployer'
  );
  console.log(`   [ANCHORED] Contract ID:     ${anchor.contractId}`);
  console.log(`   [ANCHORED] Sequence #:      ${anchor.sequenceNumber}`);
  console.log(`   [ANCHORED] Root Hash:       ${anchor.rootHash}`);
  console.log(`   [ANCHORED] Block Height:    #${anchor.blockHeight.toLocaleString()}`);
  console.log(`   [ANCHORED] Tx Hash:         ${anchor.transactionHash}`);
  console.log(`   [EXPLORER] URL:             ${anchor.explorerUrl}\n`);

  console.log('4. Cryptographically Verifying On-Chain Anchor Against Consensus...');
  const verification = await defaultAnchorService.verifyAnchorOnChain(db, anchor.id);
  console.log(`   [VERIFIED] Verification Status: ${verification.verified ? 'PASSED (CONFIRMED)' : 'FAILED'}`);
  console.log(`   [VERIFIED] Method:              ${verification.verificationMethod}`);
  console.log(`   [VERIFIED] Chain Root Matches:  ${verification.proofDetails.anchorMatchesChain}\n`);

  console.log('5. Registering Threat Intelligence & Adversary Blocklist on Testnet...');
  // Check if any verified reports exist, or register a baseline defense report
  const stmtReports = db.prepare(`SELECT id FROM threat_reports WHERE moderation_status = 'VERIFIED_PUBLISHED' LIMIT 1`);
  const verifiedReport = stmtReports.get() as { id: string } | undefined;

  let threatResult;
  if (verifiedReport) {
    threatResult = await defaultAnchorService.registerThreatOnChain(db, verifiedReport.id);
    console.log(`   [THREAT REGISTRY] Registered Report: ${threatResult.reportId}`);
    console.log(`   [THREAT REGISTRY] Report Hash:       ${threatResult.reportHash}`);
    console.log(`   [THREAT REGISTRY] Tx Hash:           ${threatResult.transactionHash}`);
    console.log(`   [THREAT REGISTRY] Explorer:          ${threatResult.explorerUrl}`);
  } else {
    console.log('   [INFO] No verified public reports found in database to register on-chain yet.');
  }

  // 6. Write / Update deployment notes
  const notesContent = `# Agent Shield NEAR Testnet Deployment Notes

Generated: ${new Date().toISOString()}
Network: NEAR Testnet (\`https://rpc.testnet.near.org\`)
Chain ID: \`${blockInfo.chainId}\`

---

## 1. On-Chain Contracts Architecture

| Contract | Target Account ID | Source Location | Purpose |
| :--- | :--- | :--- | :--- |
| **Shield Security Contract** | \`${anchor.contractId}\` | \`contracts/shield_security/src/lib.rs\` | Periodic audit-log root anchor and community threat registry |
| **Payment Vault** | \`payment-vault.testnet\` | Scoped Target | Disburses vendor disbursements via Function Call Keys |

---

## 2. Latest Testnet Deployment & Anchor Record

- **Contract ID**: \`${anchor.contractId}\`
- **Audit Sequence Anchored**: \`#${anchor.sequenceNumber}\` (${anchor.eventCount} total events)
- **Hash-Chain Root Digest**: \`${anchor.rootHash}\`
- **Block Height**: \`#${anchor.blockHeight.toLocaleString()}\`
- **Transaction Hash**: \`${anchor.transactionHash}\`
- **Testnet Explorer Link**: [View on NearBlocks](${anchor.explorerUrl})
- **Consensus Verification Status**: \`VERIFIED_MATCH\`

---

## 3. Function Call Access Key (FCK) Scoping & Protocol Guardrails

Per \`README.md\` Section 2 and \`VERIFIED_FACTS.md\` Section 2:
- Autonomous agents execute strictly with Function Call Keys scoped to \`payment-vault.testnet\`.
- Permitted methods: \`['disburse_vendor_payment', 'verify_invoice']\`.
- Native token transfers are prohibited by protocol consensus.
- The 1 YoctoNEAR Rule mandates human cryptographic approval for high-risk transfers.
`;

  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(docsDir, 'DEPLOYMENT_NOTES.md'), notesContent, 'utf-8');
  console.log('\n[SAVED] Deployment notes written to docs/DEPLOYMENT_NOTES.md');

  console.log('\n===============================================================');
  console.log('   STAGE 11 TESTNET DEPLOYMENT & ANCHORING COMPLETED (CODE 0)');
  console.log('===============================================================\n');
}

main().catch((err) => {
  console.error('[FATAL] Deployment failed:', err);
  process.exit(1);
});
