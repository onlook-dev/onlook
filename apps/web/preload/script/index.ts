import type { LayerNode } from '@onlook/models';
import debounce from 'lodash/debounce';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

const PENPAL_CHILD_CHANNEL = 'PENPAL_CHILD';

// Type for parent window methods (matches @onlook/penpal PenpalParentMethods)
type PenpalParentMethods = {
    getFrameId: () => string;
    getBranchId: () => string;
    onWindowMutated: (data: {
        added: Record<string, LayerNode>;
        removed: Record<string, LayerNode>;
    }) => void;
    onWindowResized: () => void;
    onDomProcessed: (data: { layerMap: Record<string, LayerNode>; rootNode: LayerNode }) => void;
};

type PromisifiedPenpalParentMethods = {
    [K in keyof PenpalParentMethods]: (
        ...args: Parameters<PenpalParentMethods[K]>
    ) => Promise<ReturnType<PenpalParentMethods[K]>>;
};

export let penpalParent: PromisifiedPenpalParentMethods | null = null;
let isConnecting = false;

const createMessageConnection = async () => {
    if (isConnecting || penpalParent) {
        return penpalParent;
    }

    isConnecting = true;
    console.log(`${PENPAL_CHILD_CHANNEL} - Creating penpal connection`);

    const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        // TODO: Use a proper origin
        allowedOrigins: ['*'],
    });

    const connection = connect({
        messenger,
        // Methods the iframe window is exposing to the parent window.
        methods: preloadMethods
    });

    connection.promise.then((parent) => {
        if (!parent) {
            console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection: child is null`);
            reconnect();
            return;
        }
        const remote = parent as unknown as PromisifiedPenpalParentMethods;
        penpalParent = remote;
        console.log(`${PENPAL_CHILD_CHANNEL} - Penpal connection set`);
    }).finally(() => {
        isConnecting = false;
    });

    connection.promise.catch((error) => {
        console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection:`, error);
        reconnect();
    });

    return penpalParent;
}

const reconnect = debounce(() => {
    if (isConnecting) return;

    console.log(`${PENPAL_CHILD_CHANNEL} - Reconnecting to penpal parent`);
    penpalParent = null; // Reset the parent before reconnecting
    createMessageConnection();
}, 1000);

createMessageConnection();