import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// 보충 문서 Section 4.3 — 태양계 첫 진입 줌인 애니메이션
// (0, 60, 60) → (0, 15, 25), easeOutCubic, ~3초
export function useCameraIntro() {
  const { camera } = useThree();
  const progress = useRef(0);
  const done     = useRef(false);

  // 시작 전에 카메라를 먼 위치로 초기화
  const initialized = useRef(false);
  if (!initialized.current) {
    camera.position.set(0, 60, 60);
    camera.lookAt(0, 0, 0);
    initialized.current = true;
  }

  useFrame((_, delta) => {
    if (done.current) return;

    progress.current += delta * 0.33; // 1/3 per sec → ~3초
    const t      = Math.min(progress.current, 1);
    const eased  = easeOutCubic(t);

    camera.position.set(
      0,
      60 - 45 * eased,   // 60 → 15
      60 - 35 * eased    // 60 → 25
    );
    camera.lookAt(0, 0, 0);

    if (t >= 1) done.current = true;
  });
}
