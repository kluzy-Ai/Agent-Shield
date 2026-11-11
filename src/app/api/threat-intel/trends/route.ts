import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/database';
import { TenantAccessLayer } from '@/lib/db/access-layer';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const trendsData = TenantAccessLayer.getThreatTrendsAndAnalytics(db);
    return NextResponse.json(trendsData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch threat trends.' }, { status: 500 });
  }
}

