import { NextRequest, NextResponse } from 'next/server';
import { getServerSideUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerSideUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { displayName } = await request.json();

    if (!displayName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Create profile via Firebase Cloud Function
    const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/createUserProfile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        displayName: displayName.trim(),
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create profile' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in create-profile API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}