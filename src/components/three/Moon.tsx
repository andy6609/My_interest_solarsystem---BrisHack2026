'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { MoonData } from '@/types';

interface Props {
  data: MoonData;
  index: number;
  planetColor: string;
  showLabel?: boolean; // 행성 클릭(선택) 시에만 true
}

export function Moon({ data, index, planetColor, showLabel = false }: Props) {
  const groupRef = useRef<THREE.Group>(null);
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

      {showLabel && (
        <Text
          position={[0, data.size + 0.15, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
          fillOpacity={0.85}
          renderOrder={2}
        >
          {data.name}
        </Text>
      )}
    </group>
  );
}
