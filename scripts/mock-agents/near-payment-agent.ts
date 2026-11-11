/**
 * Mock Agent 3: Treasury NEAR Payment Agent (STAGE 11)
 * Identity: treasury-v1.testnet
 * Target Contract: payment-vault.testnet
 * Security Model: Function-Call Access Key (FCK) Scoped Strictly to Single Contract
 *
 * Demonstrates:
 * 1. Signing with Function-Call Access Key (never Full Access)
 * 2. Protocol boundaries (no native transfers, gas allowance cap, 1 yoctoNEAR gate)
 * 3. Counterparty Check Service: ALLOW, WARN (routes to approvals queue), BLOCK
 */

import { AgentShield, PolicyBlockedError, ApprovalDeniedError } from '../../packages/sdk/src/index.ts';
import { defaultCounterpartyService } from '../../src/lib/near/counterparty-service.ts';

// Simulated Function-Call Access Key Definition on NEAR Protocol
interface FunctionCallAccessKeyScope {
  publicKey: string;
  receiverId: string;
  methodNames: string[];
  allowanceNear: number;
}

const DEMO_FCK_SCOPE: FunctionCallAccessKeyScope = {
  publicKey: 'ed25519:6uV8hQ...[RESTRICTED_FUNCTION_CALL_KEY]',
  receiverId: 'payment-vault.testnet', // Strict receiver scoping
  methodNames: ['disburse_vendor_payment', 'verify_invoice'], // Approved methods
  allowanceNear: 5.0 // Gas fee allowance ceiling in NEAR
};

async function runPaymentAgent() {
  console.log('🤖 [Treasury Payment Agent] Initializing Autonomous Settlement Agent...');
  console.log('🔑 [Access Key Architecture]:');
  console.log(`   - Key Type: Function-Call Access Key (FCK)`);
  console.log(`   - Scoped Contract: ${DEMO_FCK_SCOPE.receiverId}`);
  console.log(`   - Permitted Methods: [${DEMO_FCK_SCOPE.methodNames.join(', ')}]`);
  console.log(`   - Gas Allowance Ceiling: ${DEMO_FCK_SCOPE.allowanceNear} NEAR`);
  console.log(`   - Native Token Transfer Capability: NONE (Protocol-Enforced)`);
  console.log(`   - Consensus Gate: 1 YoctoNEAR required for human wallet sign-off\n`);

  const shield = new AgentShield({
    agentId: 'agent-01',
    ingestToken: 'ash_live_treasury_payment_agent_token_2026_testnet',
    endpointUrl: 'http://localhost:3000/api/ingest',
    nearAccountId: 'treasury-v1.testnet',
    targetContractId: DEMO_FCK_SCOPE.receiverId,
    maxNearPerTransaction: DEMO_FCK_SCOPE.allowanceNear,
    requiresApprovalAboveNear: 2.0, // Holds transactions > 2 NEAR for human approval
    blockedDestinations: ['attacker-drain.testnet', 'untrusted-drain.testnet', 'exploit-drain.testnet'],
    counterpartyCheckService: defaultCounterpartyService,
    // Automated resolver for CLI demonstration of approvals holding queue
    approvalResolver: async (id: string, req: any): Promise<'APPROVE' | 'DENY'> => {
      console.log(`   [Approvals Queue] Request ${id} for ${req.amountNear || 0} NEAR held for operator review.`);
      console.log(`   [Approvals Queue] Reason: ${req.reason}`);
      console.log(`   [Approvals Queue] Operator signing with 1 yoctoNEAR cryptographic confirmation.`);
      return 'APPROVE';
    }
  });

  // 1. Health Heartbeat
  console.log('💓 [Treasury Payment Agent] Emitting heartbeat to Agent Shield gateway...');
  const hb = await shield.sendHeartbeat('ACTIVE');
  console.log('   Heartbeat result:', hb.success ? 'ACTIVE & MONITORED' : hb.error);

  // 2. Define wrapped tools with in-line policy & counterparty verification
  const disburseVendorPayment = shield.wrapToolCall(
    'disburse_vendor_payment',
    'payment-vault.testnet',
    async (args: { vendorId: string; amountNear: number; invoiceRef: string }) => {
      console.log(`   Signing transaction to ${DEMO_FCK_SCOPE.receiverId}::disburse_vendor_payment...`);
      return {
        txHash: '4f2e998877aabbccddeeff00112233445566778899aabbccddeeff0011223344',
        status: 'SETTLED_ON_TESTNET',
        gasUsedTgas: '14.8',
        explorerUrl: 'https://testnet.nearblocks.io/txns/4f2e998877aabbccddeeff0011223344'
      };
    },
    { actionType: 'CONTRACT_CALL', attachedNear: 1.5 }
  );

  const disburseToNewVendor = shield.wrapToolCall(
    'disburse_vendor_payment',
    'unverified-merchant-2026.testnet',
    async (args: { vendorId: string; amountNear: number; invoiceRef: string }) => {
      return { status: 'SETTLED' };
    },
    { actionType: 'CONTRACT_CALL', attachedNear: 2.5 }
  );

  const emergencyDrain = shield.wrapToolCall(
    'emergency_treasury_drain',
    'untrusted-drain.testnet',
    async (args: { amountNear: number }) => {
      return { txHash: 'DRAIN_OCCURRED' };
    },
    { actionType: 'CONTRACT_CALL', attachedNear: 50.0 }
  );

  // SCENARIO A: Routine payment to verified counterparty within FCK boundaries
  console.log('\n--- Scenario A: Routine Vendor Settlement (Within Scoped Contract & 5 NEAR Cap) ---');
  try {
    const resA = await disburseVendorPayment({
      vendorId: 'vendor-01.testnet',
      amountNear: 1.5,
      invoiceRef: 'INV-2026-88'
    });
    console.log('✅ Routine vendor disbursement settled successfully!');
    console.log(`   Tx Hash: ${resA.txHash}`);
    console.log(`   Explorer: ${resA.explorerUrl}`);
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  }

  // SCENARIO B: Counterparty Warning & Approvals Queue Holding
  console.log('\n--- Scenario B: Unverified Counterparty Interaction (WARN -> Approvals Queue Holding) ---');
  try {
    console.log('   Invoking payment to newly observed merchant: unverified-merchant-2026.testnet...');
    const resB = await disburseToNewVendor({
      vendorId: 'unverified-merchant-2026.testnet',
      amountNear: 2.5,
      invoiceRef: 'INV-2026-99'
    });
    console.log('✅ Action successfully resumed after human operator 1-yoctoNEAR approval!');
  } catch (err: any) {
    console.log('   Result:', err.message);
  }

  // SCENARIO C: Exploit Attempt to Blocked Destination
  console.log('\n--- Scenario C: Prompt Injection Drain Targeting Blocklisted Destination (Refused to Sign) ---');
  try {
    console.log('   Attempting 50.0 NEAR transfer to untrusted-drain.testnet...');
    await emergencyDrain({ amountNear: 50.0 });
  } catch (err: any) {
    if (err instanceof PolicyBlockedError) {
      console.log('🛡️ [DEFENSE ACTIVE] Agent Shield refused to sign transaction!');
      console.log(`   Reason: ${err.reason}`);
      console.log('   Audit trail appended to hash-chained ledger and anchored to NEAR.');
    } else {
      console.error('❌ Unexpected error:', err.message);
    }
  }

  console.log('\n🤖 [Treasury Payment Agent] Demonstration execution complete.\n');
}

runPaymentAgent().catch(console.error);
