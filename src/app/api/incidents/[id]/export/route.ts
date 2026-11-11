import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/db/session-helper';
import { generateSanitizedJsonExport, generateSanitizedPdfExport } from '@/lib/forensics/export-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { id } = await params;
    const incident = auth.accessLayer.getIncidentById(id);

    if (!incident) {
      return NextResponse.json({ error: `Incident '${id}' not found.` }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (format === 'pdf') {
      const pdfBuffer = generateSanitizedPdfExport(incident);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="incident-${id}-sanitized.pdf"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    // Default: JSON export
    const jsonExport = generateSanitizedJsonExport(incident);
    return new NextResponse(jsonExport, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="incident-${id}-sanitized.json"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    const status = err.name === 'TenantIsolationViolationError' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Export failed.' }, { status });
  }
}
