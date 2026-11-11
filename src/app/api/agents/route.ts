import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = auth.accessLayer.getAgents({ applyHonestTransitions: true });
    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      agents
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      category = 'FINANCE',
      nearAccountId,
      targetContractId,
      hasFunctionCallKey = true,
      fckAllowanceNear,
      fckReceiverId,
      fckAllowedMethods = [],
      enforcementLevel = 'ENFORCING',
      riskScore = 20
    } = body;

    if (!name || !nearAccountId || !targetContractId) {
      return NextResponse.json(
        { error: 'name, nearAccountId, and targetContractId are required.' },
        { status: 400 }
      );
    }

    const newAgent = auth.accessLayer.createAgent({
      name,
      description: description || 'Autonomous Agent',
      category,
      nearAccountId,
      targetContractId,
      hasFunctionCallKey,
      fckAllowanceNear,
      fckReceiverId,
      fckAllowedMethods,
      enforcementLevel,
      riskScore
    });

    return NextResponse.json({
      success: true,
      agent: newAgent,
      rawIngestToken: newAgent.rawIngestToken,
      message: 'Agent registered successfully. Save the rawIngestToken now; it cannot be shown again.'
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === 'UnauthorizedRoleError' ? 403 : 400 }
    );
  }
}
