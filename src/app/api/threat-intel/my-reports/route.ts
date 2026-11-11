import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const reports = auth.accessLayer.getWorkspaceThreatReports();
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch reports.' }, { status: 500 });
  }
}

