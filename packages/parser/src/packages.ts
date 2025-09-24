import { type GeneratorOptions, type GeneratorOptions } from '@babel/generator';
import { packages } from '@babel/standalone';
import { type NodePath } from '@babel/traverse';

export const { parse } = packages.parser;
export const { generate } = packages.generator;
export const traverse = packages.traverse.default;
export const types = packages.types;

export type { t, NodePath, GeneratorOptions };
