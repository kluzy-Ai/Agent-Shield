import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { validateIngestToken } from '@/lib/db/access-layer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const customHeader = req.headers.get('x-agent-key');
    let rawToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    } else if (customHeader) {
      rawToken = customHeader.trim();
    }

    if (!rawToken) {
      return NextResponse.json(
        { error: 'Missing ingest credential. Provide Authorization: Bearer <ash_live_token> header.' },
        { status: 401 }
      );
    }

    const db = await getInitializedDatabase();
    const auth = validateIngestToken(db, rawToken);

    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or revoked ingest token.' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Update last_heartbeat
    db.prepare(`
      UPDATE agents
      SET last_heartbeat = ?
      WHERE id = ?
    `).run(now, auth.agentId);

    // Update credential last_used_at
    db.prepare(`
      UPDATE agent_credentials
      SET last_used_at = ?
      WHERE id = ?
    `).run(now, auth.credentialId);

    return NextResponse.json({
      success: true,
      agentId: auth.agentId,
      agentName: auth.agentName,
      status: auth.agentStatus,
      lastHeartbeat: now,
      message: 'Heartbeat acknowledged. Monitoring active.'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Heartbeat processing error' },
      { status: 500 }
    );
  }
}
