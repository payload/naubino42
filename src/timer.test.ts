import { Timer } from "./timer"

import { assert } from "chai"

describe("Timer", function () {
    const interval = 1
    let timer: Timer
    let called: number
    beforeEach(function () {
        called = 0
        timer = new Timer(interval, () => ++called)
    })
    describe("step, active", function () {
        beforeEach(() => timer.start())
        it("calls callback once on exact time", function () {
            timer.step(interval)
            assert.equal(called, 1)
        })
        it("calls callback once on overtime", function () {
            timer.step(interval * 5)
            assert.equal(called, 1)
        })
        it("calls callback once per step on overtime", function () {
            timer.step(interval * 5)
            timer.step(0)
            timer.step(0)
            assert.equal(called, 3)
        })
        it("doesn't call callback when it is not time", function () {
            timer.step(interval * 0.5)
            assert.equal(called, 0)
        })
    })
    describe("step, not active", function () {
        it("doesn't call callback", function () {
            timer.step(interval)
            timer.step(interval * 5)
            timer.step(interval * 0.5)
            assert.equal(called, 0)
        })
    })
    describe("start", function () {
        it("makes active", function () {
            assert.isFalse(timer.active)
            timer.start()
            assert.isTrue(timer.active)
        })
    })
    describe("stop", function () {
        it("makes inactive", function () {
            timer.start()
            timer.stop()
            assert.isFalse(timer.active)
        })
    })
})