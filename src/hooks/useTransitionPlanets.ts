import { useState, useEffect, useRef, useCallback } from 'react';
import { planTransition } from '@/lib/animation/transitionMatcher';
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import type { CategoryNode, PlanetVisualData } from '@/types';

export interface PlanetSlot {
  id:        string;
  data:      PlanetVisualData;
  index:     number;
  entering:  boolean;
  exiting:   boolean;
}

interface Options {
  tree:            CategoryNode[];
  initialPlanets:  PlanetVisualData[];
  totalQuestions:  number;
  onPlanetsChange?: (planets: PlanetVisualData[]) => void; // 스토어 동기화 콜백
}

export function useTransitionPlanets({
  tree,
  initialPlanets,
  totalQuestions,
  onPlanetsChange,
}: Options) {
  const [slots, setSlots] = useState<PlanetSlot[]>(() =>
    initialPlanets.map((p, i) => ({
      id: p.id, data: p, index: i, entering: false, exiting: false,
    }))
  );
  const currentPlanets = useRef<PlanetVisualData[]>(initialPlanets);

  // changePlanetCount가 호출 직후 스토어 동기화로 인한 initialPlanets 변경을
  // 무시하기 위한 보호 플래그
  const skipNextInitialSync = useRef(false);

  // 외부 데이터 변경 시 동기화 (초기 로드, 프로그레시브 분석 완료)
  // 슬라이더 조작 직후에는 skipNextInitialSync로 건너뜀
  useEffect(() => {
    if (initialPlanets.length === 0) return;
    if (skipNextInitialSync.current) {
      skipNextInitialSync.current = false;
      return;
    }
    currentPlanets.current = initialPlanets;
    setSlots(initialPlanets.map((p, i) => ({
      id: p.id, data: p, index: i, entering: false, exiting: false,
    })));
  }, [initialPlanets]);

  // 행성 수 변경 → 전환 계획 실행
  const changePlanetCount = useCallback((newCount: number) => {
    if (!tree.length) return;

    const newPlanets = getPlanetsForCount(tree, newCount, totalQuestions);
    const plan       = planTransition(currentPlanets.current, newPlanets, tree);

    // 스토어 동기화 (LeftPanel 등 외부 UI 반영)
    onPlanetsChange?.(newPlanets);
    // 동기화로 인해 initialPlanets effect가 슬롯을 덮어쓰지 않도록 보호
    skipNextInitialSync.current = true;

    setSlots((prev) => {
      // 이전 exiting 슬롯을 즉시 제거 후 새 계획 적용
      // → 빠른 연속 슬라이더 조작 시 고아 슬롯 누적 방지
      const activePrev = prev.filter((s) => !s.exiting);

      const next: PlanetSlot[] = [];

      // persist — 기존 슬롯 data만 업데이트
      for (const { from, to } of plan.persist) {
        const existing = activePrev.find((s) => s.id === from.id);
        if (existing) {
          next.push({ ...existing, data: to, exiting: false, entering: false });
        }
      }

      // split — old 슬롯을 exiting + 새 슬롯을 entering
      for (const { from, to } of plan.split) {
        const existing = activePrev.find((s) => s.id === from.id);
        if (existing) next.push({ ...existing, exiting: true, entering: false });
        for (const child of to) {
          next.push({ id: child.id, data: child, index: next.length, entering: true, exiting: false });
        }
      }

      // merge — old 슬롯들을 exiting + 새 슬롯 entering
      for (const { from, to } of plan.merge) {
        for (const op of from) {
          const existing = activePrev.find((s) => s.id === op.id);
          if (existing) next.push({ ...existing, exiting: true, entering: false });
        }
        next.push({ id: to.id, data: to, index: next.length, entering: true, exiting: false });
      }

      // appear — 새 슬롯
      for (const np of plan.appear) {
        next.push({ id: np.id, data: np, index: next.length, entering: true, exiting: false });
      }

      // disappear — 기존 슬롯을 exiting
      for (const op of plan.disappear) {
        const existing = activePrev.find((s) => s.id === op.id);
        if (existing) next.push({ ...existing, exiting: true, entering: false });
      }

      // 인덱스 재정렬 (non-exiting만)
      let idx = 0;
      return next.map((s) => ({ ...s, index: s.exiting ? s.index : idx++ }));
    });

    currentPlanets.current = newPlanets;
  }, [tree, totalQuestions, onPlanetsChange]);

  // exiting 슬롯 제거 콜백
  const removeSlot = useCallback((id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { slots, changePlanetCount, removeSlot };
}
