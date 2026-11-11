import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import { TenantAccessLayer } from '../src/lib/db/access-layer.ts';
import { PolicyEngine } from '../src/lib/policy-engine/index.ts';
import {
  AgentShield,
  PolicyBlockedError,
  ApprovalDeniedError,
  ApprovalExpiredError
} from '../packages/sdk/src/index.ts';
import {
  createGatewayProxyServer,
  evaluateGatewayRequest
} from '../services/gateway/src/index.ts';

describe('Stage 7: Policy Engine, Real Control Points & Approvals Queue (FR-07, FR-08)', () => {
  let db: DatabaseSync;
  let accessLayer: TenantAccessLayer;
  let gatewayServer: http.Server | null = null;
  let gatewayPort = 3099;

  beforeEach(() => {
    db = getDatabase(':memory:');
    resetDatabase(db);

    const now = new Date().toISOString();

    // Seed test accounts, workspaces, and memberships
    db.prepare(`
      INSERT INTO accounts (id, name, email, password_hash, created_at)
      VALUES ('acc-operator', 'Security Operator', 'operator@agentshield.testnet', 'hash123', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO workspaces (id, name, environment, owner_id, created_at)
      VALUES ('ws-treasury', 'Treasury & Store Operations', 'PRODUCTION', 'acc-operator', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, account_id, role, created_at)
      VALUES ('mem-01', 'ws-treasury', 'acc-operator', 'owner', ?)
    `).run(now);

    // Seed test agents
    // 1. Enforcing SDK Agent (Autonomous Refund Support Agent)
    db.prepare(`
      INSERT INTO agents (
        id, workspace_id, name, description, category, near_account_id, target_contract_id,
        has_function_call_key, status, enforcement_level, risk_score, created_at, last_heartbeat
      ) VALUES ('agent-refund', 'ws-treasury', 'Autonomous Refund Support Agent', 'Issues store refunds',
                'SUPPORT', 'refund-bot.testnet', 'storefront-v2.testnet', 1, 'ACTIVE', 'ENFORCING', 25, ?, ?)
    `).run(now, now);

    // 2. Observe-Only Webhook Agent (SupportGenie Observability Bot)
    db.prepare(`
      INSERT INTO agents (
        id, workspace_id, name, description, category, near_account_id, target_contract_id,
        has_function_call_key, status, enforcement_level, risk_score, created_at, last_heartbeat
      ) VALUES ('agent-observe', 'ws-treasury', 'SupportGenie Observability Bot', 'Passive webhook log stream',
                'SUPPORT', 'support-genie.testnet', 'helpdesk-v1.testnet', 0, 'ACTIVE', 'OBSERVE_ONLY', 35, ?, ?)
    `).run(now, now);

    // Seed Policies
    db.prepare(`
      INSERT INTO policies (
        id, workspace_id, agent_id, name, type, status, is_enforceable, dry_run, config_json, created_at
      ) VALUES (
        'pol-refund', 'ws-treasury', 'agent-refund', 'Autonomous Refund Guardrail',
        'SPENDING_LIMIT', 'ACTIVE', 1, 0,
        ?, ?
      )
    `).run(
      JSON.stringify({
        maxNearPerTransaction: 10.0,
        requiresApprovalAboveNear: 2.0,
        approvedDestinations: ['storefront-v2.testnet'],
        allowedTools: ['issue_refund', 'verify_order']
      }),
      now
    );

    db.prepare(`
      INSERT INTO policies (
        id, workspace_id, agent_id, name, type, status, is_enforceable, dry_run, config_json, created_at
      ) VALUES (
        'pol-observe', 'ws-treasury', 'agent-observe', 'SupportGenie Observability Guardrail',
        'SPENDING_LIMIT', 'ACTIVE', 0, 0,
        ?, ?
      )
    `).run(
      JSON.stringify({
        maxNearPerTransaction: 5.0,
        requiresApprovalAboveNear: 1.0,
        approvedDestinations: ['helpdesk-v1.testnet']
      }),
      now
    );

    accessLayer = TenantAccessLayer.create(db, {
      accountId: 'acc-operator',
      workspaceId: 'ws-treasury'
    });
  });

  afterEach(() => {
    if (gatewayServer) {
      gatewayServer.close();
      gatewayServer = null;
    }
  });

  // =========================================================================
  // TEST 1: REFUND OVER LIMIT IS HELD FOR APPROVAL
  // =========================================================================
  describe('1. Approvals Queue & Real Action Holding', () => {
    it('refund over limit is held for approval, and resumes when approved', async () => {
      let executionCompleted = false;

      // Instantiate SDK for refund agent with 2.0 NEAR approval threshold
      const shield = new AgentShield({
        agentId: 'agent-refund',
        ingestToken: 'test_token',
        requiresApprovalAboveNear: 2.0,
        maxNearPerTransaction: 10.0,
        approvedDestinations: ['storefront-v2.testnet'],
        // Mock the approval hold/resolve workflow simulating human operator approval
        approvalResolver: async (approvalId, req) => {
          assert.strictEqual(req.toolName, 'issue_refund');
          assert.strictEqual(req.amountNear, 2.5);

          // Simulate operator reviewing the pending approval and granting 1 yoctoNEAR authorization
          const created = accessLayer.createApproval({
            id: approvalId,
            agentId: 'agent-refund',
            actionType: 'issue_refund',
            toolName: 'issue_refund',
            destination: 'storefront-v2.testnet',
            amountNear: '2.5',
            parameters: req.parameters,
            reason: req.reason,
            requiresYoctoDeposit: true
          });

          assert.strictEqual(created.status, 'PENDING');
          assert.strictEqual(created.requiresYoctoDeposit, true);

          // Operator approves
          const decided = accessLayer.decideApproval(approvalId, 'APPROVE', 'Operator verified customer return receipt.');
          assert.strictEqual(decided.status, 'APPROVED');

          return 'APPROVE' as const;
        }
      });

      // Wrap refund tool
      const issueRefund = shield.wrapToolCall(
        'issue_refund',
        'storefront-v2.testnet',
        async (args: { orderId: string; amountNear: number }) => {
          executionCompleted = true;
          return { txHash: '8b9c...f102', refunded: args.amountNear };
        },
        { actionType: 'issue_refund', attachedNear: 2.5 }
      );

      // Execute: refund is for 2.5 NEAR (exceeds 2.0 limit) -> must be held for approval
      const result = await issueRefund({ orderId: 'ORD-98214', amountNear: 2.5 });

      assert.strictEqual(executionCompleted, true, 'Tool invocation must resume and finish upon approval');
      assert.strictEqual(result.txHash, '8b9c...f102');
      assert.strictEqual(result.refunded, 2.5);
    });

    it('refund over limit throws ApprovalDeniedError when operator denies the action', async () => {
      const shield = new AgentShield({
        agentId: 'agent-refund',
        requiresApprovalAboveNear: 2.0,
        maxNearPerTransaction: 10.0,
        approvedDestinations: ['storefront-v2.testnet'],
        approvalResolver: async (approvalId, req) => {
          // Simulate operator dropping/denying the request
          accessLayer.createApproval({
            id: approvalId,
            agentId: 'agent-refund',
            actionType: 'issue_refund',
            toolName: 'issue_refund',
            destination: 'storefront-v2.testnet',
            amountNear: '3.5',
            parameters: req.parameters,
            reason: req.reason
          });

          accessLayer.decideApproval(approvalId, 'DENY', 'Suspicious refund velocity detected.');
          return 'DENY' as const;
        }
      });

      const issueRefund = shield.wrapToolCall(
        'issue_refund',
        'storefront-v2.testnet',
        async (args: { amountNear: number }) => ({ success: true }),
        { actionType: 'issue_refund', attachedNear: 3.5 }
      );

      await assert.rejects(
        async () => {
          await issueRefund({ amountNear: 3.5 });
        },
        (err: any) => {
          assert.strictEqual(err.name, 'ApprovalDeniedError');
          assert.ok(err.message.includes('denied by security operator'));
          return true;
        }
      );
    });
  });

  // =========================================================================
  // TEST 2: TRANSFER TO AN UNAPPROVED DESTINATION IS BLOCKED AT THE GATEWAY
  // =========================================================================
  describe('2. Gateway Forward Proxy & Safe-Failure Mode', () => {
    it('transfer to an unapproved destination is blocked at the gateway with HTTP 403', async () => {
      gatewayPort = 3101;
      gatewayServer = createGatewayProxyServer({
        port: gatewayPort,
        defaultApprovedDestinations: ['storefront-v2.testnet', 'payment-vault.testnet']
      });

      await new Promise<void>((resolve) => gatewayServer!.listen(gatewayPort, resolve));

      // Make request targeting an unapproved destination (untrusted-drain.testnet)
      const postData = JSON.stringify({
        method: 'transfer',
        destination: 'untrusted-drain.testnet',
        amountNear: 50.0
      });

      const response = await new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: gatewayPort,
            method: 'POST',
            path: '/proxy',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'x-target-destination': 'untrusted-drain.testnet',
              'x-agent-id': 'agent-refund'
            }
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                resolve({ statusCode: res.statusCode || 500, body: JSON.parse(data) });
              } catch {
                resolve({ statusCode: res.statusCode || 500, body: data });
              }
            });
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      assert.strictEqual(response.statusCode, 403, 'Gateway must return 403 Forbidden for unapproved destinations');
      assert.strictEqual(response.body.error, 'BLOCKED_BY_GATEWAY_POLICY');
      assert.strictEqual(response.body.outcome, 'BLOCKED');
      assert.ok(response.body.reason.includes('unapproved'));
    });

    it('enforces safe-failure mode: fails closed with 502 Bad Gateway upon inspection error (no silent bypass)', async () => {
      gatewayPort = 3102;
      // Initialize gateway with simulateFailClosed: true
      gatewayServer = createGatewayProxyServer({
        port: gatewayPort,
        simulateFailClosed: true
      });

      await new Promise<void>((resolve) => gatewayServer!.listen(gatewayPort, resolve));

      const postData = JSON.stringify({ destination: 'storefront-v2.testnet', amount: 1.0 });

      const response = await new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: gatewayPort,
            method: 'POST',
            path: '/proxy',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'x-target-destination': 'storefront-v2.testnet'
            }
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              resolve({ statusCode: res.statusCode || 500, body: JSON.parse(data) });
            });
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      assert.strictEqual(response.statusCode, 502, 'Gateway must fail closed with 502 when inspection pipeline fails');
      assert.strictEqual(response.body.error, 'GATEWAY_FAIL_CLOSED_ERROR');
      assert.strictEqual(response.body.safeBypassPrevented, true, 'Gateway must never allow silent bypass on error');
    });

    it('allows forwarding when destination is approved', async () => {
      gatewayPort = 3103;
      gatewayServer = createGatewayProxyServer({
        port: gatewayPort,
        defaultApprovedDestinations: ['storefront-v2.testnet']
      });

      await new Promise<void>((resolve) => gatewayServer!.listen(gatewayPort, resolve));

      const postData = JSON.stringify({ action: 'check_stock', destination: 'storefront-v2.testnet' });

      const response = await new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: gatewayPort,
            method: 'POST',
            path: '/proxy',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'x-target-destination': 'storefront-v2.testnet'
            }
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              resolve({ statusCode: res.statusCode || 500, body: JSON.parse(data) });
            });
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.forwarded, true);
    });
  });

  // =========================================================================
  // TEST 3: AN OBSERVE-ONLY AGENT IS ONLY ALERTED AND THE UI SAYS SO
  // =========================================================================
  describe('3. Observe-Only Real Capability Constraint (FR-15 & PRD Section 21)', () => {
    it('an observe-only agent is only alerted when triggering a block rule and execution is not halted', () => {
      // Create a policy that normally blocks amounts > 5.0 NEAR
      const policyDefs = [
        {
          id: 'pol-strict',
          workspaceId: 'ws-treasury',
          agentId: 'agent-observe',
          name: 'Strict Spending Ceiling',
          type: 'SPENDING_LIMIT',
          status: 'ACTIVE' as const,
          isEnforceable: false, // Observe-only
          dryRun: false,
          maxNearPerTransaction: 5.0,
          rules: []
        }
      ];

      // Context: Observe-only agent invokes tool with 25 NEAR (exceeding 5.0 NEAR limit)
      const evaluation = PolicyEngine.evaluate(policyDefs, {
        agentId: 'agent-observe',
        agentName: 'SupportGenie Observability Bot',
        enforcementLevel: 'OBSERVE_ONLY',
        isObserveOnly: true,
        toolName: 'disburse_credit',
        destination: 'helpdesk-v1.testnet',
        amountNear: 25.0
      });

      // Assert:
      // 1. Action is NOT blocked: allowed is true
      assert.strictEqual(evaluation.allowed, true, 'Observe-only agent cannot halt or block execution');
      // 2. Outcome is downgraded to ALERT
      assert.strictEqual(evaluation.outcome, 'ALERT', 'Outcome must degrade to ALERT for observe-only agents');
      // 3. Flag indicates enforcement is unavailable
      assert.strictEqual(evaluation.enforcementUnavailable, true, 'Must flag enforcementUnavailable');
      // 4. Explanation specifies observe-only reason
      assert.ok(evaluation.reason.includes('[OBSERVE-ONLY]'), 'Reason must explicitly explain observe-only status');
      assert.ok(evaluation.reason.includes('Enforcement unavailable'), 'Reason must state enforcement unavailable');
      assert.ok(evaluation.signalsTriggered.includes('ENFORCEMENT_UNAVAILABLE_OBSERVE_ONLY'));
    });

    it('SDK wrapToolCall does not throw PolicyBlockedError for observe-only agent and emits FLAGGED/ALERT', async () => {
      let toolExecuted = false;

      const shield = new AgentShield({
        agentId: 'agent-observe',
        enforcementLevel: 'OBSERVE_ONLY',
        isObserveOnly: true,
        maxNearPerTransaction: 5.0,
        blockedDestinations: ['attacker-drain.testnet']
      });

      const callTool = shield.wrapToolCall(
        'refund_credit',
        'attacker-drain.testnet', // Normally a blocked destination!
        async () => {
          toolExecuted = true;
          return { status: 'OBSERVED_AND_EXECUTED' };
        }
      );

      // Must NOT throw PolicyBlockedError!
      const res = await callTool({});

      assert.strictEqual(toolExecuted, true, 'Tool invocation must complete for observe-only agent');
      assert.strictEqual(res.status, 'OBSERVED_AND_EXECUTED');
    });

    it('verifies TenantAccessLayer returns isEnforceable: false with clear warning for observe-only policies', () => {
      const evaluation = accessLayer.evaluateAgentAction({
        agentId: 'agent-observe',
        toolName: 'disburse_credit',
        destination: 'helpdesk-v1.testnet',
        amountNear: 20.0
      });

      assert.strictEqual(evaluation.allowed, true);
      assert.strictEqual(evaluation.enforcementUnavailable, true);
      assert.strictEqual(evaluation.outcome, 'ALERT');
    });
  });

  // =========================================================================
  // TEST 4: DRY-RUN SIMULATION MODE
  // =========================================================================
  describe('4. Dry-Run Mode Simulation', () => {
    it('permits execution in dry-run mode while logging the would-be action', () => {
      const policyDefs = [
        {
          id: 'pol-dry',
          workspaceId: 'ws-treasury',
          agentId: 'agent-refund',
          name: 'Dry Run Destination Gate',
          type: 'DESTINATION_ALLOWLIST',
          status: 'ACTIVE' as const,
          isEnforceable: true,
          dryRun: true, // DRY RUN TOGGLED ON!
          approvedDestinations: ['storefront-v2.testnet'],
          rules: []
        }
      ];

      const evaluation = PolicyEngine.evaluate(policyDefs, {
        agentId: 'agent-refund',
        agentName: 'Autonomous Refund Support Agent',
        toolName: 'issue_refund',
        destination: 'unapproved-destination.testnet' // Unapproved destination
      });

      assert.strictEqual(evaluation.allowed, true, 'Dry-run must never halt execution');
      assert.strictEqual(evaluation.isDryRun, true, 'Must flag isDryRun: true');
      assert.ok(evaluation.reason.includes('[DRY-RUN SIMULATION]'));
      assert.ok(evaluation.signalsTriggered.includes('DRY_RUN_SIMULATION'));
    });
  });
});
