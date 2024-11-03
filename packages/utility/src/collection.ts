export function getOrCreate<K, V>(
    map: {
        has(key: K): boolean;
        get(key: K): V | undefined;
        set(key: K, value: V): void;
    },
    key: K,
    create: () => V,
): V {
    let value = map.get(key);
    if (!value) {
        value = create();
        map.set(key, value);
    }
    return value;
}
