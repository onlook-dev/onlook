export class LogTimer {
    private startTime: number;
    private name: string;

    constructor(name: string) {
        this.startTime = Date.now();
        this.name = name;
    }

    log(step: string) {
        const elapsed = Date.now() - this.startTime;
        console.log(`[${this.name}] ${step}: ${elapsed}ms`);
    }
}
