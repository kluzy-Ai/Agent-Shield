/**
 * SCENARIO (a): Refund Abuse Held for Human Approval
 *
 * An e-commerce customer support agent (refund-bot.testnet) receives a customer refund request.
 * The request is for 25.0 NEAR, which breaches the autonomous spending ceiling of 2.0 NEAR.
 *
 * Demonstrated Flow:
 * 1. Agent attempts to call `issue_customer_refund` for 25.0 NEAR.
 * 2. In-line SDK pre-call hook intercepts and validates against active policies.
 * 3. Policy Rule 'Refund Autonomous Ceiling' triggers REQUIRE_APPROVAL.
 * 4. Transaction is held in the Approvals Queue with a countdown timer.
 * 5. Operator reviews the request details, justification, and 1-yoctoNEAR requirement.
 * 6. Operator authorizes the transfer with 1 yoctoNEAR cryptographic confirmation.
 * 7. Action resumes safely and settles; full audit trail recorded.
 */

import { getInitializedDatabase } from '../../src/lib/db/database.ts';
import { TenantAccessLayer } from '../../src/lib/db/access-layer.ts';
import { AgentShield, PolicyBlockedError } from '../../packages/sdk/src/index.ts';

async function runScenarioA() {
  console.log('======================================================================');
  console.log('  SCENARIO (a): REFUND ABUSE HELD FOR APPROVAL');
  console.log('  Integration: @agentshield/sdk In-Line Control Point');
  console.log('======================================================================\n');

  const db = await getInitializedDatabase();
  const workspaceId = 'ws-treasury';

  const access = TenantAccessLayer.createForSystem(db, workspaceId, 'operator@agentshield.testnet');

  console.log('1. Setting up agent policies in workspace...');
  const agentId = 'agent-02'; // refund-bot.testnet
  const agent = access.getAgentById(agentId);
  console.log(`   [AGENT] Name: ${agent?.name || 'Autonomous Refund Bot'}`);
  console.log(`   [AGENT] Account: ${agent?.nearAccountId || 'refund-bot.testnet'}`);
  console.log(`   [AGENT] Enforcement Level: ${agent?.enforcementLevel || 'ENFORCING'}\n`);

  console.log('2. Configuring policy spend guardrail...');
  console.log('   - Autonomous Ceiling: 2.0 NEAR max per refund');
  console.log('   - Rule Trigger: Transactions > 2.0 NEAR require human authorization (1 YoctoNEAR rule)\n');

  let approvalQueueHeld = false;
  let operatorApproved = false;

  console.log('3. Agent receives customer refund request for 25.0 NEAR (INV-9821)...');
  const shield = new AgentShield({
    agentId: 'agent-02',
    ingestToken: 'ash_live_demo_refund_token',
    endpointUrl: 'http://localhost:3000/api/ingest',
    nearAccountId: 'refund-bot.testnet',
    targetContractId: 'storefront-v2.testnet',
    maxNearPerTransaction: 50.0,
    requiresApprovalAboveNear: 2.0,
    approvalResolver: async (approvalId, request): Promise<'APPROVE' | 'DENY'> => {
      approvalQueueHeld = true;
      console.log('\n⏳ [APPROVALS QUEUE] Action held for operator authorization:');
      console.log(`   - Approval ID:       ${approvalId}`);
      console.log(`   - Tool Name:         ${request.toolName}`);
      console.log(`   - Target Receiver:   ${request.destination}`);
      console.log(`   - Requested Amount:  ${request.amountNear} NEAR (Limit: 2.0 NEAR)`);
      console.log(`   - Violation Reason:  ${request.reason}`);
      console.log(`   - Security Gate:     1 YoctoNEAR consensus confirmation required`);

      // Record in SQLite Approvals Queue
      const approvalRecord = access.createApproval({
        id: approvalId,
        agentId,
        toolName: request.toolName,
        destination: request.destination,
        actionType: 'CONTRACT_CALL',
        amountNear: request.amountNear,
        parameters: request.parameters || {},
        reason: request.reason || 'Transaction exceeds autonomous threshold',
        requiresYoctoDeposit: true
      });
      console.log(`   [PERSISTED] Approvals queue record created: ${approvalRecord.id}`);

      // Simulate human operator reviewing and deciding
      console.log('\n👤 [OPERATOR REVIEW] Security operator inspects invoice INV-9821...');
      console.log('   [DECISION] Transaction authorized via 1 yoctoNEAR cryptographic co-signature.');

      access.decideApproval(approvalRecord.id, 'APPROVE', 'Valid approved high-value return');
      operatorApproved = true;

      return 'APPROVE';
    }
  });

  const issueRefund = shield.wrapToolCall(
    'issue_customer_refund',
    'storefront-v2.testnet',
    async (args: { orderId: string; amountNear: number; customerWallet: string }) => {
      console.log('\n⚡ [EXECUTING TOOL] issue_customer_refund executing on-chain...');
      return {
        txHash: '0x94b3c8f1a2e456d7890bc123456789abcdef0123456789abcdef0123456789ab',
        status: 'CONFIRMED',
        refundedNear: args.amountNear,
        recipient: args.customerWallet
      };
    },
    { actionType: 'CONTRACT_CALL', attachedNear: 25.0 }
  );

  console.log('4. Agent attempts to disburse 25.0 NEAR refund...');
  const outcome = await issueRefund({
    orderId: 'ORD-9821',
    amountNear: 25.0,
    customerWallet: 'customer-verified.testnet'
  });

  console.log('\n5. Outcome Verification:');
  console.log(`   - Held in Approvals Queue:  ${approvalQueueHeld ? 'YES (VERIFIED)' : 'NO'}`);
  console.log(`   - Human Operator Approved:  ${operatorApproved ? 'YES (1 YoctoNEAR Attached)' : 'NO'}`);
  console.log(`   - Execution Succeeded Post-Approval: ${outcome.status === 'CONFIRMED' ? 'YES' : 'NO'}`);
  console.log(`   - Settle Tx Hash:          ${outcome.txHash}`);

  console.log('\n======================================================================');
  console.log('  SCENARIO (a) COMPLETED: High-value refund held and securely authorized');
  console.log('======================================================================\n');
}

export default runScenarioA;

if (process.argv[1]?.endsWith('scenario-a-refund-approval.ts')) {
  runScenarioA().catch((err) => {
    console.error('Fatal error in scenario A:', err);
    process.exit(1);
  });
}
