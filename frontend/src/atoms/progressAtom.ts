import { atom } from 'jotai';
import { totalNodeCountAtom } from './currentRoadmapAtom';

/**
 * A Set so the recursive node tree can test membership in O(1) — with ~150
 * nodes each re-rendering on every toggle, an array scan would be the hot path.
 */
export const progressAtom = atom<Set<string>>(new Set<string>());

export const progressStatsAtom = atom((get) => {
  const completed = get(progressAtom).size;
  const total = get(totalNodeCountAtom);
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
});
