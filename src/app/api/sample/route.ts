import { NextResponse } from 'next/server';

export const runtime = 'edge';
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import type { CategoryNode } from '@/types';

// ─── 헬퍼 ───

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

// ─── 샘플 CategoryNode 트리 ───
//
// 총 300개 질문, 6개 depth-0, 17개 depth-1
// recentActivityScore: Programming/Mathematics는 최근 30일 집중 → 높은 점수
// → emissiveIntensity(발광)에 반영되어 "가장 뜨거운 행성" 효과

const TOTAL_QUESTIONS = 300;

const sampleCategoryTree: CategoryNode[] = [
  // ── 1. Programming ──────────────────────────────────────────
  {
    id: 'cat-0',
    name: 'Programming',
    description: 'Software development, coding practices, and engineering tools across React, TypeScript, Python, and DevOps.',
    questionIndices: range(0, 100),
    subTopics: ['React', 'TypeScript', 'Python', 'DevOps', 'Git'],
    representativeQuestions: [
      'How do I implement useEffect with async functions in React?',
      'What is the difference between TypeScript interfaces and types?',
      'How to set up a CI/CD pipeline with GitHub Actions?',
    ],
    recentActivityScore: 0.92,
    growthTrend: 'rising',
    depth: 0,
    children: [
      {
        id: 'cat-0-0',
        name: 'React & Frontend',
        description: 'React hooks, component patterns, state management, and frontend architecture.',
        questionIndices: range(0, 35),
        subTopics: ['Hooks', 'Context API', 'Performance', 'Testing'],
        representativeQuestions: ['How do I implement useEffect with async functions in React?'],
        recentActivityScore: 0.95,
        growthTrend: 'rising',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-0-1',
        name: 'TypeScript & Python',
        description: 'Type systems, Python scripting, data processing, and modern language features.',
        questionIndices: range(35, 65),
        subTopics: ['Generics', 'Type Guards', 'Pandas', 'FastAPI'],
        representativeQuestions: ['What is the difference between TypeScript interfaces and types?'],
        recentActivityScore: 0.88,
        growthTrend: 'rising',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-0-2',
        name: 'DevOps & Infrastructure',
        description: 'CI/CD pipelines, Docker containers, cloud deployment, and system reliability.',
        questionIndices: range(65, 90),
        subTopics: ['Docker', 'GitHub Actions', 'AWS', 'Kubernetes'],
        representativeQuestions: ['How to set up a CI/CD pipeline with GitHub Actions?'],
        recentActivityScore: 0.82,
        growthTrend: 'rising',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-0-3',
        name: 'Git & Tooling',
        description: 'Version control workflows, monorepo strategy, and developer productivity tools.',
        questionIndices: range(90, 100),
        subTopics: ['Branching Strategy', 'Rebase', 'Monorepo', 'Vim'],
        representativeQuestions: ['What is the difference between git merge and git rebase?'],
        recentActivityScore: 0.65,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
    ],
  },

  // ── 2. Mathematics ──────────────────────────────────────────
  {
    id: 'cat-1',
    name: 'Mathematics',
    description: 'Statistics, algorithms, linear algebra, and mathematical foundations of machine learning.',
    questionIndices: range(100, 160),
    subTopics: ['Statistics', 'Algorithms', 'Linear Algebra', 'ML Math'],
    representativeQuestions: [
      'What is the time complexity of quicksort?',
      'How does gradient descent work in machine learning?',
      'Explain Bayes theorem with a practical example.',
    ],
    recentActivityScore: 0.85,
    growthTrend: 'rising',
    depth: 0,
    children: [
      {
        id: 'cat-1-0',
        name: 'Statistics & Probability',
        description: 'Probability theory, distributions, statistical inference, and hypothesis testing.',
        questionIndices: range(100, 125),
        subTopics: ['Probability', 'Distributions', 'Hypothesis Testing', 'Bayesian'],
        representativeQuestions: ['Explain Bayes theorem with a practical example.'],
        recentActivityScore: 0.88,
        growthTrend: 'rising',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-1-1',
        name: 'Algorithms & Data Structures',
        description: 'Sorting, searching, trees, graphs, and computational complexity analysis.',
        questionIndices: range(125, 150),
        subTopics: ['Sorting', 'Trees', 'Graphs', 'Dynamic Programming'],
        representativeQuestions: ['What is the time complexity of quicksort?'],
        recentActivityScore: 0.82,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-1-2',
        name: 'ML Mathematics',
        description: 'Mathematical foundations for machine learning including gradient descent and linear algebra.',
        questionIndices: range(150, 160),
        subTopics: ['Gradient Descent', 'Loss Functions', 'Backpropagation', 'Eigenvalues'],
        representativeQuestions: ['How does gradient descent work in machine learning?'],
        recentActivityScore: 0.78,
        growthTrend: 'rising',
        depth: 1,
        children: [],
      },
    ],
  },

  // ── 3. Design ───────────────────────────────────────────────
  {
    id: 'cat-2',
    name: 'Design',
    description: 'UI/UX design principles, Figma workflows, color theory, and design systems.',
    questionIndices: range(160, 195),
    subTopics: ['UI/UX', 'Figma', 'Color Theory', 'Design Systems'],
    representativeQuestions: [
      'What are the core principles of good UI design?',
      'How to create a design system in Figma?',
      'What is the 60-30-10 color rule?',
    ],
    recentActivityScore: 0.45,
    growthTrend: 'stable',
    depth: 0,
    children: [
      {
        id: 'cat-2-0',
        name: 'UI/UX Design',
        description: 'User interface design principles, accessibility, user research, and wireframing.',
        questionIndices: range(160, 180),
        subTopics: ['Accessibility', 'User Research', 'Wireframing', 'Prototyping'],
        representativeQuestions: ['What are the core principles of good UI design?'],
        recentActivityScore: 0.5,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-2-1',
        name: 'Figma & Visual Design',
        description: 'Figma components, auto layout, color systems, and design-to-dev handoff.',
        questionIndices: range(180, 195),
        subTopics: ['Components', 'Auto Layout', 'Color Palettes', 'Dev Mode'],
        representativeQuestions: ['How to create a design system in Figma?'],
        recentActivityScore: 0.4,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
    ],
  },

  // ── 4. Health & Lifestyle ───────────────────────────────────
  {
    id: 'cat-3',
    name: 'Health & Lifestyle',
    description: 'Exercise, nutrition, sleep optimization, cooking, and physical wellness.',
    questionIndices: range(195, 235),
    subTopics: ['Exercise', 'Nutrition', 'Sleep', 'Cooking'],
    representativeQuestions: [
      'What is the best workout routine for muscle gain?',
      'How much protein should I eat per day?',
      'How to improve sleep quality naturally?',
    ],
    recentActivityScore: 0.55,
    growthTrend: 'stable',
    depth: 0,
    children: [
      {
        id: 'cat-3-0',
        name: 'Exercise & Fitness',
        description: 'Workout routines, strength training, cardio, and sports performance.',
        questionIndices: range(195, 210),
        subTopics: ['Strength Training', 'Cardio', 'Stretching', 'Recovery'],
        representativeQuestions: ['What is the best workout routine for muscle gain?'],
        recentActivityScore: 0.6,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-3-1',
        name: 'Nutrition & Diet',
        description: 'Macronutrients, meal planning, supplements, and healthy eating strategies.',
        questionIndices: range(210, 222),
        subTopics: ['Protein', 'Macros', 'Meal Prep', 'Supplements'],
        representativeQuestions: ['How much protein should I eat per day?'],
        recentActivityScore: 0.55,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-3-2',
        name: 'Sleep & Recovery',
        description: 'Sleep hygiene, circadian rhythms, and recovery techniques.',
        questionIndices: range(222, 229),
        subTopics: ['Sleep Hygiene', 'Circadian Rhythm', 'Napping', 'Stress'],
        representativeQuestions: ['How to improve sleep quality naturally?'],
        recentActivityScore: 0.45,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-3-3',
        name: 'Cooking & Food',
        description: 'Cooking techniques, recipes, world cuisines, and food science.',
        questionIndices: range(229, 235),
        subTopics: ['Techniques', 'Recipes', 'Cuisines', 'Food Science'],
        representativeQuestions: ['What is the Maillard reaction in cooking?'],
        recentActivityScore: 0.35,
        growthTrend: 'declining',
        depth: 1,
        children: [],
      },
    ],
  },

  // ── 5. Culture & Language ───────────────────────────────────
  {
    id: 'cat-4',
    name: 'Culture & Language',
    description: 'Music theory, travel planning, English learning, and world cultures.',
    questionIndices: range(235, 270),
    subTopics: ['Music', 'Travel', 'English', 'Arts'],
    representativeQuestions: [
      'How do I learn music theory from scratch?',
      'What are the must-see places in Japan?',
      'How to improve my English writing skills?',
    ],
    recentActivityScore: 0.3,
    growthTrend: 'declining',
    depth: 0,
    children: [
      {
        id: 'cat-4-0',
        name: 'Music & Arts',
        description: 'Music theory, instruments, composition, and artistic expression.',
        questionIndices: range(235, 247),
        subTopics: ['Music Theory', 'Chords', 'Composition', 'Instruments'],
        representativeQuestions: ['How do I learn music theory from scratch?'],
        recentActivityScore: 0.35,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-4-1',
        name: 'Travel & Geography',
        description: 'Travel destinations, trip planning, cultural experiences, and geography.',
        questionIndices: range(247, 259),
        subTopics: ['Asia', 'Europe', 'Trip Planning', 'Budget Travel'],
        representativeQuestions: ['What are the must-see places in Japan?'],
        recentActivityScore: 0.25,
        growthTrend: 'declining',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-4-2',
        name: 'English Learning',
        description: 'Grammar, vocabulary building, writing skills, and language acquisition.',
        questionIndices: range(259, 270),
        subTopics: ['Grammar', 'Vocabulary', 'Writing', 'Speaking'],
        representativeQuestions: ['How to improve my English writing skills?'],
        recentActivityScore: 0.3,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
    ],
  },

  // ── 6. Mind & Business ─────────────────────────────────────
  {
    id: 'cat-5',
    name: 'Mind & Business',
    description: 'Startup strategy, philosophy, psychology, and personal productivity.',
    questionIndices: range(270, 300),
    subTopics: ['Startup', 'Philosophy', 'Psychology', 'Productivity'],
    representativeQuestions: [
      'What is the lean startup methodology?',
      'How does cognitive bias affect decision-making?',
      'How to stay focused and avoid procrastination?',
    ],
    recentActivityScore: 0.4,
    growthTrend: 'stable',
    depth: 0,
    children: [
      {
        id: 'cat-5-0',
        name: 'Startup & Business',
        description: 'Entrepreneurship, product strategy, go-to-market planning, and fundraising.',
        questionIndices: range(270, 285),
        subTopics: ['MVP', 'Validation', 'GTM Strategy', 'Fundraising'],
        representativeQuestions: ['What is the lean startup methodology?'],
        recentActivityScore: 0.45,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-5-1',
        name: 'Philosophy & Psychology',
        description: 'Philosophical frameworks, cognitive science, decision theory, and human behavior.',
        questionIndices: range(285, 295),
        subTopics: ['Stoicism', 'Cognitive Bias', 'Decision Theory', 'Ethics'],
        representativeQuestions: ['How does cognitive bias affect decision-making?'],
        recentActivityScore: 0.35,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
      {
        id: 'cat-5-2',
        name: 'Productivity',
        description: 'Focus techniques, time management, habit formation, and personal efficiency.',
        questionIndices: range(295, 300),
        subTopics: ['Deep Work', 'Pomodoro', 'Habits', 'Goal Setting'],
        representativeQuestions: ['How to stay focused and avoid procrastination?'],
        recentActivityScore: 0.4,
        growthTrend: 'stable',
        depth: 1,
        children: [],
      },
    ],
  },
];

// ─── GET ───

export async function GET() {
  // planets를 tree에서 동적 생성 → tree와 항상 일관성 보장
  const planets = getPlanetsForCount(sampleCategoryTree, 6, TOTAL_QUESTIONS);

  return NextResponse.json({
    success: true,
    tree: sampleCategoryTree,
    planets,
    metadata: {
      totalQuestions: TOTAL_QUESTIONS,
      planetCount: 6,
      isSample: true,
      userName: 'andy',
    },
  });
}
