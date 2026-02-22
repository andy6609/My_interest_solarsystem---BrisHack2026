# 카메라 행성 추적 버그 (Camera Planet Tracking)

> 발생일: 2026-02-21
> 상태: 수정 완료

---

## 증상

1. 행성 클릭 시 카메라가 행성이 있던 **빈 공간**을 비추고, 행성은 궤도를 따라 이미 지나감
2. 카메라가 행성에 **너무 가까이** 줌되어 행성 표면만 보임
3. 애니메이션 도착 후에도 행성이 **정중앙에 오지 않고** 약간 치우침

---

## 원인

### 1. 고정 좌표 참조 (기존 구현)

```typescript
// 클릭 시점의 좌표 스냅샷만 저장
targetRef.current = {
  lookAt: planetPosition.clone(), // 이 좌표는 영원히 고정!
};
```

행성은 매 프레임 궤도를 따라 이동 중인데, 카메라는 클릭 순간의 좌표만 바라봄.

→ Object3D 참조 방식으로 이미 수정됨 (`object.getWorldPosition()` 매 프레임 호출)

### 2. 잘못된 오프셋 수식

```typescript
// Before — 행성 크기/궤도와 무관한 이상한 거리 계산
const targetPos = new THREE.Vector3(
  dir.x * 8 + planetPos.x * 0.2,  // ???
  radius * 3 + 3,
  dir.z * 8 + planetPos.z * 0.2
);
```

궤도 반경이 20인 행성에 대해 `dir.x * 8 + 20 * 0.2 = 12` → 행성보다 원점에 더 가까운 위치에 카메라 배치.

### 3. lookAt lerp 지연

`DAMPING = 0.03`으로 위치와 시선 모두 동일한 속도로 보간 → 움직이는 행성을 쫓지 못하고 항상 뒤꽁무니만 따라감.

---

## 수정 내용 (`useCameraTransition.ts`)

### 오프셋 수식 개선

```typescript
// After — 행성 위치 기준, 바깥쪽으로 radius에 비례한 거리
const backDist = radius * 5 + 4;
const height   = radius * 2 + 3;

_targetCam
  .copy(_planetPos)
  .addScaledVector(_dir, backDist)  // 행성에서 바깥쪽으로
  .setY(_planetPos.y + height);      // 위에서 내려다봄
```

### 시선 추적 분리

| 구간 | 카메라 위치 | 시선 (lookAt) |
|------|------------|---------------|
| 애니메이션 중 | `lerp(targetCam, 0.04)` 부드럽게 | `lerp(planetPos, 0.10)` 빠르게 |
| 애니메이션 후 | 행성 이동분(delta)만큼 동일 이동 | 행성 위치 직접 복사 (지연 0) |

### 매 프레임 실시간 추적

```typescript
// 애니메이션 완료 후: 행성 공전에 카메라가 자석처럼 붙어감
const delta = planetPos.clone().sub(controls.target);
camera.position.add(delta);       // 카메라도 같은 벡터만큼 이동
controls.target.copy(planetPos);  // 시선 = 행성 현재 위치
```

---

## 수정된 파일

| 파일 | 변경 |
|------|------|
| `src/hooks/useCameraTransition.ts` | 오프셋 수식 교체, POS/LOOKAT 분리 damping, 실시간 delta 추적 |
