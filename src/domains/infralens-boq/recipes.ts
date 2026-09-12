import recipesData from './recipes.json';
import { WorkItemRecipe } from './types';

export const RECIPES: WorkItemRecipe[] = recipesData as WorkItemRecipe[];

export const RECIPES_MAP = new Map<string, WorkItemRecipe>(
  RECIPES.map(r => [r.slug, r])
);

export interface RecipeGroup {
  group: string;
  items: WorkItemRecipe[];
}

export const GROUPED_RECIPES: RecipeGroup[] = (() => {
  const map = new Map<string, WorkItemRecipe[]>();
  for (const item of RECIPES) {
    if (!map.has(item.group)) {
      map.set(item.group, []);
    }
    map.get(item.group)!.push(item);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
})();

export const DEFAULT_EXAMPLE_SLUGS = [
  { slug: "m20-concrete", qty: 12 },
  { slug: "rcc-reinforcement-steel", qty: 1.1 },
  { slug: "formwork-slab", qty: 95 },
  { slug: "brickwork-cm-1-6", qty: 18 },
  { slug: "plaster-12mm-1-4", qty: 220 },
  { slug: "vitrified-tile-flooring", qty: 90 },
  { slug: "interior-emulsion-2coat", qty: 350 },
  { slug: "point-wiring", qty: 24 }
];
