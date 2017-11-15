export class Timer {
    public active = false
    public time = 0

    constructor(public interval: number, private callback: () => void) {
    }

    start(): Timer {
        this.active = true
        return this
    }
    stop(): Timer {
        this.active = false
        return this
    }
    step(dt: number): Timer {
        if (!this.active) return this
        this.time += dt
        if (this.time >= this.interval) {
            this.time -= this.interval
            this.callback()
        }
        return this
    }
}
