import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const customerSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['personal', 'business']).default('business'),
  status: z.enum(['lead', 'active', 'inactive']).default('lead'),
  sourceName: z.string().optional(),
  notes: z.string().optional(),
});

export const opportunitySchema = z.object({
  name: z.string().min(1),
  customerId: z.string().min(1),
  stageId: z.string().min(1),
  value: z.number().nonnegative().default(0),
  expectedCloseDate: z.string().optional(),
  description: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;