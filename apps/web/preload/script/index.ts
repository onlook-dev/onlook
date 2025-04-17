import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

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

    const remote = await connection.promise as any;
}

createMessageConnection();