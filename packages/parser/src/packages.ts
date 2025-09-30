import { packages } from '@babel/standalone';

import type { GeneratorOptions } from '@babel/generator';
import type { NodePath } from '@babel/traverse';
import type * as T from '@babel/types';

export const { parse } = packages.parser;
export const { generate } = packages.generator;
export const traverse = packages.traverse.default;
export const t = packages.types;

export type { T, NodePath, GeneratorOptions };
