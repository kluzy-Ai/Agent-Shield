import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required to flag a report.' }, { status: 401 });
    }

    const body = await req.json();
    const { reportId, reason } = body;

    if (!reportId || !reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'reportId and reason are required.' }, { status: 400 });
    }

    const result = auth.accessLayer.flagThreatReport(reportId, reason.trim());

    return NextResponse.json({
      success: true,
      message: result.isHidden
        ? 'Report flagged and automatically hidden from public repository pending platform review.'
        : 'Report flagged successfully. Thank you for keeping the community safe.',
      ...result
    });
  } catch (err: any) {
    if (err.message.includes('already flagged')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err.message.includes('not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || 'Failed to flag report.' }, { status: 500 });
  }
}
