import { listenForDomMutation, listenForResize } from './dom';

export function listenForDomChanges() {
    listenForDomMutation();
    listenForResize();
}
