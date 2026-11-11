import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { defaultAnchorService } from '@/lib/near/anchor-service';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessLayer } = auth;
    const latestAnchor = defaultAnchorService.getLatestAnchor(accessLayer.db, accessLayer.workspaceId);
    const history = defaultAnchorService.getAnchorHistory(accessLayer.db, accessLayer.workspaceId);

    return NextResponse.json({
      workspaceId: accessLayer.workspaceId,
      latestAnchor,
      history
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

    const { accessLayer } = auth;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'anchor';

    if (action === 'anchor') {
      const anchor = await defaultAnchorService.anchorWorkspaceAuditRoot(
        accessLayer.db,
        accessLayer.workspaceId,
        accessLayer.actorEmail
      );
      return NextResponse.json({ success: true, anchor });
    }

    if (action === 'verify') {
      const anchorId = body.anchorId;
      if (!anchorId) {
        return NextResponse.json({ error: 'anchorId is required for verification' }, { status: 400 });
      }
      const verification = await defaultAnchorService.verifyAnchorOnChain(accessLayer.db, anchorId);
      return NextResponse.json({ success: true, verification });
    }

    if (action === 'register_threat') {
      if (!['owner', 'admin', 'moderator'].includes(accessLayer.role)) {
        return NextResponse.json(
          { error: 'Only owners, admins, or moderators can register threats on-chain' },
          { status: 403 }
        );
      }
      const reportId = body.reportId;
      if (!reportId) {
        return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
      }
      const result = await defaultAnchorService.registerThreatOnChain(accessLayer.db, reportId);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
