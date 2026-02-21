import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  HIERARCHY_PROMPT,
  MERGE_PROMPT,
  parseJsonSafe,
  normalizeCategoryTree,
} from '@/lib/analysis/classifier';
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import type { CategoryNode, UnifiedMessage } from '@/types';

const anthropic = new Anthropic();

// ─── 유틸: 배열에서 고르게 N개 샘플링 ───

function sampleEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  const step = arr.length / count;
  return Array.from({ length: count }, (_, i) => arr[Math.floor(i * step)]);
}

// 질문을 maxLen자로 잘라 토큰 절약 (분류에는 앞부분만 충분)
function truncateQuestions(questions: string[], maxLen = 80): string[] {
  return questions.map((q) =>
    q.length > maxLen ? q.slice(0, maxLen) + '…' : q
  );
}

// ─── LLM 호출 (재시도 최대 2회) ───

async function callLLM(prompt: string, maxRetries = 2): Promise<CategoryNode[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (response.content[0] as { type: string; text: string }).text;
      return parseJsonSafe(text);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw lastError ?? new Error('LLM 호출 실패');
}

// ─── POST /api/analyze ───
//
// mode=quick  : messages에서 250개 샘플 → 즉시 응답 (초기 태양계)
// mode=chunk  : questions 배열을 분류 → chunkTree 반환
// mode=merge  : chunkTrees 배열을 병합 → 최종 tree + planets 반환

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = 'quick',
      messages,
      questions,
      chunkTrees,
      planetCount = 8,
      totalQuestions = 0,
    } = body;

    // ── mode=chunk: 청크 하나 분류 ──
    if (mode === 'chunk') {
      const qs = truncateQuestions(
        (questions as string[]).filter((q: string) => q.length > 10)
      );
      if (qs.length === 0) {
        return NextResponse.json({ success: true, chunkTree: [] });
      }
      const tree = await callLLM(HIERARCHY_PROMPT(qs));
      return NextResponse.json({ success: true, chunkTree: tree });
    }

    // ── mode=merge: 청크 트리들 병합 ──
    if (mode === 'merge') {
      const trees = chunkTrees as CategoryNode[][];
      if (!trees || trees.length === 0) {
        return NextResponse.json(
          { error: 'chunkTrees 없음' },
          { status: 400 }
        );
      }
      if (trees.length === 1) {
        const normalized = normalizeCategoryTree(trees[0]);
        const planets = getPlanetsForCount(normalized, planetCount, totalQuestions);
        return NextResponse.json({
          success: true,
          tree: normalized,
          planets,
          metadata: { totalQuestions, planetCount },
        });
      }
      const merged = await callLLM(MERGE_PROMPT(trees));
      const normalized = normalizeCategoryTree(merged);
      const planets = getPlanetsForCount(normalized, planetCount, totalQuestions);
      return NextResponse.json({
        success: true,
        tree: normalized,
        planets,
        metadata: { totalQuestions, planetCount },
      });
    }

    // ── mode=quick (기본): 250개 샘플 → 즉시 태양계 ──
    const userQuestions = (messages as UnifiedMessage[])
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .filter((q) => q.length > 10);

    if (userQuestions.length === 0) {
      return NextResponse.json(
        { error: '분석할 질문이 없습니다' },
        { status: 400 }
      );
    }

    const sample = truncateQuestions(sampleEvenly(userQuestions, 150));
    const tree = await callLLM(HIERARCHY_PROMPT(sample));
    const normalized = normalizeCategoryTree(tree);
    const planets = getPlanetsForCount(normalized, planetCount, userQuestions.length);

    return NextResponse.json({
      success: true,
      tree: normalized,
      planets,
      metadata: { totalQuestions: userQuestions.length, planetCount },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
