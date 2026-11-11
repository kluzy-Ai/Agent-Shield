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
    const credentials = auth.accessLayer.getAgentCredentials(id);

    return NextResponse.json({ credentials });
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

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
    const body = await req.json().catch(() => ({}));
    const result = auth.accessLayer.rotateAgentCredential(id, body.name);

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
      rawIngestToken: result.rawIngestToken,
      tokenPrefix: result.tokenPrefix,
      message: 'New ingest token generated. Prior active tokens revoked. Save this token immediately.'
    }, { status: 201 });
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

    const body = await req.json();
    if (!body.credentialId) {
      return NextResponse.json({ error: 'credentialId is required' }, { status: 400 });
    }

    const result = auth.accessLayer.revokeAgentCredential(body.credentialId);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : err.name === 'UnauthorizedRoleError' ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
