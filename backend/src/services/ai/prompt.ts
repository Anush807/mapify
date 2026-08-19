import { MAX_DEPTH, MAX_NODES } from '../../schemas/roadmap.schema';

/**
 * A compact example of the exact shape we want back. Showing the schema beats
 * describing it — models match examples far more reliably than prose.
 */
const SHAPE_EXAMPLE = `{
  "topic": "the user's topic, echoed back",
  "title": "A Beginner-to-Advanced Path for <Topic>",
  "summary": "One or two sentences on what this path covers.",
  "nodes": [
    {
      "id": "fundamentals",
      "title": "Fundamentals",
      "description": "Why this stage matters and what 'done' looks like.",
      "resources": ["Name of a book, doc, or course"],
      "children": [
        {
          "id": "fundamentals-core-concepts",
          "title": "Core Concepts",
          "description": "A concrete sub-step.",
          "resources": [],
          "children": []
        }
      ]
    }
  ]
}`;

export const SYSTEM_PROMPT = [
  'You are a curriculum designer who builds learning roadmaps.',
  'You reply with a single JSON object and nothing else.',
].join(' ');

export function buildRoadmapPrompt(topic: string): string {
  return `Build a learning roadmap for this topic: "${topic}"

Return ONLY a JSON object matching this exact structure. No markdown code fences, no commentary, no prose before or after:

${SHAPE_EXAMPLE}

Rules:
- "id" must be a stable lowercase slug (letters, digits, hyphens only) and must be UNIQUE across the entire tree. Prefix child ids with the parent id.
- Order "nodes" as a path: the first entry is where a beginner starts, the last is mastery.
- Nesting is at most ${MAX_DEPTH} levels deep, and the whole tree has at most ${MAX_NODES} nodes total. Aim for 5-8 top-level stages with 2-5 children each.
- "description" is one or two sentences, concrete about what to learn and how to know you're done.
- "resources" holds 0-3 real, well-known books, docs, or courses. Never invent a URL — prefer names over links.
- "children" is always present; use [] for a leaf.
- If the topic is too vague to plan, still return valid JSON for your best reasonable interpretation of it.`;
}

/**
 * Appended verbatim to the second attempt. Telling the model *what* was wrong
 * fixes far more failures than simply asking again.
 */
export function buildRetryPrompt(topic: string, previousError: string): string {
  return `${buildRoadmapPrompt(topic)}

IMPORTANT — your previous output did not match the required JSON shape.

The problem was:
${previousError}

Return valid JSON only, matching the exact structure above. Start your response with { and end it with }. Do not include markdown fences or any explanation.`;
}
