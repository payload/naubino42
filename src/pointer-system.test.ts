import { PointerSystem, Naub, Pointer, Naubino } from "./naubino"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"
import { assert } from "chai"

describe("Pointer", () => {
    describe("step", function () {
        it("moves when pos is set", () => {
            const pointer = new Pointer({ x: 0, y: 0 })
            pointer.pos = { x: 10, y: 0 }
            pointer.step()
            assert.isAbove(pointer.body.position.x, 0)
        })
    })
})

describe("PointerSystem", function () {
    let naubino: Naubino
    let system: PointerSystem
    beforeEach(function () {
        naubino = new Naubino()
        system = new PointerSystem(naubino, naubino.engine)
    })
    describe("find_naub", function () {
        let naub_a: Naub
        let naub_b: Naub
        beforeEach(function () {
            naub_a = naubino.create_naub({ x: 10, y: 10 })
            naub_b = naubino.create_naub({ x: -10, y: -10 })
        })
        it("finds naub at naub center", function () {
            const naub = system.find_naub(naub_a.pos)
            assert.equal(naub, naub_a)
        })
        it("finds naub near border", function () {
            const naub = system.find_naub({ x: naub_a.pos.x + naub_a.radius * 0.9, y: naub_a.pos.y })
            assert.equal(naub, naub_a)
        })
        it("finds nothing at nothing", function () {
            const naub = system.find_naub({ x: -20, y: 0 })
            assert.isNull(naub)
        })
    })
    describe("connect_pointer_naub", function () {
        it("creates pointer when applied on naub", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const pointer = system.connect_pointer_naub(naub_a)
            assert.ok(pointer)
        })
    })
    describe("touch_down", function () {
        it("creates pointer when applied on naub pos", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const pointer = system.touch_down(naub_a.pos)
            assert.ok(pointer)
        })
        it("naubs join after touch_down", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const naub_b = naubino.create_naub({ x: 10 + naub_a.radius*3, y: 10 })
            const pointer = system.touch_down(naub_a.pos)
            pointer.moveTo(naub_b.pos)
            let called: Array<any> = []
            naubino.ee.on("naub_naub_collision", () => called.push("naub_naub_collision"))
            naubino.ee.on("join_naubs", () => called.push("join_naubs"))
            _.times(10, () => {
                system.step()
                naubino.step()
            })
            assert.deepEqual(called, ["naub_naub_collision", "join_naubs"])
        })
        it("naubs don't join after touch up", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const naub_b = naubino.create_naub({ x: 10 + naub_a.radius*3, y: 10 })
            const pointer = system.touch_down(naub_a.pos)
            pointer.moveTo(naub_b.pos)
            let called: Array<any> = []
            naubino.ee.on("naub_naub_collision", () => called.push("naub_naub_collision"))
            naubino.ee.on("join_naubs", () => called.push("join_naubs"))
            system.step()
            naubino.step()
            pointer.up()
            Matter.Body.applyForce(naub_a.body, naub_a.body.position, { x: naub_a.body.mass * 0.01, y: 0 })
            _.times(10, () => {
                system.step()
                naubino.step()
            })
            assert.deepEqual(called, ["naub_naub_collision"])
        })
    })
    describe("Pointer", function () {
        it("gets removed when naub removes", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const pointer = system.touch_down(naub_a.pos)

            let called = new Array<Pointer>()
            system.ee.on("remove_pointer", (pointer) => called.push(pointer))
            naub_a.remove()
            system.step()
            assert.deepEqual(called, [pointer], "remove_pointer called with pointer")
        })
    })
})

