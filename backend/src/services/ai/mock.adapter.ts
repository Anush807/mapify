import { buildRoadmapPrompt } from './prompt';
import type { AiAdapter, GenerateOptions } from './types';

/**
 * Not in the spec — added so the full generate -> validate -> persist -> render
 * flow can be exercised locally without any provider API key. Set
 * AI_PROVIDER=mock. It returns the same validated shape a real provider would,
 * so nothing downstream can tell the difference.
 */
function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'topic'
  );
}

const STAGES: Array<{ title: string; steps: string[] }> = [
  { title: 'Orientation', steps: ['What it is', 'Why it matters', 'Set up your tools'] },
  { title: 'Fundamentals', steps: ['Core vocabulary', 'First hands-on exercise', 'Common mistakes'] },
  { title: 'Building Blocks', steps: ['Key techniques', 'Practice project'] },
  { title: 'Intermediate Practice', steps: ['Work from real examples', 'Debugging and testing'] },
  { title: 'Advanced Topics', steps: ['Performance and scale', 'Edge cases'] },
  { title: 'Mastery', steps: ['Build something end to end', 'Teach it to someone else'] },
];

export const mockAdapter: AiAdapter = {
  name: 'mock',

  async generateRoadmap(topic: string, _options: GenerateOptions = {}): Promise<string> {
    // Touch the prompt builder so a broken prompt still surfaces in mock runs.
    void buildRoadmapPrompt(topic);
    await new Promise((resolve) => setTimeout(resolve, 250)); // pretend latency

    const base = slugify(topic);
    const nodes = STAGES.map((stage, i) => {
      const id = `${base}-${slugify(stage.title)}`;
      return {
        id,
        title: `${stage.title}: ${topic}`,
        description: `Stage ${i + 1} of your ${topic} path. Work through each step before moving on.`,
        resources: i === 0 ? [`An introductory guide to ${topic}`] : [],
        children: stage.steps.map((step) => ({
          id: `${id}-${slugify(step)}`,
          title: step,
          description: `${step} — applied to ${topic}.`,
          resources: [],
          children: [],
        })),
      };
    });

    if (process.env.MOCK_FORCE_INVALID) return 'I am afraid I cannot help with that.';
    return JSON.stringify({
      topic,
      title: `A Learning Path for ${topic}`,
      summary: `A staged roadmap taking you from first principles to confident practice in ${topic}.`,
      nodes,
    });
  },
};

export default mockAdapter;
