import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (!body.title || !body.threatCategory || !body.description) {
      return NextResponse.json(
        { error: 'Missing required report fields: title, threatCategory, description.' },
        { status: 400 }
      );
    }

    const report = auth.accessLayer.submitThreatReport({
      id: body.id,
      incidentId: body.incidentId,
      title: body.title,
      threatCategory: body.threatCategory,
      severity: body.severity,
      reporterType: body.reporterType,
      reporterName: body.reporterName || auth.user.account.name,
      reporterEmail: body.reporterEmail || auth.user.account.email,
      agentPlatform: body.agentPlatform,
      targetAddressOrDomain: body.targetAddressOrDomain,
      description: body.description,
      defensiveEvidence: body.defensiveEvidence,
      evidenceSnippet: body.evidenceSnippet,
      mitigationApplied: body.mitigationApplied,
      isPublicConsented: Boolean(body.isPublicConsented), // Private by default unless explicitly true
      tags: body.tags,
      attachment: body.attachment
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (err: any) {
    if (err.name === 'SubmissionRateLimitError') {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds || 60) } }
      );
    }
    if (err.name === 'DuplicateReportError') {
      return NextResponse.json(
        { error: err.message, duplicateOfId: err.duplicateOfId },
        { status: 409 }
      );
    }
    if (
      err.message.includes('strictly prohibited') ||
      err.message.includes('exceeds maximum allowable length') ||
      err.message.includes('required')
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const status = err.name === 'UnauthorizedRoleError' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to submit threat report.' }, { status });
  }
}

