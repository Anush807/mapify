import { Router } from 'express';
import * as roadmapController from '../controllers/roadmap.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { CreateRoadmapSchema, UpdateProgressSchema } from '../schemas/request.schema';

const router = Router();

// Every roadmap route is owner-scoped.
router.use(requireAuth);

router.post('/', validateBody(CreateRoadmapSchema), roadmapController.create);
router.get('/', roadmapController.list);
router.get('/:id', roadmapController.getById);
router.delete('/:id', roadmapController.remove);
router.patch('/:id/progress', validateBody(UpdateProgressSchema), roadmapController.updateProgress);

export default router;
