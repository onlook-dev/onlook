import { createAtom } from 'mobx';
import * as Y from 'yjs';

const instances = new WeakMap<Y.Array<any>, ObservableYJSArray<any>>();

export class ObservableYJSArray<V> {
    static get<V>(target: Y.Array<V>): ObservableYJSArray<V> {
        let map = instances.get(target);
        if (!map) {
            map = new ObservableYJSArray(target);
            instances.set(target, map);
        }
        return map as ObservableYJSArray<V>;
    }

    readonly y: Y.Array<V>;
    readonly _atom = createAtom('ObservableYJSArray');

    private constructor(y: Y.Array<V>) {
        this.y = y;
        this.y.observe(() => {
            this._atom.reportChanged();
        });
    }

    get length(): number {
        this._atom.reportObserved();
        return this.y.length;
    }

    insert(index: number, content: V[]): void {
        this.y.insert(index, content);
    }

    push(content: V[]): void {
        this.y.push(content);
    }

    unshift(content: V[]): void {
        this.y.unshift(content);
    }

    delete(index: number, length?: number): void {
        this.y.delete(index, length);
    }

    get(index: number): V | undefined {
        this._atom.reportObserved();
        return this.y.get(index);
    }

    toArray(): V[] {
        this._atom.reportObserved();
        return this.y.toArray();
    }

    slice(start?: number, end?: number): V[] {
        this._atom.reportObserved();
        return this.y.slice(start, end);
    }

    [Symbol.iterator](): IterableIterator<V> {
        this._atom.reportObserved();
        return this.y[Symbol.iterator]();
    }

    toJSON(): V[] {
        this._atom.reportObserved();
        return this.y.toJSON() as V[];
    }
}
