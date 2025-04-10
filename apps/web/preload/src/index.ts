import { WindowMessenger, connect } from 'penpal';

const createMessageConnection = async () => {
    console.log("Iframe creating message connection");

    const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        allowedOrigins: ['http://localhost:8084'],
    });

    const connection = connect({
        messenger,
        // Methods the iframe window is exposing to the parent window.
        methods: {
            mouseMove(x: number, y: number, color: string) {
                const element = document.elementFromPoint(x, y);
                if (!element) return;
                (element as HTMLElement).style.cssText = `border: 2px solid ${color};`;
            }
        },
    });

    const remote = await connection.promise as any;
}

createMessageConnection();