import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import { TenantAccessLayer, TenantIsolationViolationError } from '../src/lib/db/access-layer.ts';
import {
  RedactionPipeline,
  defaultRedactionPipeline,
  isValidLuhn
} from '../src/lib/redaction/index.ts';
import {
  buildForensicTimeline,
  createMinimumEvidence
} from '../src/lib/forensics/timeline-builder.ts';
import {
  generateSanitizedJsonExport,
  generateSanitizedPdfExport
} from '../src/lib/forensics/export-generator.ts';
import {
  BackgroundWorker,
  NotificationDispatcher
} from '../services/worker/src/index.ts';

describe('Stage 9: Alerts, Incidents, Forensics, Redaction & Background Worker', () => {
  let db: any;
  let access: TenantAccessLayer;
  let otherTenantAccess: TenantAccessLayer;

  beforeEach(() => {
    db = getDatabase(':memory:');
    resetDatabase(db);

    // Seed test accounts & workspaces
    db.exec(`
      INSERT INTO accounts (id, name, email, password_hash, created_at)
      VALUES ('acc-1', 'Operator 1', 'op@agentshield.testnet', 'argon2_dummy', datetime('now')),
             ('acc-2', 'Tenant 2', 'tenant2@agentshield.testnet', 'argon2_dummy', datetime('now'));

      INSERT INTO workspaces (id, name, environment, owner_id, created_at)
      VALUES ('ws-primary', 'Primary SOC Workspace', 'PRODUCTION', 'acc-1', datetime('now')),
             ('ws-isolated', 'Isolated Tenant Workspace', 'PRODUCTION', 'acc-2', datetime('now'));

      INSERT INTO workspace_members (id, workspace_id, account_id, role, created_at)
      VALUES ('mem-1', 'ws-primary', 'acc-1', 'owner', datetime('now')),
             ('mem-2', 'ws-isolated', 'acc-2', 'owner', datetime('now'));

      INSERT INTO agents (id, workspace_id, name, description, category, near_account_id, target_contract_id, status, enforcement_level, risk_score, created_at, last_heartbeat)
      VALUES ('agent-refund', 'ws-primary', 'Refund Bot', 'Processes e-commerce refunds', 'SUPPORT', 'refund.testnet', 'storefront.testnet', 'ACTIVE', 'ENFORCING', 35, datetime('now'), datetime('now')),
             ('agent-treasury', 'ws-primary', 'Treasury Agent', 'Manages allocations', 'FINANCE', 'treasury.testnet', 'vault.testnet', 'ACTIVE', 'ENFORCING', 20, datetime('now'), datetime('now')),
             ('agent-isolated', 'ws-isolated', 'Isolated Agent', 'Other tenant agent', 'FINANCE', 'other.testnet', 'other.testnet', 'ACTIVE', 'ENFORCING', 15, datetime('now'), datetime('now'));

      INSERT INTO agent_credentials (id, agent_id, workspace_id, name, token_hash, token_prefix, status, created_at)
      VALUES ('cred-refund', 'agent-refund', 'ws-primary', 'Default Ingest Key', 'hash123', 'ash_live_test1234', 'ACTIVE', datetime('now'));
    `);

    access = TenantAccessLayer.create(db, { accountId: 'acc-1', workspaceId: 'ws-primary' });
    otherTenantAccess = TenantAccessLayer.create(db, { accountId: 'acc-2', workspaceId: 'ws-isolated' });
  });

  // =========================================================================
  // 1. Redaction Pipeline (FR-11) with Planted Fake Secrets
  // =========================================================================
  describe('1. Redaction Pipeline (FR-11) with Planted Fake Secrets', () => {
    const pipeline = new RedactionPipeline();

    test('validates card-like numbers using the Luhn algorithm', () => {
      // Valid Luhn test card numbers
      assert.strictEqual(isValidLuhn('4532 0150 1234 5671'), true);
      assert.strictEqual(isValidLuhn('4532-0150-1234-5671'), true);
      // Sequence failing Luhn
      assert.strictEqual(isValidLuhn('4532015012345672'), false);
    });

    test('scrubs planted NEAR ed25519 private keys', () => {
      const planted = 'Emergency backup key: ed25519:5G8hJ9kLmNoPqRsTuVwXyZ1234567890abcdefABCDEF1234567890 for treasury account';
      const redacted = pipeline.redactText(planted);
      assert.ok(!redacted.includes('5G8hJ9kLmNoPqRsTuVwXyZ'));
      assert.ok(redacted.includes('ed25519:[REDACTED_NEAR_SECRET_KEY]'));
    });

    test('scrubs planted EVM secp256k1 64-hex private keys', () => {
      const planted = 'Private key 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d used for signing';
      const redacted = pipeline.redactText(planted);
      assert.ok(!redacted.includes('4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d'));
      assert.ok(redacted.includes('[REDACTED_WALLET_PRIVATE_KEY]'));
    });

    test('scrubs planted 12-word and 24-word BIP-39 mnemonic seed phrases', () => {
      // 12-word standard BIP-39 mnemonic phrase
      const planted12 = 'Agent recovery phrase: abandon ability able about above absent absorb abstract absurd abuse access accident';
      const redacted12 = pipeline.redactText(planted12);
      assert.ok(!redacted12.includes('abandon ability able about above'));
      assert.ok(redacted12.includes('[REDACTED_SEED_PHRASE]'));

      // Tagged seed phrase
      const plantedTagged = 'seed phrase: "scissors scorpion scout scrap screen script scrub sea search season seat second"';
      const redactedTagged = pipeline.redactText(plantedTagged);
      assert.ok(!redactedTagged.includes('scissors scorpion scout scrap'));
      assert.ok(redactedTagged.includes('[REDACTED_SEED_PHRASE]'));
    });

    test('scrubs customer email addresses and phone numbers', () => {
      const planted = 'Contact customer alice.victim@example.org or phone +1-555-849-2041 regarding refund.';
      const redacted = pipeline.redactText(planted);
      assert.ok(!redacted.includes('alice.victim@example.org'));
      assert.ok(redacted.includes('[REDACTED_EMAIL]'));
      assert.ok(!redacted.includes('555-849-2041'));
      assert.ok(redacted.includes('[REDACTED_PHONE]'));
    });

    test('scrubs planted credit card numbers with valid Luhn checks', () => {
      const planted = 'Refund issued to Visa card: 4532-0150-1234-5671 in system.';
      const redacted = pipeline.redactText(planted);
      assert.ok(!redacted.includes('4532-0150-1234-5671'));
      assert.ok(redacted.includes('[REDACTED_CARD]'));
    });

    test('scrubs API tokens (Bearer, ash_live_, NEAR_AI_, sk-)', () => {
      const planted = 'Headers: Bearer sk-live_99887766554433221100 and ash_live_a1b2c3d4e5f678901234 and NEAR_AI_secret_key_123456789';
      const redacted = pipeline.redactText(planted);
      assert.ok(!redacted.includes('sk-live_99887766554433221100'));
      assert.ok(!redacted.includes('a1b2c3d4e5f678901234'));
      assert.ok(!redacted.includes('NEAR_AI_secret_key_123456789'));
      assert.ok(redacted.includes('Bearer [REDACTED_TOKEN]'));
      assert.ok(redacted.includes('ash_live_[REDACTED_INGEST_KEY]'));
      assert.ok(redacted.includes('NEAR_AI_[REDACTED_KEY]'));
    });

    test('deeply redacts nested JSON objects and arrays', () => {
      const payload = {
        customer: {
          name: 'Bob',
          email: 'bob@victim.com',
          phone: '(555) 234-5678'
        },
        credentials: {
          apiKey: 'ash_live_secret_token_12345',
          seed_phrase: 'abandon ability able about above absent absorb abstract absurd abuse access accident'
        },
        orders: [
          { orderId: 'ord-1', private_key: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d' }
        ]
      };

      const redacted = pipeline.redactObject(payload);
      assert.strictEqual(redacted.customer.email, '[REDACTED_EMAIL]');
      assert.strictEqual(redacted.customer.phone, '[REDACTED_PHONE]');
      assert.strictEqual(redacted.credentials.apiKey, '[REDACTED]');
      assert.strictEqual(redacted.credentials.seed_phrase, '[REDACTED]');
      assert.strictEqual(redacted.orders[0].private_key, '[REDACTED]');
    });
  });

  // =========================================================================
  // 2. Forensic Timeline Builder with Minimum-Evidence Storage
  // =========================================================================
  describe('2. Forensic Timeline Builder with Minimum-Evidence Storage', () => {
    test('constructs discrete 7-step sequence reconstruction adhering to ADR-006', () => {
      const timeline = buildForensicTimeline({
        incidentId: 'inc-test-01',
        agentId: 'agent-refund',
        agentName: 'Refund Bot',
        triggerInput: 'Customer requested 50.0 NEAR refund',
        toolName: 'issue_refund',
        destination: 'attacker-drain.testnet',
        parameters: { amount: 50.0, to: 'attacker-drain.testnet' },
        attachedNear: 50.0,
        policyOutcome: 'BLOCKED',
        policyReason: 'Amount exceeds 2.0 NEAR autonomous limit',
        matchedRules: ['TRANSACTION_LIMIT_POLICY'],
        threatIndicators: ['PROMPT_INJECTION_OVERRIDE', 'SPEND_LIMIT_EXCEEDED']
      });

      assert.strictEqual(timeline.length, 7);
      assert.strictEqual(timeline[0].phase, 'TRIGGER');
      assert.strictEqual(timeline[1].phase, 'AGENT_RESPONSE');
      assert.strictEqual(timeline[2].phase, 'TOOL_CALL');
      assert.strictEqual(timeline[3].phase, 'ATTEMPTED_ACTION');
      assert.strictEqual(timeline[4].phase, 'POLICY_DECISION');
      assert.strictEqual(timeline[5].phase, 'OUTCOME');
      assert.strictEqual(timeline[6].phase, 'INDICATOR');
      assert.strictEqual(timeline[5].enforcementBadge, 'BLOCKED');
    });

    test('creates minimum-evidence storage record without unbounded raw payload retention', () => {
      const largeRawPayload = {
        hugeMemoryDump: 'x'.repeat(5000),
        secretApiKey: 'ash_live_super_secret_token_123456789',
        customerEmail: 'ceo@victim-corp.com',
        destination: 'exploit-drain.testnet',
        amount: 100.0
      };

      const minEvidence = createMinimumEvidence(largeRawPayload, {
        agentId: 'agent-treasury',
        toolName: 'transfer',
        destination: 'exploit-drain.testnet',
        parameters: { amount: 100.0, destination: 'exploit-drain.testnet' },
        matchedRules: ['MAX_SPEND_CEILING'],
        threatIndicators: ['DRAIN_EXPLOIT']
      });

      // Proof of minimum storage
      assert.ok(minEvidence.storageBytesSaved > 4000);
      assert.ok(minEvidence.redactedSnippet.length <= 256);
      assert.ok(!minEvidence.redactedSnippet.includes('super_secret_token'));
      assert.ok(minEvidence.contentHash.length === 64);
      assert.ok(minEvidence.evidenceFingerprint.length === 64);
    });
  });

  // =========================================================================
  // 3. Incident Records, Notes, Containment & False Positive Workflows
  // =========================================================================
  describe('3. Incident Records, Notes, Containment & False Positive Workflows', () => {
    test('creates and retrieves incident dossier with tenant isolation', () => {
      const incident = access.createIncident({
        agentId: 'agent-refund',
        title: 'Unauthorized Autonomous Refund Attempt',
        severity: 'HIGH',
        attackCategory: 'UNAUTHORIZED_SPEND',
        summary: 'Agent attempted 10 NEAR refund exceeding policy limits',
        remediation: 'Inspect customer ticket and enforce 2.0 NEAR cap'
      });

      assert.ok(incident.id.startsWith('inc-'));
      assert.strictEqual(incident.status, 'OPEN');
      assert.strictEqual(incident.timelineSteps.length, 7);
      assert.ok(incident.operatorNotes.length >= 1);

      // Verify retrieval
      const fetched = access.getIncidentById(incident.id);
      assert.strictEqual(fetched?.title, 'Unauthorized Autonomous Refund Attempt');

      // Proves cross-tenant access violation throws
      assert.throws(
        () => otherTenantAccess.getIncidentById(incident.id),
        TenantIsolationViolationError
      );
    });

    test('adds operator notes to incident and updates status', () => {
      const incident = access.createIncident({
        agentId: 'agent-refund',
        title: 'Prompt Injection Investigation',
        severity: 'CRITICAL',
        attackCategory: 'PROMPT_INJECTION',
        summary: 'Prompt injection attempted to drain funds'
      });

      // Add note
      const withNote = access.addIncidentNote(
        incident.id,
        'Analyst review confirmed adversarial prompt injection in ticket #402.',
        'analyst@agentshield.testnet'
      );

      assert.ok(withNote.operatorNotes.some((n) => n.content.includes('ticket #402')));

      // Transition status to INVESTIGATING
      const updated = access.updateIncidentStatus(incident.id, 'INVESTIGATING', 'Active SOC investigation initiated.');
      assert.strictEqual(updated.status, 'INVESTIGATING');
    });

    test('pauses agent execution directly from incident containment flow', () => {
      const incident = access.createIncident({
        agentId: 'agent-refund',
        title: 'Severe Compromise Detected',
        severity: 'CRITICAL',
        attackCategory: 'AGENT_HIJACKING',
        summary: 'Immediate quarantine required'
      });

      // Pause agent
      const pauseRes = access.pauseAgentFromIncident(incident.id, 'Emergency containment');
      assert.strictEqual(pauseRes.success, true);

      // Verify agent status updated
      const agent = access.getAgentById('agent-refund');
      assert.strictEqual(agent?.status, 'PAUSED');

      // Verify operator note added to incident
      const reloaded = access.getIncidentById(incident.id);
      assert.ok(reloaded?.operatorNotes.some((n) => n.content.includes('immediately PAUSED')));
    });

    test('revokes agent credentials and disconnects agent from incident flow', () => {
      const incident = access.createIncident({
        agentId: 'agent-refund',
        title: 'Key Compromise Incident',
        severity: 'CRITICAL',
        attackCategory: 'CREDENTIAL_EXPOSURE',
        summary: 'Ingest key leaked; revoke immediately'
      });

      // Revoke connection
      const revokeRes = access.revokeConnectionFromIncident(incident.id, 'Leaked ingest token');
      assert.strictEqual(revokeRes.success, true);

      // Verify agent is DISCONNECTED
      const agent = access.getAgentById('agent-refund');
      assert.strictEqual(agent?.status, 'DISCONNECTED');
    });

    test('marks incident as false positive with operator justification', () => {
      const incident = access.createIncident({
        agentId: 'agent-treasury',
        title: 'False Alarm Batch Payment',
        severity: 'MEDIUM',
        attackCategory: 'UNAUTHORIZED_SPEND',
        summary: 'Scheduled supplier payment flagged'
      });

      const resolved = access.markIncidentFalsePositive(
        incident.id,
        'Authorized scheduled payroll settlement verified against internal ERP invoice #901.'
      );

      assert.strictEqual(resolved.status, 'FALSE_POSITIVE');
      assert.strictEqual(resolved.isFalsePositive, true);
      assert.ok(resolved.falsePositiveReason?.includes('invoice #901'));
      assert.ok(resolved.resolvedAt !== undefined);
    });
  });

  // =========================================================================
  // 4. Sanitized Incident Export (JSON and PDF)
  // =========================================================================
  describe('4. Sanitized Incident Export (JSON and PDF)', () => {
    test('generates sanitized JSON export with cryptographic integrity digest', () => {
      const incident = access.createIncident({
        agentId: 'agent-refund',
        title: 'Sanitized Export Test',
        severity: 'HIGH',
        attackCategory: 'PROMPT_INJECTION',
        summary: 'Contains planted email alice@secret.com and ed25519:5G8hJ9kLmNoPqRsTuVwXyZ1234567890abcdefABCDEF1234567890'
      });

      const jsonStr = generateSanitizedJsonExport(incident);
      const parsed = JSON.parse(jsonStr);

      assert.strictEqual(parsed.classification, 'COMMUNITY_ELIGIBLE_SANITIZED');
      assert.ok(!jsonStr.includes('alice@secret.com'));
      assert.ok(!jsonStr.includes('5G8hJ9kLmNoPqRsTuVwXyZ'));
      assert.ok(jsonStr.includes('[REDACTED_EMAIL]'));
      assert.ok(jsonStr.includes('[REDACTED_NEAR_SECRET_KEY]'));
      assert.strictEqual(parsed.cryptographicIntegrity.digestAlgorithm, 'SHA-256');
      assert.strictEqual(parsed.cryptographicIntegrity.recordHash.length, 64);
    });

    test('generates valid binary PDF-1.4 export with standard structure', () => {
      const incident = access.createIncident({
        agentId: 'agent-treasury',
        title: 'Binary PDF Generation Test',
        severity: 'CRITICAL',
        attackCategory: 'PRIVILEGE_ESCALATION',
        summary: 'Privilege escalation attempt intercepted by consensus gate'
      });

      const pdfBuffer = generateSanitizedPdfExport(incident);
      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 500);

      const pdfString = pdfBuffer.toString('utf8');
      // Proves compliance with PDF-1.4 standard
      assert.ok(pdfString.startsWith('%PDF-1.4'));
      assert.ok(pdfString.includes('/Type /Catalog'));
      assert.ok(pdfString.includes('/Type /Pages'));
      assert.ok(pdfString.includes('AGENT SHIELD SECURITY INCIDENT DOSSIER'));
      assert.ok(pdfString.includes('xref'));
      assert.ok(pdfString.includes('trailer'));
      assert.ok(pdfString.trim().endsWith('%%EOF'));
    });
  });

  // =========================================================================
  // 5. Background Worker: Heartbeat Monitoring & Notifications
  // =========================================================================
  describe('5. Background Worker: Heartbeat Monitoring & Notifications', () => {
    test('detects stale heartbeats (>60s) and transitions agent to DEGRADED', async () => {
      const worker = new BackgroundWorker(db);

      // Artificially age agent-treasury heartbeat to 75 seconds ago
      const staleTime = new Date(Date.now() - 75_000).toISOString();
      db.prepare(`UPDATE agents SET last_heartbeat = ? WHERE id = 'agent-treasury'`).run(staleTime);

      const result = await worker.evaluateCycle();
      assert.ok(result.staleAgentsFound >= 1);

      const agent = access.getAgentById('agent-treasury');
      assert.strictEqual(agent?.status, 'DEGRADED');
      assert.strictEqual(agent?.enforcementLevel, 'LIMITED_VISIBILITY');
    });

    test('detects lost heartbeats (>120s), marks agent DISCONNECTED and raises automated alert', async () => {
      const worker = new BackgroundWorker(db);

      // Artificially age agent-refund heartbeat to 150 seconds ago
      const offlineTime = new Date(Date.now() - 150_000).toISOString();
      db.prepare(`UPDATE agents SET last_heartbeat = ? WHERE id = 'agent-refund'`).run(offlineTime);

      const result = await worker.evaluateCycle();
      assert.ok(result.disconnectedAgentsFound >= 1);
      assert.ok(result.alertsCreated >= 1);
      assert.ok(result.notificationsDispatched >= 1);

      const agent = access.getAgentById('agent-refund');
      assert.strictEqual(agent?.status, 'DISCONNECTED');

      // Verify automated alert exists
      const alerts = access.getAlerts({ agentId: 'agent-refund' });
      assert.ok(alerts.some((a) => a.ruleId === 'AGENT_HEARTBEAT_LOST'));
    });

    test('dispatches alerts across configured multi-channel router (Email, Webhook, Telegram, Slack)', async () => {
      const notifier = new NotificationDispatcher();

      const alerts = await notifier.dispatchAlert({
        id: 'alt-dispatch-test',
        agentId: 'agent-treasury',
        agentName: 'Treasury Agent',
        title: 'Critical Treasury Drain Intercepted',
        severity: 'CRITICAL',
        whyFlagged: 'Prompt injection attempted 100 NEAR drain with secret Bearer sk-live-secret-key-12345',
        remediation: 'Quarantine treasury bot'
      });

      assert.ok(alerts.length >= 3);
      assert.ok(alerts.some((a) => a.channel === 'email' && a.success));
      assert.ok(alerts.some((a) => a.channel === 'telegram' && a.success));
      assert.ok(alerts.some((a) => a.channel === 'slack' && a.success));

      // Proves email template scrubbed sensitive API keys
      const emailNotif = alerts.find((a) => a.channel === 'email');
      assert.ok(!emailNotif?.content.includes('sk-live-secret-key-12345'));
      assert.ok(emailNotif?.content.includes('[REDACTED_TOKEN]'));
    });

    test('generates 24-hour Morning Incident Summary aggregating threats, drains, and fleet health', async () => {
      const worker = new BackgroundWorker(db);

      // Seed an incident in the past 2 hours
      access.createIncident({
        agentId: 'agent-refund',
        title: 'Morning Summary Incident',
        severity: 'CRITICAL',
        attackCategory: 'PROMPT_INJECTION',
        summary: 'Autonomous refund drain halted'
      });

      const summary = await worker.generateMorningSummary('ws-primary', 24);

      assert.strictEqual(summary.workspaceId, 'ws-primary');
      assert.ok(summary.totalIncidents >= 1);
      assert.ok(summary.criticalIncidents >= 1);
      assert.ok(summary.preventedDrainsNear > 0);
      assert.ok(summary.fleetHealth.activeAgents >= 0);
      assert.ok(summary.summaryBrief.includes('AGENT SHIELD MORNING INCIDENT SUMMARY'));
      assert.ok(summary.dispatchedChannels.length >= 1);
    });
  });
});
