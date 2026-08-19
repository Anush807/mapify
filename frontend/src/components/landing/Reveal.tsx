import { motion, type Variants } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Every scroll-triggered entrance on the page goes through this — same easing,
 * same distance, same duration. Section-by-section hand-tuning is what makes a
 * page feel like several animation systems bolted together.
 *
 * `once` is non-negotiable: re-animating on scroll-up is distracting and makes
 * the page feel unsettled.
 */
const DURATION = 0.55;
const EASE = [0.16, 1, 0.3, 1] as const;
const RISE = 16;

const variants: Variants = {
  hidden: { opacity: 0, y: RISE },
  visible: { opacity: 1, y: 0 },
};

interface RevealProps {
  children: React.ReactNode;
  /** Stagger position within a group — small, so a row still reads as one unit. */
  index?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}

export function Reveal({ children, index = 0, className, as = 'div' }: RevealProps) {
  const reducedMotion = useReducedMotion();
  const Component = motion[as];

  // Reduced motion: content is simply present. No fade, no rise, no delay.
  if (reducedMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: DURATION, ease: EASE, delay: index * 0.08 }}
    >
      {children}
    </Component>
  );
}
