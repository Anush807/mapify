import type { RequestHandler } from 'express';
import * as roadmapService from '../services/roadmap.service';
import { getUserId } from '../middleware/requireAuth';
import { HttpError } from '../lib/httpError';
import type { CreateRoadmapInput, UpdateProgressInput } from '../schemas/request.schema';

export const create: RequestHandler = async (req, res, next) => {
  try {
    const { topic } = req.body as CreateRoadmapInput;
    const roadmap = await roadmapService.createRoadmap(getUserId(req), topic);
    res.status(201).json({ roadmap });
  } catch (err) {
    next(err);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const roadmaps = await roadmapService.listRoadmaps(getUserId(req));
    res.json({ roadmaps });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const roadmap = await roadmapService.getRoadmap(getUserId(req), requireId(req.params.id));
    res.json({ roadmap });
  } catch (err) {
    next(err);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await roadmapService.deleteRoadmap(getUserId(req), requireId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const updateProgress: RequestHandler = async (req, res, next) => {
  try {
    const { completedIds } = req.body as UpdateProgressInput;
    const progress = await roadmapService.updateProgress(
      getUserId(req),
      requireId(req.params.id),
      completedIds,
    );
    res.json({ progress });
  } catch (err) {
    next(err);
  }
};

// Express 5 types route params as `string | string[]`; our routes only ever
// produce a single value.
function requireId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw HttpError.badRequest('Missing roadmap id');
  }
  return id;
}
