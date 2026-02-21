'use client';

import { useRef, useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { Planet } from './Planet';
import * as THREE from 'three';
import type { PlanetVisualData } from '@/types';

interface Props {
  data: PlanetVisualData;
  index: number;
  total: number;
  onClick: (position: THREE.Vector3) => void;

  // 전환 타입
  entering?: boolean;      // scale 0 → 1
  exiting?:  boolean;      // scale 1 → 0 → unmount
  splitFrom?: THREE.Vector3; // 분열 시 부모 위치에서 팽창
  onExitDone?: () => void;
}

const SPRING_CFG = {
  mass:     1.5,
  tension:  100,
  friction: 18,
};

export function AnimatedPlanet({
  data, index, total, onClick,
  entering = false,
  exiting  = false,
  splitFrom,
  onExitDone,
}: Props) {
  const [mounted, setMounted] = useState(true);

  // scale 스프링: appear 0→1, disappear 1→0
  const { scale } = useSpring({
    scale: exiting ? 0 : 1,
    delay: entering ? 400 : 0,           // 보충 문서 타이밍: appear는 400ms 딜레이
    config: SPRING_CFG,
    onRest: () => {
      if (exiting) {
        setMounted(false);
        onExitDone?.();
      }
    },
  });

  if (!mounted) return null;

  return (
    <animated.group scale={scale}>
      <Planet
        data={data}
        index={index}
        total={total}
        onClick={onClick}
      />
    </animated.group>
  );
}
