export class Timer {
    interval: number
    callback: () => void
    active = false
    time = 0
    constructor(interval: number, callback: () => void) {
        this.interval = interval
        this.callback = callback
    }
    start() {
        this.active = true
        return this
    }
    stop() {
        this.active = false
        return this
    }
    step(dt: number) {
        if (!this.active) return this
        this.time += dt
        if (this.time >= this.interval) {
            this.time -= this.interval
            this.callback()
        }
        return this
    }
}
