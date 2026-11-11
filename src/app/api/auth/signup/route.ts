import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { signUp } from '@/lib/db/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, workspaceName, environment } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required fields.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters in length.' },
        { status: 400 }
      );
    }

    const db = await getInitializedDatabase();
    const user = await signUp(db, {
      name,
      email,
      password,
      workspaceName,
      environment
    });

    const res = NextResponse.json({
      success: true,
      user
    });

    res.cookies.set('agent_shield_session', user.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Sign up failed.' },
      { status: 400 }
    );
  }
}
