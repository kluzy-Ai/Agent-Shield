import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { BackgroundWorker } from '@/../services/worker/src/index';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const worker = new BackgroundWorker(auth.accessLayer['db']);
    const summary = await worker.generateMorningSummary(auth.user.workspace.id);

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate morning summary.' }, { status: 500 });
  }
}
