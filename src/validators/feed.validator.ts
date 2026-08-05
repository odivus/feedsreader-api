import { z } from 'zod';

const urlSchema = z
  .string()
  .trim()
  .max(512, 'URL is too long')
  .url('Must be a valid URL')
  .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

export const createFeedSchema = z.object({
  body: z.object({
    url: urlSchema,
    title: z.string().trim().max(255).optional(),
    description: z.string().trim().max(5000).optional(),
  }),
});

export const updateFeedSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      url: urlSchema.optional(),
      title: z.string().trim().max(255).nullable().optional(),
      description: z.string().trim().max(5000).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' }),
});

export const feedIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export type CreateFeedDto = z.infer<typeof createFeedSchema>['body'];
export type UpdateFeedDto = z.infer<typeof updateFeedSchema>['body'];
