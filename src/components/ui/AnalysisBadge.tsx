'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AnalysisProgress {
  status: 'refining' | 'done';
  progress: number;          // 0~100
  processedQuestions: number;
  totalQuestions: number;
}

interface Props {
  progress: AnalysisProgress | null;
}

export function AnalysisBadge({ progress }: Props) {
  const [visible, setVisible] = useState(true);

  // "완료" 3초 후 자동 페이드아웃
  useEffect(() => {
    if (progress?.status === 'done') {
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [progress?.status]);

  if (!progress || !visible) return null;

  return (
    <AnimatePresence>
      {progress.status === 'refining' && (
        <motion.div
          key="refining"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                     bg-black/60 border border-star-blue/30 backdrop-blur-sm"
        >
          {/* 스피너 */}
          <div className="w-3 h-3 rounded-full border-2 border-star-blue/30 border-t-star-blue animate-spin shrink-0" />

          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[10px] text-star-blue font-medium whitespace-nowrap">
              정밀 분석 진행 중...
            </p>
            <p className="text-[9px] text-gray-500">
              {progress.processedQuestions.toLocaleString()} / {progress.totalQuestions.toLocaleString()}개 처리됨
            </p>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden shrink-0">
            <motion.div
              className="h-full bg-star-blue rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <span className="text-[9px] text-gray-400 shrink-0">
            {progress.progress}%
          </span>
        </motion.div>
      )}

      {progress.status === 'done' && (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl
                     bg-black/60 border border-green-500/30 backdrop-blur-sm"
        >
          <span className="text-green-400 text-xs">✓</span>
          <p className="text-[10px] text-green-400 whitespace-nowrap">
            분석 완료 · {progress.totalQuestions.toLocaleString()}개 반영됨
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
