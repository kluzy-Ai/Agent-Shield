import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const incidents = auth.accessLayer.getIncidents({ agentId, severity, status, limit });
    return NextResponse.json({ incidents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (!body.agentId || !body.title || !body.severity || !body.attackCategory || !body.summary) {
      return NextResponse.json(
        { error: 'Missing required incident fields: agentId, title, severity, attackCategory, summary.' },
        { status: 400 }
      );
    }

    const incident = auth.accessLayer.createIncident({
      agentId: body.agentId,
      agentName: body.agentName,
      title: body.title,
      severity: body.severity,
      status: body.status || 'OPEN',
      triggerAlertId: body.triggerAlertId,
      attackCategory: body.attackCategory,
      summary: body.summary,
      rootCause: body.rootCause,
      remediation: body.remediation,
      enforcementAction: body.enforcementAction || 'BLOCKED',
      timelineSteps: body.timelineSteps,
      evidence: body.evidence,
      operatorNotes: body.operatorNotes,
      assignedTo: body.assignedTo
    });

    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (err: any) {
    const status = err.name === 'UnauthorizedRoleError' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to create incident.' }, { status });
  }
}
