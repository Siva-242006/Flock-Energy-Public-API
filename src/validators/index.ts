import { z } from 'zod';

export const searchMetersQuerySchema = z.object({
  q: z.string().optional().default(''),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page number must be an integer greater than or equal to 1',
    }),
});

export const getMeterParamsSchema = z.object({
  meterId: z.string().min(1, 'meterId is required and cannot be empty'),
});

export const getDtsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page number must be an integer greater than or equal to 1',
    }),
});
