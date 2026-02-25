'use client';

import { DistributionChart } from '@/components/charts/DistributionChart';
import { ActivityTimeline } from '@/components/charts/ActivityTimeline';
import type { PlanetVisualData, ParsedData } from '@/types';

interface Props {
  planets: PlanetVisualData[];
  parsedData: ParsedData | null;
  totalQuestions: number;
  planetCount: number;
  selectedPlanet: PlanetVisualData | null;
  onPlanetSelect: (planet: PlanetVisualData) => void;
}

function StatCard({ label, value, multiline }: { label: string; value: string | number; multiline?: boolean }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 min-h-[64px] flex flex-col justify-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      {multiline && typeof value === 'string' ? (
        <p className="text-sm font-semibold text-gray-200 leading-snug whitespace-pre-line">{value}</p>
      ) : (
        <p className="text-sm font-semibold text-gray-200 truncate">{value}</p>
      )}
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  if (trend === 'rising') return <span className="text-green-400 text-xs">↑</span>;
  if (trend === 'declining') return <span className="text-red-400 text-xs">↓</span>;
  return <span className="text-gray-400 text-xs">→</span>;
}

export function LeftPanel({
  planets, parsedData, totalQuestions, planetCount,
  selectedPlanet, onPlanetSelect,
}: Props) {
  const platform = parsedData?.metadata.platform ?? '—';
  const dateRange = parsedData
    ? `${parsedData.metadata.dateRange.start.slice(0, 10)} ~\n${parsedData.metadata.dateRange.end.slice(0, 10)}`
    : '—';

  return (
    <div className="flex flex-col gap-4 p-4 pt-20">

      {/* 헤더 */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Overview</p>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Qs" value={totalQuestions} />
          <StatCard label="Planets" value={planetCount} />
          <StatCard label="Platform" value={platform} />
          <StatCard label="Period" value={dateRange} multiline />
        </div>
      </div>

      {/* 분포 차트 */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Distribution</p>
        <DistributionChart planets={planets} />
      </div>

      {/* 활동 타임라인 */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Activity (7d)</p>
        <ActivityTimeline planets={planets} />
      </div>

      {/* 행성 목록 */}
      <div>
        <div className="flex items-center px-3 mb-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <p className="flex-1">Planets</p>
          <div className="flex items-center gap-2.5">
            <span className="w-10 text-center">Trends</span>
            <span className="w-8 text-right">Qs</span>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {[...planets]
            .sort((a, b) => b.questionCount - a.questionCount)
            .map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onPlanetSelect(p)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                    transition-colors
                    ${selectedPlanet?.id === p.id
                      ? 'bg-white/15 text-white'
                      : 'hover:bg-white/8 text-gray-300'}
                  `}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}80` }}
                  />
                  <span className="text-xs truncate flex-1">{p.name}</span>
                  <div className="w-10 text-center shrink-0"><TrendIcon trend={p.growthTrend} /></div>
                  <span className="w-8 text-right text-[10px] text-gray-500 tabular-nums shrink-0">{p.questionCount}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
