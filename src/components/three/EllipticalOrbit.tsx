'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  semiMajorAxis: number;   // 장축 반지름 (a)
  eccentricity?: number;   // 이심률 0=원, 0.3=약한 타원
  inclination?: number;    // X축 기울기 (라디안)
  rotation?: number;       // Y축 회전 (레이어링)
  color?: string;
  opacity?: number;
}

export function EllipticalOrbit({
  semiMajorAxis,
  eccentricity = 0.15,
  inclination = 0,
  rotation = 0,
  color = '#4FC3F7',
  opacity = 0.18,
}: Props) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 256;
    // 단축 b = a * sqrt(1 - e²)
    const b = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = semiMajorAxis * Math.cos(theta);
      const z = b * Math.sin(theta);

      // 기울기 (X축 기준 회전)
      const y = z * Math.sin(inclination);
      const zFinal = z * Math.cos(inclination);

      pts.push(new THREE.Vector3(x, y, zFinal));
    }
    return pts;
  }, [semiMajorAxis, eccentricity, inclination]);

  return (
    <group rotation={[0, rotation, 0]}>
      <Line
        points={points}
        color={color}
        lineWidth={1}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </group>
  );
}

// ─────────────────────────────────────────────
// 타원 궤도 위 행성 위치 계산 (useFrame 안에서 호출)
// ─────────────────────────────────────────────
export function getPositionOnEllipse(
  time: number,
  speed: number,
  semiMajor: number,
  eccentricity: number,
  inclination: number,
  rotation: number
): THREE.Vector3 {
  const theta = time * speed;
  const b = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);

  const x = semiMajor * Math.cos(theta);
  let z  = b * Math.sin(theta);
  const y  = z * Math.sin(inclination);
  z = z * Math.cos(inclination);

  // Y축 회전 적용
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  return new THREE.Vector3(
    x * cosR - z * sinR,
    y,
    x * sinR + z * cosR
  );
}

// ─────────────────────────────────────────────
// 행성 인덱스로부터 궤도 파라미터 결정적 생성
// (Math.random 대신 sin 기반 시드 → 리렌더마다 동일)
// ─────────────────────────────────────────────
export function getOrbitParams(index: number, total: number) {
  // sin 시드 기반 의사난수 (0~1)
  const r1 = (Math.sin(index * 127.1 + 311.7) * 43758.5453) % 1;
  const r2 = (Math.sin(index * 269.5 + 183.3) * 43758.5453) % 1;
  const absR1 = Math.abs(r1);
  const absR2 = Math.abs(r2);

  return {
    semiMajorAxis: 4 + (index / Math.max(total - 1, 1)) * 16,
    eccentricity:  0.1 + absR1 * 0.2,              // 0.1~0.3
    inclination:   (absR2 - 0.5) * 0.6,             // -0.3~0.3 rad
    rotation:      (index / Math.max(total, 1)) * Math.PI * 0.6,
  };
}
