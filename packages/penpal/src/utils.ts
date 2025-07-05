export const promisifyMethod = <T extends (...args: any[]) => any>(
    method: T | undefined,
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
    return async (...args: Parameters<T>) => {
        if (!method) throw new Error('Method not initialized');
        return method(...args);
    };
};

export enum ConnectionState {
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
    RECONNECTING = 'RECONNECTING',
}

export interface ExponentialBackoffOptions {
    initialDelay: number;
    maxDelay: number;
    maxAttempts: number;
    backoffFactor?: number;
}

export class ExponentialBackoff {
    private attempts = 0;
    private timeoutId: NodeJS.Timeout | null = null;

    constructor(
        private fn: () => void | Promise<void>,
        private options: ExponentialBackoffOptions,
    ) {
        this.options.backoffFactor = this.options.backoffFactor || 2;
    }

    execute() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        if (this.attempts >= this.options.maxAttempts) {
            console.warn(`Max reconnection attempts (${this.options.maxAttempts}) reached`);
            return;
        }

        const delay = Math.min(
            this.options.initialDelay * Math.pow(this.options.backoffFactor!, this.attempts),
            this.options.maxDelay,
        );

        this.timeoutId = setTimeout(async () => {
            this.attempts++;
            try {
                await this.fn();
            } catch (error) {
                console.error('Exponential backoff function failed:', error);
            }
        }, delay);
    }

    reset() {
        this.attempts = 0;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    cancel() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}

export const exponentialBackoff = (
    fn: () => void | Promise<void>,
    options: ExponentialBackoffOptions,
) => {
    const backoff = new ExponentialBackoff(fn, options);
    return () => backoff.execute();
};

export interface HeartbeatOptions {
    interval: number;
    onHealthy?: () => void;
    onUnhealthy?: () => void;
    maxFailures?: number;
}

export class Heartbeat {
    private intervalId: NodeJS.Timeout | null = null;
    private consecutiveFailures = 0;
    private isRunning = false;

    constructor(
        private healthCheck: () => Promise<boolean>,
        private options: HeartbeatOptions,
    ) {
        this.options.maxFailures = this.options.maxFailures || 3;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.consecutiveFailures = 0;

        this.intervalId = setInterval(async () => {
            try {
                const isHealthy = await this.healthCheck();

                if (isHealthy) {
                    if (this.consecutiveFailures > 0) {
                        this.consecutiveFailures = 0;
                        this.options.onHealthy?.();
                    }
                } else {
                    this.consecutiveFailures++;
                    if (this.consecutiveFailures >= this.options.maxFailures!) {
                        this.options.onUnhealthy?.();
                    }
                }
            } catch (error) {
                this.consecutiveFailures++;
                console.error('Heartbeat check failed:', error);
                if (this.consecutiveFailures >= this.options.maxFailures!) {
                    this.options.onUnhealthy?.();
                }
            }
        }, this.options.interval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.consecutiveFailures = 0;
    }

    isActive() {
        return this.isRunning;
    }
}
