import { Hono } from 'hono';
import { AnalysisCache } from '../services/cache';

type Bindings = {
  ANTHROPIC_API_KEY: string;
  ANALYSIS_CACHE: KVNamespace;
};

export const analyzeRoute = new Hono<{ Bindings: Bindings }>();

// ─── Types ───

interface CategoryNode {
  id: string;
  name: string;
  description: string;
  questionIndices: number[];
  subTopics: string[];
  representativeQuestions: string[];
  recentActivityScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  children: CategoryNode[];
  depth: number;
}

interface CategoryData {
  name: string;
  description: string;
  questionCount: number;
  representativeQuestions: string[];
  subTopics: string[];
  recentActivityScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
}

interface MoonData {
  id: string;
  name: string;
  orbitRadius: number;
  size: number;
}

interface PlanetVisualData {
  id: string;
  name: string;
  description: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  emissiveIntensity: number;
  tilt: number;
  questionCount: number;
  representativeQuestions: string[];
  subTopics: string[];
  moons: MoonData[];
  recentActivityScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
}

// ─── Constants ───

const PLANET_COLORS = [
  '#4FC3F7', '#FF7043', '#66BB6A', '#AB47BC', '#FFA726',
  '#EF5350', '#26C6DA', '#EC407A', '#8D6E63', '#78909C',
  '#FFEE58', '#5C6BC0', '#29B6F6', '#9CCC65', '#FF8A65',
];

// ─── Prompts ───

const HIERARCHY_PROMPT = (questions: string[]) => `
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

const MERGE_PROMPT = (chunkTrees: CategoryNode[][]) => `
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

// ─── Utils ───

function parseJsonSafe(text: string): CategoryNode[] {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed.tree || [];
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.tree || [];
    }
    throw new Error('Failed to parse LLM response as JSON');
  }
}

function normalizeCategoryTree(nodes: CategoryNode[], depth = 0, prefix = ''): CategoryNode[] {
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

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function calculateVisuals(categories: CategoryData[], totalQuestions: number): PlanetVisualData[] {
  const sorted = [...categories].sort((a, b) => b.questionCount - a.questionCount);
  return sorted.map((cat, index) => {
    const ratio = cat.questionCount / (totalQuestions || 1);
    const slug = toSlug(cat.name);
    const moons: MoonData[] = cat.subTopics.slice(0, 6).map((topic, i) => ({
      id: `moon-${slug}-${i}`,
      name: topic,
      orbitRadius: 0.8 + i * 0.4,
      size: 0.1,
    }));
    return {
      id: `planet-${slug}`,
      name: cat.name,
      description: cat.description,
      radius: 0.3 + ratio * 4.0,
      orbitRadius: 4 + (index / Math.max(sorted.length - 1, 1)) * 16,
      orbitSpeed: 0.5 / (1 + index * 0.3),
      color: PLANET_COLORS[index % PLANET_COLORS.length],
      emissiveIntensity: cat.recentActivityScore,
      tilt: (Math.random() - 0.5) * 0.4,
      questionCount: cat.questionCount,
      representativeQuestions: cat.representativeQuestions,
      subTopics: cat.subTopics,
      moons,
      recentActivityScore: cat.recentActivityScore,
      growthTrend: cat.growthTrend,
    };
  });
}

function getPlanetsForCount(tree: CategoryNode[], planetCount: number, totalQuestions: number): PlanetVisualData[] {
  const level1Count = tree.length;
  const level2Count = tree.reduce((sum, node) => sum + (node.children?.length || 0), 0);
  let selectedNodes: CategoryNode[];

  if (planetCount <= level1Count) {
    selectedNodes = [...tree].sort((a, b) => b.questionIndices.length - a.questionIndices.length).slice(0, planetCount);
  } else if (level2Count > 0 && planetCount < level2Count) {
    const result: CategoryNode[] = [];
    let remaining = planetCount;
    const sortedTree = [...tree].sort((a, b) => b.questionIndices.length - a.questionIndices.length);
    for (const parent of sortedTree) {
      if (remaining <= 0) break;
      const children = parent.children || [];
      if (children.length > 1 && children.length <= remaining) {
        result.push(...children);
        remaining -= children.length;
      } else {
        result.push(parent);
        remaining -= 1;
      }
    }
    selectedNodes = result;
  } else {
    selectedNodes = tree.flatMap((parent) => parent.children?.length ? parent.children : [parent]);
  }

  const categoryData = selectedNodes.map((node) => ({
    name: node.name,
    description: node.description,
    questionCount: node.questionIndices.length,
    representativeQuestions: node.representativeQuestions,
    subTopics: node.subTopics,
    recentActivityScore: node.recentActivityScore,
    growthTrend: node.growthTrend,
  }));

  return calculateVisuals(categoryData, totalQuestions);
}

function sampleEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr;
  const step = arr.length / count;
  return Array.from({ length: count }, (_, i) => arr[Math.floor(i * step)]);
}

function truncateQuestions(questions: string[], maxLen = 80): string[] {
  return questions.map((q) => q.length > maxLen ? q.slice(0, maxLen) + '…' : q);
}

// ─── LLM call ───

async function callLLM(apiKey: string, prompt: string, maxRetries = 2): Promise<CategoryNode[]> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        if (res.status === 429 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Claude API error: ${res.status}`);
      }

      const data = await res.json() as { content: { type: string; text: string }[] };
      return parseJsonSafe(data.content[0].text);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  throw lastError ?? new Error('LLM API Call Failed');
}

// ─── POST /analyze ───

analyzeRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { mode = 'quick', messages, questions, chunkTrees, planetCount = 8, totalQuestions = 0 } = body;
    const apiKey = c.env.ANTHROPIC_API_KEY;

    if (mode === 'chunk') {
      const qs = truncateQuestions((questions as string[]).filter((q: string) => q.length > 10));
      if (qs.length === 0) return c.json({ success: true, chunkTree: [] });
      const tree = await callLLM(apiKey, HIERARCHY_PROMPT(qs));
      return c.json({ success: true, chunkTree: tree });
    }

    if (mode === 'merge') {
      const trees = chunkTrees as CategoryNode[][];
      if (!trees || trees.length === 0) return c.json({ error: 'No chunkTrees found' }, 400);
      if (trees.length === 1) {
        const normalized = normalizeCategoryTree(trees[0]);
        const planets = getPlanetsForCount(normalized, planetCount, totalQuestions);
        return c.json({ success: true, tree: normalized, planets, metadata: { totalQuestions, planetCount } });
      }
      const mergeCache = new AnalysisCache(c.env.ANALYSIS_CACHE);
      const mergeKey = `final:${await mergeCache.generateKey(trees.map((t) => JSON.stringify(t)))}`;
      const cachedMerge = await mergeCache.get(mergeKey);
      if (cachedMerge) {
        console.log(`[cache] HIT: ${mergeKey.slice(0, 16)}...`);
        return c.json({ ...cachedMerge, fromCache: true });
      }
      const merged = await callLLM(apiKey, MERGE_PROMPT(trees));
      const normalized = normalizeCategoryTree(merged);
      const planets = getPlanetsForCount(normalized, planetCount, totalQuestions);
      const mergeResult = { success: true, tree: normalized, planets, metadata: { totalQuestions, planetCount } };
      await mergeCache.set(mergeKey, mergeResult);
      return c.json(mergeResult);
    }

    // mode=quick
    const userQuestions = (messages as { role: string; content: string }[])
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .filter((q) => q.length > 10);

    if (userQuestions.length === 0) return c.json({ error: 'No questions to analyze' }, 400);

    const cache = new AnalysisCache(c.env.ANALYSIS_CACHE);
    const cacheKey = await cache.generateKey(userQuestions);
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`[cache] HIT: ${cacheKey.slice(0, 16)}...`);
      return c.json({ ...cached, fromCache: true });
    }
    console.log(`[cache] MISS: ${cacheKey.slice(0, 16)}...`);

    const sample = truncateQuestions(sampleEvenly(userQuestions, 150));
    const tree = await callLLM(apiKey, HIERARCHY_PROMPT(sample));
    const normalized = normalizeCategoryTree(tree);
    const planets = getPlanetsForCount(normalized, planetCount, userQuestions.length);

    const result = { success: true, tree: normalized, planets, metadata: { totalQuestions: userQuestions.length, planetCount } };
    await cache.set(cacheKey, result);
    return c.json(result);
  } catch (error) {
    console.error('Analyze error:', error);
    return c.json({ error: 'Analysis failed', details: (error as Error).message }, 500);
  }
});
