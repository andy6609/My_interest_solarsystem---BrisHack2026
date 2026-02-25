'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useRef, useMemo } from 'react';
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

// ── 별똥별 ──
function ShootingStar() {
  const { geo, mat, line } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#c8e8ff', transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, mat);
    return { geo, mat, line };
  }, []);

  const state = useRef({ active: false, life: 0, maxLife: 0.7, startPos: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 50 });
  const timer = useRef(0);

  const spawn = () => {
    const s = state.current;
    s.startPos.set(
      30 + Math.random() * 20,
      15 + Math.random() * 10,
      -10 + Math.random() * 5
    );
    s.dir.set(
      -0.75 - Math.random() * 0.15,
      -0.5 - Math.random() * 0.15,
      0
    ).normalize();
    s.speed = 55 + Math.random() * 20;
    s.maxLife = 0.6 + Math.random() * 0.2;
    s.life = 0;
    s.active = true;
  };

  useFrame((_, delta) => {
    const s = state.current;
    timer.current += delta;

    if (!s.active && timer.current >= 3.5) {
      timer.current = 0;
      spawn();
    }

    if (!s.active) return;

    s.life += delta;
    if (s.life >= s.maxLife) {
      s.active = false;
      mat.opacity = 0;
      return;
    }

    const t = s.life / s.maxLife;
    const fade = Math.sin(t * Math.PI);
    const head = s.startPos.clone().addScaledVector(s.dir, s.speed * s.life);
    const tail = head.clone().addScaledVector(s.dir, -(4 + t * 3));

    const pos = geo.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, tail.x, tail.y, tail.z);
    pos.setXYZ(1, head.x, head.y, head.z);
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
    mat.opacity = fade * 0.95;
  });

  return <primitive object={line} />;
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
      <ShootingStar />
    </Canvas>
  );
}
