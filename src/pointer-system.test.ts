import { PointerSystem, Naub, Pointer, Naubino } from "./naubino"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"
import { assert } from "chai"


describe("PointerSystem", function () {
    let naubino: Naubino
    let system: PointerSystem
    beforeEach(function () {
        naubino = new Naubino()
        system = naubino.pointers
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
        it("creates no pointer when applied on no naub pos", function () {
            const naub_a = naubino.create_naub({ x: 0, y: 0 })
            const pointer = system.touch_down({ x: naub_a.radius * 3, y: 0 })
            assert.isNull(pointer)
        })
        it("naubs join after touch_down", function () {
            let called: Array<any> = []
            naubino.ee.on("naub_naub_collision", () => called.push("naub_naub_collision"))
            naubino.ee.on("join_naubs", () => called.push("join_naubs"))
            const check = () => assert.deepEqual(called, ["naub_naub_collision", "join_naubs"])

            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const naub_b = naubino.create_naub({ x: 10 + naub_a.radius * 3, y: 10 })
            const pointer = system.touch_down(naub_a.pos)
            pointer.moveTo(naub_b.pos)
            _.times(30, () => naubino.step())

            check()
        })
        it("naubs don't join after touch up", function () {
            let called: Array<any> = []
            naubino.ee.on("naub_naub_collision", () => called.push("naub_naub_collision"))
            naubino.ee.on("join_naubs", () => called.push("join_naubs"))
            const check = () => assert.deepEqual(called, ["naub_naub_collision"])

            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const naub_b = naubino.create_naub({ x: 10 + naub_a.radius * 3, y: 10 })
            const pointer = system.touch_down(naub_a.pos)
            pointer.up()
            Matter.Body.applyForce(naub_a.body, naub_a.body.position, { x: naub_a.body.mass * 0.01, y: 0 })
            _.times(10, () => naubino.step())

            check()
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
        describe("move", function () {
            it("moves naub", function () {
                const pos_a = { x: 10, y: 10 }
                const pos_b = { x: -10, y: 10 }
                const check = () => assert.isBelow(naub_a.pos.x, pos_a.x, "naub moved")

                const naub_a = naubino.create_naub(pos_a)
                const pointer = naubino.connect_pointer_naub(naub_a)
                pointer.move(Vector.sub(pos_b, pos_a))
                _.times(10, () => naubino.step())

                check()
            })
        })
        describe("moveTo", function () {
            it("moves naub", function () {
                const pos_a = { x: 10, y: 10 }
                const pos_b = { x: -10, y: 10 }
                const check = () => assert.isBelow(naub_a.pos.x, pos_a.x, "naub moved")

                const naub_a = naubino.create_naub(pos_a)
                const pointer = naubino.connect_pointer_naub(naub_a)
                pointer.moveTo(pos_b)
                _.times(10, () => naubino.step())

                check()
            })
            it("moves naub in 1 sec 600 px", function () {
                const pos_a = { x: -300, y: 10 }
                const pos_b = { x: 300, y: 10 }
                const check = () => assert.isBelow(Vector.distance(naub_a.pos, pos_b), naub_a.radius, "naub near destination")

                const naub_a = naubino.create_naub(pos_a)
                const pointer = naubino.connect_pointer_naub(naub_a)
                pointer.moveTo(pos_b)
                _.times(60, () => naubino.step())

                check()
            })
        })
    })
})