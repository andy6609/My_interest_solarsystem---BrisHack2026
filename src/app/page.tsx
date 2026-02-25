'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadModal } from '@/components/ui/UploadModal';
import { useSolarStore } from '@/lib/store/useSolarStore';
import { LandingStarBackground } from '@/components/three/LandingStarBackground';
import type { ParsedData } from '@/types';

export default function LandingPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openGuide, setOpenGuide] = useState<'gemini' | 'chatgpt' | null>(null);
  const { setParsedData, setPhase, setUserName, userName } = useSolarStore();

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
      <div className="absolute inset-0 pointer-events-none">
        <LandingStarBackground />
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
          Upload your AI conversation history
          <br />
          and watch your interests be visualized as a{' '}
          <span className="text-star-blue font-medium">3D Solar System</span>.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          {/* 이름 입력란 */}
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-base focus:outline-none focus:border-star-blue/60 focus:bg-white/10 transition-colors"
          />

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

        {/* 내보내기 안내 토글 */}
        <div className="mt-4 w-full max-w-xs mx-auto text-left space-y-1">

          {/* Gemini */}
          <button
            onClick={() => setOpenGuide(openGuide === 'gemini' ? null : 'gemini')}
            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
          >
            <span>How to export Gemini data</span>
            <span>{openGuide === 'gemini' ? '▲' : '▼'}</span>
          </button>
          {openGuide === 'gemini' && (
            <ol className="text-xs text-gray-400 space-y-1.5 pl-3 pb-2 border-l border-white/10 leading-relaxed">
              <li><span className="text-gray-500">1.</span> Go to <span className="text-star-blue">takeout.google.com</span> and sign in.</li>
              <li><span className="text-gray-500">2.</span> Click <strong className="text-white">Deselect all</strong> at the top.</li>
              <li><span className="text-gray-500">3.</span> Scroll down and check <strong className="text-white">My Activity</strong>.</li>
              <li><span className="text-gray-500">4.</span> Click <em>All activity data included</em> → in the popup, deselect all, then check only <strong className="text-white">Gemini Apps</strong> → OK.</li>
              <li><span className="text-gray-500">5.</span> Click <strong className="text-white">Next step</strong>, confirm zip format, then <strong className="text-white">Create export</strong>.</li>
            </ol>
          )}

          {/* ChatGPT */}
          <button
            onClick={() => setOpenGuide(openGuide === 'chatgpt' ? null : 'chatgpt')}
            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
          >
            <span>How to export ChatGPT data</span>
            <span>{openGuide === 'chatgpt' ? '▲' : '▼'}</span>
          </button>
          {openGuide === 'chatgpt' && (
            <ol className="text-xs text-gray-400 space-y-1.5 pl-3 pb-2 border-l border-white/10 leading-relaxed">
              <li><span className="text-gray-500">1.</span> Click your profile name (bottom-left) → <strong className="text-white">Settings</strong> → <strong className="text-white">Data controls</strong>.</li>
              <li><span className="text-gray-500">2.</span> Under <em>Export data</em>, click <strong className="text-white">Export</strong>.</li>
              <li><span className="text-gray-500">3.</span> Click <strong className="text-white">Confirm export</strong> in the popup.</li>
              <li><span className="text-gray-500">4.</span> A download link will be sent to your email (may take a few minutes to a few hours).</li>
            </ol>
          )}

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
