import { twMerge, type ClassNameValue } from 'tailwind-merge';

export const customTwMerge = (...classLists: ClassNameValue[]): string => {
    const classes: string[] = [];

    // Process the class lists into a single string
    const process = (c: ClassNameValue) => {
        if (!c) return;
        if (typeof c === 'string') {
            classes.push(c);
        } else if (Array.isArray(c)) {
            c.forEach(process);
        } else if (typeof c === 'object') {
            Object.keys(c).forEach((key) => {
                if ((c as Record<string, any>)[key]) {
                    classes.push(key);
                }
            });
        }
    };

    classLists.forEach(process);

    const classString = classes.join(' ');

    // Extract background color classes. Keeping the latest one.
    const bgRegex = /(?<!\S)bg-\S+/g;
    const bgClasses = classString.match(bgRegex) || [];
    const latestBgClass = bgClasses.pop();
    const otherClasses = classString.replace(bgRegex, '');
    return twMerge(otherClasses, latestBgClass);
};
