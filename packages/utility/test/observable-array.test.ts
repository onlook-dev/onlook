import { reaction, runInAction } from 'mobx';
import { describe, expect, it } from 'bun:test';
import * as Y from 'yjs';
import { ObservableYJSArray } from '../src/observable-array';

describe(ObservableYJSArray.name, () => {
    it('should work', async () => {
        const ydoc = new Y.Doc();

        const ymap = ydoc.getArray<string>('map');
        const array = ObservableYJSArray.get(ymap);

        let entries: string[] = [];

        reaction(
            () => [...array],
            (e) => {
                entries = e;
            },
        );

        runInAction(() => {
            array.push(['foo', 'bar']);
        });

        expect(entries).toEqual(['foo', 'bar']);
    });
});
