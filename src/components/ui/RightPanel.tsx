'use client';

import { motion } from 'framer-motion';
import type { PlanetVisualData } from '@/types';

interface Props {
  planet: PlanetVisualData | null;
  onClose: () => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function TrendBadge({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  const cfg = {
    rising: { label: '↑ Rising', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    stable: { label: '→ Stable', cls: 'bg-gray-500/20  text-gray-400  border-gray-500/30' },
    declining: { label: '↓ Declining', cls: 'bg-red-500/20   text-red-400   border-red-500/30' },
  }[trend];

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function RightPanel({ planet, onClose }: Props) {
  if (!planet) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div
          className="w-16 h-16 rounded-full mb-4 opacity-30"
          style={{ background: 'radial-gradient(circle, #4FC3F7, transparent)' }}
        />
        <p className="text-sm text-gray-500">행성을 클릭하면</p>
        <p className="text-sm text-gray-500">상세 정보가 표시됩니다</p>
      </div>
    );
  }

  return (
    <motion.div
      key={planet.id}
      className="flex flex-col gap-4 p-4"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* 닫기 버튼 */}
      <motion.div variants={fadeUp} className="flex justify-end">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-xs transition-colors"
        >
          ✕ 닫기
        </button>
      </motion.div>

      {/* 행성 헤더 */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full shrink-0"
          style={{
            backgroundColor: planet.color,
            boxShadow: `0 0 24px ${planet.color}60`,
          }}
        />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{planet.name}</h2>
          <p className="text-xs text-gray-400">{planet.questionCount}개 질문</p>
        </div>
      </motion.div>

      {/* 성장 추세 */}
      <motion.div variants={fadeUp}>
        <TrendBadge trend={planet.growthTrend} />
      </motion.div>

      {/* 설명 */}
      <motion.p variants={fadeUp} className="text-xs text-gray-300 leading-relaxed">
        {planet.description}
      </motion.p>

      {/* 대표 질문 */}
      <motion.div variants={fadeUp}>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
          Representative Questions
        </p>
        <motion.ul variants={stagger} className="flex flex-col gap-1">
          {planet.representativeQuestions.map((q, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className="text-xs text-gray-300 py-2 border-b border-white/5 leading-relaxed"
            >
              &quot;{q}&quot;
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      {/* 위성 (세부 토픽) */}
      <motion.div variants={fadeUp}>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
          Moons · Sub-topics
        </p>
        <div className="flex flex-wrap gap-1.5">
          {planet.subTopics.map((topic, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-white/8 border border-white/10 rounded-full text-[10px] text-gray-300"
            >
              {topic}
            </span>
          ))}
        </div>
      </motion.div>

      {/* 활동 점수 바 */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Activity Score</p>
          <p className="text-[10px] text-gray-400">
            {Math.round(planet.recentActivityScore * 100)}%
          </p>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: planet.color }}
            initial={{ width: 0 }}
            animate={{ width: `${planet.recentActivityScore * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
