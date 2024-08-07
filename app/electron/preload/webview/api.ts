import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector, getSelectorAtLoc } from './elements';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        getSelectorAtLoc: getSelectorAtLoc,
    });
}
