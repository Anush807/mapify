import { Layers, Compass, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from './Reveal';

/**
 * Presented as equals — no numbering. These are independent reasons, not a
 * sequence, so a 01/02/03 treatment here would be a fake progression.
 */
const BENEFITS = [
  {
    icon: Layers,
    title: 'Structure instead of scattered tutorials',
    body: 'One path in a sensible order, instead of ten open tabs and no idea which to do first.',
  },
  {
    icon: Compass,
    title: 'Always know what’s next',
    body: 'Your progress is saved against the path, so stepping away for a week costs you nothing.',
  },
  {
    icon: Sparkles,
    title: 'Built around your topic, not a catalogue',
    body: 'Each roadmap is generated for what you actually asked for, down to the phrasing — not picked off a shelf of pre-made courses.',
  },
];

export function WhyItHelps() {
  return (
    <section className="container py-16 md:py-24">
      <Reveal>
        <h2 className="max-w-2xl text-balance font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Why it helps
        </h2>
      </Reveal>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {BENEFITS.map((benefit, i) => (
          <Reveal as="li" key={benefit.title} index={i}>
            <Card className="h-full">
              <CardHeader className="gap-3">
                <benefit.icon className="size-5 text-primary-strong" aria-hidden />
                <CardTitle className="font-display text-base leading-snug">
                  {benefit.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">{benefit.body}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
