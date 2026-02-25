'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function RotatingStars() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.007) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={120}
        depth={60}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0}
      />
    </group>
  );
}

export function LandingStarBackground() {
  return (
    <Canvas
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
      camera={{ position: [0, 0, 1], fov: 75 }}
      gl={{ antialias: false, powerPreference: 'default' }}
      dpr={[1, 1.5]}
    >
      <RotatingStars />
    </Canvas>
  );
}
