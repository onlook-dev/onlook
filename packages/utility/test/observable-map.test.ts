import { reaction, runInAction } from 'mobx';
import { describe, expect, it } from 'bun:test';
import * as Y from 'yjs';
import { ObservableYJSMap } from '../src/observable-map';

describe(ObservableYJSMap.name, () => {
    it('should work', async () => {
        const ydoc = new Y.Doc();

        const ymap = ydoc.getMap<string>('map');
        const map = ObservableYJSMap.get(ymap);

        let entries: [string, string][] = [];

        reaction(
            () => [...map],
            (e) => {
                entries = e;
            },
        );

        runInAction(() => {
            map.set('foo', 'bar');
        });

        expect(entries).toEqual([['foo', 'bar']]);
    });
});
