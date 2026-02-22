# 카메라 추적 버그 (Camera Tracking Issue)

> 발생일: 2026-02-21
> 상태: 수정 완료

---

## 증상

- 3D 태양계 화면에서 행성을 클릭하여 포커스할 때, 카메라가 행성을 따라가지 않음.
- 행성은 고유의 타원 궤도를 따라 계속 공전하여 이동하는데, 카메라는 클릭한 순간 행성이 있던 "과거의 빈 우주 공간"만 쳐다보고 있음.
- 결과적으로 잠시 후 행성이 시야에서 벗어나버리는 현상 발생.

---

## 근본 원인 

### 1. 정적 스냅샷 좌표 전달 (`Planet.tsx`)

행성 클릭 시 `onClick` 이벤트로 행성의 현재 좌표 스냅샷을 `Vector3` 형태로 복사(`.clone()`)하여 `SolarSystem`과 `SceneController`를 거쳐 전달함.
이로 인해 카메라는 해당 "고정된 숫자 좌표"만을 목표점으로 인식.

### 2. OrbitControls와 Camera Transition 훅의 단발성 포커싱 (`useCameraTransition.ts`)

목표 지점을 단순 `lookAt` 벡터로 받아서 카메라를 그쪽으로 부드럽게(`lerp`) 이동시킨 후 멈춤. 
행성은 렌더 스레드의 `useFrame`에 의해 `groupRef.current.position.copy(pos)`로 계속 새 위치가 갱신되며 이동하고 있지만, 
카메라의 이동 로직은 고정된 1회성 목표(Vector3)만 바라보도록 설계되어 있었기 때문에 타겟을 잃어버리게 됨.

---

## 수정 내용

### Fix 1: 좌표 스냅샷 대신 3D 객체(Object3D) 참조 전달 (`Planet.tsx`, `AnimatedPlanet.tsx`)

```typescript
// Before
onClick: (position: THREE.Vector3) => void;
onClick={(e) => {
  onClick(groupRef.current?.position.clone() ?? new THREE.Vector3());
}}

// After
onClick: (object: THREE.Object3D) => void;
onClick={(e) => {
  if (groupRef.current) onClick(groupRef.current);
}}
```

### Fix 2: 실시간 좌표 추적(Tracking) 지원 (`useCameraTransition.ts`, `SceneController.tsx`)

`Object3D` 참조를 전달받은 `useCameraTransition` 훅이 렌더 루프(`useFrame`) 매 프레임마다 지정된 객체의 `.getWorldPosition()`을 호출해 "실시간 절대 좌표"를 획득.
애니메이션 진행 중뿐만 아니라, 포커스 도착 애니메이션이 끝난 이후(`OrbitControls` 재활성화 상태)에도 
행성이 이동한 거리(Delta)만큼 카메라의 실제 위치(`camera.position`)와 바라보는 지점(`controls.target`)을 렌더링마다 치환/동기화해줌으로써 
**행성이 공전하며 도망치더라도 화면 중앙에 완벽히 추적 고정(Lock-on)** 하도록 개선.

```typescript
// useFrame 내부 로직
if (stateRef.current.type === 'planet' && stateRef.current.object) {
  // 행성의 매 프레임 현재 좌표 
  const planetPos = obj.getWorldPosition(new THREE.Vector3());
  
  // 애니메이션 종료 이후 Tracking 로직 추가
  if (controls && controls.enabled) {
    // 이전 controls.target과 달라진 현재 좌표의 오차(Delta) 계산
    const deltaMove = planetPos.clone().sub(controls.target);
    // 카메라 위치도 행성이 움직인 만큼 평행이동
    camera.position.add(deltaMove);
    // 중심점(Target)을 행성의 새 좌표에 동기화
    controls.target.copy(planetPos);
    controls.update();
  }
}
```

---

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/three/Planet.tsx` | `onClick` 시 `THREE.Vector3` 대신 `THREE.Object3D` 본체를 리턴하도록 수정 |
| `src/components/three/AnimatedPlanet.tsx` | `onClick` 시그니처 형 변환(`THREE.Object3D`) 전파 |
| `src/components/three/SolarSystem.tsx` | `handlePlanetClick` 함수가 `THREE.Object3D` 인자를 받도록 시그니처 전파 |
| `src/components/three/SceneController.tsx` | `focusOnPlanet` 시그니처 변경, `OrbitControls` 참조(`controlsRef`)를 `useCameraTransition` 훅에 직접 주입 |
| `src/hooks/useCameraTransition.ts` | 포커스 타겟을 `THREE.Object3D`로 보관. `useFrame` 루프 내에서 `.getWorldPosition()`으로 실시간 좌표계산 후 `OrbitControls` 타겟과 카메라 포지션에 매 프레임 오차를 오프셋 더해주는 완벽한 동기화 추적 적용 |
