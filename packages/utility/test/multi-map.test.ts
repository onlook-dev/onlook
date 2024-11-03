import { describe, it, expect } from 'bun:test';
import { MultiMap } from '../src/multi-map';

const createMap = () => {
    const multimap = new MultiMap();
    multimap.set(1, 'foo');
    multimap.set(1, 'bar');
    multimap.set(2, 'hoge');
    multimap.set(3, 'poyo');
    return multimap;
};

describe(MultiMap.name, () => {
    describe('clear', () => {
        it('clears elements', () => {
            const multimap = createMap();
            expect(multimap.map.size).toEqual(3);
            multimap.clear();
            expect(multimap.map.size).toEqual(0);
        });
    });
    describe('delete', () => {
        it('delete elements with specified key', () => {
            const multimap = createMap();
            expect(multimap.get(1)).toEqual(new Set(['foo', 'bar']));
            multimap.delete(1);
            expect(multimap.get(1)).toEqual(new Set());
        });
    });
    describe('get', () => {
        it('returns elements', () => {
            const multimap = createMap();
            expect(multimap.get(1)).toEqual(new Set(['foo', 'bar']));
        });
        it('returns empty set the MultiMap has no associated value', () => {
            const multimap = createMap();
            expect(multimap.get(5)).toEqual(new Set());
        });
    });
    describe('has', () => {
        it('returns if the MultiMap has any associated value', () => {
            const multimap = createMap();
            expect(multimap.has(1)).toEqual(true);
            expect(multimap.has(5)).toEqual(false);
            multimap.delete(1);
            expect(multimap.has(1)).toEqual(false);
        });
    });
    describe('[Symbol.iterator]', () => {
        it('makes MultiMap iterable', () => {
            const multimap = createMap();
            const iterated = Array.from(multimap);
            expect(iterated).toEqual([
                [1, new Set(['foo', 'bar'])],
                [2, new Set(['hoge'])],
                [3, new Set(['poyo'])],
            ]);
        });
    });
});
