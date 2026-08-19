/**
 * Phase 3 standalone check: generate a roadmap and validate it, no DB involved.
 *   npm run test:ai -- "learn rust"
 */
import { generateValidatedRoadmap } from '../services/roadmap.service';
import { collectTreeStats } from '../schemas/roadmap.schema';
import { env } from '../config/env';

async function main(): Promise<void> {
  const topic = process.argv.slice(2).join(' ') || 'learn typescript';
  console.log(`provider: ${env.AI_PROVIDER}\ntopic:    ${topic}\n`);

  const started = Date.now();
  const content = await generateValidatedRoadmap(topic);
  const stats = collectTreeStats(content.nodes);

  console.log(`✓ validated in ${Date.now() - started}ms`);
  console.log(`  title:  ${content.title}`);
  console.log(`  nodes:  ${stats.count}  depth: ${stats.depth}\n`);
  console.log(JSON.stringify(content, null, 2));
}

main().catch((err: unknown) => {
  console.error('✗ generation failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
