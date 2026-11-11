import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const agentId = body.agentId;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required to run a baseline security assessment.' },
        { status: 400 }
      );
    }

    const report = await auth.accessLayer.runAgentAssessment(agentId);

    return NextResponse.json(
      {
        success: true,
        report
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to run baseline security assessment.' },
      { status: 500 }
    );
  }
}
