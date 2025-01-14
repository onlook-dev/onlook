export interface DebounceOptions {
    leading?: boolean;
    trailing?: boolean;
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: DebounceOptions = {},
): (...args: Parameters<T>) => void {
    const { leading = false, trailing = true } = options;
    let timeout: Timer | null = null;
    let lastArgs: Parameters<T> | null = null;

    return (...args: Parameters<T>) => {
        const shouldCallLeading = leading && !timeout;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            if (trailing && lastArgs) {
                func(...lastArgs);
            }
            timeout = null;
            lastArgs = null;
        }, wait);

        if (shouldCallLeading) {
            func(...args);
        } else if (trailing) {
            lastArgs = args;
        }
    };
}
