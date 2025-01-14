import * as csstree from './csstree.esm';
import * as uuidBundle from './uuid';
export * from './helpers';

export const uuid: () => string = uuidBundle.uuid;
export const cssTree: any = csstree;
