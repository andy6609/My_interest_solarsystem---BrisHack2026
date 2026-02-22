import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppPhase,
  CategoryNode,
  ParsedData,
  PlanetVisualData,
  SolarStore,
} from '@/types';
import { PLANET_COUNT_DEFAULT } from '@/lib/utils/constants';

export const useSolarStore = create<SolarStore>()(
  persist(
    (set) => ({
      phase: 'landing',
      parsedData: null,
      categoryTree: [],
      planets: [],
      planetCount: PLANET_COUNT_DEFAULT,
      selectedPlanet: null,
      totalQuestions: 0,
      userName: '',

      setPhase: (phase: AppPhase) => set({ phase }),
      setParsedData: (data: ParsedData) => set({ parsedData: data }),
      setCategoryTree: (tree: CategoryNode[]) => set({ categoryTree: tree }),
      setPlanets: (planets: PlanetVisualData[]) => set({ planets }),
      setPlanetCount: (count: number) => set({ planetCount: count }),
      setSelectedPlanet: (planet: PlanetVisualData | null) =>
        set({ selectedPlanet: planet }),
      setTotalQuestions: (count: number) => set({ totalQuestions: count }),
      setUserName: (name: string) => set({ userName: name }),
      reset: () =>
        set({
          phase: 'landing',
          parsedData: null,
          categoryTree: [],
          planets: [],
          planetCount: PLANET_COUNT_DEFAULT,
          selectedPlanet: null,
          totalQuestions: 0,
          userName: '',
        }),
    }),
    {
      name: 'solar-system-store',
      partialize: (state) => ({
        categoryTree: state.categoryTree,
        planets: state.planets,
        planetCount: state.planetCount,
        totalQuestions: state.totalQuestions,
      }),
    }
  )
);
