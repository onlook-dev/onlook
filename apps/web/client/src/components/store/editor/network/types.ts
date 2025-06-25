export interface NetworkStatus {
    isOnline: boolean;
    isConnecting: boolean;
    lastSeen: Date;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
    latency?: number;

}

export interface NetworkConfig{
    pingUrl: string;
    pingInterval: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    timeoutDuration: number;
}

export interface NetworkEvent {
    type: 'online' | 'offline' | 'reconnecting' | 'reconnected' | 'disconnected' | 'quality-change' | 'max-attempts-reached';
    timestamp: Date;
    data?:any;

}
export type NetworkEventCallback = (event: NetworkEvent) => void;

export interface PingResult {
    success: boolean;
    latency?: number;
    error?: string;
    timestamp: Date;
}