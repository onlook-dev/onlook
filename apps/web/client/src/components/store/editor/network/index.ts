import {makeAutoObservable, runInAction} from "mobx";

import type { NetworkStatus,NetworkConfig,NetworkEvent,NetworkEventCallback } from "./types";

import {pingServer,calculateConnectionQuality,calculateBackoffDelay,debounce} from "./utils";



export class NetworkStore{

    status:NetworkStatus = {
        isOnline: typeof window !== 'undefined' ? navigator.onLine : false,
        isConnecting:false,
        lastSeen:new Date(),
        reconnectAttempts:0,
        maxReconnectAttempts:5,
        connectionQuality:'offline',
        latency:undefined,

    };


    private config:NetworkConfig = {
        pingUrl: 'https://www.cloudflare.com/cdn-cgi/trace', // Reliable CDN endpoint for real internet connectivity
        pingInterval:2000, 
        maxReconnectAttempts:5,
        reconnectDelay:1000,
        timeoutDuration:3000, 
    };

    private pingIntervalId:ReturnType<typeof setInterval> | null = null;
    private reconnectTimeoutId:ReturnType<typeof setTimeout> | null = null;
    private eventCallbacks:Set<NetworkEventCallback> = new Set();
    private isDestroyed:boolean = false;

    private debounceOnlineHandler: (() => void) & { cancel: () => void };
    private debounceOfflineHandler: (() => void) & { cancel: () => void };
    private debouncedUpdateStatus: ((isOnline: boolean, latency?: number) => void) & { cancel: () => void };
    private visibilityChangeHandler: () => void;

    constructor(customConfig?:Partial<NetworkConfig>){
        makeAutoObservable(this);

        if(customConfig){
            this.config = {...this.config,...customConfig};
            this.status.maxReconnectAttempts = this.config.maxReconnectAttempts;
        }

    
        
        this.debounceOnlineHandler = debounce(()=>this.handleOnlineEvent(),1000);
        this.debounceOfflineHandler = debounce(()=>this.handleOfflineEvent(),100); 
        
        
        this.debouncedUpdateStatus = debounce((isOnline: boolean, latency?: number) => {
            this.updateStatusImmediate(isOnline, latency);
        }, 200);

        
        this.visibilityChangeHandler = () => {
            if (!document.hidden) {
                
                this.performQuickCheck();
            }
        };

        this.initializeNetwork();
    }

    private initializeNetwork():void{
        
        if (typeof window !== 'undefined') {
            window.addEventListener('online',this.debounceOnlineHandler);
            window.addEventListener('offline',this.debounceOfflineHandler);
            
            
            document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        }

        this.performInitialCheck();
        this.startPingMonitoring();
    }

    private async performInitialCheck():Promise<void>{
        
        if (typeof window !== 'undefined' && !navigator.onLine) {
            console.log('Browser reports offline');
            this.updateStatusImmediate(false);
            return;
        }

       
        try{
            const result = await pingServer(this.config);
            this.updateStatus(result.success, result.latency);

            if(result.success){
                this.emitEvent({
                    type:'online',
                    timestamp:new Date(),
                    data:{latency:result.latency}
                });
            } else {
                console.log('Internet connectivity test failed');
            }
        }
        catch(error){
            console.warn('Initial Network Check Failed',error);
            this.updateStatus(false);
        }
    }

    private async performQuickCheck():Promise<void>{
        
        if (typeof window !== 'undefined' && !navigator.onLine) {
            this.updateStatusImmediate(false);
            return;
        }

        try{
            const result = await pingServer({
                ...this.config,
                timeoutDuration: 1500 
            });
            this.updateStatusImmediate(result.success, result.latency);
        }
        catch(error){
            this.updateStatusImmediate(false);
        }
    }

    private startPingMonitoring():void{
        if(this.pingIntervalId){
            clearInterval(this.pingIntervalId);
        }
        this.pingIntervalId = setInterval(async()=>{
            if(this.isDestroyed) return;

            
            if (typeof window !== 'undefined' && !navigator.onLine) {
                this.handlePingResult(false);
                return;
            }

            
            try{
             const result = await pingServer(this.config);
             this.handlePingResult(result.success, result.latency);
            }
            catch(error){
             console.warn('Internet connectivity test failed', error);
             this.handlePingResult(false);
            }
            
        },this.config.pingInterval);
    }

    private handlePingResult(success:boolean,latency?:number):void{
        const wasOnline = this.status.isOnline;
        this.updateStatus(success,latency);

        if(!wasOnline && success){
            this.emitEvent({
                type:'reconnected',
                timestamp: new Date(),
                data:{latency}
            });
            this.resetReconnectAttempts();
        }
        else if(wasOnline && !success){
            this.emitEvent({
                type:'disconnected',
                timestamp:new Date(),
            })
            this.startReconnectProcess();
        }
    }

    
    private updateStatus(isOnline:boolean,latency?:number):void{
        this.debouncedUpdateStatus(isOnline, latency);
    }

    
    private updateStatusImmediate(isOnline:boolean,latency?:number):void{
        runInAction(() => {
            const previousQuality = this.status.connectionQuality;

            this.status.isOnline = isOnline;
            this.status.latency = latency;
            this.status.connectionQuality = calculateConnectionQuality(latency,isOnline);

            if(isOnline){
                this.status.lastSeen = new Date();
                this.status.isConnecting = false;
            }

            if(previousQuality !== this.status.connectionQuality){
                this.emitEvent({
                    type:'quality-change',
                    timestamp:new Date(),
                    data:{
                        from:previousQuality,
                        to:this.status.connectionQuality,
                        latency
                    }
                });
            }
        });
    }

    private handleOnlineEvent():void{
        console.log('Browser detected online');
        this.performInitialCheck();
    }

    private handleOfflineEvent():void{
        console.log('Browser detected offline');
        this.updateStatusImmediate(false); 
        this.emitEvent({
            type:'offline',
            timestamp:new Date()
        });
        this.startReconnectProcess();
    }

    private startReconnectProcess():void{
        if(this.status.isConnecting||this.isDestroyed) return;
        if(this.status.reconnectAttempts >= this.config.maxReconnectAttempts){
            console.warn('Max reconnect attempts reached - stopping automatic retries');
            this.status.isConnecting = false;
            this.emitEvent({
                type:'max-attempts-reached',
                timestamp:new Date(),
                data:{
                    attempts: this.status.reconnectAttempts,
                    maxAttempts: this.status.maxReconnectAttempts
                }
            });
            return;
        }
        this.status.isConnecting = true;
        this.status.reconnectAttempts++;

        const delay = calculateBackoffDelay(this.status.reconnectAttempts - 1,this.config.reconnectDelay);

        console.log(`Reconnect attempt ${this.status.reconnectAttempts}/${this.status.maxReconnectAttempts} in ${Math.round(delay)}ms`);
        
        this.emitEvent({
            type:'reconnecting',
            timestamp:new Date(),
            data:{
                attempt:this.status.reconnectAttempts,
                maxAttempts:this.status.maxReconnectAttempts,
                delay:Math.round(delay)
            }
        });

        this.reconnectTimeoutId = setTimeout(async()=>{
            if(this.isDestroyed) return;
            try{
                const result = await pingServer(this.config);
               if(result.success){
                this.updateStatus(true,result.latency);
                this.emitEvent({
                    type:'reconnected',
                    timestamp:new Date(),
                    data:{latency:result.latency}
                });
                this.resetReconnectAttempts();
               }
               else{
                this.status.isConnecting = false;
                this.startReconnectProcess();
               }
            }
            catch(error){
                console.warn('Reconnection attempt failed:', error);
                this.status.isConnecting = false;
                this.startReconnectProcess();
            }
        },delay);
    }

    public manualRetry():void{
        this.resetReconnectAttempts();
        this.startReconnectProcess();
    }

    private resetReconnectAttempts():void{
        this.status.reconnectAttempts = 0;
        this.status.isConnecting = false;
        if(this.reconnectTimeoutId){
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    }

    private emitEvent(event:NetworkEvent):void{
        this.eventCallbacks.forEach(callback => {
            try{
               callback(event);
            }
            catch(error){
               console.error('Error in network event callback:', error);
            }
        })
    }

    public subscribe(callback:NetworkEventCallback): ()=>void{
        this.eventCallbacks.add(callback);
        return ()=>{
            this.eventCallbacks.delete(callback);
        };

    }

    public async checkConnection():Promise<boolean>{
        try{
         const result = await pingServer(this.config);
         this.updateStatus(result.success,result.latency);
         return result.success;
        }
        catch(error){
          this.updateStatus(false);
          return false;
        }
    }

    public updateConfig(newConfig:Partial<NetworkConfig>):void{
        this.config = {...this.config,...newConfig};
        this.startPingMonitoring();
    }
    public destroy():void
    {
         this.isDestroyed = true;

       
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }

        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        
        // Safely cancel any pending debounced handlers (guard in case they were not initialized)
        if (this.debouncedUpdateStatus && typeof (this.debouncedUpdateStatus as any).cancel === 'function') {
            (this.debouncedUpdateStatus as any).cancel();
        }
        if (this.debounceOnlineHandler && typeof (this.debounceOnlineHandler as any).cancel === 'function') {
            (this.debounceOnlineHandler as any).cancel();
        }
        if (this.debounceOfflineHandler && typeof (this.debounceOfflineHandler as any).cancel === 'function') {
            (this.debounceOfflineHandler as any).cancel();
        }

        
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.debounceOnlineHandler);
            window.removeEventListener('offline', this.debounceOfflineHandler);
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        }

        
        this.eventCallbacks.clear();
    }



}