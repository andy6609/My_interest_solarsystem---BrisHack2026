'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: string;
  label: string;
  detail?: string;
}

const STEPS: Step[] = [
  { id: 'parse', label: '데이터 파싱', detail: '대화 기록 읽는 중...' },
  { id: 'extract', label: '질문 추출', detail: 'user 메시지 필터링 중...' },
  { id: 'classify', label: 'AI 분류', detail: 'Claude가 관심사를 분석하고 있습니다...' },
  { id: 'map', label: '행성 생성', detail: '시각화 데이터 매핑 중...' },
  { id: 'render', label: '태양계 구성', detail: '3D 씬을 준비하고 있습니다...' },
];

interface Props {
  currentStep: string;
  questionCount?: number;
}

export function LoadingSequence({ currentStep, questionCount }: Props) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-space-bg flex flex-col items-center justify-center text-white">
      {/* 중앙 항성 애니메이션 */}
      <div className="relative mb-12">
        <motion.div
          className="w-20 h-20 rounded-full bg-star-blue/30 border-2 border-star-blue"
          animate={{
            scale: [1, 1.15, 1],
            boxShadow: [
              '0 0 20px rgba(79,195,247,0.3)',
              '0 0 50px rgba(79,195,247,0.6)',
              '0 0 20px rgba(79,195,247,0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          ✦
        </div>
      </div>

      {/* 질문 수 */}
      {questionCount && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-400 text-sm mb-8"
        >
          {questionCount.toLocaleString()}개의 질문을 분석하고 있습니다{dots}
        </motion.p>
      )}

      {/* 스텝 목록 */}
      <div className="w-full max-w-xs space-y-3">
        <AnimatePresence>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isCurrent ? 'bg-star-blue/10 border border-star-blue/30' : ''
                  }`}
              >
                {/* 아이콘 */}
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {isDone ? (
                    <span className="text-green-400 text-sm">✓</span>
                  ) : isCurrent ? (
                    <motion.div
                      className="w-3 h-3 rounded-full border-2 border-star-blue border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                </div>

                {/* 라벨 */}
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium ${isDone
                      ? 'text-gray-500 line-through'
                      : isCurrent
                        ? 'text-white'
                        : 'text-gray-600'
                      }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && step.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export { STEPS };
