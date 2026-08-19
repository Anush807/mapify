import { Link } from 'react-router-dom';
import { HeroPathAnimation } from './HeroPathAnimation';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
      <div className="flex flex-col items-start gap-6">
        <h1 className="max-w-xl text-balance font-display text-4xl font-bold leading-[1.03] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          Any topic. A clear path to learn it.
        </h1>

        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
          Type in what you want to learn. Get a roadmap, not a search results page — and
          track your way through it, step by step.
        </p>

        {/* Full width when stacked: the ghost button's padding would otherwise
            indent its label out of line with the primary button above it. */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/new">Build your roadmap</Link>
          </Button>
          <Button variant="ghost" size="lg" className="w-full sm:w-auto" asChild>
            {/* Same-page jump, so it stays a real anchor. */}
            <a href="#example">See an example</a>
          </Button>
        </div>
      </div>

      {/* Decorative: the headline and subhead carry the whole message without it. */}
      <div className="lg:pl-4">
        <HeroPathAnimation />
      </div>
    </section>
  );
}
