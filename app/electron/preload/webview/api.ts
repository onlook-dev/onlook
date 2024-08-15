import { contextBridge } from 'electron';
import { getElementAtLoc, getElementWithSelector, getSelectorAtLoc } from './elements';
import { findInsertLocation } from './elements/insert';

export function setApi() {
    contextBridge.exposeInMainWorld('api', {
        getElementAtLoc: getElementAtLoc,
        getElementWithSelector: getElementWithSelector,
        findInsertLocation: findInsertLocation,
        getSelectorAtLoc: getSelectorAtLoc,
    });
}
