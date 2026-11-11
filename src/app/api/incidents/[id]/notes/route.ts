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

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Note content is required.' }, { status: 400 });
    }

    const updated = auth.accessLayer.addIncidentNote(id, body.content.trim(), body.author);
    return NextResponse.json({ success: true, incident: updated });
  } catch (err: any) {
    const status =
      err.name === 'TenantIsolationViolationError'
        ? 403
        : err.name === 'UnauthorizedRoleError'
        ? 403
        : 500;
    return NextResponse.json({ error: err.message || 'Failed to append note.' }, { status });
  }
}
