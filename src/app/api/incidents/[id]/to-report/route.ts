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

    const report = auth.accessLayer.convertIncidentToThreatReport(id, {
      isPublicConsented: Boolean(body.isPublicConsented),
      reporterName: body.reporterName || auth.user.account.name,
      reporterEmail: body.reporterEmail || auth.user.account.email,
      additionalNotes: body.additionalNotes
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (err: any) {
    const statusCode = err.name === 'UnauthorizedRoleError' ? 403 : err.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: err.message || 'Failed to convert incident to threat report.' }, { status: statusCode });
  }
}

