export interface IIRBTree<K, V> {
    size: number;

    set(key: K, value: V): void;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): void;

    max(): [K, V] | undefined;
    min(): [K, V] | undefined;

    next(key: K): [K, V] | undefined;
    prev(key: K): [K, V] | undefined;

    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
