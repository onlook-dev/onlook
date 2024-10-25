export function isNearEqual(x: number, y: number, delta: number): boolean {
    return Math.abs(x - y) <= delta;
}

export function mod(x: number, y: number): number {
    return x - y * Math.floor(x / y);
}
