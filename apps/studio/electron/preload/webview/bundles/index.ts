// @ts-expect-error - No type for bundle
import * as uuidBundle from './uuid';

export const uuid: () => string = uuidBundle.uuid;
