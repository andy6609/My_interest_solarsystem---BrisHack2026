import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraState {
  type: 'planet' | 'reset';
  object?: THREE.Object3D;
  radius?: number;
}

const POS_DAMPING    = 0.04;   // 카메라 위치 보간 속도
const LOOKAT_DAMPING = 0.10;   // 시선 보간 (위치보다 빠르게 → 행성이 먼저 시야에 들어옴)
const THRESHOLD      = 0.3;    // 도착 판정 거리

// 재사용 벡터 (GC 방지)
const _planetPos = new THREE.Vector3();
const _dir       = new THREE.Vector3();
const _targetCam = new THREE.Vector3();
const _delta     = new THREE.Vector3();

export function useCameraTransition(controlsRef: React.RefObject<OrbitControlsImpl>) {
  const { camera } = useThree();
  const stateRef   = useRef<CameraState>({ type: 'reset' });
  const isAnimating = useRef(false);

  useFrame(() => {
    const state    = stateRef.current;
    const controls = controlsRef.current;

    // ── 행성 포커스 ──
    if (state.type === 'planet' && state.object) {
      const radius = state.radius || 1;

      // 매 프레임 행성의 현재 월드 위치 읽기
      state.object.getWorldPosition(_planetPos);

      // 카메라 목표 위치: 행성 기준 바깥쪽 + 위
      _dir.copy(_planetPos).normalize();
      const backDist = radius * 5 + 4;    // 행성 크기에 비례한 거리
      const height   = radius * 2 + 3;

      _targetCam
        .copy(_planetPos)
        .addScaledVector(_dir, backDist)
        .setY(_planetPos.y + height);

      if (isAnimating.current) {
        // 진입 애니메이션: 위치는 부드럽게, 시선은 빠르게
        camera.position.lerp(_targetCam, POS_DAMPING);

        if (controls) {
          controls.target.lerp(_planetPos, LOOKAT_DAMPING);
          controls.update();
        } else {
          camera.lookAt(_planetPos);
        }

        if (camera.position.distanceTo(_targetCam) < THRESHOLD) {
          isAnimating.current = false;
          if (controls) controls.enabled = true;
        }
      } else if (controls && controls.enabled) {
        // 애니메이션 완료 후: 행성의 이동분만큼 카메라+타겟을 동일하게 이동 → 지연 0
        _delta.copy(_planetPos).sub(controls.target);
        camera.position.add(_delta);
        controls.target.copy(_planetPos);
        controls.update();
      }
    }

    // ── 전체 태양계 뷰 복귀 ──
    else if (state.type === 'reset' && isAnimating.current) {
      const resetPos    = new THREE.Vector3(0, 15, 25);
      const resetTarget = new THREE.Vector3(0, 0, 0);

      camera.position.lerp(resetPos, POS_DAMPING);
      if (controls) {
        controls.target.lerp(resetTarget, LOOKAT_DAMPING);
        controls.update();
      } else {
        camera.lookAt(resetTarget);
      }

      if (camera.position.distanceTo(resetPos) < THRESHOLD) {
        isAnimating.current = false;
        if (controls) controls.enabled = true;
      }
    }
  });

  const focusOnPlanet = useCallback(
    (object: THREE.Object3D, radius: number) => {
      stateRef.current = { type: 'planet', object, radius };
      isAnimating.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
    },
    [controlsRef]
  );

  const resetView = useCallback(() => {
    stateRef.current = { type: 'reset' };
    isAnimating.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [controlsRef]);

  return { focusOnPlanet, resetView, isAnimating };
}
