export const platformSlash = '/';

export const truncate = (str: string | null | undefined, length: number): string | null => {
    if (!str || str.length <= length) return str ?? null;
    return `${str.slice(0, length - 3)}...`;
};

export function getTruncatedFileName(fileName: string): string {
    const parts = fileName.split(platformSlash);
    return parts[parts.length - 1] ?? '';
}
