import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { WhyItHelps } from '@/components/landing/WhyItHelps';
import { RoadmapPreview } from '@/components/landing/RoadmapPreview';
import { FinalCta } from '@/components/landing/FinalCta';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useLenis } from '@/hooks/useLenis';

export function Landing() {
  // One instance for the page, destroyed on unmount; skipped under reduced motion.
  useLenis();

  return (
    // Light-only (spec scope) — the scope class re-declares the light tokens so
    // this page stays light even when the app shell is set to dark.
    <div className="theme-light-only flex min-h-screen flex-col bg-background text-foreground">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <WhyItHelps />
        <RoadmapPreview />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
