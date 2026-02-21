'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadModal } from '@/components/ui/UploadModal';
import { useSolarStore } from '@/lib/store/useSolarStore';
import type { ParsedData } from '@/types';

export default function LandingPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setParsedData, setPhase } = useSolarStore();

  // 업로드 완료 → 분석 페이지로 이동
  const handleParsed = (data: ParsedData) => {
    setParsedData(data);
    setPhase('processing');
    router.push('/solar-system');
  };

  // 샘플 데이터 → 바로 태양계로
  const handleSample = () => {
    setPhase('solar-system');
    router.push('/solar-system?sample=true');
  };

  return (
    <main className="min-h-screen bg-space-bg flex flex-col items-center justify-center text-white relative overflow-hidden">
      {/* 별 배경 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: (i % 3 === 0 ? 2 : 1) + 'px',
              height: (i % 3 === 0 ? 2 : 1) + 'px',
              top: ((i * 137.5) % 100) + '%',
              left: ((i * 97.3) % 100) + '%',
              opacity: 0.2 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 text-center max-w-xl px-6">
        {/* 항성 아이콘 */}
        <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-star-blue/20 border-2 border-star-blue/60 flex items-center justify-center shadow-[0_0_60px_rgba(79,195,247,0.4)]">
          <span className="text-5xl select-none">✦</span>
        </div>

        <h1 className="text-4xl font-bold mb-2 text-white tracking-tight">
          My Interest
          <br />
          <span className="text-star-blue">Solar System</span>
        </h1>

        <p className="text-gray-400 mt-4 mb-10 text-base leading-relaxed">
          AI 대화 기록을 업로드하면
          <br />
          내 관심사가{' '}
          <span className="text-star-blue font-medium">3D 태양계</span>로
          시각화됩니다.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            onClick={handleSample}
            className="w-full py-3 rounded-xl bg-star-blue text-space-bg font-bold text-base hover:bg-star-glow transition-colors shadow-[0_0_20px_rgba(79,195,247,0.3)]"
          >
            Try with Sample Data
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 rounded-xl border border-white/20 text-white font-medium text-base hover:bg-white/10 transition-colors"
          >
            Upload Data
          </button>
        </div>

        <div className="mt-10 text-xs text-gray-600">
          Supported: ChatGPT · Claude · Gemini · Plain Text
        </div>
      </div>

      {/* 업로드 모달 */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onParsed={handleParsed}
      />
    </main>
  );
}
