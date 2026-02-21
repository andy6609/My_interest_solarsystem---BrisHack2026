'use client';

import { Canvas } from '@react-three/fiber';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CentralStar } from './shaders/StarCoreMaterial';
import { GridFloor } from './GridFloor';
import { PostEffects } from './Effects';
import { AnimatedPlanet } from './AnimatedPlanet';
import { CameraIntro } from './CameraIntro';
import { SceneController, type SceneControllerHandle } from './SceneController';
import { useTransitionPlanets } from '@/hooks/useTransitionPlanets';
import { SCENE_CONFIG } from '@/config/sceneConfig';
import type { CategoryNode, PlanetVisualData } from '@/types';

let Perf: React.ComponentType<{ position?: string }> | null = null;
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Perf = require('r3f-perf').Perf;
  } catch { /* 무시 */ }
}

interface Props {
  planets: PlanetVisualData[];
  categoryTree: CategoryNode[];
  totalQuestions: number;
  planetCount: number;
  onPlanetClick: (planet: PlanetVisualData) => void;
  onDeselect: () => void;
}

export function SolarSystem({
  planets, categoryTree, totalQuestions, planetCount,
  onPlanetClick, onDeselect,
}: Props) {
  const { background, camera, fog, performance } = SCENE_CONFIG;
  const controllerRef = useRef<SceneControllerHandle>(null);

  const { slots, changePlanetCount, removeSlot } = useTransitionPlanets({
    tree: categoryTree,
    initialPlanets: planets,
    totalQuestions,
  });

  // planetCount 변경 시 전환 실행
  useEffect(() => {
    if (categoryTree.length > 0) {
      changePlanetCount(planetCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetCount, categoryTree]);

  const handlePlanetClick = (planet: PlanetVisualData, position: THREE.Vector3) => {
    controllerRef.current?.focusOnPlanet(position, planet.radius);
    onPlanetClick(planet);
  };

  const handleDeselect = () => {
    controllerRef.current?.resetView();
    onDeselect();
  };

  return (
    <Canvas
      className="w-full h-full"
      dpr={performance.dpr}
      performance={{ min: 0.5, max: 1, debounce: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, depth: true }}
    >
      <CameraIntro />
      <PerspectiveCamera makeDefault position={camera.default.position} fov={camera.default.fov} />
      <SceneController ref={controllerRef} onBackgroundClick={handleDeselect} />

      <color attach="background" args={[background.color]} />
      <fogExp2 attach="fog" args={[background.color, fog.density]} />

      <Stars
        radius={background.stars.radius} depth={background.stars.depth}
        count={background.stars.count} factor={background.stars.factor}
        saturation={background.stars.saturation} fade speed={background.stars.speed}
      />
      <ambientLight intensity={0.05} />

      <Suspense fallback={null}>
        <CentralStar />
        <GridFloor />

        {/* 전환 애니메이션이 적용된 행성들 */}
        {slots.map((slot) => (
          <AnimatedPlanet
            key={slot.id}
            data={slot.data}
            index={slot.index}
            total={slots.filter((s) => !s.exiting).length}
            onClick={(pos) => handlePlanetClick(slot.data, pos)}
            entering={slot.entering}
            exiting={slot.exiting}
            onExitDone={() => removeSlot(slot.id)}
          />
        ))}

        <PostEffects />
        {Perf && <Perf position="top-left" />}
      </Suspense>
    </Canvas>
  );
}
