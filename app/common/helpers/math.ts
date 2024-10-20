export function isNearEqual(x: number, y: number, delta: number): boolean {
    return Math.abs(x - y) <= delta;
}
