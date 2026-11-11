import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/database';
import { TenantAccessLayer } from '@/lib/db/access-layer';
import { checkBotRateLimit } from '@/lib/threat-intel/bot-limiter';

export async function GET(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous-reader';

    const rate = checkBotRateLimit(clientIp, 60, 60_000);

    const headers = {
      'X-RateLimit-Limit': String(rate.limit),
      'X-RateLimit-Remaining': String(rate.remaining),
      'X-RateLimit-Reset': String(rate.resetSeconds)
    };

    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Bot-friendly rate limit is 60 requests per minute.' },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': String(rate.resetSeconds)
          }
        }
      );
    }

    const db = getDatabase();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = TenantAccessLayer.getPublicThreatIntelligence(db, {
      q,
      category,
      tag,
      limit,
      offset
    });

    return NextResponse.json(
      {
        reports: result.reports,
        total: result.total
      },
      { headers }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch public threat intelligence.' }, { status: 500 });
  }
}
