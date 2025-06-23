import type { PingResult, NetworkConfig } from "./types";


export async function pingServer(config:NetworkConfig):Promise<PingResult>{
    const startTime = performance.now();

    try{
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutDuration);

        let resp: Response | undefined;

        try {
            resp = await fetch(config.pingUrl, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                },
            });

            if (!resp.ok) {
                throw new Error(`Network response was not ok: ${resp.status}`);
            }

            const endTime = performance.now();
            const latency = endTime - startTime;

            return {
                success: true,
                latency,
                timestamp: new Date(),
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }
    catch(error){
        const endTime = performance.now();
        const latency = endTime - startTime;

        return {
            success: false,
            latency,
            error: error instanceof Error ? error.message : 'Error Pinging Server',
            timestamp: new Date(),
        };
    }
}

export function calculateConnectionQuality(latency?:number,success?:boolean):'excellent' |'good' | 'poor' | 'offline'{
    if(!success)return 'offline';
    if(!latency)return 'poor';

    if (latency < 100) return 'excellent';
    if (latency < 200) return 'good';
    if (latency < 1000) return 'poor';
    
    return 'offline';
}

export function calculateBackoffDelay(attempt:number,baseDelay:number,maxDelay:number=30000):number {
    const delay = Math.min(baseDelay * Math.pow(2,attempt),maxDelay);
    const jitter = Math.random() * 0.5;
    return delay * (1 + jitter);
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const debouncedFunction = (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            func(...args);
        }, delay);
    };

    debouncedFunction.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debouncedFunction;
}