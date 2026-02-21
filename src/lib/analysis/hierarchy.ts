import type { CategoryNode, PlanetVisualData } from '@/types';
import { calculateVisuals } from './visualMapper';
import type { CategoryData } from '@/types';

function nodeToCategoryData(node: CategoryNode): CategoryData {
  return {
    name: node.name,
    description: node.description,
    questionCount: node.questionIndices.length,
    representativeQuestions: node.representativeQuestions,
    subTopics: node.subTopics,
    recentActivityScore: node.recentActivityScore,
    growthTrend: node.growthTrend,
  };
}

export function getPlanetsForCount(
  tree: CategoryNode[],
  planetCount: number,
  totalQuestions: number
): PlanetVisualData[] {
  const level1Count = tree.length;
  const level2Count = tree.reduce(
    (sum, node) => sum + (node.children?.length || 0),
    0
  );

  let selectedNodes: CategoryNode[];

  if (planetCount <= level1Count) {
    selectedNodes = [...tree]
      .sort((a, b) => b.questionIndices.length - a.questionIndices.length)
      .slice(0, planetCount);
  } else if (level2Count > 0 && planetCount < level2Count) {
    const result: CategoryNode[] = [];
    let remaining = planetCount;

    const sortedTree = [...tree].sort(
      (a, b) => b.questionIndices.length - a.questionIndices.length
    );

    for (const parent of sortedTree) {
      if (remaining <= 0) break;

      const children = parent.children || [];
      if (children.length > 1 && children.length <= remaining) {
        result.push(...children);
        remaining -= children.length;
      } else {
        result.push(parent);
        remaining -= 1;
      }
    }

    selectedNodes = result;
  } else {
    selectedNodes = tree.flatMap((parent) =>
      parent.children?.length ? parent.children : [parent]
    );
  }

  const categoryData = selectedNodes.map(nodeToCategoryData);
  return calculateVisuals(categoryData, totalQuestions);
}
