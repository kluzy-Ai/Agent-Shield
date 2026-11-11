import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/database';
import { checkBotRateLimit } from '@/lib/threat-intel/bot-limiter';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const row = db.prepare(`
      SELECT id, title, threat_category as threatCategory, severity, agent_platform as agentPlatform,
             description, mitigation_applied as mitigationApplied, tags_json, published_at as publishedAt,
             helpful_count as helpfulCount, is_confirmed as isConfirmed, is_hidden as isHidden,
             flag_count as flagCount, onchain_tx_hash as onchainTxHash
      FROM threat_reports
      WHERE id = ? AND is_public_consented = 1 AND moderation_status = 'VERIFIED_PUBLISHED' AND is_hidden = 0
    `).get(id) as any;

    if (!row) {
      return NextResponse.json(
        { error: 'Report not found or not published to the public repository.' },
        { status: 404, headers }
      );
    }

    let tags = [];
    try { tags = JSON.parse(row.tags_json || '[]'); } catch {}

    return NextResponse.json({
      report: {
        id: row.id,
        title: row.title,
        threatCategory: row.threatCategory,
        severity: row.severity,
        agentPlatform: row.agentPlatform,
        description: row.description,
        mitigationApplied: row.mitigationApplied,
        tags,
        publishedAt: row.publishedAt,
        helpfulCount: row.helpfulCount || 0,
        isConfirmed: Boolean(row.isConfirmed),
        onchainTxHash: row.onchainTxHash
      }
    }, { headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch threat report.' }, { status: 500 });
  }
}
