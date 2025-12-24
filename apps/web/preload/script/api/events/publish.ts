import { penpalParent } from '../..';

export function publishDomProcessed(layerMap: Map<string, any>, rootNode: any) {
    if (!penpalParent) return;
    
    penpalParent.onDomProcessed({
        layerMap: Object.fromEntries(layerMap),
        rootNode
    }).catch((error: Error) => {
        console.error('Failed to send DOM processed event:', error);
    });
}
