// GENERATED CODE - DO NOT MANUALLY MODIFY
import { z } from 'zod';

export const CorgiStructSchema = z.object({
  name: z.string(),
age: z.number(),
weight: z.number(),
color: z.string(),
is_cute: z.boolean().default(true)
});
  

export const MyStructSchema = z.object({
  test: z.string(),
test2: z.number(),
corgis: z.array(z.unknown())
});
  