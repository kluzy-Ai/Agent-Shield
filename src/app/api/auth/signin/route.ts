import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { signIn } from '@/lib/db/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const db = await getInitializedDatabase();
    const user = await signIn(db, { email, password });

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
      { error: err.message || 'Invalid credentials.' },
      { status: 401 }
    );
  }
}
