import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.accessLayer.isPlatformModerator) {
      return NextResponse.json(
        { error: 'Forbidden: Platform owner privilege required for takedown.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reportId, reason } = body;

    if (!reportId || !reason) {
      return NextResponse.json({ error: 'reportId and reason are required.' }, { status: 400 });
    }

    const updated = auth.accessLayer.adminTakedownThreatReport(reportId, reason);

    return NextResponse.json({
      success: true,
      message: 'Report taken down and hidden from community repository.',
      report: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
