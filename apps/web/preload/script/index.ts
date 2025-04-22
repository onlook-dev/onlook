import type { PenpalParentMethods } from '@onlook/penpal';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

// Parent methods should be treated as promises
type PromisifiedPenpalParentMethods = {
    [K in keyof PenpalParentMethods]: (
        ...args: Parameters<PenpalParentMethods[K]>
    ) => Promise<ReturnType<PenpalParentMethods[K]>>;
}

export let remote: PromisifiedPenpalParentMethods | null = null;

const createMessageConnection = async () => {
    console.log("Preload - Creating penpal connection");

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

    remote = await connection.promise as unknown as PromisifiedPenpalParentMethods;
    return remote;
}

createMessageConnection();