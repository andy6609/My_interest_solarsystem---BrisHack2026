# Progressive Analysis 구현 후 발견된 이슈

> 작성일: 2026-02-21

---

## 이슈 1: 정밀 분석(Phase 2) 속도 느림

### 증상
- Phase 1 (Quick): ~5초 완료 (150개 샘플)
- Phase 2 (Background Refinement): **8분 이상 소요** (32% 처리)
- 청크 간 15초 대기로 인한 누적 지연

### 원인
```
1009개 질문 / 200개 청크 = 5청크
청크 간 대기: 15초 × 5 = 75초
각 API 응답시간: ~20초 × 5 = 100초
Phase 3 merge 전 대기: 15초
합계: ~190초 (~3분) 이상

실제 관측: ~8분 이상
→ API 응답 시간이 예상보다 훨씬 길거나 다른 병목 존재
```

### 관련 파일
| 파일 | 라인 |
|------|------|
| `src/app/api/analyze/route.ts` | 청크 크기, 토큰 계산 |
| `src/app/solar-system/page.tsx` | Phase 2 루프, sleep(15000) |

### 개선 아이디어
- 청크 간 대기시간 조정 (15초 → 10초 or 5초)
- 청크 크기 증가 (200 → 300) → 청크 수 감소
- Phase 2 시작 지점 재검토 (Phase 1 완료 후 즉시? vs 사용자 대기?)

---

## 이슈 2: 행성 개수 슬라이더 동작 불가 ✅ 해결됨 (2026-02-21)

### 증상
1. 슬라이더로 행성 개수 조절 → **행성이 바뀌지 않음** (개수도 궤적도 동일)
2. 왼쪽 패널 행성 목록 → **항상 고정된 6개만 표시**
3. 기대: 슬라이더 변경 시 매끄럽게 행성 enter/exit 애니메이션

### 근본 원인
`src/app/solar-system/page.tsx`에서:
```typescript
const handleCountChange = setPlanetCount;  // ← 상태만 변경
// 누락: getPlanetsForCount(categoryTree, count) → calculateVisuals() → setPlanets()
```

**슬라이더 변경 흐름이 끊어짐:**
```
현재:
  setPlanetCount(newCount)
    ↓ (Zustand 상태만 업데이트)
  [행성 재계산 안 함]

필요:
  setPlanetCount(newCount)
    ↓
  getPlanetsForCount(categoryTree, newCount, totalQuestions)
    ↓
  calculateVisuals()
    ↓
  setPlanets(newPlanets)  ← 이 단계가 누락됨
```

### 관련 파일

| 파일 | 역할 | 문제 |
|------|------|------|
| `src/app/solar-system/page.tsx` | 슬라이더 이벤트 핸들러 | **setPlanetCount만 호출** |
| `src/lib/analysis/hierarchy.ts` | `getPlanetsForCount()` 정의 | 미호출 |
| `src/lib/analysis/visualMapper.ts` | `calculateVisuals()` 정의 | 미호출 |
| `src/lib/store/useSolarStore.ts` | `categoryTree`, `planets` 상태 | 동기화 안 됨 |
| `src/hooks/useTransitionPlanets.ts` | 행성 enter/exit 애니메이션 | planets 배열이 변경되지 않으면 작동 불가 |
| `src/components/ui/LeftPanel.tsx` | 왼쪽 패널 행성 목록 | `planets` 배열 기반 → 항상 초기값 |
| `src/components/three/SolarSystem.tsx` | Canvas 렌더링 | `planets` 배열 기반 → 업데이트 안 됨 |

### Step 7 (완료 — 상세 기록: `step7-sample-slider.md`)

기존 AI_CONTEXT.md의 Step 7 설명:
```
슬라이더 변경 시 API 재호출 없이 프론트에서 즉시 계산:
planetCount ≤ Level1 개수(~5)  → 대분류 노드만 사용
planetCount < Level2 개수(~14) → 큰 카테고리부터 하위로 분할 (하이브리드)
planetCount ≥ Level2 개수      → 전체 세분류 사용

구현: src/lib/analysis/hierarchy.ts → getPlanetsForCount(tree, count, totalQuestions)
```

이 구현은 **코드 상으로만 준비**되어 있고, **page.tsx에서 호출하지 않음**.

---

## 해결 방법 (Step 7 구현)

`solar-system/page.tsx`에서 슬라이더 변경 시 콜백 수정:

```typescript
// 변경 전 (현재):
const handleCountChange = setPlanetCount;

// 변경 후 (필요):
const handleCountChange = (newCount: number) => {
  setPlanetCount(newCount);

  if (categoryTree.length > 0 && totalQuestions > 0) {
    const newPlanets = getPlanetsForCount(categoryTree, newCount, totalQuestions);
    const visualPlanets = calculateVisuals(newPlanets);
    setPlanets(visualPlanets);
  }
};
```

import 추가 필요:
```typescript
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import { calculateVisuals } from '@/lib/analysis/visualMapper';
```

---

## 정리

| 이슈 | 심각도 | 상태 | 해결 방법 |
|------|--------|------|----------|
| Phase 2 느림 | 중간 | 미해결 | 청크 간 대기시간 조정 검토 필요 |
| 슬라이더 동작 안 함 | **높음** | ✅ 완료 | `/api/sample`에 `tree` 추가 + `setCategoryTree` 호출 |
