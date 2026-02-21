// ─── Clock Abstraction ──────────────────────────────────────────

export interface Disposable {
    dispose(): void;
}

export interface Clock {
    now(): number;
    setTimeout(cb: () => void, ms: number): Disposable;
    setInterval(cb: () => void, ms: number): Disposable;
}

// ─── RealClock (production) ─────────────────────────────────────

export class RealClock implements Clock {
    now(): number {
        return Date.now();
    }

    setTimeout(cb: () => void, ms: number): Disposable {
        const id = globalThis.setTimeout(cb, ms);
        return { dispose: () => globalThis.clearTimeout(id) };
    }

    setInterval(cb: () => void, ms: number): Disposable {
        const id = globalThis.setInterval(cb, ms);
        return { dispose: () => globalThis.clearInterval(id) };
    }
}

// ─── FakeClock (testing) ────────────────────────────────────────

interface ScheduledTask {
    cb: () => void;
    fireAt: number;
    interval: number | null; // null = setTimeout, number = setInterval period
    cancelled: boolean;
}

export class FakeClock implements Clock {
    private _now = 0;
    private tasks: ScheduledTask[] = [];

    now(): number {
        return this._now;
    }

    setTimeout(cb: () => void, ms: number): Disposable {
        const task: ScheduledTask = {
            cb,
            fireAt: this._now + ms,
            interval: null,
            cancelled: false,
        };
        this.tasks.push(task);
        return { dispose: () => { task.cancelled = true; } };
    }

    setInterval(cb: () => void, ms: number): Disposable {
        const task: ScheduledTask = {
            cb,
            fireAt: this._now + ms,
            interval: ms,
            cancelled: false,
        };
        this.tasks.push(task);
        return { dispose: () => { task.cancelled = true; } };
    }

    /**
     * Advance time by `ms` milliseconds, firing any due callbacks in order.
     */
    advance(ms: number): void {
        const target = this._now + ms;
        while (true) {
            // Find the next task that fires before or at target
            let earliest: ScheduledTask | null = null;
            for (const t of this.tasks) {
                if (t.cancelled) continue;
                if (t.fireAt <= target) {
                    if (!earliest || t.fireAt < earliest.fireAt) {
                        earliest = t;
                    }
                }
            }
            if (!earliest) break;
            this._now = earliest.fireAt;
            const task = earliest;
            if (task.interval !== null) {
                // Reschedule interval
                task.fireAt = this._now + task.interval;
            } else {
                task.cancelled = true;
            }
            task.cb();
        }
        this._now = target;
    }
}
