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
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const alerts = auth.accessLayer.getAlerts({ agentId, severity, status, limit });

    return NextResponse.json({
      workspaceId: auth.accessLayer.workspaceId,
      total: alerts.length,
      alerts
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch security alerts.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check for Bulk Acknowledge action
    if (body.action === 'BULK_ACKNOWLEDGE') {
      if (!Array.isArray(body.alertIds) || body.alertIds.length === 0) {
        return NextResponse.json(
          { error: 'alertIds array is required for bulk acknowledge.' },
          { status: 400 }
        );
      }
      const result = auth.accessLayer.bulkAcknowledgeAlerts(body.alertIds);
      return NextResponse.json({
        success: true,
        acknowledgedCount: result.acknowledgedCount
      });
    }

    // Check for False Positive action
    if (body.action === 'MARK_FALSE_POSITIVE') {
      if (!body.alertId || !body.reason) {
        return NextResponse.json(
          { error: 'alertId and reason are required for false positive marking.' },
          { status: 400 }
        );
      }
      const updated = auth.accessLayer.markAlertFalsePositive(body.alertId, body.reason);
      return NextResponse.json({
        success: true,
        alert: updated
      });
    }

    // Default: Manual Alert Creation
    if (!body.agentId || !body.ruleId || !body.title || !body.whyFlagged) {
      return NextResponse.json(
        { error: 'agentId, ruleId, title, and whyFlagged are required.' },
        { status: 400 }
      );
    }

    const created = auth.accessLayer.createAlert({
      agentId: body.agentId,
      agentName: body.agentName || body.agentId,
      ruleId: body.ruleId,
      ruleName: body.ruleName || body.title,
      title: body.title,
      severity: body.severity || 'HIGH',
      status: body.status || 'OPEN',
      attackCategory: body.attackCategory || 'UNSPECIFIED',
      whyFlagged: body.whyFlagged,
      supportingEvidence: body.supportingEvidence || {},
      remediation: body.remediation || 'Inspect agent activity context.',
      enforcementAction: body.enforcementAction || 'FLAGGED'
    });

    return NextResponse.json(
      { success: true, alert: created },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process alert action.' },
      { status: 500 }
    );
  }
}
