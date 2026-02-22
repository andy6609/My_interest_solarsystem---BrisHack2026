# 행성 개수 불일치 버그 (Planet Count Mismatch)

> 발생일: 2026-02-21
> 상태: 수정 완료

---

## 증상

- 샘플 데이터 로드 시 6개 행성으로 시작
- 슬라이더로 행성 수를 늘리면 정상적으로 증가함
- 슬라이더로 행성 수를 다시 줄이면 화면의 행성이 줄어들지 않고 잔류함
- 예: 슬라이더를 4로 설정해도 화면에 행성 9개가 떠 있음

---

## 근본 원인 (3가지)

### 1. ID 충돌 (Key Collision) — `visualMapper.ts`

행성 ID를 `planet-${index}` 형태로 인덱스 기반으로 부여했기 때문에,
슬라이더 값이 바뀌어 카테고리 수가 달라지면 **같은 ID가 완전히 다른 카테고리에 배정**됨.

```
12개일 때: planet-0 = "React & Frontend" (35문항, 하위 카테고리)
 4개일 때: planet-0 = "Programming"      (100문항, 상위 카테고리)
```

`useTransitionPlanets`의 merge 로직이 `prev.find(s => s.id === from.id)`로 슬롯을 찾으므로,
exiting 슬롯과 entering 슬롯이 **동일한 key**를 갖게 되어 React가 혼동.

### 2. 이중 업데이트 경로 (Dual Update Path) — `solar-system/page.tsx`

`handleCountChange`에서 `setPlanetCount`와 `setPlanets`를 동시에 호출하여
한 번의 슬라이더 조작에 두 개의 상충하는 상태 업데이트 경로가 동시에 발동됨.

| 경로 | 트리거 | 동작 |
|------|--------|------|
| **A** | `setPlanets()` → `useEffect([initialPlanets])` | 슬롯을 새 배열로 직접 리셋 (애니메이션 없음) |
| **B** | `setPlanetCount()` → `useEffect([planetCount])` → `changePlanetCount()` | exit/enter 전환 애니메이션 적용 |

경로 A가 슬롯을 리셋한 뒤 경로 B가 exiting 슬롯을 다시 추가하거나,
또는 B가 세팅한 전환 상태를 A가 덮어쓰는 **경쟁 조건** 발생.

### 3. exiting 고아 슬롯 누적 — `useTransitionPlanets.ts`

슬라이더를 빠르게 연속 조작하면 이전 렌더의 `exiting: true` 슬롯이
`onExitDone`이 불리기 전에 새 전환 계획에 포함되지 않아 **영구적으로 잔류**함.

---

## 수정 내용

### Fix 1: ID를 이름(slug) 기반으로 변경 (`visualMapper.ts`)

```typescript
// Before
id: `planet-${index}`

// After
function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
id: `planet-${toSlug(cat.name)}`
// e.g. "React & Frontend" → "planet-react-frontend"
```

같은 카테고리명이면 행성 수 변경 전후에도 항상 동일한 ID 보장.

### Fix 2: 이중 업데이트 제거 (`solar-system/page.tsx`)

```typescript
// Before
const handleCountChange = useCallback((newCount: number) => {
  setPlanetCount(newCount);
  const newCategories = getPlanetsForCount(categoryTree, newCount, totalQuestions);
  const newPlanets = calculateVisuals(newCategories, totalQuestions);
  setPlanets(newPlanets); // ← 제거
}, [...]);

// After
const handleCountChange = useCallback((newCount: number) => {
  setPlanetCount(newCount); // planetCount만 업데이트. 행성 전환은 useTransitionPlanets 전담.
}, [setPlanetCount]);
```

대신 `useTransitionPlanets`의 `onPlanetsChange` 콜백을 통해 전환 완료 후 스토어 동기화.

### Fix 3: exiting 슬롯 즉시 정리 + skipNextInitialSync 보호 플래그 (`useTransitionPlanets.ts`)

```typescript
// changePlanetCount 내부 setSlots 시작 부분
const activePrev = prev.filter((s) => !s.exiting); // 이전 exiting 즉시 제거

// onPlanetsChange 콜백으로 스토어 동기화 후, 이로 인한 initialPlanets effect 발동 차단
skipNextInitialSync.current = true;
```

---

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/analysis/visualMapper.ts` | ID를 `planet-${slug}` 형식으로 변경 |
| `src/app/solar-system/page.tsx` | `handleCountChange`에서 `setPlanets` 호출 제거, `onPlanetsChange` prop 전달 |
| `src/hooks/useTransitionPlanets.ts` | `onPlanetsChange` 콜백 추가, `skipNextInitialSync` 보호 플래그, exiting 즉시 정리, `useCallback` 적용 |
| `src/components/three/SolarSystem.tsx` | `onPlanetsChange` prop 추가 및 훅에 전달 |
