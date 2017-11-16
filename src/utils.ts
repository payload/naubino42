import { EventEmitter } from "eventemitter3"

export function fail_condition(condition: boolean): boolean {
    const throw_error = true
    if (throw_error && !condition) {
        throw Error("fail_condition")
    }
    return !condition
}

export function delegate_event(event: string | symbol, from: EventEmitter, to: EventEmitter) {
    from.on(event, (...args) => to.emit(event, ...args))
}