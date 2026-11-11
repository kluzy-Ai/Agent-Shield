import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, event, runLlmClassifier = false, autoPersistAlerts = true } = body;

    if (!agentId || !event) {
      return NextResponse.json(
        { error: 'agentId and event payload are required.' },
        { status: 400 }
      );
    }

    const result = await auth.accessLayer.evaluateDetectionRules(agentId, event, {
      runLlmClassifier,
      autoPersistAlerts
    });

    return NextResponse.json({
      success: true,
      hasAlert: result.hasAlert,
      alertsCount: result.alerts.length,
      alerts: result.alerts,
      signals: result.signals
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Detection rule evaluation failed.' },
      { status: 500 }
    );
  }
}
