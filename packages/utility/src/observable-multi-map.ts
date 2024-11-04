import { observable, ObservableSet } from 'mobx';

export class ObservableMultiMap<K, T> {
    readonly map = observable.map<K, ObservableSet<T>>();

    clear(): void {
        this.map.clear();
    }
    delete(key: K): boolean {
        return this.map.delete(key);
    }
    deleteValue(key: K, value: T): boolean {
        const set = this.map.get(key);
        if (!set) {
            return false;
        }
        const deleted = set.delete(value);
        if (set.size === 0) {
            this.map.delete(key);
        }
        return deleted;
    }
    get(key: K): Set<T> {
        return this.map.get(key) ?? new Set();
    }
    has(key: K): boolean {
        return this.map.has(key);
    }
    set(key: K, value: T): void {
        const set = this.map.get(key);
        if (set) {
            set.add(value);
        } else {
            this.map.set(key, observable.set([value]));
        }
    }
    *[Symbol.iterator](): Generator<[K, Set<T>]> {
        for (const kv of this.map) {
            yield kv;
        }
    }
    keys(): IterableIterator<K> {
        return this.map.keys();
    }
    values(): IterableIterator<Set<T>> {
        return this.map.values();
    }
}
