import { z } from 'zod';
import { IdeType } from '../ide';
import { ProjectSchema } from '../projects';

export const UserSettingsSchema = z.object({
    id: z.string().optional(),
    enableAnalytics: z.boolean().optional(),
    ideType: z.nativeEnum(IdeType).optional(),
    signInMethod: z.string().optional(),
    shouldWarnDelete: z.boolean().optional(),
});

export const ProjectsCacheSchema = z.object({
    projects: z.array(ProjectSchema),
});

export const UserMetadataSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    avatarUrl: z.string().optional(),
});

export const AuthTokensSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.string(),
    expiresIn: z.string(),
    providerToken: z.string(),
    tokenType: z.string(),
});

export const AppStateSchema = z.object({
    activeProjectId: z.string().optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type ProjectsCache = z.infer<typeof ProjectsCacheSchema>;
export type UserMetadata = z.infer<typeof UserMetadataSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type AppState = z.infer<typeof AppStateSchema>;
