import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase, resetDatabase } from '../src/lib/db/database.ts';
import { signUp, signIn, hashPassword, verifyPassword } from '../src/lib/db/auth.ts';
import { TenantAccessLayer, TenantIsolationViolationError, UnauthorizedRoleError } from '../src/lib/db/access-layer.ts';
import { appendAuditLog, verifyAuditChain, GENESIS_HASH } from '../src/lib/db/audit.ts';

describe('Tenant Isolation, RBAC & Hash-Chained Audit Log (Stage 5)', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    // Isolated in-memory database for each test run
    db = getDatabase(':memory:');
    resetDatabase(db);
  });

  describe('1. Argon2id Password Hashing & Session Authentication', () => {
    it('hashes passwords using Argon2id with memory-hard parameters per RFC 9106', async () => {
      const rawPassword = 'SuperSecurePassword2026!';
      const hash = await hashPassword(rawPassword);

      // Verify Argon2id string format: $argon2id$v=19$m=65536,t=3,p=4$...
      assert.ok(hash.startsWith('$argon2id$'), 'Hash must use argon2id algorithm');
      assert.ok(hash.includes('m=65536'), 'Must use 64MB memory cost');
      assert.ok(hash.includes('t=3'), 'Must use time cost 3');
      assert.ok(hash.includes('p=4'), 'Must use parallelism 4');

      // Verify correct password matches and wrong password fails
      const isValid = await verifyPassword(hash, rawPassword);
      assert.strictEqual(isValid, true, 'Correct password must verify');

      const isInvalid = await verifyPassword(hash, 'WrongPassword123');
      assert.strictEqual(isInvalid, false, 'Incorrect password must be rejected');
    });

    it('successfully signs up user, creates workspace, and establishes authenticated session', async () => {
      const user = await signUp(db, {
        name: 'Alice Security Lead',
        email: 'alice@agentshield.testnet',
        password: 'SecurePassword123!',
        workspaceName: 'Acme Primary Vault',
        environment: 'PRODUCTION'
      });

      assert.ok(user.account.id.startsWith('acc-'));
      assert.strictEqual(user.account.email, 'alice@agentshield.testnet');
      assert.ok(user.workspace.id.startsWith('ws-'));
      assert.strictEqual(user.workspace.name, 'Acme Primary Vault');
      assert.strictEqual(user.role, 'owner');
      assert.ok(user.sessionToken.length >= 32);

      // Verify sign in with correct credentials
      const signedIn = await signIn(db, {
        email: 'alice@agentshield.testnet',
        password: 'SecurePassword123!'
      });

      assert.strictEqual(signedIn.account.id, user.account.id);
      assert.strictEqual(signedIn.workspace.id, user.workspace.id);
      assert.strictEqual(signedIn.role, 'owner');

      // Verify sign in with incorrect password throws
      await assert.rejects(
        async () => {
          await signIn(db, {
            email: 'alice@agentshield.testnet',
            password: 'BadPassword'
          });
        },
        /Invalid email or password/
      );
    });
  });

  describe('2. Multi-Tenant Isolation & Cross-Tenant Read Blocking', () => {
    it('proves that cross-tenant reads fail via the central access layer', async () => {
      // 1. Setup Tenant A (Alice)
      const alice = await signUp(db, {
        name: 'Alice',
        email: 'alice@tenant-a.com',
        password: 'Password123!',
        workspaceName: 'Tenant A Vault'
      });

      // 2. Setup Tenant B (Bob)
      const bob = await signUp(db, {
        name: 'Bob',
        email: 'bob@tenant-b.com',
        password: 'Password123!',
        workspaceName: 'Tenant B Vault'
      });

      const aliceAccess = TenantAccessLayer.create(db, {
        accountId: alice.account.id,
        workspaceId: alice.workspace.id
      });

      const bobAccess = TenantAccessLayer.create(db, {
        accountId: bob.account.id,
        workspaceId: bob.workspace.id
      });

      // Alice creates a confidential agent and security policy in Tenant A
      const aliceAgent = aliceAccess.createAgent({
        name: 'Alice Confidential Settlement Bot',
        description: 'Private treasury agent for Tenant A',
        nearAccountId: 'tenant-a-settle.testnet',
        targetContractId: 'vault-a.testnet',
        enforcementLevel: 'ENFORCING',
        riskScore: 20
      });

      const alicePolicy = aliceAccess.createPolicy({
        agentId: aliceAgent.id,
        name: 'Tenant A Secret Spending Cap',
        type: 'SPENDING_LIMIT',
        config: { maxNearPerTransaction: 10.0 }
      });

      // TEST CASE A: Bob attempts to initialize an Access Layer for Tenant A's workspace
      assert.throws(
        () => {
          TenantAccessLayer.create(db, {
            accountId: bob.account.id,
            workspaceId: alice.workspace.id // Bob trying to enter Alice's workspace
          });
        },
        (err: any) => {
          assert.ok(err instanceof TenantIsolationViolationError);
          assert.ok(err.message.includes('Cross-Tenant Access Violation'));
          return true;
        },
        'Bob must not be allowed to instantiate an access layer for Tenant A'
      );

      // TEST CASE B: Bob attempts to read Alice's agent using Bob's own access layer
      assert.throws(
        () => {
          bobAccess.getAgentById(aliceAgent.id);
        },
        (err: any) => {
          assert.ok(err instanceof TenantIsolationViolationError);
          assert.ok(err.message.includes('Cross-Tenant Read Violation'));
          assert.strictEqual(err.resourceId, aliceAgent.id);
          assert.strictEqual(err.actualWorkspaceId, alice.workspace.id);
          assert.strictEqual(err.attemptedWorkspaceId, bob.workspace.id);
          return true;
        },
        'Bob must be blocked when attempting to read Alice’s agent'
      );

      // TEST CASE C: Bob attempts to read Alice's policy using Bob's own access layer
      assert.throws(
        () => {
          bobAccess.getPolicyById(alicePolicy.id);
        },
        (err: any) => {
          assert.ok(err instanceof TenantIsolationViolationError);
          assert.ok(err.message.includes('Cross-Tenant Read Violation'));
          assert.strictEqual(err.resourceId, alicePolicy.id);
          return true;
        },
        'Bob must be blocked when attempting to read Alice’s policy'
      );

      // TEST CASE D: Bob queries agent and policy lists; results must contain ZERO items from Alice
      const bobAgents = bobAccess.getAgents();
      assert.strictEqual(bobAgents.length, 0, 'Bob must not see any of Alice’s agents in list');

      const bobPolicies = bobAccess.getPolicies();
      assert.strictEqual(bobPolicies.length, 0, 'Bob must not see any of Alice’s policies in list');

      // Alice successfully reads her own agent and policy
      const aliceAgentRead = aliceAccess.getAgentById(aliceAgent.id);
      assert.strictEqual(aliceAgentRead?.id, aliceAgent.id);
      assert.strictEqual(aliceAgentRead?.name, 'Alice Confidential Settlement Bot');

      const alicePolicyRead = aliceAccess.getPolicyById(alicePolicy.id);
      assert.strictEqual(alicePolicyRead?.id, alicePolicy.id);
      assert.strictEqual(alicePolicyRead?.name, 'Tenant A Secret Spending Cap');
    });
  });

  describe('3. Role-Based Access Control (RBAC): owner, admin, analyst, viewer', () => {
    it('enforces fine-grained role constraints across mutations and queries', async () => {
      const ownerUser = await signUp(db, {
        name: 'Workspace Owner',
        email: 'owner@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'Acme Operations'
      });

      const ownerAccess = TenantAccessLayer.create(db, {
        accountId: ownerUser.account.id,
        workspaceId: ownerUser.workspace.id
      });

      // 1. Owner creates agent
      const agent = ownerAccess.createAgent({
        name: 'Operations Bot',
        description: 'Ops bot',
        nearAccountId: 'ops.testnet',
        targetContractId: 'ops-target.testnet'
      });

      // 2. Add members with different roles
      const viewerMember = ownerAccess.addMember({ email: 'viewer@agentshield.testnet', role: 'viewer', name: 'Compliance Auditor' });
      const analystMember = ownerAccess.addMember({ email: 'analyst@agentshield.testnet', role: 'analyst', name: 'SOC Analyst' });
      const adminMember = ownerAccess.addMember({ email: 'admin@agentshield.testnet', role: 'admin', name: 'Security Admin' });

      // Instantiate access layers for each role
      const viewerAccess = TenantAccessLayer.create(db, { accountId: viewerMember.accountId, workspaceId: ownerUser.workspace.id });
      const analystAccess = TenantAccessLayer.create(db, { accountId: analystMember.accountId, workspaceId: ownerUser.workspace.id });
      const adminAccess = TenantAccessLayer.create(db, { accountId: adminMember.accountId, workspaceId: ownerUser.workspace.id });

      // VIEWER ROLE TESTS: Can read, but CANNOT mutate
      const viewerAgents = viewerAccess.getAgents();
      assert.strictEqual(viewerAgents.length, 1, 'Viewer must be able to read agents');

      assert.throws(
        () => {
          viewerAccess.updateAgentStatus(agent.id, 'PAUSED');
        },
        (err: any) => {
          assert.ok(err instanceof UnauthorizedRoleError);
          assert.strictEqual(err.role, 'viewer');
          return true;
        },
        'Viewer must not be permitted to mutate agent status'
      );

      assert.throws(
        () => {
          viewerAccess.createPolicy({
            agentId: agent.id,
            name: 'Viewer Forbidden Policy',
            type: 'SPENDING_LIMIT'
          });
        },
        (err: any) => {
          assert.ok(err instanceof UnauthorizedRoleError);
          assert.strictEqual(err.role, 'viewer');
          return true;
        },
        'Viewer must not be permitted to create policies'
      );

      // ANALYST ROLE TESTS: Can update agent / read data / log findings, but cannot create core policies
      assert.throws(
        () => {
          analystAccess.createPolicy({
            agentId: agent.id,
            name: 'Analyst Forbidden Policy',
            type: 'SPENDING_LIMIT'
          });
        },
        (err: any) => {
          assert.ok(err instanceof UnauthorizedRoleError);
          assert.strictEqual(err.role, 'analyst');
          return true;
        },
        'Analyst must not be permitted to configure core policies'
      );

      // Analyst can append incident findings to audit log
      const auditRec = analystAccess.appendAuditLog(
        'INCIDENT_INVESTIGATED',
        agent.id,
        'Analyst flagged suspicious egress vector for review.'
      );
      assert.ok(auditRec.entryHash.length === 64);

      // ADMIN ROLE TESTS: Can create policies and update agents
      const adminPolicy = adminAccess.createPolicy({
        agentId: agent.id,
        name: 'Admin Authorized Policy',
        type: 'DESTINATION_ALLOWLIST',
        config: { approvedDestinations: ['ops-target.testnet'] }
      });
      assert.strictEqual(adminPolicy.name, 'Admin Authorized Policy');

      const updatedAgent = adminAccess.updateAgentStatus(agent.id, 'PAUSED');
      assert.strictEqual(updatedAgent.status, 'PAUSED');
    });
  });

  describe('4. Append-Only Hash-Chained Audit Log (FR-01, FR-14)', () => {
    it('verifies valid cryptographic chain from genesis to head', async () => {
      const user = await signUp(db, {
        name: 'Audit Test User',
        email: 'auditor@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'Audit Test Vault'
      });

      const access = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });

      // Genesis block was created during signup
      const initialLogs = access.getAuditLogs();
      assert.strictEqual(initialLogs.length, 1);
      assert.strictEqual(initialLogs[0].prevHash, GENESIS_HASH);

      // Append sequential audit records
      access.appendAuditLog('KEY_ROTATION', 'agent-01', 'Rotated function call key credentials');
      access.appendAuditLog('POLICY_UPDATED', 'pol-01', 'Changed daily spending cap from 5 to 10 NEAR');
      access.appendAuditLog('TRANSACTION_BLOCKED', 'tx-123', 'Blocked 500 NEAR exfiltration attempt');

      const allLogs = access.getAuditLogs();
      assert.strictEqual(allLogs.length, 4);

      // Check SHA-256 link integrity
      for (let i = 1; i < allLogs.length; i++) {
        assert.strictEqual(allLogs[i].prevHash, allLogs[i - 1].entryHash, `Log sequence ${i + 1} must point to prev log hash`);
      }

      // Verification check
      const verification = access.verifyAuditChain();
      assert.strictEqual(verification.isValid, true);
      assert.strictEqual(verification.totalEntries, 4);
      assert.strictEqual(verification.error, undefined);
    });

    it('detects cryptographic tampering and breaks verification if an attacker mutates data in place', async () => {
      const user = await signUp(db, {
        name: 'Tamper Test User',
        email: 'tamper@agentshield.testnet',
        password: 'Password123!',
        workspaceName: 'Tamper Detection Vault'
      });

      const access = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });

      access.appendAuditLog('SECURITY_ALERT', 'agent-01', 'Authentic Audit Log Entry 1');
      access.appendAuditLog('SECURITY_ALERT', 'agent-01', 'Authentic Audit Log Entry 2');

      const preTamperVerification = access.verifyAuditChain();
      assert.strictEqual(preTamperVerification.isValid, true);

      // SIMULATE ATTACK: Direct SQL update tampering with the summary of entry 2
      db.prepare(`
        UPDATE audit_logs
        SET summary = 'FALSIFIED MALICIOUS MODIFICATION'
        WHERE sequence_number = 2 AND workspace_id = ?
      `).run(user.workspace.id);

      // Chain verification must detect the discrepancy!
      const postTamperVerification = access.verifyAuditChain();
      assert.strictEqual(postTamperVerification.isValid, false, 'Tampered log must fail cryptographic check');
      assert.ok(
        postTamperVerification.error?.includes('Cryptographic tamper detected at sequence 2'),
        'Error must specifically identify sequence 2 tamper'
      );
    });
  });
});
