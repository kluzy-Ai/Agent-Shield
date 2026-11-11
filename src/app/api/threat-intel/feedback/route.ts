import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/database';
import { TenantAccessLayer } from '@/lib/db/access-layer';
import { getAuthContext } from '@/lib/db/session-helper';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json().catch(() => ({}));
    const reportId = body.reportId;

    if (!reportId) {
      return NextResponse.json({ error: "Missing 'reportId'." }, { status: 400 });
    }

    // Determine user identifier: authenticated account ID or IP/User-Agent hash
    const auth = await getAuthContext(req).catch(() => null);
    let userIdentifier = auth?.user?.account?.id;

    if (!userIdentifier) {
      const forwarded = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || 'anonymous-client';
      userIdentifier = crypto.createHash('sha256').update(`${forwarded}:${userAgent}`).digest('hex').slice(0, 16);
    }

    const result = TenantAccessLayer.recordMitigationFeedback(db, reportId, userIdentifier);

    return NextResponse.json({
      success: true,
      helpfulCount: result.helpfulCount,
      alreadyVoted: result.alreadyVoted
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record mitigation feedback.' }, { status: 500 });
  }
}

