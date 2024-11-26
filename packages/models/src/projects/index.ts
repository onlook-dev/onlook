import { z } from 'zod';

export const RectPositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const RectDimensionSchema = z.object({
    width: z.number(),
    height: z.number(),
});

export const FrameSettingsSchema = z.object({
    id: z.string(),
    url: z.string(),
    position: RectPositionSchema,
    dimension: RectDimensionSchema,
    linkedIds: z.array(z.string()).nullable(),
    duplicate: z.boolean().nullable(),
});

export const ProjectSettingsSchema = z.object({
    scale: z.number().optional(),
    frames: z.array(FrameSettingsSchema).optional(),
    position: RectPositionSchema.optional(),
});

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    folderPath: z.string(),
    url: z.string(),
    previewImg: z.string().optional(),
    createdAt: z.string(), // ISO 8601
    updatedAt: z.string(), // ISO 8601
    settings: ProjectSettingsSchema.optional(),
    runCommand: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type FrameSettings = z.infer<typeof FrameSettingsSchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type RectPosition = z.infer<typeof RectPositionSchema>;
export type RectDimension = z.infer<typeof RectDimensionSchema>;

export enum WindowCommand {
    MINIMIZE = 'minimize',
    MAXIMIZE = 'maximize',
    UNMAXIMIZE = 'unmaximize',
    CLOSE = 'close',
}
