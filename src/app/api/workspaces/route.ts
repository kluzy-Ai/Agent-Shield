import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAuthContext } from '@/lib/db/session-helper';
import { appendAuditLog } from '@/lib/db/audit';
import { switchActiveWorkspace } from '@/lib/db/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db, user } = auth;

    // Fetch only workspaces the user is an authorized member of
    const rows = db.prepare(`
      SELECT w.id, w.name, w.environment, w.owner_id as ownerId, w.created_at as createdAt, wm.role
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.account_id = ?
      ORDER BY w.created_at ASC
    `).all(user.account.id) as any[];

    return NextResponse.json({
      workspaces: rows,
      activeWorkspaceId: user.workspace.id
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db, user } = auth;
    const body = await req.json();
    const { name, environment = 'PRODUCTION' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 });
    }

    const workspaceId = `ws-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const cleanName = name.trim();

    // 1. Create Workspace
    db.prepare(`
      INSERT INTO workspaces (id, name, environment, owner_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(workspaceId, cleanName, environment, user.account.id, now);

    // 2. Make creator 'owner'
    const memberId = `mem-${crypto.randomBytes(6).toString('hex')}`;
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, account_id, role, created_at)
      VALUES (?, ?, ?, 'owner', ?)
    `).run(memberId, workspaceId, user.account.id, now);

    // 3. Genesis Audit Record
    appendAuditLog(
      db,
      workspaceId,
      user.account.email,
      'GENESIS_WORKSPACE_CREATED',
      workspaceId,
      `Workspace "${cleanName}" created by ${user.account.email} under ${environment} environment.`,
      { ownerId: user.account.id, environment }
    );

    // 4. Switch session to this new workspace
    const updatedUser = switchActiveWorkspace(db, user.sessionToken, workspaceId);

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspaceId,
        name: cleanName,
        environment,
        ownerId: user.account.id,
        createdAt: now,
        role: 'owner'
      },
      user: updatedUser
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
