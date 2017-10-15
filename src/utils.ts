export function fail_condition(condition: boolean): boolean {
    const throw_error = true
    if (throw_error && !condition) {
        throw Error("fail_condition")
    }
    return !condition
}