import { atom } from 'jotai';
import type { Roadmap } from '@/lib/types';
import { countNodes } from '@/lib/tree';

export const currentRoadmapAtom = atom<Roadmap | null>(null);

/** Derived: recomputes only when the roadmap itself changes. */
export const totalNodeCountAtom = atom((get) => {
  const roadmap = get(currentRoadmapAtom);
  return roadmap ? countNodes(roadmap.content.nodes) : 0;
});
