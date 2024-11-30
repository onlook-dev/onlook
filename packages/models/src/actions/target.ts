import { z } from 'zod';

const ChangeSchema = <T>(type: z.ZodType<T>) =>
    z.object({
        updated: type,
        original: type,
    });

export type Change<T> = {
    updated: T;
    original: T;
};

export const ActionTargetSchema = z.object({
    domId: z.string(),
    oid: z.string().nullable(),
    webviewId: z.string(),
});

export const StyleActionTargetSchema = ActionTargetSchema.extend({
    change: ChangeSchema(z.string()),
});

export type ActionTarget = z.infer<typeof ActionTargetSchema>;
export type StyleActionTarget = z.infer<typeof StyleActionTargetSchema>;
