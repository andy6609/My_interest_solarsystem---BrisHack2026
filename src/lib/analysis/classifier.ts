import type { CategoryNode } from '@/types';

// ─── 계층적 분류 프롬프트 ───

export const HIERARCHY_PROMPT = (questions: string[]) => `
You are classifying questions into a HIERARCHICAL category tree.

Create a 2-level hierarchy:
- Level 1: 4-5 BROAD categories
- Level 2: Each Level 1 category splits into 2-4 SPECIFIC sub-categories

Total leaf categories should be between 12-15.

RULES:
- Every question must belong to exactly one leaf category
- Category names should be concise (1-3 words, English)
- Categories should reflect the user's actual interests
- recentActivityScore: 0.0-1.0 (higher = more recent questions in this category)
- growthTrend: "rising" | "stable" | "declining"

QUESTIONS:
${questions.map((q, i) => `[${i}] ${q}`).join('\n')}

Respond in EXACT JSON format (no markdown, no code fences):
{
  "tree": [
    {
      "name": "Technology",
      "description": "2-3 sentence description",
      "questionIndices": [0, 1, 2],
      "representativeQuestions": ["question 1", "question 2", "question 3"],
      "subTopics": ["sub-topic-1", "sub-topic-2"],
      "recentActivityScore": 0.8,
      "growthTrend": "rising",
      "children": [
        {
          "name": "Frontend Development",
          "description": "...",
          "questionIndices": [0, 1],
          "representativeQuestions": ["question 1", "question 2"],
          "subTopics": ["React", "TypeScript"],
          "recentActivityScore": 0.9,
          "growthTrend": "rising",
          "children": []
        }
      ]
    }
  ]
}
`;

// ─── 2단계 병합 프롬프트 (500개 초과 시 사용) ───

export const MERGE_PROMPT = (chunkTrees: CategoryNode[][]) => `
You have classified a large set of questions in multiple batches.
Here are the category trees from each batch (represented as category names and counts):

${chunkTrees.map((tree, i) => `
Batch ${i + 1}:
${tree.map(n => `- ${n.name} (${n.questionIndices.length} questions)
  ${n.children?.map(c => `  - ${c.name} (${c.questionIndices.length} questions)`).join('\n  ') ?? ''}`).join('\n')}
`).join('\n')}

Merge these into a single coherent 2-level hierarchy:
- Level 1: 4-5 BROAD categories (consolidate similar ones from batches)
- Level 2: 2-4 sub-categories each
- Total leaf categories: 12-15

Use the most representative category names from the batches.
Combine questionIndices offsets are unknown — set questionIndices to empty arrays [].
Estimate recentActivityScore and growthTrend from the batch data.

Respond in EXACT JSON format (no markdown, no code fences):
{
  "tree": [
    {
      "name": "Technology",
      "description": "2-3 sentence description",
      "questionIndices": [],
      "representativeQuestions": ["representative question from batches"],
      "subTopics": ["sub-topic-1", "sub-topic-2"],
      "recentActivityScore": 0.8,
      "growthTrend": "rising",
      "children": [
        {
          "name": "Frontend Development",
          "description": "...",
          "questionIndices": [],
          "representativeQuestions": ["question 1"],
          "subTopics": ["React", "TypeScript"],
          "recentActivityScore": 0.9,
          "growthTrend": "rising",
          "children": []
        }
      ]
    }
  ]
}
`;

// ─── 유틸 ───

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function parseJsonSafe(text: string): CategoryNode[] {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.tree || [];
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.tree || [];
    }
    throw new Error('LLM 응답을 JSON으로 파싱할 수 없습니다');
  }
}

// id, depth 필드를 LLM 응답에 주입
export function normalizeCategoryTree(
  nodes: CategoryNode[],
  depth = 0,
  prefix = ''
): CategoryNode[] {
  return nodes.map((node, i) => {
    const id = prefix ? `${prefix}-${i}` : `cat-${i}`;
    return {
      ...node,
      id,
      depth,
      children: node.children?.length
        ? normalizeCategoryTree(node.children, depth + 1, id)
        : [],
    };
  });
}
