import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { extractSessionToken, getAuthContext } from '@/lib/db/session-helper';
import { switchActiveWorkspace, validateSession } from '@/lib/db/auth';

export async function GET(req: NextRequest) {
  try {
    const context = await getAuthContext(req);
    if (!context) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: context.user
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getInitializedDatabase();
    const token = extractSessionToken(req);

    if (!token) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { action, workspaceId } = body;

    if (action === 'switch_workspace') {
      if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
      }

      const updatedUser = switchActiveWorkspace(db, token, workspaceId);
      return NextResponse.json({
        success: true,
        user: updatedUser
      });
    }

    if (action === 'signout') {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      const res = NextResponse.json({ success: true });
      res.cookies.delete('agent_shield_session');
      return res;
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Operation failed' },
      { status: 400 }
    );
  }
}
