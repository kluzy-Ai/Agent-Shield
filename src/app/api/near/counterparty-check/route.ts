import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/database';
import { defaultCounterpartyService } from '@/lib/near/counterparty-service';
import { getAuthContext } from '@/lib/db/session-helper';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const account = searchParams.get('account');
    const agentId = searchParams.get('agentId') || undefined;

    if (!account) {
      return NextResponse.json({ error: "Missing required parameter 'account'." }, { status: 400 });
    }

    const db = getDatabase();
    const auth = await getAuthContext(req).catch(() => null);

    const result = await defaultCounterpartyService.evaluateCounterparty(account, {
      agentId,
      workspaceId: auth?.user?.workspace?.id,
      db
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Counterparty evaluation failed.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId || body.counterparty;
    const agentId = body.agentId || undefined;
    const expectedIsContract = body.expectedIsContract === true;

    if (!accountId) {
      return NextResponse.json({ error: "Missing required field 'accountId'." }, { status: 400 });
    }

    const db = getDatabase();
    const auth = await getAuthContext(req).catch(() => null);

    const result = await defaultCounterpartyService.evaluateCounterparty(accountId, {
      agentId,
      workspaceId: auth?.user?.workspace?.id,
      expectedIsContract,
      db
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Counterparty check failed.' }, { status: 500 });
  }
}
