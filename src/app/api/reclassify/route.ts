import { NextRequest, NextResponse } from 'next/server';
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import type { CategoryNode } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { tree, planetCount, totalQuestions } = await req.json();

    if (!tree || !planetCount) {
      return NextResponse.json(
        { error: 'tree와 planetCount가 필요합니다' },
        { status: 400 }
      );
    }

    const planets = getPlanetsForCount(
      tree as CategoryNode[],
      planetCount,
      totalQuestions || 0
    );

    return NextResponse.json({ success: true, planets });
  } catch (error) {
    return NextResponse.json(
      { error: 'Reclassify failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
