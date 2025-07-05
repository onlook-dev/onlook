import { 
    PENPAL_CHILD_CHANNEL, 
    type PromisifiedPenpalParentMethods,
    ConnectionState,
    ExponentialBackoff,
    Heartbeat
} from '@onlook/penpal';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

export let penpalParent: PromisifiedPenpalParentMethods | null = null;
let isConnecting = false;
let connectionState = ConnectionState.DISCONNECTED;
let reconnectAttempts = 0;
let heartbeat: Heartbeat | null = null;
let lastSuccessfulConnection = 0;
let connectionQuality = {
    latency: 0,
    successRate: 1.0,
    totalAttempts: 0,
    successfulAttempts: 0
};

const createMessageConnection = async () => {
    if (isConnecting || (penpalParent && connectionState === ConnectionState.CONNECTED)) {
        return penpalParent;
    }

    isConnecting = true;
    connectionState = ConnectionState.CONNECTING;
    connectionQuality.totalAttempts++;
    
    console.log(`${PENPAL_CHILD_CHANNEL} - Creating penpal connection (attempt ${reconnectAttempts + 1})`);

    const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        allowedOrigins: ['*'],
    });

    const connection = connect({
        messenger,
        methods: preloadMethods
    });

    connection.promise.then((parent) => {
        if (!parent) {
            console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection: child is null`);
            connectionState = ConnectionState.DISCONNECTED;
            reconnectBackoff.execute();
            return;
        }
        
        const remote = parent as unknown as PromisifiedPenpalParentMethods;
        penpalParent = remote;
        connectionState = ConnectionState.CONNECTED;
        lastSuccessfulConnection = Date.now();
        reconnectAttempts = 0;
        connectionQuality.successfulAttempts++;
        connectionQuality.successRate = connectionQuality.successfulAttempts / connectionQuality.totalAttempts;
        
        reconnectBackoff.reset();
        startHeartbeat();
        
        console.log(`${PENPAL_CHILD_CHANNEL} - Penpal connection established successfully`);
    }).finally(() => {
        isConnecting = false;
    });

    connection.promise.catch((error) => {
        console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection:`, error);
        connectionState = ConnectionState.DISCONNECTED;
        reconnectBackoff.execute();
    });

    return penpalParent;
}

const reconnectBackoff = new ExponentialBackoff(async () => {
    if (isConnecting || connectionState === ConnectionState.RECONNECTING) return;

    connectionState = ConnectionState.RECONNECTING;
    reconnectAttempts++;
    
    console.log(`${PENPAL_CHILD_CHANNEL} - Reconnecting to penpal parent (attempt ${reconnectAttempts})`);
    
    stopHeartbeat();
    penpalParent = null;
    await createMessageConnection();
}, {
    initialDelay: 1000,
    maxDelay: 30000,
    maxAttempts: 10,
    backoffFactor: 2
});

const startHeartbeat = () => {
    if (heartbeat?.isActive()) return;
    
    heartbeat = new Heartbeat(async () => {
        if (!penpalParent || connectionState !== ConnectionState.CONNECTED) {
            return false;
        }
        
        try {
            const startTime = Date.now();
            await penpalParent.getFrameId();
            connectionQuality.latency = Date.now() - startTime;
            return true;
        } catch (error) {
            console.warn(`${PENPAL_CHILD_CHANNEL} - Heartbeat failed:`, error);
            return false;
        }
    }, {
        interval: 30000,
        maxFailures: 2,
        onHealthy: () => {
            console.log(`${PENPAL_CHILD_CHANNEL} - Connection health restored`);
        },
        onUnhealthy: () => {
            console.warn(`${PENPAL_CHILD_CHANNEL} - Connection unhealthy, triggering reconnection`);
            connectionState = ConnectionState.DISCONNECTED;
            reconnectBackoff.execute();
        }
    });
    
    heartbeat.start();
};

const stopHeartbeat = () => {
    if (heartbeat) {
        heartbeat.stop();
        heartbeat = null;
    }
};

createMessageConnection();
