import type { PenpalParentMethods } from '@onlook/penpal';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

export let remote: PenpalParentMethods | null = null;

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

    remote = await connection.promise as unknown as PenpalParentMethods;
    return remote;
}

createMessageConnection();