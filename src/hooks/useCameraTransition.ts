import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraState {
  type: 'planet' | 'reset';
  object?: THREE.Object3D;
  radius?: number;
}

const DAMPING = 0.03;   // 낮을수록 느리고 부드러움
const THRESHOLD = 0.05;   // 이 거리 이하면 도착 판정

export function useCameraTransition(controlsRef: React.RefObject<OrbitControlsImpl>) {
  const { camera } = useThree();
  const stateRef = useRef<CameraState>({ type: 'reset' });
  const isAnimating = useRef(false);

  useFrame(() => {
    if (!stateRef.current) return;
    const controls = controlsRef.current;

    // 행성에 포커싱된 상태일 때
    if (stateRef.current.type === 'planet' && stateRef.current.object) {
      const obj = stateRef.current.object;
      const radius = stateRef.current.radius || 1;

      // 행성의 '현재' 위치 
      const planetPos = obj.getWorldPosition(new THREE.Vector3());

      const cfg = {
        offsetHeight: 3,
        offsetDistance: 8,
      };

      const dir = planetPos.clone().normalize();
      const targetPos = new THREE.Vector3(
        dir.x * cfg.offsetDistance + planetPos.x * 0.2,
        radius * 3 + cfg.offsetHeight,
        dir.z * cfg.offsetDistance + planetPos.z * 0.2
      );

      // 애니메이션 진행 중: 목표(TargetPos) 및 목표점(PlanetPos)으로 부드럽게 이동
      if (isAnimating.current) {
        camera.position.lerp(targetPos, DAMPING);
        if (controls) {
          controls.target.lerp(planetPos, DAMPING);
          controls.update();
        } else {
          camera.lookAt(planetPos);
        }

        if (camera.position.distanceTo(targetPos) < THRESHOLD) {
          isAnimating.current = false;
          if (controls) controls.enabled = true; // 이동 끝난 후 유저 조작 허용
        }
      }
      // 애니메이션 끝난 후: 행성은 계속 움직이므로 완전히 OrbitControls에 맞추어 따라가기(Tracking)
      else if (controls && controls.enabled) {
        // 행성이 움직인 만큼(마지막 프레임 대비 오차) 카메라에도 벡터 덧셈!
        const deltaMove = planetPos.clone().sub(controls.target);
        camera.position.add(deltaMove);
        controls.target.copy(planetPos);
        controls.update();
      }
    }
    // 전체 태양계 뷰 상태일 때
    else if (stateRef.current.type === 'reset') {
      if (isAnimating.current) {
        const resetPos = new THREE.Vector3(0, 15, 25);
        const resetTarget = new THREE.Vector3(0, 0, 0);

        camera.position.lerp(resetPos, DAMPING);
        if (controls) {
          controls.target.lerp(resetTarget, DAMPING);
          controls.update();
        } else {
          camera.lookAt(resetTarget);
        }

        if (camera.position.distanceTo(resetPos) < THRESHOLD) {
          isAnimating.current = false;
          if (controls) controls.enabled = true;
        }
      }
    }
  });

  const focusOnPlanet = useCallback(
    (object: THREE.Object3D, radius: number) => {
      stateRef.current = { type: 'planet', object, radius };
      isAnimating.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false; // 이동 중 조작 불가
    },
    [controlsRef]
  );

  const resetView = useCallback(() => {
    stateRef.current = { type: 'reset' };
    isAnimating.current = true;
    if (controlsRef.current) controlsRef.current.enabled = false; // 이동 중 조작 불가
  }, [controlsRef]);

  // isAnimating을 리턴하여 외부에서 활용 가능하게 유지
  return { focusOnPlanet, resetView, isAnimating };
}
