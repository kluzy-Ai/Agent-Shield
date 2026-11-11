import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import { signUp } from '../src/lib/db/auth.ts';
import {
  TenantAccessLayer,
  TenantIsolationViolationError,
  UnauthorizedRoleError,
  validateIngestToken,
  checkRateLimit,
  computeHonestAgentStatus
} from '../src/lib/db/access-layer.ts';
import { AgentShield, PolicyBlockedError } from '../packages/sdk/src/index.ts';

describe('Stage 6: Real Agent Registration, Ingest Credentials, Heartbeats & Telemetry', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = getDatabase(':memory:');
    resetDatabase(db);
  });

  describe('1. Agent Registration & Lifecycle Flows (FR-02, FR-03)', () => {
    it('creates an agent with scoped credentials shown once and stored hashed', async () => {
      const user = await signUp(db, {
        name: 'SecOps Lead',
        email: 'secops@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'SecOps Vault'
      });

      const access = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });

      // 1. Create Agent
      const agent = access.createAgent({
        name: 'Settlement Bot',
        description: 'Automated settlement bot',
        nearAccountId: 'settle.testnet',
        targetContractId: 'vault.testnet',
        hasFunctionCallKey: true,
        fckAllowanceNear: '10.0',
        fckAllowedMethods: ['transfer', 'payout'],
        enforcementLevel: 'ENFORCING',
        riskScore: 25
      });

      assert.ok(agent.id.startsWith('agt-'));
      assert.strictEqual(agent.name, 'Settlement Bot');
      assert.ok(agent.rawIngestToken?.startsWith('ash_live_'));

      // Verify token is stored HASHED, NOT in raw plaintext
      const creds = access.getAgentCredentials(agent.id);
      assert.strictEqual(creds.length, 1);
      assert.strictEqual(creds[0].status, 'ACTIVE');
      assert.ok(creds[0].tokenPrefix.includes('****'));

      // Check raw database row
      const rawCredRow = db.prepare('SELECT token_hash FROM agent_credentials WHERE agent_id = ?').get(agent.id) as any;
      assert.notStrictEqual(rawCredRow.token_hash, agent.rawIngestToken, 'Raw token must NEVER be stored in plaintext');
      assert.strictEqual(rawCredRow.token_hash.length, 64, 'Token must be stored as SHA-256 digest');

      // 2. Edit Agent
      const edited = access.editAgent(agent.id, {
        description: 'Updated settlement bot description',
        fckAllowanceNear: '15.0'
      });
      assert.strictEqual(edited.description, 'Updated settlement bot description');
      assert.strictEqual(edited.fckAllowanceNear, '15.0');

      // 3. Pause & Resume Agent
      const paused = access.updateAgentStatus(agent.id, 'PAUSED');
      assert.strictEqual(paused.status, 'PAUSED');

      const resumed = access.updateAgentStatus(agent.id, 'ACTIVE');
      assert.strictEqual(resumed.status, 'ACTIVE');

      // 4. Rotate Credential (Revokes old token, returns new raw token once)
      const rotation = access.rotateAgentCredential(agent.id);
      assert.ok(rotation.rawIngestToken.startsWith('ash_live_'));
      assert.notStrictEqual(rotation.rawIngestToken, agent.rawIngestToken);

      const allCreds = access.getAgentCredentials(agent.id);
      assert.strictEqual(allCreds.length, 2);
      const activeCount = allCreds.filter((c) => c.status === 'ACTIVE').length;
      const revokedCount = allCreds.filter((c) => c.status === 'REVOKED').length;
      assert.strictEqual(activeCount, 1);
      assert.strictEqual(revokedCount, 1);

      // 5. Disconnect Agent
      const disconnected = access.disconnectAgent(agent.id);
      assert.strictEqual(disconnected.status, 'DISCONNECTED');
      assert.strictEqual(disconnected.enforcementLevel, 'DISCONNECTED');

      // 6. Remove Agent
      const removal = access.removeAgent(agent.id);
      assert.strictEqual(removal.success, true);
      assert.strictEqual(access.getAgents().length, 0);
    });
  });

  describe('2. Ingestion Security & Validation (Schema, Token Auth, Idempotency, Rate Limiting)', () => {
    it('authenticates valid tokens and rejects revoked tokens', async () => {
      const user = await signUp(db, {
        name: 'Ingest User',
        email: 'ingest@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'Ingest Vault'
      });

      const access = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });

      const agent = access.createAgent({
        name: 'Ingest Bot',
        description: 'Bot for ingest testing',
        nearAccountId: 'ingest.testnet',
        targetContractId: 'contract.testnet'
      });

      const rawToken = agent.rawIngestToken!;

      // Validate active token
      const auth = validateIngestToken(db, rawToken);
      assert.ok(auth !== null);
      assert.strictEqual(auth?.agentId, agent.id);
      assert.strictEqual(auth?.workspaceId, user.workspace.id);

      // Validate invalid token fails
      const badAuth = validateIngestToken(db, 'ash_live_invalid_token_123');
      assert.strictEqual(badAuth, null);

      // Revoke credential and verify subsequent validation fails
      access.disconnectAgent(agent.id);
      const revokedAuth = validateIngestToken(db, rawToken);
      assert.strictEqual(revokedAuth, null, 'Revoked credential must fail ingestion validation');
    });

    it('enforces idempotency and deduplicates telemetry events by eventId', async () => {
      const user = await signUp(db, {
        name: 'Dedupe User',
        email: 'dedupe@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'Dedupe Vault'
      });

      const access = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });

      const agent = access.createAgent({
        name: 'Dedupe Bot',
        description: 'Bot for dedupe testing',
        nearAccountId: 'dedupe.testnet',
        targetContractId: 'target.testnet'
      });

      const eventId = 'evt-unique-uuid-999';

      // First insertion
      const ev1 = access.recordTelemetryEvent({
        id: eventId,
        agentId: agent.id,
        agentName: agent.name,
        eventType: 'TOOL_CALL',
        actionType: 'check_balance',
        destination: 'target.testnet',
        payloadSummary: 'Checked wallet balance',
        enforcementOutcome: 'ALLOWED',
        riskLevel: 'LOW'
      });
      assert.strictEqual(ev1.id, eventId);

      // Duplicate insertion with same ID
      const ev2 = access.recordTelemetryEvent({
        id: eventId,
        agentId: agent.id,
        agentName: agent.name,
        eventType: 'TOOL_CALL',
        actionType: 'check_balance',
        destination: 'target.testnet',
        payloadSummary: 'DUPLICATE RETRY',
        enforcementOutcome: 'ALLOWED',
        riskLevel: 'LOW'
      });

      assert.strictEqual(ev2.id, eventId);
      const events = access.getTelemetry({ agentId: agent.id });
      assert.strictEqual(events.length, 1, 'Duplicate event must NOT be stored twice');
    });

    it('enforces rate limiting per credential bucket', () => {
      const key = 'test-rate-limit-token-key';
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const check = checkRateLimit(key, limit, 10_000);
        assert.strictEqual(check.allowed, true);
      }

      // 6th call exceeds limit
      const blocked = checkRateLimit(key, limit, 10_000);
      assert.strictEqual(blocked.allowed, false);
      assert.strictEqual(blocked.remaining, 0);
    });
  });

  describe('3. Heartbeat & Integration Health (Honest Status Transitions FR-15)', () => {
    it('never shows "Monitoring active" if telemetry or heartbeats stopped', () => {
      // 1. Fresh agent with heartbeat within 10 seconds -> ACTIVE
      const activeAgent = {
        status: 'ACTIVE',
        enforcementLevel: 'ENFORCING',
        lastHeartbeat: new Date(Date.now() - 5000).toISOString()
      };
      const activeHealth = computeHonestAgentStatus(activeAgent);
      assert.strictEqual(activeHealth.status, 'ACTIVE');
      assert.strictEqual(activeHealth.enforcementLevel, 'ENFORCING');
      assert.strictEqual(activeHealth.heartbeatLost, false);

      // 2. Stale agent with heartbeat older than 60s -> DEGRADED (Heartbeat Lost)
      const staleAgent = {
        status: 'ACTIVE',
        enforcementLevel: 'ENFORCING',
        lastHeartbeat: new Date(Date.now() - 90_000).toISOString() // 90 seconds ago
      };
      const staleHealth = computeHonestAgentStatus(staleAgent);
      assert.strictEqual(staleHealth.status, 'DEGRADED', 'Stale agent must honestly transition to DEGRADED');
      assert.strictEqual(staleHealth.enforcementLevel, 'LIMITED_VISIBILITY', 'Must degrade enforcement level');
      assert.strictEqual(staleHealth.heartbeatLost, true);

      // 3. Disconnected agent stays DISCONNECTED
      const discAgent = {
        status: 'DISCONNECTED',
        enforcementLevel: 'DISCONNECTED',
        lastHeartbeat: new Date().toISOString()
      };
      const discHealth = computeHonestAgentStatus(discAgent);
      assert.strictEqual(discHealth.status, 'DISCONNECTED');
    });
  });

  describe('4. @agentshield/sdk Client Execution & Policy Interception', () => {
    it('intercepts and blocks exploit attempts targeting blocklisted destinations', async () => {
      const shield = new AgentShield({
        agentId: 'agent-mock-01',
        ingestToken: 'mock_token',
        blockedDestinations: ['attacker-drain.testnet']
      });

      const safeTool = shield.wrapToolCall(
        'check_inventory',
        'store-catalog.testnet',
        async (args: { item: string }) => `Stock for ${args.item}: 100`
      );

      const res = await safeTool({ item: 'Widget' });
      assert.strictEqual(res, 'Stock for Widget: 100');

      const exploitTool = shield.wrapToolCall(
        'drain_funds',
        'attacker-drain.testnet',
        async () => 'EXPLOIT_EXECUTED'
      );

      await assert.rejects(
        async () => {
          await exploitTool({});
        },
        (err: any) => {
          assert.ok(err instanceof PolicyBlockedError);
          assert.strictEqual(err.toolName, 'drain_funds');
          assert.strictEqual(err.destination, 'attacker-drain.testnet');
          return true;
        }
      );
    });

    it('enforces single-transaction NEAR spend ceiling', async () => {
      const shield = new AgentShield({
        agentId: 'agent-mock-02',
        ingestToken: 'mock_token',
        maxNearPerTransaction: 5.0
      });

      const transfer = shield.wrapToolCall(
        'transfer_near',
        'receiver.testnet',
        async (args: { amount: number }) => 'TRANSFER_COMPLETE',
        { attachedNear: 25.0 } // Exceeds 5.0 NEAR
      );

      await assert.rejects(
        async () => {
          await transfer({ amount: 25.0 });
        },
        (err: any) => {
          assert.ok(err instanceof PolicyBlockedError);
          assert.ok(err.reason.includes('exceeds policy single-transaction ceiling'));
          return true;
        }
      );
    });
  });
});
