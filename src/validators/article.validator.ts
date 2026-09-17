import { z } from 'zod';

export const getArticleFeedSchema = z.object({
  query: z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    feedId: z.coerce.number().int().positive().optional(),
  }),
});

export type GetArticleFeedQuery = z.infer<typeof getArticleFeedSchema>['query'];
