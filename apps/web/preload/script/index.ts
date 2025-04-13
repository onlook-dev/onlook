import { WindowMessenger, connect } from 'penpal';
import { getMethods } from './api';

const createMessageConnection = async () => {
    console.log("Iframe creating message connection");

    const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        // TODO: Use a proper origin
        allowedOrigins: ['*'],
    });

    const connection = connect({
        messenger,
        // Methods the iframe window is exposing to the parent window.
        methods: getMethods()
    });

    const remote = await connection.promise as any;
}

createMessageConnection();