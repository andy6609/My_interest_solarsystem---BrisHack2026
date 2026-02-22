'use client';

import { PLANET_COUNT_MIN, PLANET_COUNT_MAX } from '@/lib/utils/constants';

interface Props {
  value: number;
  max?: number;
  onChange: (count: number) => void;
}

function getLabel(v: number): string {
  if (v <= 5) return 'Broad';
  if (v <= 10) return 'Medium';
  return 'Specific';
}

export function PlanetCountSlider({ value, max = PLANET_COUNT_MAX, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 bg-black/60 backdrop-blur border border-white/10 px-4 py-3 rounded-2xl">
      <span className="text-xs text-gray-500 uppercase tracking-widest whitespace-nowrap">
        Planets
      </span>

      <input
        type="range"
        min={PLANET_COUNT_MIN}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-44 accent-star-blue cursor-pointer"
      />

      <span className="text-2xl font-bold text-star-blue min-w-[1.5rem] text-center tabular-nums">
        {value}
      </span>

      <span className="text-xs text-gray-500 min-w-[3rem]">
        {getLabel(value)}
      </span>
    </div>
  );
}
