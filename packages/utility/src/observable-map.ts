import { createAtom, type IAtom } from 'mobx';
import * as Y from 'yjs';
import { getOrCreate } from './collection';

const instances = new WeakMap<Y.Map<any>, ObservableYJSMap<any>>();

export class ObservableYJSMap<V> {
    static get<V>(target: Y.Map<V>): ObservableYJSMap<V>;
    static get<V>(target: Y.Map<V> | undefined): ObservableYJSMap<V> | undefined;
    static get<V>(target: Y.Map<V> | undefined): ObservableYJSMap<V> | undefined {
        if (!target) {
            return;
        }
        let map = instances.get(target);
        if (!map) {
            map = new ObservableYJSMap(target);
            instances.set(target, map);
        }
        return map as ObservableYJSMap<V>;
    }

    readonly y: Y.Map<V>;
    readonly wholeAtom = createAtom('ObservableYJSMap');
    readonly valueAtoms = new Map<string, IAtom>();

    private getValueAtom(key: string): IAtom {
        return getOrCreate(this.valueAtoms, key, () => createAtom('ObservableYJSMapValue'));
    }

    private constructor(y: Y.Map<V>) {
        this.y = y;
        this.y.observe((event) => {
            for (const [key] of event.keys) {
                // TODO: removed key atoms?
                this.getValueAtom(key).reportChanged();
            }
            this.wholeAtom.reportChanged();
        });
    }

    get size(): number {
        this.wholeAtom.reportObserved();
        return this.y.size;
    }

    set(key: string, value: V): void {
        this.y.set(key, value);
    }

    delete(key: string): void {
        this.y.delete(key);
    }

    get(key: string): V | undefined {
        this.getValueAtom(key).reportObserved();
        return this.y.get(key);
    }

    has(key: string): boolean {
        this.getValueAtom(key).reportObserved();
        return this.y.has(key);
    }

    clear() {
        this.y.clear();
        this.wholeAtom.reportChanged();
    }

    keys(): IterableIterator<string> {
        this.wholeAtom.reportObserved();
        return this.y.keys();
    }

    values(): IterableIterator<V> {
        this.wholeAtom.reportObserved();
        return this.y.values() as IterableIterator<V>;
    }

    [Symbol.iterator](): IterableIterator<[string, V]> {
        this.wholeAtom.reportObserved();
        return this.y[Symbol.iterator]() as IterableIterator<[string, V]>;
    }

    toJSON(): Record<string, V> {
        this.wholeAtom.reportObserved();
        return this.y.toJSON();
    }
}
