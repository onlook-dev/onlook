import { listenForDomMutation, listenForResize } from './dom';
import { listenForWheelZoom } from './wheel';

export function listenForDomChanges() {
    listenForDomMutation();
    listenForResize();
    listenForWheelZoom();
}
