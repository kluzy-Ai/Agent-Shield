import argon2 from 'argon2';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { appendAuditLog } from './audit.ts';

export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface AccountRecord {
  id: string;
  name: string;
  email: string;
  isPlatformModerator: boolean;
  createdAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  environment: 'PRODUCTION' | 'STAGING' | 'SANDBOX';
  ownerId: string;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  token: string;
  accountId: string;
  activeWorkspaceId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthenticatedUser {
  account: AccountRecord;
  workspace: WorkspaceRecord;
  role: WorkspaceRole;
  sessionToken: string;
}

// Memory-hard Argon2id hashing per RFC 9106
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function signUp(
  db: DatabaseSync,
  params: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
    environment?: 'PRODUCTION' | 'STAGING' | 'SANDBOX';
  }
): Promise<AuthenticatedUser> {
  const normalizedEmail = params.email.trim().toLowerCase();

  // Check if account already exists
  const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error(`An account with email ${normalizedEmail} already exists.`);
  }

  const accountId = `acc-${crypto.randomBytes(8).toString('hex')}`;
  const passwordHash = await hashPassword(params.password);
  const now = new Date().toISOString();

  // 1. Insert account
  db.prepare(`
    INSERT INTO accounts (id, name, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(accountId, params.name.trim(), normalizedEmail, passwordHash, now);

  // 2. Create default workspace
  const workspaceId = `ws-${crypto.randomBytes(6).toString('hex')}`;
  const wsName = params.workspaceName?.trim() || `${params.name.trim()}'s Workspace`;
  const env = params.environment || 'PRODUCTION';

  db.prepare(`
    INSERT INTO workspaces (id, name, environment, owner_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(workspaceId, wsName, env, accountId, now);

  // 3. Assign creator as 'owner'
  const memberId = `mem-${crypto.randomBytes(6).toString('hex')}`;
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, account_id, role, created_at)
    VALUES (?, ?, ?, 'owner', ?)
  `).run(memberId, workspaceId, accountId, now);

  // 4. Initialize Genesis Audit Log Block for the workspace (FR-01, FR-14)
  appendAuditLog(
    db,
    workspaceId,
    normalizedEmail,
    'GENESIS_WORKSPACE_CREATED',
    workspaceId,
    `Workspace "${wsName}" initialized with environment ${env}. Owner role assigned to ${normalizedEmail}.`,
    { ownerId: accountId, environment: env }
  );

  // 5. Create Session
  const sessionId = `ses-${crypto.randomBytes(12).toString('hex')}`;
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.prepare(`
    INSERT INTO sessions (id, token, account_id, active_workspace_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, sessionToken, accountId, workspaceId, now, expiresAt);

  return {
    account: { id: accountId, name: params.name.trim(), email: normalizedEmail, isPlatformModerator: false, createdAt: now },
    workspace: { id: workspaceId, name: wsName, environment: env, ownerId: accountId, createdAt: now },
    role: 'owner',
    sessionToken
  };
}

export async function signIn(
  db: DatabaseSync,
  params: {
    email: string;
    password: string;
  }
): Promise<AuthenticatedUser> {
  const normalizedEmail = params.email.trim().toLowerCase();

  const account = db.prepare(`
    SELECT id, name, email, password_hash, is_platform_moderator, created_at
    FROM accounts
    WHERE email = ?
  `).get(normalizedEmail) as { id: string; name: string; email: string; password_hash: string; is_platform_moderator?: number; created_at: string } | undefined;

  if (!account) {
    throw new Error('Invalid email or password.');
  }

  const isValid = await verifyPassword(account.password_hash, params.password);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  // Find user's primary or latest workspace
  const member = db.prepare(`
    SELECT wm.workspace_id, wm.role, w.name, w.environment, w.owner_id, w.created_at as ws_created_at
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.account_id = ?
    ORDER BY w.created_at ASC
    LIMIT 1
  `).get(account.id) as {
    workspace_id: string;
    role: WorkspaceRole;
    name: string;
    environment: 'PRODUCTION' | 'STAGING' | 'SANDBOX';
    owner_id: string;
    ws_created_at: string;
  } | undefined;

  if (!member) {
    throw new Error('No workspaces found for this account.');
  }

  const sessionId = `ses-${crypto.randomBytes(12).toString('hex')}`;
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, token, account_id, active_workspace_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, sessionToken, account.id, member.workspace_id, now, expiresAt);

  // Audit login event
  appendAuditLog(
    db,
    member.workspace_id,
    account.email,
    'SESSION_AUTHENTICATED',
    sessionId,
    `Operator authenticated successfully with Argon2 password verification.`,
    { role: member.role }
  );

  return {
    account: { id: account.id, name: account.name, email: account.email, isPlatformModerator: Boolean(account.is_platform_moderator), createdAt: account.created_at },
    workspace: { id: member.workspace_id, name: member.name, environment: member.environment, ownerId: member.owner_id, createdAt: member.ws_created_at },
    role: member.role,
    sessionToken
  };
}

/**
 * NEAR Testnet Wallet Passwordless Sign-In (Stage 11 Item 5)
 */
export async function signInWithNearWallet(
  db: DatabaseSync,
  accountId: string
): Promise<AuthenticatedUser> {
  const normalizedAccount = accountId.trim().toLowerCase();
  if (!normalizedAccount.endsWith('.testnet') && !normalizedAccount.endsWith('.near') && !/^[0-9a-f]{64}$/.test(normalizedAccount)) {
    throw new Error('Invalid NEAR account ID. Must be a .testnet or .near named account or 64-char hex.');
  }

  const email = `${normalizedAccount}@near.wallet`;
  let account = db.prepare(`SELECT id, name, email, is_platform_moderator, created_at FROM accounts WHERE email = ?`).get(email) as any;

  let workspaceId = 'ws-near-prod-01';
  const defaultWs = db.prepare(`SELECT id, name, environment, owner_id, created_at FROM workspaces ORDER BY created_at ASC LIMIT 1`).get() as any;
  if (defaultWs) {
    workspaceId = defaultWs.id;
  }

  if (!account) {
    const accId = `acc-near-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const dummyHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    db.prepare(`
      INSERT INTO accounts (id, name, email, password_hash, is_platform_moderator, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(accId, normalizedAccount, email, dummyHash, now);

    account = { id: accId, name: normalizedAccount, email, is_platform_moderator: 0, created_at: now };

    db.prepare(`
      INSERT OR IGNORE INTO workspace_members (id, workspace_id, account_id, role, created_at)
      VALUES (?, ?, ?, 'admin', ?)
    `).run(`mem-${crypto.randomBytes(8).toString('hex')}`, workspaceId, accId, now);
  }

  const member = db.prepare(`
    SELECT wm.workspace_id, wm.role, w.name, w.environment, w.owner_id, w.created_at as ws_created_at
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.account_id = ?
    ORDER BY w.created_at ASC
    LIMIT 1
  `).get(account.id) as any;

  const sessionId = `ses-near-${crypto.randomBytes(12).toString('hex')}`;
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, token, account_id, active_workspace_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, sessionToken, account.id, member?.workspace_id || workspaceId, now, expiresAt);

  appendAuditLog(
    db,
    member?.workspace_id || workspaceId,
    email,
    'SESSION_AUTHENTICATED',
    sessionId,
    `Operator authenticated via NEAR Testnet Wallet (${normalizedAccount}).`,
    { nearAccountId: normalizedAccount, role: member?.role || 'admin' }
  );

  return {
    account: { id: account.id, name: account.name, email: account.email, isPlatformModerator: Boolean(account.is_platform_moderator), createdAt: account.created_at },
    workspace: {
      id: member?.workspace_id || workspaceId,
      name: member?.name || defaultWs?.name || 'Production Shield',
      environment: member?.environment || defaultWs?.environment || 'PRODUCTION',
      ownerId: member?.owner_id || defaultWs?.owner_id || account.id,
      createdAt: member?.ws_created_at || defaultWs?.created_at || now
    },
    role: member?.role || 'admin',
    sessionToken
  };
}

export function validateSession(
  db: DatabaseSync,
  token: string
): AuthenticatedUser | null {
  const now = new Date().toISOString();

  const row = db.prepare(`
    SELECT s.id as session_id, s.token, s.account_id, s.active_workspace_id,
           a.name as account_name, a.email as account_email, a.is_platform_moderator, a.created_at as account_created_at,
           w.name as workspace_name, w.environment as workspace_env, w.owner_id as workspace_owner_id, w.created_at as workspace_created_at,
           wm.role as member_role
    FROM sessions s
    JOIN accounts a ON a.id = s.account_id
    JOIN workspaces w ON w.id = s.active_workspace_id
    JOIN workspace_members wm ON wm.workspace_id = s.active_workspace_id AND wm.account_id = s.account_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now) as any;

  if (!row) return null;

  return {
    account: { id: row.account_id, name: row.account_name, email: row.account_email, isPlatformModerator: Boolean(row.is_platform_moderator), createdAt: row.account_created_at },
    workspace: { id: row.active_workspace_id, name: row.workspace_name, environment: row.workspace_env, ownerId: row.workspace_owner_id, createdAt: row.workspace_created_at },
    role: row.member_role as WorkspaceRole,
    sessionToken: row.token
  };
}

export function switchActiveWorkspace(
  db: DatabaseSync,
  sessionToken: string,
  targetWorkspaceId: string
): AuthenticatedUser {
  const session = validateSession(db, sessionToken);
  if (!session) {
    throw new Error('Invalid or expired session.');
  }

  // Validate account is a registered member of targetWorkspaceId
  const member = db.prepare(`
    SELECT wm.role, w.name, w.environment, w.owner_id, w.created_at
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.workspace_id = ? AND wm.account_id = ?
  `).get(targetWorkspaceId, session.account.id) as any;

  if (!member) {
    throw new Error(`Tenant Isolation Violation: Account ${session.account.email} is not a member of Workspace ${targetWorkspaceId}.`);
  }

  db.prepare(`
    UPDATE sessions
    SET active_workspace_id = ?
    WHERE token = ?
  `).run(targetWorkspaceId, sessionToken);

  appendAuditLog(
    db,
    targetWorkspaceId,
    session.account.email,
    'WORKSPACE_SWITCHED',
    targetWorkspaceId,
    `Operator switched active context to workspace "${member.name}".`,
    { role: member.role }
  );

  return {
    account: session.account,
    workspace: { id: targetWorkspaceId, name: member.name, environment: member.environment, ownerId: member.owner_id, createdAt: member.created_at },
    role: member.role as WorkspaceRole,
    sessionToken
  };
}
