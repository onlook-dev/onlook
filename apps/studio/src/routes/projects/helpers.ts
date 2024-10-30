import { platformSlash } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { capitalizeFirstLetter } from '/common/helpers';

export enum CreateMethod {
    LOAD = 'load',
    NEW = 'new',
}

export const PLACEHOLDER_NAMES = [
    'The greatest app in the world',
    'My epic project',
    'The greatest project ever',
    'A revolutionary idea',
    'Project X',
    'Genius React App',
    'The next billion dollar idea',
    'Mind-blowingly cool app',
    'Earth-shatteringly great app',
    'Moonshot project',
];

export const SETTINGS_MESSAGE = [
    'Set some dials and knobs and stuff',
    'Fine-tune how you want to build',
    'Swap out your default code editor if you dare',
    "You shouldn't be worried about this stuff, yet here you are",
    'Mostly a formality',
    "What's this button do?",
    'Customize how you want to build',
    'Thanks for stopping by the Settings page',
    'This is where the good stuff is',
    'Open 24 hours, 7 days a week',
    '*beep boop*',
    "Welcome. We've been expecting you.",
];

export function getRandomPlaceholder() {
    return PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)];
}

export function getRandomSettingsMessage() {
    return SETTINGS_MESSAGE[Math.floor(Math.random() * SETTINGS_MESSAGE.length)];
}

export async function getPreviewImage(filename: string): Promise<string | null> {
    const base64Img = (await window.api.invoke(MainChannels.GET_IMAGE, filename)) as string | null;
    if (!base64Img) {
        return null;
    }
    return base64Img;
}

const STEP_MAP = {
    [CreateMethod.LOAD]: ['Select folder', 'Verify project', 'Name project', 'Set URL'],
    [CreateMethod.NEW]: ['Name project', 'Select folder', 'Install project', 'Run project'],
};

export function getStepName(method: CreateMethod | null, step: number): string {
    try {
        if (!method) {
            return 'Unknown Method';
        }

        return STEP_MAP[method][step];
    } catch (e) {
        return 'Unknown Step';
    }
}

export function getNameFromPath(path: string): string {
    const parts = path.split(/[/\\]/);
    const name = parts.pop() || '';
    return capitalizeFirstLetter(name);
}

export function getFolderNameAndTargetPath(fullPath: string): { name: string; path: string } {
    const pathParts = fullPath.split(/[/\\]/);
    const newFolderName = pathParts[pathParts.length - 1] || '';
    const pathToFolders = pathParts.slice(0, -1).join(platformSlash);
    return { name: newFolderName, path: pathToFolders };
}
