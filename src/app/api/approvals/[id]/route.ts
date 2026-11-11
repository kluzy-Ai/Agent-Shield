import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { validateIngestToken, TenantAccessLayer } from '@/lib/db/access-layer';
import { getInitializedDatabase } from '@/lib/db/database';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let accessLayer: TenantAccessLayer | null = null;
    const auth = await getAuthContext(req);
    if (auth) {
      accessLayer = auth.accessLayer;
    } else {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
      if (token) {
        const db = await getInitializedDatabase();
        const valid = validateIngestToken(db, token);
        if (valid) {
          accessLayer = TenantAccessLayer.create(db, {
            accountId: 'system-agent',
            workspaceId: valid.workspaceId
          });
        }
      }
    }

    if (!accessLayer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approval = accessLayer.getApprovalById(id);
    if (!approval) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      approval
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

