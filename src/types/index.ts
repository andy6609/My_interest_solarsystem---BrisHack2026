// ============================================
// 통합 메시지 & 파싱 타입
// ============================================

export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
  platform: 'chatgpt' | 'claude' | 'gemini' | 'other';
  conversationId: string;
  conversationTitle?: string;
}

export interface ParsedData {
  messages: UnifiedMessage[];
  metadata: {
    platform: string;
    totalConversations: number;
    totalMessages: number;
    dateRange: { start: string; end: string };
  };
}

// ============================================
// 행성 & 태양계 시각화 타입
// ============================================

export interface MoonData {
  id: string;
  name: string;
  orbitRadius: number;
  size: number;
}

export interface PlanetVisualData {
  id: string;
  name: string;
  description: string;

  // 시각 매핑
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  emissiveIntensity: number;
  tilt: number;

  // 데이터
  questionCount: number;
  representativeQuestions: string[];
  subTopics: string[];
  moons: MoonData[];
  recentActivityScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
}

// ============================================
// 카테고리 계층 트리 타입
// ============================================

export interface CategoryNode {
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

export interface CategoryData {
  name: string;
  description: string;
  questionCount: number;
  representativeQuestions: string[];
  subTopics: string[];
  recentActivityScore: number;
  growthTrend: 'rising' | 'stable' | 'declining';
}

// ============================================
// API 응답 타입
// ============================================

export interface AnalyzeResponse {
  success: boolean;
  tree: CategoryNode[];
  planets: PlanetVisualData[];
  metadata: {
    totalQuestions: number;
    planetCount: number;
  };
}

export interface ParseResponse {
  success: boolean;
  data: ParsedData;
}

// ============================================
// 앱 상태 타입
// ============================================

export type AppPhase = 'landing' | 'uploading' | 'processing' | 'solar-system';

export interface SolarStore {
  phase: AppPhase;
  parsedData: ParsedData | null;
  categoryTree: CategoryNode[];
  planets: PlanetVisualData[];
  planetCount: number;
  selectedPlanet: PlanetVisualData | null;
  totalQuestions: number;

  setPhase: (phase: AppPhase) => void;
  setParsedData: (data: ParsedData) => void;
  setCategoryTree: (tree: CategoryNode[]) => void;
  setPlanets: (planets: PlanetVisualData[]) => void;
  setPlanetCount: (count: number) => void;
  setSelectedPlanet: (planet: PlanetVisualData | null) => void;
  setTotalQuestions: (count: number) => void;
  reset: () => void;
}
