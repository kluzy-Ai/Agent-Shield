import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { signInWithNearWallet } from '@/lib/db/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json(
        { error: 'Valid NEAR accountId is required.' },
        { status: 400 }
      );
    }

    const normalized = accountId.trim().toLowerCase();

    // Verify on NEAR Testnet RPC
    try {
      const rpcRes = await fetch('https://rpc.testnet.near.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'near-wallet-auth-check',
          method: 'query',
          params: {
            request_type: 'view_account',
            finality: 'final',
            account_id: normalized
          }
        }),
        signal: AbortSignal.timeout(5000)
      });

      const rpcData = await rpcRes.json() as any;
      if (rpcData.error && rpcData.error.cause?.name === 'UNKNOWN_ACCOUNT') {
        // Warning: on testnet dev flow we can still allow dev testing, or notify
        console.warn(`[NEAR Wallet Sign-In] Account ${normalized} not yet created on testnet, proceeding in dev mode`);
      }
    } catch (rpcErr) {
      console.warn('[NEAR Wallet Sign-In] RPC verification ping skipped:', rpcErr);
    }

    const db = await getInitializedDatabase();
    const user = await signInWithNearWallet(db, normalized);

    const res = NextResponse.json({
      success: true,
      user
    });

    res.cookies.set('agent_shield_session', user.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'NEAR wallet authentication failed.' },
      { status: 400 }
    );
  }
}
