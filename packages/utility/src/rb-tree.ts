/* eslint-disable @typescript-eslint/no-non-null-assertion */

// From https://github.com/cschen1205/js-redblacktree (+ refactoring / additional methods)
//
// MIT License
//
// Copyright (c) 2017 Chen Caishun
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { type IIRBTree } from './ii-rb-tree';

interface RBNode<Key, Value> {
    key: Key;
    value: Value;
    left: RBNode<Key, Value> | undefined;
    right: RBNode<Key, Value> | undefined;
    count: number;
    red: boolean;
}

export class RBTree<K, V> implements IIRBTree<K, V> {
    root: RBNode<K, V> | undefined;
    readonly compare: (a: K, b: K) => number;

    constructor(compare?: (a: K, b: K) => number) {
        this.root = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.compare = compare || ((a1: any, a2: any) => a1 - a2);
    }

    set(key: K, value: V): void {
        this.root = this._put(this.root, key, value);
    }

    private _put(x: RBNode<K, V> | undefined, key: K, value: V): RBNode<K, V> {
        if (x == undefined) {
            return {
                key,
                value,
                left: undefined,
                right: undefined,
                count: 1,
                red: true,
            };
        }
        const cmp = this.compare(key, x.key);
        if (cmp < 0) {
            x.left = this._put(x.left, key, value);
        } else if (cmp > 0) {
            x.right = this._put(x.right, key, value);
        } else {
            x.value = value;
        }

        if (this._isRed(x.right) && !this._isRed(x.left)) x = this._rotateLeft(x);
        if (this._isRed(x.left) && this._isRed(x.left!.left)) x = this._rotateRight(x);
        if (this._isRed(x.left) && this._isRed(x.right)) this._flipColor(x);

        x.count = 1 + this._count(x.left) + this._count(x.right);

        return x;
    }

    private _count(x: RBNode<K, V> | undefined) {
        return x == undefined ? 0 : x.count;
    }

    get(key: K) {
        const x = this._get(this.root, key);
        if (x != undefined) {
            return x.value;
        }
        return undefined;
    }

    private _get(x: RBNode<K, V> | undefined, key: K): RBNode<K, V> | undefined {
        if (x == undefined) {
            return undefined;
        }
        const cmp = this.compare(key, x.key);
        if (cmp < 0) {
            return this._get(x.left, key);
        }
        if (cmp > 0) {
            return this._get(x.right, key);
        }
        return x;
    }

    private _getPath(x: RBNode<K, V> | undefined, key: K): RBNode<K, V>[] {
        if (x == undefined) {
            return [];
        }
        const cmp = this.compare(key, x.key);
        if (cmp < 0) {
            return [x, ...this._getPath(x.left, key)];
        }
        if (cmp > 0) {
            return [x, ...this._getPath(x.right, key)];
        }
        return [x];
    }

    next(key: K): [K, V] | undefined {
        const path = this._getPath(this.root, key);
        const next = this._next(path);
        if (next) {
            return [next.key, next.value];
        }
    }

    prev(key: K): [K, V] | undefined {
        const path = this._getPath(this.root, key);
        const prev = this._prev(path);
        if (prev) {
            return [prev.key, prev.value];
        }
    }

    private _next(path: RBNode<K, V>[]): RBNode<K, V> | undefined {
        if (path.length === 0) {
            return undefined;
        }
        let x = path.pop()!;

        if (x.right != undefined) {
            return this._min(x.right);
        }

        while (path.length > 0) {
            const y = path.pop()!;
            if (y.left == x) {
                return y;
            }
            x = y;
        }
    }

    private _prev(path: RBNode<K, V>[]): RBNode<K, V> | undefined {
        if (path.length === 0) {
            return undefined;
        }
        let x = path.pop()!;
        if (x.left != undefined) {
            return this._max(x.left);
        }

        while (path.length > 0) {
            const y = path.pop()!;
            if (y.right == x) {
                return y;
            }
            x = y;
        }
    }

    has(key: K): boolean {
        const x = this._get(this.root, key);
        return x != undefined;
    }

    get size(): number {
        return this._count(this.root);
    }

    delete(key: K): void {
        this.root = this._delete(this.root, key);
    }

    private _delete(x: RBNode<K, V> | undefined, key: K): RBNode<K, V> | undefined {
        if (x == undefined) {
            return undefined;
        }

        const cmp = this.compare(key, x.key);
        if (cmp < 0) {
            x.left = this._delete(x.left, key);
        } else if (cmp > 0) {
            x.right = this._delete(x.right, key);
        } else {
            if (x.left == undefined) {
                x = x.right;
            } else if (x.right == undefined) {
                x = x.left;
            } else {
                const t = x;
                x = this._min(t.right)!;
                x.right = this._delMin(t.right);
                x.left = t.left;
            }
        }

        if (x !== undefined) {
            if (this._isRed(x.right) && !this._isRed(x.left)) x = this._rotateLeft(x);
            if (this._isRed(x.left) && this._isRed(x.left!.left)) x = this._rotateRight(x);
            if (this._isRed(x.left) && this._isRed(x.right)) this._flipColor(x);

            x.count = 1 + this._count(x.left) + this._count(x.right);
        }

        return x;
    }

    private _isRed(x: RBNode<K, V> | undefined): boolean {
        return x == undefined ? false : x.red;
    }

    private _flipColor(x: RBNode<K, V>): void {
        x.left!.red = false;
        x.right!.red = false;
        x.red = true;
    }

    private _rotateLeft(x: RBNode<K, V>): RBNode<K, V> {
        const oldX = x;
        const m = x.right!;
        oldX.right = m.left;
        m.left = oldX;
        m.red = oldX.red;
        oldX.red = true;

        oldX.count = 1 + this._count(oldX.left) + this._count(oldX.right);

        return m;
    }

    private _rotateRight(x: RBNode<K, V>): RBNode<K, V> {
        const oldX = x;
        const m = oldX.left!;
        oldX.left = m.right;
        m.right = oldX;
        m.red = oldX.red;
        oldX.red = true;

        oldX.count = 1 + this._count(oldX.left) + this._count(oldX.right);

        return m;
    }

    max(): [K, V] | undefined {
        const x = this._max(this.root);
        return x ? [x.key, x.value] : undefined;
    }

    min(): [K, V] | undefined {
        const x = this._min(this.root);
        return x ? [x.key, x.value] : undefined;
    }

    private _min(x: RBNode<K, V> | undefined): RBNode<K, V> | undefined {
        if (x == undefined) {
            return undefined;
        }
        if (x.left == undefined) {
            return x;
        }
        return this._min(x.left);
    }

    private _max(x: RBNode<K, V> | undefined): RBNode<K, V> | undefined {
        if (x == undefined) {
            return undefined;
        }
        if (x.right == undefined) {
            return x;
        }
        return this._max(x.right);
    }

    private _delMin(x: RBNode<K, V> | undefined): RBNode<K, V> | undefined {
        if (x == undefined) {
            return undefined;
        }

        if (x.left == undefined) {
            return x.right;
        }

        x.left = this._delMin(x.left);
        x.count = 1 + this._count(x.left) + this._count(x.right);
        return x;
    }

    *keys(): IterableIterator<K> {
        for (const kv of this) {
            yield kv[0];
        }
    }

    *values(): IterableIterator<V> {
        for (const kv of this) {
            yield kv[1];
        }
    }

    *[Symbol.iterator](): IterableIterator<[K, V]> {
        if (this.root == undefined) {
            return;
        }

        const stack: RBNode<K, V>[] = [];
        let x: RBNode<K, V> | undefined = this.root;

        while (x != undefined || stack.length > 0) {
            while (x != undefined) {
                stack.push(x);
                x = x.left;
            }

            x = stack.pop()!;
            yield [x.key, x.value];
            x = x.right;
        }
    }

    private _print(x: RBNode<K, V> | undefined, depth: number): void {
        if (x == undefined) {
            return;
        }

        this._print(x.left, depth + 1);
        console.log(' '.repeat(depth) + String(x.key) + (x.red ? 'R' : 'B'));
        this._print(x.right, depth + 1);
    }

    print(): void {
        this._print(this.root, 0);
    }
}
