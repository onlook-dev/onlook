// @ts-expect-error - No type for bundle
import * as uuidBundle from './uuid';
// @ts-expect-error - No type for bundle
import * as csstree from './csstree.esm';

export const uuid: () => string = uuidBundle.uuid;
export const cssTree: any = csstree;
