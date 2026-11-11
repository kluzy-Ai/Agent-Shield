import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { id } = await params;
    const incident = auth.accessLayer.getIncidentById(id);

    if (!incident) {
      return NextResponse.json({ error: `Incident '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status });
  }
}

export async function PATCH(
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

    if (body.action === 'MARK_FALSE_POSITIVE') {
      if (!body.reason) {
        return NextResponse.json({ error: 'False positive reason is required.' }, { status: 400 });
      }
      const updated = auth.accessLayer.markIncidentFalsePositive(id, body.reason);
      return NextResponse.json({ success: true, incident: updated });
    }

    if (body.status) {
      const updated = auth.accessLayer.updateIncidentStatus(id, body.status, body.note);
      return NextResponse.json({ success: true, incident: updated });
    }

    return NextResponse.json({ error: 'No status or action specified for update.' }, { status: 400 });
  } catch (err: any) {
    const status =
      err.name === 'TenantIsolationViolationError'
        ? 403
        : err.name === 'UnauthorizedRoleError'
        ? 403
        : 500;
    return NextResponse.json({ error: err.message || 'Failed to update incident.' }, { status });
  }
}
