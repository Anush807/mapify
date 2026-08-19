import { z } from 'zod';

export const CreateRoadmapSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(3, 'topic must be at least 3 characters')
    .max(120, 'topic must be 120 characters or fewer'),
});

export const UpdateProgressSchema = z.object({
  completedIds: z.array(z.string().min(1)).max(500),
});

export type CreateRoadmapInput = z.infer<typeof CreateRoadmapSchema>;
export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;
