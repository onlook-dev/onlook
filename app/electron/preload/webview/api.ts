import { contextBridge } from 'electron';
import { getElementAtLoc } from './elements';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
    });
}
