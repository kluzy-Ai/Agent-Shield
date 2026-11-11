import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { validateIngestToken, TenantAccessLayer } from '@/lib/db/access-layer';
import { getInitializedDatabase } from '@/lib/db/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      toolName,
      destination,
      amountNear,
      attachedDepositYocto,
      parameters,
      rawPayload
    } = body;

    if (!agentId || !toolName || !destination) {
      return NextResponse.json(
        { error: 'agentId, toolName, and destination are required' },
        { status: 400 }
      );
    }

    // Try session auth first
    let accessLayer: TenantAccessLayer | null = null;
    const auth = await getAuthContext(req);
    if (auth) {
      accessLayer = auth.accessLayer;
    } else {
      // Try Bearer token auth
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
      if (token) {
        const db = await getInitializedDatabase();
        const valid = validateIngestToken(db, token);
        if (valid && valid.agentId === agentId) {
          accessLayer = TenantAccessLayer.create(db, {
            accountId: 'system-agent',
            workspaceId: valid.workspaceId
          });
        }
      }
    }

    if (!accessLayer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evaluation = accessLayer.evaluateAgentAction({
      agentId,
      toolName,
      destination,
      amountNear,
      attachedDepositYocto,
      parameters,
      rawPayload
    });

    return NextResponse.json({
      success: true,
      evaluation
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

