'use client';

import { useCameraIntro } from '@/hooks/useCameraIntro';

// useFrame이 필요한 컴포넌트는 Canvas 내부에서 사용해야 함
export function CameraIntro() {
  useCameraIntro();
  return null;
}
