import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Reveal } from './Reveal';

export function FinalCta() {
  return (
    <section className="container py-20 md:py-28">
      <Reveal className="flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-2xl text-balance font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Stop guessing what to learn next.
        </h2>
        <Button size="lg" asChild>
          <Link to="/new">Build your roadmap</Link>
        </Button>
      </Reveal>
    </section>
  );
}
