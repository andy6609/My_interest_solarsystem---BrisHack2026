'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSolarStore } from '@/lib/store/useSolarStore';
import { LoadingSequence } from '@/components/ui/LoadingSequence';
import { SolarSystem } from '@/components/three/SolarSystem';
import { PlanetCountSlider } from '@/components/ui/PlanetCountSlider';
import { AnimatedPanel } from '@/components/ui/AnimatedPanel';
import { LeftPanel } from '@/components/ui/LeftPanel';
import { RightPanel } from '@/components/ui/RightPanel';
import { AnalysisBadge, type AnalysisProgress } from '@/components/ui/AnalysisBadge';
import type { PlanetVisualData } from '@/types';

// ─── 유틸 ───

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── 페이지 ───

export default function SolarSystemPage() {
  const searchParams = useSearchParams();
  const isSample = searchParams.get('sample') === 'true';

  const {
    phase,
    parsedData,
    planets,
    categoryTree,
    planetCount,
    totalQuestions,
    selectedPlanet,
    setPhase,
    setPlanets,
    setCategoryTree,
    setTotalQuestions,
    setPlanetCount,
    setSelectedPlanet,
  } = useSolarStore();

  const [loadingStep, setLoadingStep] = useState('parse');
  const [error, setError] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const hasAnalyzed = useRef(false);

  useEffect(() => {
    if (hasAnalyzed.current) return;

    if (isSample) {
      hasAnalyzed.current = true;
      loadSample();
    } else if (phase === 'processing' && parsedData) {
      hasAnalyzed.current = true;
      analyzeData();
    } else if (planets.length > 0) {
      setPhase('solar-system');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSample, phase, parsedData]);

  const handlePlanetClick = (planet: PlanetVisualData) => {
    setSelectedPlanet(planet);
  };

  const handleDeselect = () => {
    setSelectedPlanet(null);
  };

  // 슬라이더 변경 시 planetCount만 업데이트.
  // 실제 행성 전환(exit/enter 애니메이션)은 SolarSystem → useTransitionPlanets가 전담.
  const handleCountChange = useCallback((newCount: number) => {
    setPlanetCount(newCount);
  }, [setPlanetCount]);

  // ── 샘플 데이터 로드 ──

  const loadSample = async () => {
    setLoadingStep('map');
    try {
      const res = await fetch('/api/sample');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setLoadingStep('render');
      if (json.tree) setCategoryTree(json.tree);
      setPlanets(json.planets);
      setTotalQuestions(json.metadata.totalQuestions);
      await sleep(600);
      setPhase('solar-system');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ── 프로그레시브 분석 ──

  const analyzeData = async () => {
    if (!parsedData) return;

    try {
      // 유저 질문 추출
      const userQuestions = parsedData.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .filter((q) => q.length > 10);

      // ──────────────────────────────────────
      // Phase 1: Quick Analysis (250개 샘플)
      // ──────────────────────────────────────
      setLoadingStep('classify');

      const quickRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: parsedData.messages,
          planetCount,
          mode: 'quick',
        }),
      });

      const quickJson = await quickRes.json();
      if (!quickRes.ok || !quickJson.success) {
        throw new Error(quickJson.details || quickJson.error);
      }

      // 즉시 태양계 렌더링
      setLoadingStep('render');
      setCategoryTree(quickJson.tree);
      setPlanets(quickJson.planets);
      setTotalQuestions(quickJson.metadata.totalQuestions);
      await sleep(400);
      setPhase('solar-system');

      // 질문이 150개 이하면 추가 분석 불필요
      if (userQuestions.length <= 150) return;

      // ──────────────────────────────────────
      // Phase 2: Background Refinement (전체 청크)
      // ──────────────────────────────────────
      setAnalysisProgress({
        status: 'refining',
        progress: 0,
        processedQuestions: 0,
        totalQuestions: userQuestions.length,
      });

      const chunks = chunkArray(userQuestions, 200);
      const chunkTrees: unknown[][] = [];

      for (let i = 0; i < chunks.length; i++) {
        // rate limit 안전 간격 (첫 청크 전에도 대기 — Phase 1과의 간격)
        await sleep(15000);

        try {
          const chunkRes = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: chunks[i],
              mode: 'chunk',
            }),
          });

          const chunkJson = await chunkRes.json();
          if (chunkRes.ok && chunkJson.success && chunkJson.chunkTree?.length) {
            chunkTrees.push(chunkJson.chunkTree);
          }
        } catch {
          // 개별 청크 실패 시 무시하고 계속 진행
          console.warn(`Chunk ${i + 1} failed, skipping...`);
        }

        const processed = Math.min((i + 1) * 200, userQuestions.length);
        const progress = Math.round(((i + 1) / chunks.length) * 80);

        setAnalysisProgress({
          status: 'refining',
          progress,
          processedQuestions: processed,
          totalQuestions: userQuestions.length,
        });
      }

      // 청크 결과가 없으면 Quick 결과 유지
      if (chunkTrees.length === 0) {
        setAnalysisProgress({
          status: 'done',
          progress: 100,
          processedQuestions: userQuestions.length,
          totalQuestions: userQuestions.length,
        });
        return;
      }

      // ──────────────────────────────────────
      // Phase 3: Final Merge
      // ──────────────────────────────────────
      setAnalysisProgress({
        status: 'refining',
        progress: 90,
        processedQuestions: userQuestions.length,
        totalQuestions: userQuestions.length,
      });

      await sleep(15000); // merge 호출 전 rate limit 대기

      const mergeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkTrees,
          planetCount,
          totalQuestions: userQuestions.length,
          mode: 'merge',
        }),
      });

      const mergeJson = await mergeRes.json();
      if (mergeRes.ok && mergeJson.success) {
        setCategoryTree(mergeJson.tree);
        setPlanets(mergeJson.planets);
        setTotalQuestions(mergeJson.metadata.totalQuestions);
      }

      setAnalysisProgress({
        status: 'done',
        progress: 100,
        processedQuestions: userQuestions.length,
        totalQuestions: userQuestions.length,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ── 에러 ──

  if (error) {
    return (
      <div className="min-h-screen bg-space-bg flex flex-col items-center justify-center text-white gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-400 text-sm max-w-xs text-center">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 rounded-xl border border-white/20 text-gray-400 hover:bg-white/10 transition-colors text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── 로딩 ──

  if (phase !== 'solar-system') {
    const questionCount = parsedData?.messages.filter((m) => m.role === 'user').length;
    return <LoadingSequence currentStep={loadingStep} questionCount={questionCount} />;
  }

  // ── 태양계 뷰 ──

  return (
    <div className="relative w-screen h-screen bg-space-bg overflow-hidden">

      {/* ── 3D 캔버스 (항상 전체 화면, 패널 영향 없음) ── */}
      <SolarSystem
        planets={planets}
        categoryTree={categoryTree}
        totalQuestions={totalQuestions}
        planetCount={planetCount}
        selectedPlanet={selectedPlanet}
        onPlanetClick={handlePlanetClick}
        onDeselect={handleDeselect}
        onPlanetsChange={setPlanets}
      />

      {/* 왼쪽 패널 토글 버튼 */}
      <button
        onClick={() => setLeftOpen((v) => !v)}
        className="absolute top-[90%] -translate-y-1/2 left-0 z-50
          w-6 h-16 flex items-center justify-center
          bg-white/10 backdrop-blur-md border border-white/20 border-l-0
          text-gray-300 hover:text-white hover:bg-white/20 transition-all
          rounded-r-xl"
        title={leftOpen ? '패널 닫기' : '패널 열기'}
      >
        {leftOpen ? '◀' : '▶'}
      </button>

      {/* 프로그레시브 분석 뱃지 — 우측 상단 */}
      <div className="absolute top-4 right-4 z-10">
        <AnalysisBadge progress={analysisProgress} />
      </div>

      {/* 행성 수 슬라이더 — 하단 중앙 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <PlanetCountSlider value={planetCount} onChange={handleCountChange} />
      </div>

      {/* ── 왼쪽 패널 (절대 오버레이, 캔버스 크기 무영향) ── */}
      <AnimatedPanel isOpen={leftOpen} side="left" width="w-72">
        <LeftPanel
          planets={planets}
          parsedData={parsedData}
          totalQuestions={totalQuestions}
          planetCount={planetCount}
          selectedPlanet={selectedPlanet}
          onPlanetSelect={handlePlanetClick}
        />
      </AnimatedPanel>

      {/* ── 오른쪽 패널 (절대 오버레이, 캔버스 크기 무영향) ── */}
      <AnimatedPanel isOpen={!!selectedPlanet} side="right" width="w-80">
        <RightPanel planet={selectedPlanet} onClose={handleDeselect} />
      </AnimatedPanel>

    </div>
  );
}
