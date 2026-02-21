'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraTransition } from '@/hooks/useCameraTransition';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE_CONFIG } from '@/config/sceneConfig';

export interface SceneControllerHandle {
  focusOnPlanet: (pos: THREE.Vector3, radius: number) => void;
  resetView: () => void;
}

interface Props {
  onBackgroundClick: () => void;
}

// forwardRef로 부모(SolarSystem)가 포커스 메서드를 호출할 수 있게 함
export const SceneController = forwardRef<SceneControllerHandle, Props>(
  function SceneController({ onBackgroundClick }, ref) {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { focusOnPlanet, resetView, isAnimating } = useCameraTransition();
    const { camera } = SCENE_CONFIG;

    // 트랜지션 중 OrbitControls 비활성화
    useEffect(() => {
      const controls = controlsRef.current;
      if (!controls) return;

      const interval = setInterval(() => {
        controls.enabled = !isAnimating.current;
      }, 50);
      return () => clearInterval(interval);
    }, [isAnimating]);

    // 부모로 메서드 노출
    useImperativeHandle(ref, () => ({
      focusOnPlanet,
      resetView,
    }));

    const handleBackground = () => {
      resetView();
      onBackgroundClick();
    };

    return (
      <>
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={camera.orbit.dampingFactor}
          minDistance={camera.orbit.minDistance}
          maxDistance={camera.orbit.maxDistance}
          maxPolarAngle={camera.orbit.maxPolarAngle}
        />

        {/* 투명 배경 평면 — 클릭 시 뷰 리셋 */}
        <mesh
          position={[0, -3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleBackground}
          visible={false}
        >
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial />
        </mesh>
      </>
    );
  }
);
