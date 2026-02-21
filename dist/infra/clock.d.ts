export interface Disposable {
    dispose(): void;
}
export interface Clock {
    now(): number;
    setTimeout(cb: () => void, ms: number): Disposable;
    setInterval(cb: () => void, ms: number): Disposable;
}
export declare class RealClock implements Clock {
    now(): number;
    setTimeout(cb: () => void, ms: number): Disposable;
    setInterval(cb: () => void, ms: number): Disposable;
}
export declare class FakeClock implements Clock {
    private _now;
    private tasks;
    now(): number;
    setTimeout(cb: () => void, ms: number): Disposable;
    setInterval(cb: () => void, ms: number): Disposable;
    /**
     * Advance time by `ms` milliseconds, firing any due callbacks in order.
     */
    advance(ms: number): void;
}
//# sourceMappingURL=clock.d.ts.map