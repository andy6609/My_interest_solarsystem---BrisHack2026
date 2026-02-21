import { useState, useEffect, useRef } from 'react';
import { planTransition } from '@/lib/animation/transitionMatcher';
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import type { CategoryNode, PlanetVisualData } from '@/types';

export interface PlanetSlot {
  id:        string;           // 고유 슬롯 ID
  data:      PlanetVisualData;
  index:     number;
  entering:  boolean;
  exiting:   boolean;
}

interface Options {
  tree:           CategoryNode[];
  initialPlanets: PlanetVisualData[];
  totalQuestions: number;
}

export function useTransitionPlanets({ tree, initialPlanets, totalQuestions }: Options) {
  const [slots, setSlots]   = useState<PlanetSlot[]>(() =>
    initialPlanets.map((p, i) => ({
      id: p.id, data: p, index: i, entering: false, exiting: false,
    }))
  );
  const currentPlanets = useRef<PlanetVisualData[]>(initialPlanets);

  // 외부에서 initialPlanets 변경 시 (첫 로드 등) 동기화
  useEffect(() => {
    if (initialPlanets.length === 0) return;
    currentPlanets.current = initialPlanets;
    setSlots(initialPlanets.map((p, i) => ({
      id: p.id, data: p, index: i, entering: false, exiting: false,
    })));
  }, [initialPlanets]);

  // 행성 수 변경 → 전환 계획 실행
  const changePlanetCount = (newCount: number) => {
    if (!tree.length) return;

    const newPlanets = getPlanetsForCount(tree, newCount, totalQuestions);
    const plan       = planTransition(currentPlanets.current, newPlanets, tree);

    setSlots((prev) => {
      const next: PlanetSlot[] = [];
      const total = newPlanets.length;

      // persist — 기존 슬롯 data만 업데이트
      for (const { from, to } of plan.persist) {
        const existing = prev.find((s) => s.id === from.id);
        if (existing) {
          next.push({ ...existing, data: to, exiting: false, entering: false });
        }
      }

      // split — old 슬롯을 exiting으로 + 새 슬롯을 entering으로
      for (const { from, to } of plan.split) {
        const existing = prev.find((s) => s.id === from.id);
        if (existing) next.push({ ...existing, exiting: true, entering: false });
        for (const child of to) {
          next.push({ id: child.id, data: child, index: next.length, entering: true, exiting: false });
        }
      }

      // merge — old 슬롯들을 exiting + 새 슬롯 entering
      for (const { from, to } of plan.merge) {
        for (const op of from) {
          const existing = prev.find((s) => s.id === op.id);
          if (existing) next.push({ ...existing, exiting: true, entering: false });
        }
        next.push({ id: to.id, data: to, index: next.length, entering: true, exiting: false });
      }

      // appear — 새 슬롯
      for (const np of plan.appear) {
        next.push({ id: np.id, data: np, index: next.length, entering: true, exiting: false });
      }

      // disappear — 기존 슬롯을 exiting으로
      for (const op of plan.disappear) {
        const existing = prev.find((s) => s.id === op.id);
        if (existing) next.push({ ...existing, exiting: true, entering: false });
      }

      // 인덱스 재정렬 (non-exiting만)
      let idx = 0;
      return next.map((s) => ({ ...s, index: s.exiting ? s.index : idx++, total }));
    });

    currentPlanets.current = newPlanets;
  };

  // exiting 슬롯 제거 콜백
  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  return { slots, changePlanetCount, removeSlot };
}
