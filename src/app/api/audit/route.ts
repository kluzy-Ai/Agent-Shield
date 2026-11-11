import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessLayer } = auth;
    const entries = accessLayer.getAuditLogs();
    const verification = accessLayer.verifyAuditChain();

    return NextResponse.json({
      workspaceId: accessLayer.workspaceId,
      entries,
      verification
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

    const { accessLayer } = auth;
    const body = await req.json();
    const { actionType, resourceId, summary, details = {} } = body;

    if (!actionType || !summary) {
      return NextResponse.json({ error: 'actionType and summary are required' }, { status: 400 });
    }

    const entry = accessLayer.appendAuditLog(
      actionType,
      resourceId || accessLayer.workspaceId,
      summary,
      details
    );
    const verification = accessLayer.verifyAuditChain();

    return NextResponse.json({
      success: true,
      entry,
      verification
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
