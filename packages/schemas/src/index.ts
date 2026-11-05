import { z } from "zod";
export const uuid = z.uuid();
export const requestCode = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
export const verifyCode = requestCode.extend({
  code: z.string().regex(/^\d{6}$/),
});
export const createComplex = z.strictObject({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export const grantRole = z.strictObject({
  userId: uuid,
  role: z.enum(["complex_admin", "front_desk"]),
});
export type ScopedRole = z.infer<typeof grantRole>["role"];
