'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlanetVisualData } from '@/types';

interface Props {
  planets: PlanetVisualData[];
}

// recentActivityScore를 기반으로 가상의 7일 활동 데이터 생성
function buildActivityData(planets: PlanetVisualData[]) {
  const days = ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'];
  return days.map((day, i) => {
    const t = i / 6; // 0 → 1
    const total = planets.reduce((sum, p) => {
      // 최근일수록 recentActivityScore 높은 행성의 가중치를 높임
      const w = p.recentActivityScore > 0.6 ? t : 1 - t * 0.5;
      return sum + p.questionCount * w * (0.1 + Math.sin(i + p.recentActivityScore * 5) * 0.05);
    }, 0);
    return { day, questions: Math.round(total) };
  });
}

export function ActivityTimeline({ planets }: Props) {
  const data = buildActivityData(planets);

  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fill: '#6b7280', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 11,
            color: '#e5e7eb',
          }}
          cursor={{ stroke: 'rgba(79,195,247,0.3)' }}
          formatter={(v: number) => [v, 'questions']}
        />
        <Area
          type="monotone"
          dataKey="questions"
          stroke="#4FC3F7"
          strokeWidth={1.5}
          fill="url(#actGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
