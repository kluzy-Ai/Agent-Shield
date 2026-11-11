import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = auth.accessLayer.getPolicies();
    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      policies
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
      agentId,
      name,
      type = 'SPENDING_LIMIT',
      status = 'ACTIVE',
      isEnforceable = true,
      dryRun = false,
      config = {}
    } = body;

    if (!agentId || !name) {
      return NextResponse.json({ error: 'agentId and name are required' }, { status: 400 });
    }

    const policy = auth.accessLayer.createPolicy({
      agentId,
      name,
      type,
      status,
      isEnforceable,
      dryRun,
      config
    });

    return NextResponse.json({
      success: true,
      policy
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === 'UnauthorizedRoleError' ? 403 : 400 }
    );
  }
}

