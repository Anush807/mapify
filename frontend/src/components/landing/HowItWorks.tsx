import { Reveal } from './Reveal';

/**
 * Numbered — and this is the one section on the page that earns it. These are
 * three steps in a fixed order, not three independent features.
 */
const STEPS = [
  {
    title: 'Tell it what you want to learn',
    body: 'A topic, a skill, a subject. As specific or as broad as you want.',
  },
  {
    title: 'Get a roadmap, not a list',
    body: 'The path breaks the topic into an order that actually makes sense, with resources at each step.',
  },
  {
    title: 'Check off your progress',
    body: 'See exactly where you are and what’s next, instead of losing your place across a dozen open tabs.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-muted">
      <div className="container py-16 md:py-24">
        <Reveal>
          <h2 className="max-w-2xl text-balance font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            How it works
          </h2>
        </Reveal>

        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} index={i} className="flex flex-col gap-3">
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-primary-strong">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  aria-hidden
                  className="mt-2 h-px flex-1 bg-border"
                />
              </span>
              <h3 className="font-display text-lg font-semibold leading-snug">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
