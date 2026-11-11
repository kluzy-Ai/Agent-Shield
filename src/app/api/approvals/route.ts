import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { validateIngestToken, TenantAccessLayer } from '@/lib/db/access-layer';
import { getInitializedDatabase } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const agentId = searchParams.get('agentId') || undefined;

    const approvals = auth.accessLayer.getApprovals({ status, agentId });
    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      approvals
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      actionType,
      toolName,
      destination,
      amountNear,
      parameters,
      riskSeverity = 'HIGH',
      policyId,
      reason,
      requiresYoctoDeposit = true,
      expiresInSeconds = 300
    } = body;

    if (!agentId || !actionType || !toolName || !destination || !reason) {
      return NextResponse.json(
        { error: 'agentId, actionType, toolName, destination, and reason are required' },
        { status: 400 }
      );
    }

    // Try session auth first
    let accessLayer: TenantAccessLayer | null = null;
    const auth = await getAuthContext(req);
    if (auth) {
      accessLayer = auth.accessLayer;
    } else {
      // Try Bearer token auth for agents submitting approval requests
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

    const approval = accessLayer.createApproval({
      agentId,
      actionType,
      toolName,
      destination,
      amountNear,
      parameters,
      riskSeverity,
      policyId,
      reason,
      requiresYoctoDeposit,
      expiresInSeconds
    });

    return NextResponse.json({
      success: true,
      approval
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

