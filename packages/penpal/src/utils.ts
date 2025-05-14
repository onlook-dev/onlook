export const promisifyMethod = <T extends (...args: any[]) => any>(
    method: T | undefined,
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
    return async (...args: Parameters<T>) => {
        if (!method) throw new Error('Method not initialized');
        return method(...args);
    };
};
