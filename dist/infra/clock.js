// ─── Clock Abstraction ──────────────────────────────────────────
// ─── RealClock (production) ─────────────────────────────────────
export class RealClock {
    now() {
        return Date.now();
    }
    setTimeout(cb, ms) {
        const id = globalThis.setTimeout(cb, ms);
        return { dispose: () => globalThis.clearTimeout(id) };
    }
    setInterval(cb, ms) {
        const id = globalThis.setInterval(cb, ms);
        return { dispose: () => globalThis.clearInterval(id) };
    }
}
export class FakeClock {
    _now = 0;
    tasks = [];
    now() {
        return this._now;
    }
    setTimeout(cb, ms) {
        const task = {
            cb,
            fireAt: this._now + ms,
            interval: null,
            cancelled: false,
        };
        this.tasks.push(task);
        return { dispose: () => { task.cancelled = true; } };
    }
    setInterval(cb, ms) {
        const task = {
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
    advance(ms) {
        const target = this._now + ms;
        while (true) {
            // Find the next task that fires before or at target
            let earliest = null;
            for (const t of this.tasks) {
                if (t.cancelled)
                    continue;
                if (t.fireAt <= target) {
                    if (!earliest || t.fireAt < earliest.fireAt) {
                        earliest = t;
                    }
                }
            }
            if (!earliest)
                break;
            this._now = earliest.fireAt;
            const task = earliest;
            if (task.interval !== null) {
                // Reschedule interval
                task.fireAt = this._now + task.interval;
            }
            else {
                task.cancelled = true;
            }
            task.cb();
        }
        this._now = target;
    }
}
//# sourceMappingURL=clock.js.map