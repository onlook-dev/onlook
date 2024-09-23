import { MainChannels } from '/common/constants';

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
