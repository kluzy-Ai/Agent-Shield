import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter.' }, { status: 400 });
    }

    if (action === 'PAUSE_AGENT') {
      const result = auth.accessLayer.pauseAgentFromIncident(id, body.reason);
      const incident = auth.accessLayer.getIncidentById(id);
      return NextResponse.json({ success: true, action: 'PAUSE_AGENT', result, incident });
    }

    if (action === 'REVOKE_CONNECTION') {
      const result = auth.accessLayer.revokeConnectionFromIncident(id, body.reason);
      const incident = auth.accessLayer.getIncidentById(id);
      return NextResponse.json({ success: true, action: 'REVOKE_CONNECTION', result, incident });
    }

    if (action === 'MARK_FALSE_POSITIVE') {
      if (!body.reason) {
        return NextResponse.json({ error: 'False positive reason is required.' }, { status: 400 });
      }
      const incident = auth.accessLayer.markIncidentFalsePositive(id, body.reason);
      return NextResponse.json({ success: true, action: 'MARK_FALSE_POSITIVE', incident });
    }

    if (action === 'ACKNOWLEDGE') {
      const incident = auth.accessLayer.updateIncidentStatus(id, 'INVESTIGATING', body.note || 'Incident acknowledged for active investigation.');
      return NextResponse.json({ success: true, action: 'ACKNOWLEDGE', incident });
    }

    return NextResponse.json({ error: `Unsupported incident action '${action}'.` }, { status: 400 });
  } catch (err: any) {
    const status =
      err.name === 'TenantIsolationViolationError'
        ? 403
        : err.name === 'UnauthorizedRoleError'
        ? 403
        : 500;
    return NextResponse.json({ error: err.message || 'Incident action failed.' }, { status });
  }
}
