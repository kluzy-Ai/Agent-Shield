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
    const policy = auth.accessLayer.getPolicyById(id);
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ policy });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    const updated = auth.accessLayer.updatePolicy(id, {
      name: body.name,
      status: body.status,
      dryRun: body.dryRun,
      isEnforceable: body.isEnforceable,
      config: body.config
    });

    return NextResponse.json({
      success: true,
      policy: updated
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === 'UnauthorizedRoleError' ? 403 : 400 }
    );
  }
}

