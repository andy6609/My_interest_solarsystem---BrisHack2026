import type { CategoryNode, PlanetVisualData } from '@/types';

export interface TransitionPlan {
  persist:    Array<{ from: PlanetVisualData; to: PlanetVisualData }>;
  split:      Array<{ from: PlanetVisualData; to: PlanetVisualData[] }>;
  merge:      Array<{ from: PlanetVisualData[]; to: PlanetVisualData }>;
  appear:     PlanetVisualData[];
  disappear:  PlanetVisualData[];
}

// ─── 트리 유틸 ───

function flattenTree(tree: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function walk(nodes: CategoryNode[]) {
    for (const n of nodes) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(tree);
  return result;
}

function getChildrenNames(name: string, tree: CategoryNode[]): string[] {
  const all = flattenTree(tree);
  const node = all.find((n) => n.name === name);
  if (!node) return [];
  return (node.children ?? []).map((c) => c.name);
}

function getParentName(name: string, tree: CategoryNode[]): string | null {
  for (const top of tree) {
    for (const child of top.children ?? []) {
      if (child.name === name) return top.name;
    }
  }
  return null;
}

// ─── 메인 매칭 ───

export function planTransition(
  oldPlanets: PlanetVisualData[],
  newPlanets: PlanetVisualData[],
  tree: CategoryNode[]
): TransitionPlan {
  const plan: TransitionPlan = {
    persist: [], split: [], merge: [], appear: [], disappear: [],
  };

  const matchedOldIds  = new Set<string>();
  const matchedNewIds  = new Set<string>();

  // 1. 이름 동일 → persist
  for (const np of newPlanets) {
    const same = oldPlanets.find((op) => op.name === np.name);
    if (same) {
      plan.persist.push({ from: same, to: np });
      matchedOldIds.add(same.id);
      matchedNewIds.add(np.id);
    }
  }

  // 2. old 1개 → new 여러 개 (부모가 자식으로 분열)
  for (const op of oldPlanets) {
    if (matchedOldIds.has(op.id)) continue;
    const childNames = getChildrenNames(op.name, tree);
    const children   = newPlanets.filter(
      (np) => childNames.includes(np.name) && !matchedNewIds.has(np.id)
    );
    if (children.length > 1) {
      plan.split.push({ from: op, to: children });
      matchedOldIds.add(op.id);
      children.forEach((c) => matchedNewIds.add(c.id));
    }
  }

  // 3. old 여러 개 → new 1개 (자식들이 부모로 합체)
  for (const np of newPlanets) {
    if (matchedNewIds.has(np.id)) continue;
    const childNames = getChildrenNames(np.name, tree);
    const fromOld    = oldPlanets.filter(
      (op) => childNames.includes(op.name) && !matchedOldIds.has(op.id)
    );
    if (fromOld.length > 1) {
      plan.merge.push({ from: fromOld, to: np });
      fromOld.forEach((o) => matchedOldIds.add(o.id));
      matchedNewIds.add(np.id);
    }
  }

  // 4. 매칭 안 된 new → appear
  for (const np of newPlanets) {
    if (!matchedNewIds.has(np.id)) plan.appear.push(np);
  }

  // 5. 매칭 안 된 old → disappear
  for (const op of oldPlanets) {
    if (!matchedOldIds.has(op.id)) plan.disappear.push(op);
  }

  return plan;
}
