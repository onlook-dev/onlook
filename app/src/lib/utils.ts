import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function assertNever(n: never): never {
    throw new Error(`Expected \`never\`, found: ${JSON.stringify(n)}`);
}
