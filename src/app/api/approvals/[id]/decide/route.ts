import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(
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
    const { decision, note } = body;

    if (!decision || (decision !== 'APPROVE' && decision !== 'DENY')) {
      return NextResponse.json(
        { error: "decision must be either 'APPROVE' or 'DENY'" },
        { status: 400 }
      );
    }

    const updated = auth.accessLayer.decideApproval(id, decision, note);

    return NextResponse.json({
      success: true,
      approval: updated
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.name === 'UnauthorizedRoleError' ? 403 : 400 }
    );
  }
}

