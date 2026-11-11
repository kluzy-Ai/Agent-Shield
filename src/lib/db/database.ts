import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let instance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (dbPath === ':memory:') {
    const memoryDb = new DatabaseSync(':memory:');
    initSchema(memoryDb);
    return memoryDb;
  }

  if (instance) {
    return instance;
  }

  const defaultDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }

  const resolvedPath = dbPath || path.join(defaultDir, 'agent-shield.db');
  instance = new DatabaseSync(resolvedPath);
  initSchema(instance);
  return instance;
}

let seedPromise: Promise<void> | null = null;
export async function getInitializedDatabase(dbPath?: string): Promise<DatabaseSync> {
  const db = getDatabase(dbPath);
  if (dbPath !== ':memory:') {
    if (!seedPromise) {
      const { seedDatabase } = await import('./seed.ts');
      seedPromise = seedDatabase(db);
    }
    await seedPromise;
  }
  return db;
}

export function initSchema(db: DatabaseSync): void {
  // 1. Accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_platform_moderator INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Workspaces
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      environment TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES accounts(id)
    );
  `);

  // 3. Workspace Members & Roles (owner, admin, analyst, viewer, moderator)
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'analyst', 'viewer', 'moderator')),
      created_at TEXT NOT NULL,
      UNIQUE(workspace_id, account_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);

  // 4. Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      account_id TEXT NOT NULL,
      active_workspace_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 5. Append-only Hash-chained Audit Log (FR-01, FR-14)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      workspace_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      id TEXT UNIQUE NOT NULL,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      entry_hash TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (workspace_id, sequence_number),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 6. Connected Agents (Workspace-Scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'FINANCE',
      near_account_id TEXT NOT NULL,
      target_contract_id TEXT NOT NULL,
      has_function_call_key INTEGER NOT NULL DEFAULT 1,
      fck_allowance_near TEXT,
      fck_receiver_id TEXT,
      fck_allowed_methods_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      enforcement_level TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      last_heartbeat TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // Safely migrate existing tables if columns missing
  try { db.exec(`ALTER TABLE accounts ADD COLUMN is_platform_moderator INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN category TEXT NOT NULL DEFAULT 'FINANCE'`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN has_function_call_key INTEGER NOT NULL DEFAULT 1`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN fck_allowance_near TEXT`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN fck_receiver_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN fck_allowed_methods_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN declared_tools_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN declared_endpoints_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN data_access_json TEXT NOT NULL DEFAULT '[]'`); } catch {}

  // 7. Scoped Per-Agent Ingest Credentials (Hashed, Shown Once)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_credentials (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      token_prefix TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'REVOKED')),
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      last_used_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 8. Ingested Activity Timeline & Telemetry Events (Schema-validated, Idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      action_type TEXT NOT NULL,
      destination TEXT NOT NULL,
      payload_summary TEXT NOT NULL,
      enforcement_outcome TEXT NOT NULL CHECK(enforcement_outcome IN ('ALLOWED', 'FLAGGED', 'PAUSED', 'BLOCKED')),
      risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      signals_triggered_json TEXT NOT NULL DEFAULT '[]',
      counterparty_signals_json TEXT,
      raw_redacted_payload TEXT,
      is_simulated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 9. Security Policies (Workspace-Scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      is_enforceable INTEGER NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 10. Approvals Queue (Real Action Holding Mechanism for REQUIRE_APPROVAL)
  db.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      destination TEXT NOT NULL,
      amount_near TEXT,
      parameters_json TEXT NOT NULL DEFAULT '{}',
      risk_severity TEXT NOT NULL CHECK(risk_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      policy_id TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
      requires_yocto_deposit INTEGER NOT NULL DEFAULT 0,
      requested_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT,
      decision_note TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 11. Security Alerts & Incident Detections (FR-06, FR-09)
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED')),
      attack_category TEXT NOT NULL,
      why_flagged TEXT NOT NULL,
      evidence_json TEXT NOT NULL DEFAULT '{}',
      remediation TEXT NOT NULL,
      enforcement_action TEXT NOT NULL DEFAULT 'FLAGGED',
      is_false_positive INTEGER NOT NULL DEFAULT 0,
      false_positive_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 12. Baseline Security Assessments (FR-04)
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      confidence TEXT NOT NULL CHECK(confidence IN ('LOW', 'MEDIUM', 'HIGH')),
      summary TEXT NOT NULL,
      inventory_json TEXT NOT NULL DEFAULT '{}',
      safe_tests_json TEXT NOT NULL DEFAULT '[]',
      findings_json TEXT NOT NULL DEFAULT '[]',
      coverage_report_json TEXT NOT NULL DEFAULT '{}',
      assessed_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 13. Security Incidents & Forensic Dossiers (FR-09, FR-10, FR-11)
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'INVESTIGATING', 'CONTAINED', 'FALSE_POSITIVE', 'RESOLVED')),
      trigger_alert_id TEXT,
      attack_category TEXT NOT NULL,
      summary TEXT NOT NULL,
      root_cause TEXT,
      remediation TEXT,
      enforcement_action TEXT NOT NULL DEFAULT 'BLOCKED',
      timeline_steps_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      operator_notes_json TEXT NOT NULL DEFAULT '[]',
      is_false_positive INTEGER NOT NULL DEFAULT 0,
      false_positive_reason TEXT,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 14. Threat Intelligence Reports (FR-12, FR-13)
  db.exec(`
    CREATE TABLE IF NOT EXISTS threat_reports (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      incident_id TEXT,
      title TEXT NOT NULL,
      threat_category TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      reporter_type TEXT NOT NULL DEFAULT 'OPERATOR',
      reporter_name TEXT,
      reporter_email TEXT,
      agent_platform TEXT NOT NULL,
      target_address_or_domain TEXT,
      description TEXT NOT NULL,
      defensive_evidence TEXT,
      evidence_snippet TEXT,
      mitigation_applied TEXT NOT NULL,
      is_public_consented INTEGER NOT NULL DEFAULT 0,
      is_confirmed INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      flag_count INTEGER NOT NULL DEFAULT 0,
      takedown_reason TEXT,
      takedown_at TEXT,
      takedown_by TEXT,
      moderation_status TEXT NOT NULL CHECK(moderation_status IN ('PENDING_REVIEW', 'IN_TRIAGE', 'VERIFIED_PUBLISHED', 'REJECTED', 'DUPLICATE')),
      triage_severity TEXT,
      triage_confidence TEXT CHECK(triage_confidence IN ('LOW', 'MEDIUM', 'HIGH')),
      moderation_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      published_at TEXT,
      duplicate_of_id TEXT,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      content_fingerprint TEXT NOT NULL,
      attachment_meta_json TEXT NOT NULL DEFAULT '{}',
      sanitized_summary_json TEXT,
      yara_or_sigma_rule TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // 15. Threat Intelligence Mitigation Feedback ("This helped" Upvotes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS threat_feedback (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      user_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES threat_reports(id)
    );
  `);

  // 15b. Community Threat Flags (Auto-hide after 3 distinct flags)
  db.exec(`
    CREATE TABLE IF NOT EXISTS threat_flags (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES threat_reports(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      UNIQUE(report_id, account_id)
    );
  `);

  // 16. NEAR Protocol Audit Anchors & Threat Registry (FR-01, FR-12, FR-14)
  db.exec(`
    CREATE TABLE IF NOT EXISTS near_anchors (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      root_hash TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      block_height INTEGER NOT NULL,
      block_timestamp TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      anchored_by TEXT NOT NULL,
      explorer_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);

  // Safe migrations for alerts & threat reports
  try { db.exec(`ALTER TABLE alerts ADD COLUMN timeline_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE alerts ADD COLUMN operator_notes_json TEXT NOT NULL DEFAULT '[]'`); } catch {}
  try { db.exec(`ALTER TABLE alerts ADD COLUMN incident_id TEXT`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN onchain_tx_hash TEXT`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN onchain_registered_at TEXT`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN flag_count INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN takedown_reason TEXT`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN takedown_at TEXT`); } catch {}
  try { db.exec(`ALTER TABLE threat_reports ADD COLUMN takedown_by TEXT`); } catch {}

  // Indexes for high performance tenant filtering and fast ingestion lookup
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_lookup ON workspace_members(workspace_id, account_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_audit_workspace_seq ON audit_logs(workspace_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_policies_workspace ON policies(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_token_hash ON agent_credentials(token_hash);
    CREATE INDEX IF NOT EXISTS idx_credentials_agent ON agent_credentials(agent_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_workspace_time ON telemetry_events(workspace_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_agent_time ON telemetry_events(agent_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_approvals_workspace_status ON approvals(workspace_id, status);
    CREATE INDEX IF NOT EXISTS idx_approvals_agent ON approvals(agent_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_workspace_time ON alerts(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_agent ON alerts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_workspace_time ON incidents(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_agent ON incidents(agent_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_agent ON assessments(agent_id, assessed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assessments_workspace ON assessments(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_threat_reports_workspace ON threat_reports(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_threat_reports_public ON threat_reports(is_public_consented, moderation_status, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_threat_reports_fingerprint ON threat_reports(content_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_threat_feedback_report ON threat_feedback(report_id, user_identifier);
    CREATE INDEX IF NOT EXISTS idx_threat_flags_report ON threat_flags(report_id, account_id);
    CREATE INDEX IF NOT EXISTS idx_threat_reports_flags ON threat_reports(is_hidden, flag_count);
    CREATE INDEX IF NOT EXISTS idx_near_anchors_workspace ON near_anchors(workspace_id, sequence_number DESC);
  `);
}

// Helper to reset database during isolated tests
export function resetDatabase(db: DatabaseSync): void {
  db.exec(`
    DELETE FROM near_anchors;
    DELETE FROM threat_flags;
    DELETE FROM threat_feedback;
    DELETE FROM threat_reports;
    DELETE FROM incidents;
    DELETE FROM assessments;
    DELETE FROM alerts;
    DELETE FROM approvals;
    DELETE FROM telemetry_events;
    DELETE FROM agent_credentials;
    DELETE FROM audit_logs;
    DELETE FROM policies;
    DELETE FROM agents;
    DELETE FROM sessions;
    DELETE FROM workspace_members;
    DELETE FROM workspaces;
    DELETE FROM accounts;
  `);
}
