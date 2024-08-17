import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector } from './elements';
import { getInsertLocation } from './elements/insert';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        getInsertLocation: getInsertLocation,
    });
}
