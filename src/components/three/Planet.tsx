'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { EllipticalOrbit, getPositionOnEllipse, getOrbitParams } from './EllipticalOrbit';
import { Moon } from './Moon';
import type { PlanetVisualData } from '@/types';

interface Props {
  data: PlanetVisualData;
  index: number;
  total: number;
  onClick: (object: THREE.Object3D) => void;
}

export function Planet({ data, index, total, onClick }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  // 궤도 파라미터 — 결정적 생성 (리렌더 시 동일)
  const orbit = useMemo(() => getOrbitParams(index, total), [index, total]);

  // 카메라 거리 기반 LOD
  const [camDist, setCamDist] = useState(30);

  const segments = camDist < 10 ? 64 : camDist < 25 ? 32 : 16;
  const showMoons = camDist < 20;
  const showLabel = camDist < 30;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // 타원 궤도 위 위치 계산
    const pos = getPositionOnEllipse(
      clock.elapsedTime,
      data.orbitSpeed,
      orbit.semiMajorAxis,
      orbit.eccentricity,
      orbit.inclination,
      orbit.rotation
    );
    groupRef.current.position.copy(pos);

    // LOD용 카메라 거리 (60프레임마다 갱신으로 최적화)
    if (Math.floor(clock.elapsedTime * 60) % 60 === 0) {
      setCamDist(camera.position.distanceTo(pos));
    }

    // 글로우 맥동
    if (glowRef.current) {
      glowRef.current.opacity =
        0.08 + data.emissiveIntensity * 0.08 + Math.sin(clock.elapsedTime * 1.2 + index) * 0.02;
    }
  });

  const scale = hovered ? data.radius * 1.2 : data.radius;

  return (
    <>
      {/* 타원 궤도선 */}
      <EllipticalOrbit
        semiMajorAxis={orbit.semiMajorAxis}
        eccentricity={orbit.eccentricity}
        inclination={orbit.inclination}
        rotation={orbit.rotation}
      />

      {/* 행성 그룹 (useFrame으로 위치 업데이트) */}
      <group ref={groupRef}>

        {/* 행성 본체 */}
        <mesh
          scale={scale}
          onClick={(e) => {
            e.stopPropagation();
            if (groupRef.current) onClick(groupRef.current);
          }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[1, segments, segments]} />
          <meshStandardMaterial
            color={data.color}
            emissive={data.color}
            emissiveIntensity={data.emissiveIntensity * (hovered ? 2.5 : 1)}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>

        {/* 글로우 레이어 */}
        <mesh scale={data.radius * 1.6}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={glowRef}
            color={data.color}
            transparent
            opacity={0.1 + data.emissiveIntensity * 0.08}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 행성 이름 라벨 — drei Text (DOM 없이 3D 텍스트) */}
        {showLabel && (
          <Text
            position={[0, data.radius + 0.6, 0]}
            fontSize={0.28}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.04}
            outlineColor="#000000"
            fillOpacity={hovered ? 1 : 0.75}
            renderOrder={1}
          >
            {`${data.name}  (${data.questionCount})`}
          </Text>
        )}

        {/* 위성들 */}
        {showMoons &&
          data.moons.map((moon, i) => (
            <Moon key={moon.id} data={moon} index={i} planetColor={data.color} />
          ))}
      </group>
    </>
  );
}
