import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || undefined;
    const outcome = searchParams.get('outcome') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const events = auth.accessLayer.getTelemetry({
      agentId,
      outcome,
      severity,
      limit
    });

    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      events,
      totalCount: events.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
