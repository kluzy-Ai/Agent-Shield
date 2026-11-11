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
        { error: 'Forbidden: Platform owner privilege required to confirm report.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required.' }, { status: 400 });
    }

    const updated = auth.accessLayer.adminConfirmThreatReport(reportId);

    return NextResponse.json({
      success: true,
      message: 'Report confirmed by platform owner.',
      report: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
