import { type ParseResult } from '@babel/parser';
import { type JSXAttribute, type File } from '@babel/types';

export const FONT_WEIGHT_REGEX =
    /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;

export type TraverseCallback = (classNameAttr: JSXAttribute, ast: ParseResult<File>) => void;
