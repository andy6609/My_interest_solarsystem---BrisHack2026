# 프로그레시브 분석 & Step 7 구현 변경사항

> 작성일: 2026-02-21

---

## 파일별 변경 내역

### 1. `src/app/api/analyze/route.ts`

**추가된 함수:**
```typescript
function sampleEvenly<T>(arr: T[], count: number): T[]
// 배열에서 고르게 N개 샘플링

function truncateQuestions(questions: string[], maxLen = 80): string[]
// 질문을 80자로 자르기 (토큰 절약)
```

**mode 파라미터 추가:**
| mode | 입력 | 동작 | 응답 |
|------|------|------|------|
| `quick` (기본) | `messages`, `planetCount` | 150개 샘플 → 단일 LLM 호출 | `{ tree, planets, metadata }` |
| `chunk` | `questions` | 전달받은 질문 분류 → 단일 LLM 호출 | `{ chunkTree }` |
| `merge` | `chunkTrees`, `planetCount`, `totalQuestions` | MERGE_PROMPT로 트리 병합 | `{ tree, planets, metadata }` |

**토큰 절약:**
- 모든 질문을 `truncateQuestions()`로 80자 제한
- quick 모드: 250개 → **150개** 샘플로 감소
  - 기존: ~30,000 토큰 (rate limit 초과)
  - 현재: ~18,000 토큰 (안전 여유)

---

### 2. `src/app/solar-system/page.tsx`

**Import 추가:**
```typescript
import { getPlanetsForCount } from '@/lib/analysis/hierarchy';
import { calculateVisuals } from '@/lib/analysis/visualMapper';
```

**Step 7: 슬라이더 콜백 구현 (핵심)**
```typescript
const handleCountChange = useCallback((newCount: number) => {
  setPlanetCount(newCount);
  if (categoryTree.length > 0 && totalQuestions > 0) {
    const newCategories = getPlanetsForCount(categoryTree, newCount, totalQuestions);
    const newPlanets = calculateVisuals(newCategories, totalQuestions);
    setPlanets(newPlanets);
  }
}, [categoryTree, totalQuestions, setPlanetCount, setPlanets]);
```

**변경된 이벤트 핸들러:**
```typescript
// 변경 전:
onCountChange={setPlanetCount}           // ← 상태만 변경, 행성 미재계산

// 변경 후:
onCountChange={handleCountChange}        // ← 행성 동적 재계산
```

**프로그레시브 분석 (Phase 1~3) 로직:**
- Phase 1: quick 모드로 150개 샘플 분석 → 즉시 태양계 렌더링
- Phase 2: 나머지 질문을 200개 청크로 분할 → 15초 간격 순차 호출 → `setAnalysisProgress` 업데이트
- Phase 3: chunkTrees merge → 최종 태양계 업데이트

**UI 추가:**
```typescript
<div className="absolute top-4 right-4 z-10">
  <AnalysisBadge progress={analysisProgress} />
</div>
```
우측 상단에 "정밀 분석 진행 중... N%" 뱃지 표시

---

### 3. `src/components/ui/AnalysisBadge.tsx` (새 파일)

**역할:** 프로그레시브 분석 진행률 표시

**상태:**
- `status: 'refining' | 'done'`
- `progress: 0~100` (퍼센트)
- `processedQuestions, totalQuestions` (몇 개 처리됨)

**UI:**
- "정밀 분석 진행 중..." (스피너 + 진행 바 + 퍼센트)
- "분석 완료 · 1009개 반영됨" (완료 후 4초 페이드아웃)

---

### 4. `PROGRESSIVE_ANALYSIS.md` (새 문서)

프로그레시브 분석의 전체 설계와 동작 흐름 문서화

---

### 5. `troubleshooting/progressive-analysis-issues.md` (새 문서)

구현 후 발견된 2가지 이슈 상세 기록:
- Issue 1: Phase 2 속도 느림 (8분 이상)
- Issue 2: 슬라이더 동작 불가 (Step 7 미구현)

---

## 핵심 개선사항

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 초기 태양계 표시 | API 호출 중 빈 화면 | ~5초 만에 150개 샘플로 즉시 렌더링 |
| 슬라이더 | 상태만 변경, 행성 미반영 | categoryTree에서 동적 재계산 |
| 토큰 사용 | ~30,000 (초과) | ~18,000 (여유) |
| 질문 길이 | 전체 (평균 ~120자) | 80자 제한 (분류 성능 동일) |

---

## 남은 작업

### Issue 1: Phase 2 속도 최적화
**현재:** 8분 이상
**개선 방법:**
- 청크 간 대기시간: 15초 → 10초 or 5초
- 청크 크기: 200 → 300
- Phase 2 병렬 호출 검토 (rate limit 허용 범위 내)

### Issue 2: 완료 ✓
슬라이더 동작 구현 완료

---

## 커밋 히스토리

| 커밋 ID | 메시지 |
|---------|--------|
| 9f4dc16 | Gemini Takeout 파서 교체 + Rate Limit 순차 호출 개선 |
| c7d227b | **프로그레시브 분석 + Step 7 슬라이더 구현** ← 현재 |
