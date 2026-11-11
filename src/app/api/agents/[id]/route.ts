import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const agent = auth.accessLayer.getAgentById(id, { applyHonestTransitions: true });

    if (!agent) {
      return NextResponse.json({ error: `Agent '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    let updatedAgent;

    if (action === 'pause') {
      updatedAgent = auth.accessLayer.updateAgentStatus(id, 'PAUSED');
    } else if (action === 'resume') {
      updatedAgent = auth.accessLayer.updateAgentStatus(id, 'ACTIVE');
    } else if (action === 'disconnect') {
      updatedAgent = auth.accessLayer.disconnectAgent(id);
    } else {
      updatedAgent = auth.accessLayer.editAgent(id, body);
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent
    });
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : err.name === 'UnauthorizedRoleError' ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = auth.accessLayer.removeAgent(id);

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : err.name === 'UnauthorizedRoleError' ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
