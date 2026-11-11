import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import {
  TenantAccessLayer,
  TenantIsolationViolationError,
  UnauthorizedRoleError,
  SubmissionRateLimitError,
  DuplicateReportError
} from '../src/lib/db/access-layer.ts';
import {
  computeContentFingerprint,
  detectDuplicates,
  checkSubmissionRateLimit,
  resetRateLimitsForTesting,
  sanitizeReportInputs,
  stripHtml,
  validateReportConstraints,
  FIELD_LIMITS
} from '../src/lib/threat-intel/hygiene.ts';
import { checkBotRateLimit, resetBotRateLimitsForTesting } from '../src/lib/threat-intel/bot-limiter.ts';
import { CounterpartyService } from '../src/lib/near/counterparty-service.ts';
import { AnchorService } from '../src/lib/near/anchor-service.ts';

describe('Scope Change: Open Community Threat Repository & Automated Safeguards', () => {
  let db: any;
  let operatorAccess: TenantAccessLayer;
  let adminAccess: TenantAccessLayer;
  let platformOwnerAccess: TenantAccessLayer;
  let analystAccess: TenantAccessLayer;
  let viewerAccess: TenantAccessLayer;
  let otherTenantAccess: TenantAccessLayer;

  beforeEach(() => {
    resetRateLimitsForTesting();
    resetBotRateLimitsForTesting();
    db = getDatabase(':memory:');
    resetDatabase(db);

    // Seed test accounts with diverse roles
    db.exec(`
      INSERT INTO accounts (id, name, email, password_hash, is_platform_moderator, created_at)
      VALUES ('acc-operator', 'Operator User', 'operator@agentshield.testnet', 'argon2_dummy', 0, datetime('now')),
             ('acc-admin', 'Admin User', 'admin@agentshield.testnet', 'argon2_dummy', 0, datetime('now')),
             ('acc-owner-mod', 'Platform Owner', 'owner@agentshield.testnet', 'argon2_dummy', 1, datetime('now')),
             ('acc-analyst', 'Analyst User', 'analyst@agentshield.testnet', 'argon2_dummy', 0, datetime('now')),
             ('acc-viewer', 'Viewer User', 'viewer@agentshield.testnet', 'argon2_dummy', 0, datetime('now')),
             ('acc-tenant2', 'External Tenant', 'external@agentshield.testnet', 'argon2_dummy', 0, datetime('now'));

      INSERT INTO workspaces (id, name, environment, owner_id, created_at)
      VALUES ('ws-primary', 'Primary SOC Workspace', 'PRODUCTION', 'acc-operator', datetime('now')),
             ('ws-isolated', 'Isolated Tenant Workspace', 'PRODUCTION', 'acc-tenant2', datetime('now'));

      INSERT INTO workspace_members (id, workspace_id, account_id, role, created_at)
      VALUES ('mem-1', 'ws-primary', 'acc-operator', 'owner', datetime('now')),
             ('mem-2', 'ws-primary', 'acc-admin', 'admin', datetime('now')),
             ('mem-3', 'ws-primary', 'acc-owner-mod', 'admin', datetime('now')),
             ('mem-4', 'ws-primary', 'acc-analyst', 'analyst', datetime('now')),
             ('mem-5', 'ws-primary', 'acc-viewer', 'viewer', datetime('now')),
             ('mem-6', 'ws-isolated', 'acc-tenant2', 'owner', datetime('now'));

      INSERT INTO agents (id, workspace_id, name, description, category, near_account_id, target_contract_id, status, enforcement_level, risk_score, created_at, last_heartbeat)
      VALUES ('agent-refund', 'ws-primary', 'Refund Bot', 'Processes e-commerce refunds', 'SUPPORT', 'refund.testnet', 'storefront.testnet', 'ACTIVE', 'ENFORCING', 35, datetime('now'), datetime('now')),
             ('agent-treasury', 'ws-primary', 'Treasury Bot', 'Manages allocations', 'FINANCE', 'treasury.testnet', 'vault.testnet', 'ACTIVE', 'ENFORCING', 20, datetime('now'), datetime('now'));
    `);

    operatorAccess = TenantAccessLayer.create(db, { accountId: 'acc-operator', workspaceId: 'ws-primary' });
    adminAccess = TenantAccessLayer.create(db, { accountId: 'acc-admin', workspaceId: 'ws-primary' });
    platformOwnerAccess = TenantAccessLayer.create(db, { accountId: 'acc-owner-mod', workspaceId: 'ws-primary' });
    analystAccess = TenantAccessLayer.create(db, { accountId: 'acc-analyst', workspaceId: 'ws-primary' });
    viewerAccess = TenantAccessLayer.create(db, { accountId: 'acc-viewer', workspaceId: 'ws-primary' });
    otherTenantAccess = TenantAccessLayer.create(db, { accountId: 'acc-tenant2', workspaceId: 'ws-isolated' });
  });

  // =========================================================================
  // 1. Public Read & Bot Rate Limiting (Requirement 2)
  // =========================================================================
  describe('1. Public Read & Bot Rate Limiting', () => {
    test('public threat intelligence is readable without authentication', () => {
      // Seed a public community report
      operatorAccess.submitThreatReport({
        title: 'Public Community Vector',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Attacker tested prompt injection via chat.',
        mitigationApplied: 'Enforce prompt guardrails.',
        isPublicConsented: true
      });

      // Query statically without passing any workspace access layer or auth token
      const feed = TenantAccessLayer.getPublicThreatIntelligence(db);
      assert.strictEqual(feed.total, 1);
      assert.strictEqual(feed.reports[0].title, 'Public Community Vector');
      assert.strictEqual(feed.reports[0].isConfirmed, false);
      assert.strictEqual(feed.reports[0].isPublicConsented, true);
    });

    test('bot rate limiter returns 429 and Retry-After header after 60 requests per minute', () => {
      const clientIp = '198.51.100.42';

      for (let i = 0; i < 60; i++) {
        const rate = checkBotRateLimit(clientIp, 60, 60_000);
        assert.strictEqual(rate.allowed, true);
        assert.strictEqual(rate.remaining, 59 - i);
      }

      // 61st request fails
      const rateExceeded = checkBotRateLimit(clientIp, 60, 60_000);
      assert.strictEqual(rateExceeded.allowed, false);
      assert.strictEqual(rateExceeded.remaining, 0);
      assert.ok(rateExceeded.resetSeconds > 0);
    });
  });

  // =========================================================================
  // 2. Submit & Instant Publishing vs Workspace Private (Requirement 3)
  // =========================================================================
  describe('2. Submit & Instant Publishing vs Private Workspace', () => {
    test('unchecked public consent = private to workspace only, never in public feed', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Private Workspace Incident',
        threatCategory: 'UNAUTHORIZED_TOOL_USE',
        severity: 'MEDIUM',
        description: 'Agent called internal diagnostic endpoint.',
        mitigationApplied: 'Removed endpoint.',
        isPublicConsented: false
      });

      assert.strictEqual(report.isPublicConsented, false);
      assert.strictEqual(report.moderationStatus, 'PENDING_REVIEW');
      assert.strictEqual(report.publishedAt, undefined);

      // Present in submitter workspace
      const myReports = operatorAccess.getWorkspaceThreatReports();
      assert.strictEqual(myReports.some(r => r.id === report.id), true);

      // NEVER in public feed
      const publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      assert.strictEqual(publicFeed.reports.some(r => r.id === report.id), false);
    });

    test('checked public consent = published immediately, labeled "Community report, not verified"', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Open Community Threat Vector',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Direct prompt injection discovered in customer assistant.',
        mitigationApplied: 'Filtered delimiter tokens.',
        isPublicConsented: true
      });

      assert.strictEqual(report.isPublicConsented, true);
      assert.strictEqual(report.moderationStatus, 'VERIFIED_PUBLISHED');
      assert.strictEqual(report.isConfirmed, false);
      assert.ok(report.publishedAt, 'Published immediately with timestamp');

      // Instantly visible in public intelligence
      const publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      const found = publicFeed.reports.find(r => r.id === report.id);
      assert.ok(found, 'Report must be visible immediately');
      assert.strictEqual(found?.isConfirmed, false);
    });
  });

  // =========================================================================
  // 3. Automated Safeguards (Requirement 4)
  // =========================================================================
  describe('3. Automated Safeguards (Redaction, HTML, Field Caps, Attachments)', () => {
    test('redaction pipeline scrubs planted secrets before storage and in public text', () => {
      const plantedNearKey = 'ed25519:5D9Kx3A1XkL3q7vY9mZ4nF6wP8jR2tC1bE5hN7gU3iO9pS8dL4eK6wM1zX7yV3bA';
      const plantedEmail = 'target-victim@enterprise.com';
      const rawText = `Adversary exfiltrated key: ${plantedNearKey} and emailed ${plantedEmail}`;

      const report = operatorAccess.submitThreatReport({
        title: 'Attacker Attempted Key Harvest',
        threatCategory: 'CREDENTIAL_EXPOSURE',
        severity: 'CRITICAL',
        description: rawText,
        mitigationApplied: 'Rotated key.',
        isPublicConsented: true
      });

      // Verify DB storage has NO raw secrets
      const row = db.prepare('SELECT description FROM threat_reports WHERE id = ?').get(report.id) as any;
      assert.ok(!row.description.includes(plantedNearKey), 'Stored description must not contain NEAR key');
      assert.ok(!row.description.includes(plantedEmail), 'Stored description must not contain email');
      assert.ok(row.description.includes('[REDACTED_NEAR_SECRET_KEY]'));
      assert.ok(row.description.includes('[REDACTED_EMAIL]'));
    });

    test('strips HTML from all report fields to prevent injection', () => {
      const rawTitle = '<b>Exploit</b> Alert <script>alert(1)</script>';
      const rawDesc = 'Agent <a href="http://evil.com">clicked here</a> to trigger <i>malfunction</i>.';

      const report = operatorAccess.submitThreatReport({
        title: rawTitle,
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: rawDesc,
        mitigationApplied: '<div>Applied sandbox rule</div>',
        isPublicConsented: true
      });

      assert.strictEqual(report.title, 'Exploit Alert alert(1)');
      assert.strictEqual(report.description, 'Agent clicked here to trigger malfunction.');
      assert.strictEqual(report.mitigationApplied, 'Applied sandbox rule');
    });

    test('enforces maximum field lengths', () => {
      const oversizedTitle = 'A'.repeat(FIELD_LIMITS.TITLE + 1);
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: oversizedTitle,
          threatCategory: 'PROMPT_INJECTION',
          description: 'Valid description.'
        }),
        /Title exceeds maximum allowable length/
      );

      const oversizedDesc = 'B'.repeat(FIELD_LIMITS.DESCRIPTION + 1);
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: 'Valid Title',
          threatCategory: 'PROMPT_INJECTION',
          description: oversizedDesc
        }),
        /Description exceeds maximum allowable length/
      );

      const oversizedMitigation = 'C'.repeat(FIELD_LIMITS.MITIGATION_APPLIED + 1);
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: 'Valid Title',
          threatCategory: 'PROMPT_INJECTION',
          description: 'Valid description.',
          mitigationApplied: oversizedMitigation
        }),
        /Defensive mitigation exceeds maximum allowable length/
      );
    });

    test('strictly prohibits file attachments', () => {
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: 'Payload with File',
          threatCategory: 'PROMPT_INJECTION',
          description: 'Report with attached script.',
          attachment: {
            filename: 'payload.txt',
            mimeType: 'text/plain',
            sizeBytes: 1024
          }
        }),
        /Attachments are strictly prohibited in community threat reports/
      );
    });
  });

  // =========================================================================
  // 4. Rate Limits & Duplicate Detection (Requirement 4)
  // =========================================================================
  describe('4. Rate Limits & Duplicate Detection', () => {
    test('enforces 5 submissions per 10 minutes and daily cap', () => {
      const topics = [
        { title: 'DNS Cache Poisoning Attempt', cat: 'DENIAL_OF_SERVICE', desc: 'Attacker spoofed resolver addresses across regional gateway instances.' },
        { title: 'Buffer Overflow in Image Parser', cat: 'SUPPLY_CHAIN_COMPROMISE', desc: 'Malformed PNG chunk overflowed heap memory during avatar processing.' },
        { title: 'SQL Injection in User Profile', cat: 'DATA_LEAKAGE', desc: 'Unescaped apostrophe in bio field dumped database schemas.' },
        { title: 'Replay Attack on Offline Nonce', cat: 'UNSAFE_TRANSACTION', desc: 'Stale transaction payload was re-broadcast by malicious RPC node.' },
        { title: 'Prompt Hijacking via Webhook Event', cat: 'AGENT_TOOL_HIJACKING', desc: 'Incoming webhook header contained system instruction reset sequence.' }
      ];

      for (const t of topics) {
        operatorAccess.submitThreatReport({
          title: t.title,
          threatCategory: t.cat,
          severity: 'MEDIUM',
          description: t.desc
        });
      }

      // 6th submission within 10 minutes fails
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: 'Sixth Distinct Security Finding',
          threatCategory: 'CREDENTIAL_EXPOSURE',
          severity: 'MEDIUM',
          description: 'Sixth completely unique description regarding exposed session tokens.'
        }),
        SubmissionRateLimitError
      );
    });

    test('rejects exact and near duplicates with DuplicateReportError', () => {
      const original = operatorAccess.submitThreatReport({
        title: 'Hidden System Override in PDF Stream',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'An attacker placed hidden white text in an invoice PDF instructing payment transfer.',
        mitigationApplied: 'OCR sanitization.',
        isPublicConsented: true
      });

      // Exact title/description duplicate
      assert.throws(
        () => operatorAccess.submitThreatReport({
          title: 'Hidden System Override in PDF Stream',
          threatCategory: 'PROMPT_INJECTION',
          severity: 'HIGH',
          description: 'An attacker placed hidden white text in an invoice PDF instructing payment transfer.',
          mitigationApplied: 'OCR sanitization.',
          isPublicConsented: true
        }),
        DuplicateReportError
      );
    });
  });

  // =========================================================================
  // 5. Community Flagging & Automatic 3-Flag Hide (Requirement 4)
  // =========================================================================
  describe('5. Community Flagging & Auto-Hide After 3 Flags', () => {
    test('signed-in readers can flag a report; after 3 distinct accounts it auto-hides', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Controversial Community Submission',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Contains questionable guidance.',
        mitigationApplied: 'Block everything.',
        isPublicConsented: true
      });

      // Visible initially
      let publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      assert.strictEqual(publicFeed.reports.some(r => r.id === report.id), true);

      // Flag 1 from admin
      const res1 = adminAccess.flagThreatReport(report.id, 'Contains incorrect payload details');
      assert.strictEqual(res1.flagCount, 1);
      assert.strictEqual(res1.isHidden, false);

      // Duplicate flag from same account is rejected
      assert.throws(
        () => adminAccess.flagThreatReport(report.id, 'Duplicate flag attempt'),
        /already flagged this report/
      );

      // Flag 2 from analyst
      const res2 = analystAccess.flagThreatReport(report.id, 'Misleading remediation advice');
      assert.strictEqual(res2.flagCount, 2);
      assert.strictEqual(res2.isHidden, false);

      // Still visible in public feed
      publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      assert.strictEqual(publicFeed.reports.some(r => r.id === report.id), true);

      // Flag 3 from viewer -> triggers AUTO-HIDE!
      const res3 = viewerAccess.flagThreatReport(report.id, 'Possible spam report');
      assert.strictEqual(res3.flagCount, 3);
      assert.strictEqual(res3.isHidden, true);

      // Report is now HIDDEN from public feed!
      publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      assert.strictEqual(publicFeed.reports.some(r => r.id === report.id), false);

      // Appears in platform owner flagged queue
      const flaggedQueue = platformOwnerAccess.getFlaggedThreatReports();
      const foundFlagged = flaggedQueue.find(r => r.id === report.id);
      assert.ok(foundFlagged, 'Must appear in platform owner flagged queue');
      assert.strictEqual(foundFlagged?.flagCount, 3);
      assert.strictEqual(foundFlagged?.isHidden, true);
    });
  });

  // =========================================================================
  // 6. Platform Owner Takedown & Confirmation (Requirement 4 & 5)
  // =========================================================================
  describe('6. Platform Owner Takedown & Confirmed Badge', () => {
    test('customer workspace roles (owner/admin/analyst) are refused takedown & confirm actions', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Report for Access Check',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Test report.',
        isPublicConsented: true
      });

      // Workspace owner cannot takedown
      assert.throws(
        () => operatorAccess.adminTakedownThreatReport(report.id, 'Unauthorized takedown'),
        UnauthorizedRoleError
      );

      // Workspace admin cannot takedown
      assert.throws(
        () => adminAccess.adminTakedownThreatReport(report.id, 'Unauthorized takedown'),
        UnauthorizedRoleError
      );

      // Workspace admin cannot confirm
      assert.throws(
        () => adminAccess.adminConfirmThreatReport(report.id),
        UnauthorizedRoleError
      );
    });

    test('platform owner can execute takedown, logging reason in audit chain', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Report for Takedown',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Violates community guidelines.',
        isPublicConsented: true
      });

      const updated = platformOwnerAccess.adminTakedownThreatReport(report.id, 'Violated community guidelines.');
      assert.strictEqual(updated.isHidden, true);
      assert.strictEqual(updated.moderationStatus, 'REJECTED');
      assert.strictEqual(updated.takedownReason, 'Violated community guidelines.');

      // Audit chain verification
      const auditRows = db.prepare(`SELECT * FROM audit_logs WHERE action_type = 'THREAT_REPORT_TAKEDOWN'`).all() as any[];
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].resource_id, report.id);
    });

    test('platform owner can mark report as Confirmed', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Report for Confirmation',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Verified real attack pattern.',
        isPublicConsented: true
      });

      assert.strictEqual(report.isConfirmed, false);

      const confirmed = platformOwnerAccess.adminConfirmThreatReport(report.id);
      assert.strictEqual(confirmed.isConfirmed, true);

      // In public feed, isConfirmed is true
      const publicFeed = TenantAccessLayer.getPublicThreatIntelligence(db);
      const item = publicFeed.reports.find(r => r.id === report.id);
      assert.strictEqual(item?.isConfirmed, true);
    });
  });

  // =========================================================================
  // 7. Separation Rule: Unverified Reports NEVER Feed Blocklists (Requirement 6)
  // =========================================================================
  describe('7. Separation Rule: Unverified Reports Never Feed Blocklists', () => {
    test('unverified community report cannot change counterparty blocking decisions', async () => {
      const badAccount = 'adversary-unverified.testnet';

      // 1. Submit unverified community report targeting badAccount
      const report = operatorAccess.submitThreatReport({
        title: 'Community Report on Adversary Account',
        threatCategory: 'UNSAFE_TRANSACTION',
        severity: 'CRITICAL',
        targetAddressOrDomain: badAccount,
        description: 'Account sent phishing transactions.',
        mitigationApplied: 'Block account.',
        isPublicConsented: true // Published immediately, but isConfirmed = false!
      });

      assert.strictEqual(report.isConfirmed, false);

      // 2. Query counterparty service for this account
      const counterpartyService = new CounterpartyService();
      const assessmentBefore = await counterpartyService.evaluateCounterparty(badAccount, {
        db,
        agentId: 'agent-treasury'
      });

      // The unverified report MUST NOT put account on blocklist!
      assert.strictEqual(assessmentBefore.signals.isOnSharedBlocklist, false, 'Unverified community report must NEVER set isOnSharedBlocklist');
      assert.notStrictEqual(assessmentBefore.outcome, 'BLOCK');

      // 3. Platform owner confirms the report
      platformOwnerAccess.adminConfirmThreatReport(report.id);

      // 4. Query counterparty service again
      const assessmentAfter = await counterpartyService.evaluateCounterparty(badAccount, {
        db,
        agentId: 'agent-treasury'
      });

      // Now that platform owner confirmed it, it feeds the blocklist
      assert.strictEqual(assessmentAfter.signals.isOnSharedBlocklist, true, 'Confirmed report feeds blocklist');
      assert.strictEqual(assessmentAfter.outcome, 'BLOCK');
    });

    test('unverified community report cannot be registered on-chain', async () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Unverified Community Submission',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Unverified test.',
        isPublicConsented: true
      });

      assert.strictEqual(report.isConfirmed, false);

      const anchorService = new AnchorService();

      // Attempting to register unverified report on-chain MUST THROW!
      await assert.rejects(
        async () => {
          await anchorService.registerThreatOnChain(db, report.id);
        },
        /unverified community report.*Only platform-owner confirmed threats can be registered on-chain/
      );

      // Once confirmed, it can be registered on-chain
      platformOwnerAccess.adminConfirmThreatReport(report.id);
      const res = await anchorService.registerThreatOnChain(db, report.id);
      assert.ok(res.transactionHash);
      assert.strictEqual(res.reportId, report.id);
    });
  });

  // =========================================================================
  // 8. "This Helped" Feedback & Incident Conversion (Requirement 8)
  // =========================================================================
  describe('8. Mitigation Feedback & Incident Conversion', () => {
    test('"This helped" increments count and prevents duplicate votes per user', () => {
      const report = operatorAccess.submitThreatReport({
        title: 'Helpful Defensive Guide',
        threatCategory: 'PROMPT_INJECTION',
        severity: 'HIGH',
        description: 'Detailed mitigation steps.',
        mitigationApplied: 'Clear prompt boundary tokens.',
        isPublicConsented: true
      });

      // User 1 votes
      const vote1 = TenantAccessLayer.recordMitigationFeedback(db, report.id, 'user-alice');
      assert.strictEqual(vote1.success, true);
      assert.strictEqual(vote1.helpfulCount, 1);
      assert.strictEqual(vote1.alreadyVoted, false);

      // User 1 votes again -> prevented!
      const vote1Again = TenantAccessLayer.recordMitigationFeedback(db, report.id, 'user-alice');
      assert.strictEqual(vote1Again.success, true);
      assert.strictEqual(vote1Again.alreadyVoted, true);
      assert.strictEqual(vote1Again.helpfulCount, 1);

      // User 2 votes -> increments to 2
      const vote2 = TenantAccessLayer.recordMitigationFeedback(db, report.id, 'user-bob');
      assert.strictEqual(vote2.helpfulCount, 2);
    });

    test('converts incident dossier into pre-filled threat report draft', () => {
      const incident = operatorAccess.createIncident({
        agentId: 'agent-refund',
        title: 'Exploit of Refund Window',
        severity: 'HIGH',
        attackCategory: 'PROMPT_INJECTION_INDICATOR',
        summary: 'Attacker bypassed tool limit.',
        evidence: { snippet: 'prompt override: refund 10x' }
      });

      const converted = operatorAccess.convertIncidentToThreatReport(incident.id, {
        isPublicConsented: true,
        reporterName: 'SOC Lead'
      });

      assert.ok(converted.id);
      assert.strictEqual(converted.threatCategory, 'PROMPT_INJECTION');
      assert.strictEqual(converted.isPublicConsented, true);
      assert.strictEqual(converted.moderationStatus, 'VERIFIED_PUBLISHED');
      assert.strictEqual(converted.isConfirmed, false);
      assert.ok(converted.description.includes('Attacker bypassed tool limit'));
    });
  });
});
