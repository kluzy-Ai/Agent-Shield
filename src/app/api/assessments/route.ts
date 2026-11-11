import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;

    const assessments = auth.accessLayer.getAssessments(agentId);

    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      total: assessments.length,
      assessments
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch assessments.' },
      { status: 500 }
    );
  }
}
