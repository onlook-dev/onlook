import { createAtom } from 'mobx';
import { type IIRBTree } from './ii-rb-tree';
import { RBTree } from './rb-tree';

export class ObservableRBTree<K, V> implements IIRBTree<K, V> {
    constructor(compare?: (a: K, b: K) => number) {
        this._tree = new RBTree(compare);
    }

    private readonly _tree: RBTree<K, V>;
    readonly _atom = createAtom('ObservableRBTree');

    get size(): number {
        this._atom.reportObserved();
        return this._tree.size;
    }
    set(key: K, value: V): void {
        this._tree.set(key, value);
        this._atom.reportChanged();
    }
    get(key: K): V | undefined {
        this._atom.reportObserved();
        return this._tree.get(key);
    }
    has(key: K): boolean {
        this._atom.reportObserved();
        return this._tree.has(key);
    }
    delete(key: K): void {
        this._tree.delete(key);
        this._atom.reportChanged();
    }
    max(): [K, V] | undefined {
        this._atom.reportObserved();
        return this._tree.max();
    }
    min(): [K, V] | undefined {
        this._atom.reportObserved();
        return this._tree.min();
    }
    next(key: K): [K, V] | undefined {
        this._atom.reportObserved();
        return this._tree.next(key);
    }
    prev(key: K): [K, V] | undefined {
        this._atom.reportObserved();
        return this._tree.prev(key);
    }
    keys(): IterableIterator<K> {
        this._atom.reportObserved();
        return this._tree.keys();
    }
    values(): IterableIterator<V> {
        this._atom.reportObserved();
        return this._tree.values();
    }
    [Symbol.iterator](): IterableIterator<[K, V]> {
        this._atom.reportObserved();
        return this._tree[Symbol.iterator]();
    }
}
