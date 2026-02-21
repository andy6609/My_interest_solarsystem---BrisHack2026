'use client';

import { Grid } from '@react-three/drei';
import { SCENE_CONFIG } from '@/config/sceneConfig';

const { grid } = SCENE_CONFIG;

export function GridFloor() {
  return (
    <Grid
      position={grid.position}
      args={[100, 100]}
      cellSize={grid.cellSize}
      cellThickness={0.5}
      cellColor={grid.cellColor}
      sectionSize={grid.sectionSize}
      sectionThickness={1}
      sectionColor={grid.sectionColor}
      fadeDistance={grid.fadeDistance}
      fadeStrength={1}
      infiniteGrid
    />
  );
}
