# Step 7: 샘플 데이터 슬라이더 완전 구현

> 작성일: 2026-02-21
> 관련 이슈: `progressive-analysis-issues.md` → 이슈 2 (슬라이더 동작 불가) 해결 기록

---

## 1. 문제 요약

`/solar-system?sample=true` 경로에서 행성 수 슬라이더를 조작해도 행성이 변경되지 않았다.

**기대 동작:**
- 슬라이더 5 → 행성 5개 (대분류: Programming, Mathematics, Design, Health, Business)
- 슬라이더 12 → 행성 12개 (대분류 + 일부 중분류 혼합)
- 슬라이더 20 → 행성 20개 (전체 중분류)

**실제 동작:**
- 슬라이더를 어떻게 움직여도 행성 개수 고정 (변경 없음)
- `useTransitionPlanets`의 enter/exit 애니메이션도 발생하지 않음
- 왼쪽 패널 행성 목록도 항상 동일한 5개만 표시

---

## 2. 근본 원인 분석

### 2-1. 슬라이더 콜백 흐름

`page.tsx`의 `handleCountChange`는 이미 올바르게 구현되어 있었다:

```typescript
// src/app/solar-system/page.tsx (기존 코드)
const handleCountChange = useCallback((newCount: number) => {
  setPlanetCount(newCount);
  if (categoryTree.length > 0 && totalQuestions > 0) {  // ← 핵심 가드
    const newCategories = getPlanetsForCount(categoryTree, newCount, totalQuestions);
    const newPlanets = calculateVisuals(newCategories, totalQuestions);
    setPlanets(newPlanets);
  }
}, [categoryTree, totalQuestions, setPlanetCount, setPlanets]);
```

`categoryTree.length > 0` 조건이 **항상 false**였기 때문에 행성 재계산이 통째로 스킵되었다.

### 2-2. categoryTree가 비어있는 이유

`loadSample()`을 보면:

```typescript
// 변경 전 — 문제가 있는 코드
const loadSample = async () => {
  setLoadingStep('map');
  try {
    const res = await fetch('/api/sample');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    setLoadingStep('render');
    setPlanets(json.planets);           // ✅ 행성 데이터는 세팅됨
    setTotalQuestions(json.metadata.totalQuestions);  // ✅ 총 질문 수도 세팅됨
    // setCategoryTree(???)             // ❌ 누락! → categoryTree는 여전히 []
    await sleep(600);
    setPhase('solar-system');
  } catch (err) {
    setError((err as Error).message);
  }
};
```

그리고 `/api/sample` GET 응답은:

```json
{
  "success": true,
  "planets": [...],
  "metadata": { "totalQuestions": 300, "planetCount": 5 }
}
```

`tree` 필드 자체가 없었다. 따라서 두 가지 문제가 동시에 존재했다:

| 문제 | 위치 | 내용 |
|------|------|------|
| ❌ API 미반환 | `/api/sample/route.ts` | `tree` 필드 없음 |
| ❌ 프론트 미저장 | `solar-system/page.tsx` | `setCategoryTree()` 미호출 |

### 2-3. 실제 데이터 경로와의 차이

실제 파일 업로드 경로(`analyzeData()`)는:

```typescript
// /api/analyze → quickJson 응답에 tree 포함됨
setCategoryTree(quickJson.tree);   // ✅ 정상 호출됨
setPlanets(quickJson.planets);
setTotalQuestions(quickJson.metadata.totalQuestions);
```

샘플 경로만 `setCategoryTree` 호출이 빠진 것이었다.

---

## 3. 변경 파일 상세

### 3-1. `src/app/api/sample/route.ts`

#### 변경 내용: `sampleCategoryTree` 추가 + 응답에 포함

**추가한 헬퍼 함수:**

```typescript
function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}
```

- `questionIndices`는 실제 메시지 배열 인덱스가 아니라 **길이만 중요** (`getPlanetsForCount`가 `.length`로 questionCount를 계산하기 때문)
- `range(0, 120)` → 길이 120짜리 배열 → `questionCount = 120`

**sampleCategoryTree 구조 (총 5개 depth-0 노드):**

```
cat-0  Programming      (questionIndices: 0~119, 120개)
  ├── cat-0-0  React          (0~34,  35개)
  ├── cat-0-1  TypeScript     (35~64, 30개)
  ├── cat-0-2  Python         (65~89, 25개)
  ├── cat-0-3  DevOps         (90~109, 20개)
  └── cat-0-4  Git            (110~119, 10개)

cat-1  Mathematics      (questionIndices: 120~194, 75개)
  ├── cat-1-0  Statistics     (120~144, 25개)
  ├── cat-1-1  Algorithms     (145~169, 25개)
  ├── cat-1-2  Linear Algebra (170~184, 15개)
  └── cat-1-3  ML Math        (185~194, 10개)

cat-2  Design           (questionIndices: 195~239, 45개)
  ├── cat-2-0  UI/UX          (195~214, 20개)
  ├── cat-2-1  Figma          (215~229, 15개)
  └── cat-2-2  Color Theory   (230~239, 10개)

cat-3  Health           (questionIndices: 240~274, 35개)
  ├── cat-3-0  Exercise       (240~254, 15개)
  ├── cat-3-1  Nutrition      (255~264, 10개)
  ├── cat-3-2  Sleep          (265~271, 7개)
  └── cat-3-3  Mental Health  (272~274, 3개)

cat-4  Business         (questionIndices: 275~299, 25개)
  ├── cat-4-0  Startup        (275~284, 10개)
  ├── cat-4-1  Product Strategy (285~291, 7개)
  ├── cat-4-2  Marketing      (292~296, 5개)
  └── cat-4-3  Finance        (297~299, 3개)
```

**총계:** depth-0 노드 5개, depth-1 노드 20개, 전체 질문 300개

**각 노드의 `CategoryNode` 필드 구성:**

```typescript
{
  id: 'cat-0',                    // normalizeCategoryTree와 동일한 형식
  name: 'Programming',
  description: '...',
  questionIndices: range(0, 120), // [0, 1, 2, ..., 119] — 길이가 questionCount
  subTopics: ['React', 'TypeScript', 'Python', 'DevOps', 'Git'],
  representativeQuestions: ['...', '...', '...'],
  recentActivityScore: 0.9,       // 0~1
  growthTrend: 'rising',          // 'rising' | 'stable' | 'declining'
  depth: 0,                       // 0 = 대분류, 1 = 중분류
  children: [/* CategoryNode[] */],
}
```

**id 명명 규칙:**
- depth-0: `cat-0`, `cat-1`, ..., `cat-4`
- depth-1: `cat-{부모인덱스}-{자식인덱스}` (예: `cat-0-2` = Programming의 3번째 자식)
- `src/lib/analysis/classifier.ts`의 `normalizeCategoryTree()` 로직과 동일한 형식

**GET 응답 변경:**

```typescript
// 변경 전
return NextResponse.json({
  success: true,
  planets: samplePlanets,
  metadata: { totalQuestions: 300, planetCount: 5, isSample: true },
});

// 변경 후
return NextResponse.json({
  success: true,
  tree: sampleCategoryTree,   // ← 추가
  planets: samplePlanets,
  metadata: { totalQuestions: 300, planetCount: 5, isSample: true },
});
```

---

### 3-2. `src/app/solar-system/page.tsx`

#### 변경 내용: `loadSample()` 안에 `setCategoryTree` 호출 추가

```typescript
// 변경 전
setLoadingStep('render');
setPlanets(json.planets);
setTotalQuestions(json.metadata.totalQuestions);
await sleep(600);
setPhase('solar-system');

// 변경 후
setLoadingStep('render');
if (json.tree) setCategoryTree(json.tree);   // ← 추가 (안전 가드 포함)
setPlanets(json.planets);
setTotalQuestions(json.metadata.totalQuestions);
await sleep(600);
setPhase('solar-system');
```

`if (json.tree)` 가드를 넣은 이유: `/api/sample`이 `tree`를 반환하지 않는 구버전과의 하위 호환성 및 방어 코딩.

---

## 4. 슬라이더 동작 흐름 (수정 후)

```
사용자가 슬라이더 조작 (예: 5 → 12)
  │
  ▼
handleCountChange(12)
  │
  ├── setPlanetCount(12)         [Zustand 상태 업데이트]
  │
  └── categoryTree.length > 0?  [이제 5개 있으므로 true]
        │
        ▼
      getPlanetsForCount(categoryTree, 12, 300)
        │  ← src/lib/analysis/hierarchy.ts
        │  level1Count = 5, level2Count = 20
        │  12 > 5 이고 12 < 20 이므로 "하이브리드" 모드:
        │    큰 카테고리(Programming 120개)부터 children으로 분할
        │    남은 슬롯이 부족하면 parent 노드 사용
        │
        ▼
      calculateVisuals(selectedNodes, 300)
        │  ← src/lib/analysis/visualMapper.ts
        │  questionCount 비율로 radius, orbitRadius, color 등 계산
        │
        ▼
      setPlanets(newPlanets)     [Zustand 상태 업데이트]
        │
        ▼
      SolarSystem → useTransitionPlanets
        │  ← src/hooks/useTransitionPlanets.ts
        │  이전 planets와 새 planets 비교
        │  id 매칭으로 유지/진입/퇴장 슬롯 분류
        │
        ▼
      AnimatedPlanet (enter/exit @react-spring 스케일 애니메이션)
```

---

## 5. `getPlanetsForCount` 동작 원리 (슬라이더 범위별)

`src/lib/analysis/hierarchy.ts` 기준, 샘플 데이터(5개 대분류, 20개 중분류)에서:

| 슬라이더 값 | 모드 | 결과 |
|------------|------|------|
| 1~5 | **대분류만** (`≤ level1Count`) | 상위 N개 대분류 (questionIndices.length 내림차순) |
| 6~19 | **하이브리드** (`> level1Count && < level2Count`) | 큰 카테고리부터 children으로 교체, 슬롯 채움 |
| 20+ | **전체 중분류** (`≥ level2Count`) | 모든 depth-1 노드 (children 없는 경우 parent 유지) |

**하이브리드 예시 (슬라이더 = 8):**
```
sortedTree (questionCount 내림차순):
  Programming (120) → children 5개 → 슬롯 5개 소비 (remaining: 3)
  Mathematics (75)  → children 4개 > remaining(3), 사용 불가 → parent 유지 (remaining: 2)
  Design (45)       → children 3개 > remaining(2), 사용 불가 → parent 유지 (remaining: 1)
  Health (35)       → children 4개 > remaining(1), 사용 불가 → parent 유지 (remaining: 0)
결과: React, TypeScript, Python, DevOps, Git, Mathematics, Design, Health (8개)
```

---

## 6. API 응답 검증

수정 후 curl로 확인:

```bash
curl -s http://localhost:3001/api/sample | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('success:', d['success'])
print('tree count:', len(d['tree']))           # 5
print('planets count:', len(d['planets']))     # 5
print('tree[0] id:', d['tree'][0]['id'])       # cat-0
print('tree[0] children:', len(d['tree'][0]['children']))  # 5
print('totalQuestions:', d['metadata']['totalQuestions']) # 300
"
```

**출력:**
```
success: True
tree count: 5
planets count: 5
tree[0] id: cat-0
tree[0] children: 5
totalQuestions: 300
```

TypeScript 컴파일 에러 없음:
```bash
node_modules/.bin/tsc --noEmit  # 에러 없이 통과
```

---

## 7. samplePlanets와 sampleCategoryTree 간 정합성

`planets`와 `tree`는 별개로 초기 렌더링에 각각 쓰인다:

- **`planets`** → 앱 진입 시 `SolarSystem`에 즉시 렌더링 (이미 `calculateVisuals` 결과값)
- **`tree`** → 슬라이더 변경 시 `getPlanetsForCount` + `calculateVisuals`로 새 행성 배열 생성

따라서 `samplePlanets`의 `questionCount` 합계(300)와 `sampleCategoryTree`의 depth-0 `questionIndices.length` 합계(300)가 일치해야 `calculateVisuals`의 비율 계산이 자연스럽다.

| depth-0 노드 | planets questionCount | tree questionIndices.length |
|------------|----------------------|------------------------------|
| Programming | 120 | 120 (range(0, 120)) |
| Mathematics | 75  | 75  (range(120, 195)) |
| Design      | 45  | 45  (range(195, 240)) |
| Health      | 35  | 35  (range(240, 275)) |
| Business    | 25  | 25  (range(275, 300)) |
| **합계**   | **300** | **300** |

---

## 8. 관련 파일 맵

```
수정된 파일:
  src/app/api/sample/route.ts           ← sampleCategoryTree 추가, tree 응답 포함
  src/app/solar-system/page.tsx         ← loadSample()에 setCategoryTree 추가

연관된 (수정 없음) 파일:
  src/lib/analysis/hierarchy.ts         ← getPlanetsForCount() — 트리 → 행성 배열 추출
  src/lib/analysis/visualMapper.ts      ← calculateVisuals() — CategoryData → PlanetVisualData
  src/lib/store/useSolarStore.ts        ← categoryTree, planets 상태 관리
  src/hooks/useTransitionPlanets.ts     ← planets 변경 감지 → enter/exit 슬롯 분류
  src/components/three/AnimatedPlanet.tsx ← @react-spring scale 애니메이션
  src/types/index.ts                    ← CategoryNode 타입 정의
```

---

## 9. 이전 이슈 파일 업데이트

`progressive-analysis-issues.md`의 이슈 2는 이 PR로 **완전 해결**됨.

> 해당 파일의 "해결 방법 (Step 7 구현)" 섹션은 `handleCountChange` 콜백 수정을 제안하고 있지만,
> 실제 코드에서는 `handleCountChange`가 이미 올바르게 구현되어 있었다.
> 진짜 문제는 **샘플 경로에서 categoryTree가 세팅되지 않았던 것**이었다.
> (실제 데이터 업로드 경로는 `setCategoryTree(quickJson.tree)` 가 정상 호출되고 있었음)
