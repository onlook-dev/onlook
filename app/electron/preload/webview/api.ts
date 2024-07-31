import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector } from './elements';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
    });
}
