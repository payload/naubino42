import { PointerSystem, Naub, Pointer, Naubino } from "./naubino"

import * as Matter from "matter-js"
import { Vector } from "matter-js"
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
        it("connects naub", function () {
            const naub_a = naubino.create_naub({ x: 10, y: 10 })
            const pointer = naubino.connect_pointer_naub(naub_a)
            assert(pointer)
        })
    })
})

