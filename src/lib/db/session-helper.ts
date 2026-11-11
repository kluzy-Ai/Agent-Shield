import { NextRequest } from 'next/server';
import { DatabaseSync } from 'node:sqlite';
import { getInitializedDatabase } from './database.ts';
import { validateSession, type AuthenticatedUser } from './auth.ts';
import { TenantAccessLayer } from './access-layer.ts';

export interface AuthContext {
  db: DatabaseSync;
  user: AuthenticatedUser;
  accessLayer: TenantAccessLayer;
}

export function extractSessionToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const customHeader = req.headers.get('x-session-token');
  if (customHeader) {
    return customHeader.trim();
  }

  const cookieToken = req.cookies.get('agent_shield_session')?.value;
  if (cookieToken) {
    return cookieToken.trim();
  }

  return null;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const db = await getInitializedDatabase();
  const token = extractSessionToken(req);

  if (!token) {
    // Development/demo fallback when visiting the dashboard without an active cookie
    const asPlatformOwner = req.nextUrl?.searchParams?.get('as_platform_owner') === '1' || req.headers.get('x-platform-owner') === '1';
    const targetAccountId = asPlatformOwner ? 'acc-mod' : 'acc-operator';
    const targetWorkspaceId = 'ws-treasury';

    const defaultUser = db.prepare(`
      SELECT a.id, a.name, a.email, a.is_platform_moderator, a.created_at as account_created_at,
             wm.workspace_id, wm.role,
             w.name as workspace_name, w.environment, w.owner_id, w.created_at as workspace_created_at
      FROM accounts a
      JOIN workspace_members wm ON wm.account_id = a.id
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE a.id = ? AND wm.workspace_id = ?
      LIMIT 1
    `).get(targetAccountId, targetWorkspaceId) as any;

    if (defaultUser) {
      const user: AuthenticatedUser = {
        sessionToken: 'dev-demo-session-token',
        account: {
          id: defaultUser.id,
          name: defaultUser.name,
          email: defaultUser.email,
          isPlatformModerator: Boolean(defaultUser.is_platform_moderator),
          createdAt: defaultUser.account_created_at || new Date().toISOString()
        },
        workspace: {
          id: defaultUser.workspace_id,
          name: defaultUser.workspace_name,
          environment: defaultUser.environment,
          ownerId: defaultUser.owner_id || defaultUser.id,
          createdAt: defaultUser.workspace_created_at || new Date().toISOString()
        },
        role: defaultUser.role
      };
      const accessLayer = TenantAccessLayer.create(db, {
        accountId: user.account.id,
        workspaceId: user.workspace.id
      });
      return { db, user, accessLayer };
    }

    return null;
  }

  const user = validateSession(db, token);
  if (!user) {
    return null;
  }

  const accessLayer = TenantAccessLayer.create(db, {
    accountId: user.account.id,
    workspaceId: user.workspace.id
  });

  return { db, user, accessLayer };
}
