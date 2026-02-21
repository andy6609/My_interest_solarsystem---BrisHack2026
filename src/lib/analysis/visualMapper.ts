import type { CategoryData, MoonData, PlanetVisualData } from '@/types';
import { PLANET_COLORS } from '@/lib/utils/constants';

export function calculateVisuals(
  categories: CategoryData[],
  totalQuestions: number
): PlanetVisualData[] {
  const sorted = [...categories].sort(
    (a, b) => b.questionCount - a.questionCount
  );

  return sorted.map((cat, index) => {
    const ratio = cat.questionCount / (totalQuestions || 1);

    const moons: MoonData[] = cat.subTopics.slice(0, 4).map((topic, i) => ({
      id: `moon-${index}-${i}`,
      name: topic,
      orbitRadius: 0.8 + i * 0.4,
      size: 0.1,
    }));

    return {
      id: `planet-${index}`,
      name: cat.name,
      description: cat.description,
      radius: 0.3 + ratio * 4.0,
      orbitRadius: 4 + (index / Math.max(sorted.length - 1, 1)) * 16,
      orbitSpeed: 0.5 / (1 + index * 0.3),
      color: PLANET_COLORS[index % PLANET_COLORS.length],
      emissiveIntensity: cat.recentActivityScore,
      tilt: (Math.random() - 0.5) * 0.4,
      questionCount: cat.questionCount,
      representativeQuestions: cat.representativeQuestions,
      subTopics: cat.subTopics,
      moons,
      recentActivityScore: cat.recentActivityScore,
      growthTrend: cat.growthTrend,
    };
  });
}
