import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

const DAMPING   = 0.03;   // 낮을수록 느리고 부드러움
const THRESHOLD = 0.05;   // 이 거리 이하면 도착 판정

// 보충 문서 Section 4.1 — Damping 기반 부드러운 카메라 이동
export function useCameraTransition() {
  const { camera } = useThree();
  const targetRef     = useRef<CameraTarget | null>(null);
  const lookAtCurrent = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating   = useRef(false);

  useFrame(() => {
    if (!targetRef.current || !isAnimating.current) return;

    const target = targetRef.current;

    camera.position.lerp(target.position, DAMPING);
    lookAtCurrent.current.lerp(target.lookAt, DAMPING);
    camera.lookAt(lookAtCurrent.current);

    if (camera.position.distanceTo(target.position) < THRESHOLD) {
      isAnimating.current = false;
    }
  });

  // 행성으로 포커스 — 행성 뒤쪽+위에서 내려다보는 앵글
  const focusOnPlanet = useCallback(
    (planetPosition: THREE.Vector3, planetRadius: number) => {
      const cfg = {
        offsetHeight:   3,
        offsetDistance: 8,
      };

      // 항성(원점)에서 행성 방향 벡터
      const dir = planetPosition.clone().normalize();

      // 행성 위치에서 뒤쪽+위로 오프셋
      const offset = new THREE.Vector3(
        dir.x * cfg.offsetDistance + planetPosition.x * 0.2,
        planetRadius * 3 + cfg.offsetHeight,
        dir.z * cfg.offsetDistance + planetPosition.z * 0.2
      );

      targetRef.current = {
        position: offset,
        lookAt:   planetPosition.clone(),
      };
      isAnimating.current = true;
    },
    []
  );

  // 전체 태양계 뷰로 복귀
  const resetView = useCallback(() => {
    targetRef.current = {
      position: new THREE.Vector3(0, 15, 25),
      lookAt:   new THREE.Vector3(0, 0, 0),
    };
    isAnimating.current = true;
  }, []);

  return { focusOnPlanet, resetView, isAnimating };
}
