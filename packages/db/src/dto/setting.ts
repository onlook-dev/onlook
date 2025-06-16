import type { ProjectSettings } from '@onlook/models';
import type { ProjectSettings as DbProjectSettings } from '../schema';

export const toProjectSettings = (dbProjectSettings: DbProjectSettings): ProjectSettings => {
    return {
        commands: {
            build: dbProjectSettings.buildCommand,
            run: dbProjectSettings.runCommand,
            install: dbProjectSettings.installCommand,
        },
        env: dbProjectSettings.env,
    };
};

export const fromProjectSettings = (projectSettings: ProjectSettings): Omit<DbProjectSettings, 'projectId'> => {
    return {
        buildCommand: projectSettings.commands.build ?? '',
        runCommand: projectSettings.commands.run ?? '',
        installCommand: projectSettings.commands.install ?? '',
        env: projectSettings.env ?? {},
    };
};