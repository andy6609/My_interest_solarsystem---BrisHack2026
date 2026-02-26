export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { planets, metadata } = await req.json();
    // Step 9에서 구현 예정: html2canvas + Supabase Storage
    return NextResponse.json({
      success: true,
      message: 'Share feature coming in Step 9',
      planets,
      metadata,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Share failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
