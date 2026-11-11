import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alert = auth.accessLayer.getAlertById(id);
    if (!alert) {
      return NextResponse.json({ error: `Alert '${id}' not found.` }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.isFalsePositive) {
      const updated = auth.accessLayer.markAlertFalsePositive(id, body.falsePositiveReason || 'Marked by operator');
      return NextResponse.json({ success: true, alert: updated });
    }

    if (body.status) {
      const updated = auth.accessLayer.updateAlertStatus(id, body.status, body.note);
      return NextResponse.json({ success: true, alert: updated });
    }

    return NextResponse.json({ error: 'No valid status update parameters provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
