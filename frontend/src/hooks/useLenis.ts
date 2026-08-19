import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from './useReducedMotion';

/**
 * One instance per mounted view, destroyed on unmount — a global instance
 * surviving route changes fights the next view for scroll control.
 *
 * Defaults are deliberate: Lenis' out-expo easing is the point. Tuning the
 * duration up turns smoothing into slow-motion.
 */
export function useLenis(enabled = true): void {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Reduced motion means native scroll, not a gentler Lenis.
    if (!enabled || reducedMotion) return;

    const lenis = new Lenis();
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled, reducedMotion]);
}
