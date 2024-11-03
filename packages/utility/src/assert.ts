export function assertNotNull<T>(value: T | null | undefined): T {
    if (value == null) {
        throw new Error('unexpected null or undefined');
    }
    return value;
}

export function assertNever(n: never): never {
    throw new Error(`Expected \`never\`, found: ${JSON.stringify(n)}`);
}
