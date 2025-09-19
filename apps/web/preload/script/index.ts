import { PENPAL_CHILD_CHANNEL, type PromisifiedPenpalParentMethods } from '@onlook/penpal';
import debounce from 'lodash/debounce';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

export let penpalParent: PromisifiedPenpalParentMethods | null = null;
let isConnecting = false;
let retryCount = 0;
const maxRetries = 3;
const baseDelay = 1000;

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
        retryCount = 0;
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

const reconnect = () => {
    if (isConnecting) return;
    
    if (retryCount >= maxRetries) {
        console.error(`${PENPAL_CHILD_CHANNEL} - Max retries (${maxRetries}) reached, giving up`);
        retryCount = 0;
        return;
    }
    
    retryCount += 1;
    const delay = baseDelay * Math.pow(2, retryCount - 1);
    
    console.log(`${PENPAL_CHILD_CHANNEL} - Retrying connection attempt ${retryCount}/${maxRetries} in ${delay}ms`);
    
    setTimeout(() => {
        console.log(`${PENPAL_CHILD_CHANNEL} - Reconnecting to penpal parent`);
        penpalParent = null;
        createMessageConnection();
    }, delay);
};

createMessageConnection();
