import { prisma } from '../lib/prisma';
import type { Prisma } from '../generated/prisma/client';
import { HttpError } from '../lib/httpError';
import { AiProviderError, generateRoadmap as callProvider } from './ai';
import {
  RoadmapSchema,
  collectNodeIds,
  validateTreeConstraints,
  type RoadmapContent,
} from '../schemas/roadmap.schema';

/**
 * Models are told to return bare JSON, but a stray ```json fence or a sentence
 * of preamble is the single most common deviation. Recover from it rather than
 * burning the one retry on something this mechanical.
 */
function extractJson(raw: string): string {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) text = text.slice(start, end + 1);

  return text.trim();
}

/** Parse + validate + enforce size limits. Returns a reason string on failure. */
function parseAndValidate(
  raw: string,
): { ok: true; content: RoadmapContent } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (err) {
    return {
      ok: false,
      reason: `The response was not parseable JSON (${err instanceof Error ? err.message : 'unknown error'}).`,
    };
  }

  const result = RoadmapSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 10)
      .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    return { ok: false, reason: `The JSON did not match the schema:\n${issues}` };
  }

  const problems = validateTreeConstraints(result.data);
  if (problems.length > 0) {
    return { ok: false, reason: problems.map((p) => `- ${p}`).join('\n') };
  }

  return { ok: true, content: result.data };
}

/**
 * One retry, and only one. The retry is fed the specific validation failure so
 * the model has something to correct, rather than just rolling the dice again.
 */
export async function generateValidatedRoadmap(topic: string): Promise<RoadmapContent> {
  let raw: string;
  try {
    raw = await callProvider(topic);
  } catch (err) {
    if (err instanceof AiProviderError) {
      console.error(`[ai:${err.provider}]`, err.message);
      throw HttpError.badGateway('Roadmap generation failed, please try again.');
    }
    throw err;
  }

  const first = parseAndValidate(raw);
  if (first.ok) return normalize(first.content, topic);

  console.warn('[roadmap] first attempt failed validation:', first.reason);

  let retryRaw: string;
  try {
    retryRaw = await callProvider(topic, { previousError: first.reason });
  } catch (err) {
    if (err instanceof AiProviderError) {
      console.error(`[ai:${err.provider}]`, err.message);
      throw HttpError.badGateway('Roadmap generation failed, please try again.');
    }
    throw err;
  }

  const second = parseAndValidate(retryRaw);
  if (second.ok) return normalize(second.content, topic);

  console.warn('[roadmap] retry also failed validation:', second.reason);
  throw HttpError.unprocessable(
    "We couldn't generate a valid roadmap for that topic. Try rewording it or picking something more specific.",
  );
}

/** The user's topic is the source of truth, not whatever the model echoed back. */
function normalize(content: RoadmapContent, topic: string): RoadmapContent {
  return { ...content, topic };
}

export interface RoadmapWithProgress {
  id: string;
  topic: string;
  title: string;
  content: RoadmapContent;
  createdAt: Date;
  updatedAt: Date;
  completedIds: string[];
  totalNodes: number;
}

/** Prisma returns `content` as JsonValue; it was validated on the way in. */
function asContent(value: unknown): RoadmapContent {
  return value as RoadmapContent;
}

export async function createRoadmap(
  userId: string,
  topic: string,
): Promise<RoadmapWithProgress> {
  const content = await generateValidatedRoadmap(topic);

  const roadmap = await prisma.roadmap.create({
    // Validated above; Prisma's InputJsonValue can't express a recursive type.
    data: { userId, topic, content: content as unknown as Prisma.InputJsonObject },
  });

  return {
    id: roadmap.id,
    topic: roadmap.topic,
    title: content.title,
    content,
    createdAt: roadmap.createdAt,
    updatedAt: roadmap.updatedAt,
    completedIds: [],
    totalNodes: collectNodeIds(content.nodes).length,
  };
}

export interface RoadmapSummary {
  id: string;
  topic: string;
  title: string;
  createdAt: Date;
  totalNodes: number;
  completedCount: number;
}

export async function listRoadmaps(userId: string): Promise<RoadmapSummary[]> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { progress: { where: { userId }, select: { completedIds: true } } },
  });

  return roadmaps.map((r) => {
    const content = asContent(r.content);
    const completedIds = r.progress[0]?.completedIds ?? [];
    return {
      id: r.id,
      topic: r.topic,
      title: content.title,
      createdAt: r.createdAt,
      totalNodes: collectNodeIds(content.nodes).length,
      completedCount: completedIds.length,
    };
  });
}

export async function getRoadmap(
  userId: string,
  roadmapId: string,
): Promise<RoadmapWithProgress> {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include: { progress: { where: { userId }, select: { completedIds: true } } },
  });

  // Same 404 whether it doesn't exist or belongs to someone else — don't let
  // callers probe for other users' roadmap ids.
  if (!roadmap || roadmap.userId !== userId) throw HttpError.notFound('Roadmap not found');

  const content = asContent(roadmap.content);
  return {
    id: roadmap.id,
    topic: roadmap.topic,
    title: content.title,
    content,
    createdAt: roadmap.createdAt,
    updatedAt: roadmap.updatedAt,
    completedIds: roadmap.progress[0]?.completedIds ?? [],
    totalNodes: collectNodeIds(content.nodes).length,
  };
}

export async function deleteRoadmap(userId: string, roadmapId: string): Promise<void> {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: { userId: true },
  });
  if (!roadmap || roadmap.userId !== userId) throw HttpError.notFound('Roadmap not found');

  await prisma.roadmap.delete({ where: { id: roadmapId } });
}

export async function updateProgress(
  userId: string,
  roadmapId: string,
  completedIds: string[],
): Promise<{ completedIds: string[]; totalNodes: number }> {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    select: { userId: true, content: true },
  });
  if (!roadmap || roadmap.userId !== userId) throw HttpError.notFound('Roadmap not found');

  // Only ids that actually exist in this tree get stored — a client bug or a
  // stale tab shouldn't be able to write junk into completedIds.
  const validIds = new Set(collectNodeIds(asContent(roadmap.content).nodes));
  const accepted = [...new Set(completedIds)].filter((id) => validIds.has(id));

  const progress = await prisma.progress.upsert({
    where: { userId_roadmapId: { userId, roadmapId } },
    create: { userId, roadmapId, completedIds: accepted },
    update: { completedIds: accepted },
  });

  return { completedIds: progress.completedIds, totalNodes: validIds.size };
}

export const RoadmapContentSchema = RoadmapSchema;
export type { RoadmapContent };
// Exported for the standalone AI test script (npm run test:ai).
export const _internal = { extractJson, parseAndValidate };
