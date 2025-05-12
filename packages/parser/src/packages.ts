import { packages } from '@babel/standalone';

import type * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import type { GeneratorOptions } from '@babel/generator';

export const { parse } = packages.parser;
export const { generate } = packages.generator;
export const traverse = packages.traverse.default;
export const types = packages.types;

export type { t, NodePath, GeneratorOptions };
