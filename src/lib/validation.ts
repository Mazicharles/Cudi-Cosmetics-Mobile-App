import { z } from 'zod';
import { states } from './config';
export const shippingSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:0(?:80|81|70|90|91)\d{8}|\+234(?:80|81|70|90|91)\d{8})$/,
      'Enter a valid Nigerian phone number',
    ),
  address1: z.string().trim().min(5).max(200),
  address2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2).max(100),
  state: z.enum(states),
  postal_code: z.string().trim().max(20).optional().default(''),
  country: z.literal('Nigeria'),
});
export const checkoutSchema = z
  .object({
    shipping: shippingSchema,
    items: z
      .array(
        z
          .object({
            product_id: z.string().uuid(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const referenceSchema = z.string().regex(/^CUDI-[A-Za-z0-9-]{1,100}$/);
export const safeNext = (value: string | null) =>
  value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/account';
