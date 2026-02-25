'use client';

import { shaderMaterial, Html } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useSolarStore } from '@/lib/store/useSolarStore';

// ─────────────────────────────────────────────
// 셰이더 머티리얼 정의
// ─────────────────────────────────────────────
const StarCoreShaderMaterial = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uColor1: new THREE.Color('#ffffff'),  // 중심 (밝은 흰색)
    uColor2: new THREE.Color('#4FC3F7'),  // 중간 (시안)
    uColor3: new THREE.Color('#0288D1'),  // 외곽 (진한 파랑)
    uNoiseScale: 3.0,
    uNoiseSpeed: 0.8,
    uFresnelPower: 2.5,
    uPulseSpeed: 1.5,
    uDistortStrength: 0.15,
  },

  // ─── Vertex Shader ───
  /* glsl */ `
    uniform float uTime;
    uniform float uNoiseScale;
    uniform float uDistortStrength;

    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vPosition;
    varying float vDisplacement;

    // ── Simplex Noise 3D ──
    vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x)  { return mod289v4(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289v3(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_  = 0.142857142857;
      vec3  ns  = n_ * D.wyz - D.xzx;
      vec4  j   = p - 49.0 * floor(p * ns.z * ns.z);
      vec4  x_  = floor(j * ns.z);
      vec4  y_  = floor(j - 7.0 * x_);
      vec4  x   = x_ * ns.x + ns.yyyy;
      vec4  y   = y_ * ns.x + ns.yyyy;
      vec4  h   = 1.0 - abs(x) - abs(y);
      vec4  b0  = vec4(x.xy, y.xy);
      vec4  b1  = vec4(x.zw, y.zw);
      vec4  s0  = floor(b0)*2.0 + 1.0;
      vec4  s1  = floor(b1)*2.0 + 1.0;
      vec4  sh  = -step(h, vec4(0.0));
      vec4  a0  = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4  a1  = b1.xzyw + s1.xzyw * sh.zzww;
      vec3  p0  = vec3(a0.xy, h.x);
      vec3  p1  = vec3(a0.zw, h.y);
      vec3  p2  = vec3(a1.xy, h.z);
      vec3  p3  = vec3(a1.zw, h.w);
      vec4  norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv    = uv;
      vNormal = normalize(normalMatrix * normal);

      // 다층 노이즈 표면 왜곡
      float n1 = snoise(position * uNoiseScale       + uTime * 0.3);
      float n2 = snoise(position * uNoiseScale * 2.0 + uTime * 0.5) * 0.5;
      float displacement = (n1 + n2) * uDistortStrength;

      vDisplacement = displacement;
      vec3 newPos   = position + normal * displacement;
      vPosition     = newPos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,

  // ─── Fragment Shader ───
  /* glsl */ `
    uniform float uTime;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    uniform vec3  uColor3;
    uniform float uFresnelPower;
    uniform float uPulseSpeed;

    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vPosition;
    varying float vDisplacement;

    void main() {
      // 프레넬 — 가장자리일수록 시안 글로우
      vec3  viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), uFresnelPower);

      // 맥동
      float pulse = sin(uTime * uPulseSpeed) * 0.15 + 0.85;

      // 중심→외곽 그라데이션
      float centerGlow = 1.0 - fresnel;
      vec3  color = mix(uColor3, uColor2, centerGlow);
      color = mix(color, uColor1, centerGlow * centerGlow);

      // 노이즈 표면 패턴
      float pattern = vDisplacement * 5.0 + 0.5;
      color = mix(color, uColor1, pattern * 0.3);

      // 프레넬 글로우 추가
      color += uColor2 * fresnel * 0.6;

      // 최종 밝기
      float brightness = (1.0 + fresnel * 0.8) * pulse;

      gl_FragColor = vec4(color * brightness, 1.0);
    }
  `
);

// R3F에 등록
extend({ StarCoreShaderMaterial });

// TypeScript 타입 선언
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      starCoreShaderMaterial: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref?: React.Ref<any>;
        transparent?: boolean;
        depthWrite?: boolean;
      };
    }
  }
}

// ─────────────────────────────────────────────
// 수직 빛줄기 컴포넌트
// ─────────────────────────────────────────────
function LightBeam({ direction }: { direction: 'up' | 'down' }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const ySign = direction === 'up' ? 1 : -1;
  const HEIGHT = 24;

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.15 + Math.sin(clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <mesh position={[0, ySign * (HEIGHT / 2), 0]}>
      <cylinderGeometry
        args={[
          direction === 'up' ? 0.02 : 0.25,  // top radius
          direction === 'up' ? 0.25 : 0.02,  // bottom radius
          HEIGHT,
          8,
        ]}
      />
      <meshBasicMaterial
        ref={matRef}
        color="#4FC3F7"
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// 메인 항성 컴포넌트 (커스텀 셰이더)
// ─────────────────────────────────────────────
export function CentralStar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matRef = useRef<any>(null);
  const userName = useSolarStore((s) => s.userName);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uTime = clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* 광원 1: 시안 메인 */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        color="#4FC3F7"
        distance={60}
        decay={2}
      />
      {/* 광원 2: 흰색 코어 */}
      <pointLight
        position={[0, 0, 0]}
        intensity={1}
        color="#ffffff"
        distance={20}
        decay={2}
      />

      {/* 항성 코어 — 커스텀 셰이더 */}
      <mesh>
        <sphereGeometry args={[1.5, 128, 128]} />
        <starCoreShaderMaterial ref={matRef} depthWrite={true} />
      </mesh>

      {/* 글로우 레이어 1 — 가까운 후광 */}
      <mesh>
        <sphereGeometry args={[2.0, 32, 32]} />
        <meshBasicMaterial
          color="#4FC3F7"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 글로우 레이어 2 — 넓은 후광 */}
      <mesh>
        <sphereGeometry args={[3.0, 32, 32]} />
        <meshBasicMaterial
          color="#4FC3F7"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 글로우 레이어 3 — Bloom이 잡아서 퍼뜨리는 후광 */}
      <mesh>
        <sphereGeometry args={[4.5, 16, 16]} />
        <meshBasicMaterial
          color="#81D4FA"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 수직 빛줄기 */}
      <LightBeam direction="up" />
      <LightBeam direction="down" />

      {/* 사용자 이름 라벨 */}
      {userName && (
        <Html
          position={[0, 2.8, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-7 py-3 rounded-full text-3xl font-bold text-white whitespace-nowrap"
            style={{
              background: 'rgba(79,195,247,0.22)',
              border: '2.5px solid rgba(79,195,247,0.75)',
              textShadow: '0 0 18px rgba(79,195,247,0.95)',
              backdropFilter: 'blur(7px)',
            }}
          >
            {userName}
          </div>
        </Html>
      )}
    </group>
  );
}
