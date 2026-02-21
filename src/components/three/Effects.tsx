'use client';

import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { SCENE_CONFIG } from '@/config/sceneConfig';

const cfg = SCENE_CONFIG.postProcessing;

// ─────────────────────────────────────────────
// 프로덕션용 — 고정 파라미터
// ─────────────────────────────────────────────
function ProductionEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={cfg.bloom.luminanceThreshold}
        luminanceSmoothing={cfg.bloom.luminanceSmoothing}
        intensity={cfg.bloom.intensity}
        kernelSize={KernelSize.LARGE}
        mipmapBlur={cfg.bloom.mipmapBlur}
        levels={cfg.bloom.levels}
      />
      <Vignette
        eskil={false}
        offset={cfg.vignette.offset}
        darkness={cfg.vignette.darkness}
        blendFunction={BlendFunction.NORMAL}
      />
      {cfg.chromaticAberration.enabled && (
        <ChromaticAberration
          offset={new THREE.Vector2(
            cfg.chromaticAberration.offset[0],
            cfg.chromaticAberration.offset[1]
          )}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={true}
          modulationOffset={0.5}
        />
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────
// 개발용 — leva GUI로 실시간 파라미터 조절
// ─────────────────────────────────────────────
function DevEffects() {
  // leva는 클라이언트 사이드에서만 동작하므로 dynamic import 패턴
  // 여기서는 직접 사용 (이미 'use client')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useControls } = require('leva');

  const bloom = useControls('Bloom', {
    threshold: { value: cfg.bloom.luminanceThreshold, min: 0, max: 1, step: 0.01 },
    intensity: { value: cfg.bloom.intensity, min: 0, max: 5, step: 0.1 },
    smoothing: { value: cfg.bloom.luminanceSmoothing, min: 0, max: 1, step: 0.01 },
  });

  const vignette = useControls('Vignette', {
    offset: { value: cfg.vignette.offset, min: 0, max: 1, step: 0.01 },
    darkness: { value: cfg.vignette.darkness, min: 0, max: 1.5, step: 0.01 },
  });

  const ca = useControls('ChromaticAberration', {
    enabled: { value: cfg.chromaticAberration.enabled },
    offset: { value: cfg.chromaticAberration.offset[0], min: 0, max: 0.005, step: 0.0001 },
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={bloom.threshold}
        luminanceSmoothing={bloom.smoothing}
        intensity={bloom.intensity}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
        levels={5}
      />
      <Vignette
        eskil={false}
        offset={vignette.offset}
        darkness={vignette.darkness}
        blendFunction={BlendFunction.NORMAL}
      />
      {ca.enabled && (
        <ChromaticAberration
          offset={new THREE.Vector2(ca.offset, ca.offset)}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={true}
          modulationOffset={0.5}
        />
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────
// 익스포트 — dev/prod 자동 분기
// ─────────────────────────────────────────────
export function PostEffects() {
  if (process.env.NODE_ENV === 'development') {
    return <DevEffects />;
  }
  return <ProductionEffects />;
}
