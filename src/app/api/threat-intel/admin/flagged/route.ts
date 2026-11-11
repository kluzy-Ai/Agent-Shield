import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.accessLayer.isPlatformModerator) {
      return NextResponse.json(
        { error: 'Forbidden: Platform owner privilege required.' },
        { status: 403 }
      );
    }

    const reports = auth.accessLayer.getFlaggedThreatReports();

    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
