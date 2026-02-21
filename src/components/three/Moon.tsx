'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MoonData } from '@/types';

interface Props {
  data: MoonData;
  index: number;
  planetColor: string;
}

export function Moon({ data, index, planetColor }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  // 위성마다 다른 공전 속도·위상
  const speed = 1.2 + index * 0.3;
  const phase = index * (Math.PI * 2 / 3);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const angle = clock.elapsedTime * speed + phase;
    groupRef.current.position.set(
      Math.cos(angle) * data.orbitRadius,
      Math.sin(angle * 0.4) * 0.15,
      Math.sin(angle) * data.orbitRadius
    );
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[data.size, 8, 8]} />
        <meshStandardMaterial
          color={planetColor}
          emissive={planetColor}
          emissiveIntensity={0.3}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}
