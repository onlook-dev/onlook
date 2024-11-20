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
    webviewId: z.string(),
    domId: z.string(),
    oid: z.string().nullable(),
});

export const StyleActionTargetSchema = ActionTargetSchema.extend({
    change: ChangeSchema(z.string()),
});

export const GroupActionTargetSchema = ActionTargetSchema.extend({
    index: z.number(),
});

export type ActionTarget = z.infer<typeof ActionTargetSchema>;
export type StyleActionTarget = z.infer<typeof StyleActionTargetSchema>;
export type GroupActionTarget = z.infer<typeof GroupActionTargetSchema>;
