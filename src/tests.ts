import { Vector, Matter, WorldState } from "./matter-js"
import { Naubino, Naub, NaubJoint, Pointer } from "./naubino"

import { assert } from "chai"
import * as _ from "lodash"

describe("Naub", function () {
    let naub_a: Naub
    let naub_b: Naub
    beforeEach(function () {
        const engine = Matter.Engine.create()
        naub_a = new Naub(engine)
        naub_b = new Naub(engine)
    })
    describe("is_joined", function () {
        it("default false", function () {
            assert.isFalse(naub_a.is_joined(naub_b))
            assert.isFalse(naub_b.is_joined(naub_a))
            assert.isFalse(naub_a.is_joined(naub_a))
        })
        it("after join_naub true only with joined naubs", function () {
            naub_a.join_naub(naub_b)
            assert.isTrue(naub_a.is_joined(naub_b))
            assert.isTrue(naub_b.is_joined(naub_a))
            assert.isFalse(naub_a.is_joined(naub_a))
        })
    })
    describe("join_naub", function () {
        it("makes is_joined true", function () {
            naub_a.join_naub(naub_b)
            assert.isTrue(naub_a.is_joined(naub_b))
        })
        it("call twice is okay", function () {
            naub_a.join_naub(naub_b)
            assert.doesNotThrow(() => naub_a.join_naub(naub_b))
        })
        it("call on itself is not okay", function () {
            assert.throws(() => naub_a.join_naub(naub_a))
        })
    })
    describe("unjoin_naub", function () {
        it("makes is_joined false", function () {
            naub_a.join_naub(naub_b)
            naub_a.unjoin_naub(naub_b)
            assert.isFalse(naub_a.is_joined(naub_b))
        })
        it("call on unjoined naub is okay", function () {
            assert.doesNotThrow(() => naub_a.unjoin_naub(naub_b))
        })
        it("call on itself is not okay", function () {
            assert.throws(() => naub_a.unjoin_naub(naub_a))
        })
    })
    describe("merge_naub", function () {
        beforeEach(function () {
            const engine = Matter.Engine.create()
            naub_b.join_naub(new Naub(engine))
            naub_b.join_naub(new Naub(engine))
        })
        it("kills other naub", function () {
            naub_a.merge_naub(naub_b)
            assert.equal(naub_b.alive, false)
        })
        it("joins this naub with neighbors of other naub", function () {
            const neighbors = _.clone(naub_b.naubs_joints)
            naub_a.merge_naub(naub_b)
            assert.deepEqual(naub_a.naubs_joints.keys(), neighbors.keys())
        })
        it("unjoins other naub from neighbors", function () {
            naub_a.merge_naub(naub_b)
            assert.equal(naub_b.naubs_joints.size, 0)
        })
    })
})

describe("Naubino", () => {
    let naubino: Naubino

    beforeEach(function () {
        naubino = new Naubino()
        naubino.size = { x: 200, y: 200 }
    })

    describe("naub_touches_naub", function () {
        let naub_a: Naub
        let naub_b: Naub
        let naubs_a: Naub[]
        let naubs_b: Naub[]
        beforeEach(function () {
            naub_a = naubino.create_naub();
            naub_b = naubino.create_naub();
            naubs_a = naubino.create_naub_chain(2)
            naubs_b = naubino.create_naub_chain(2)
        })
        it("join two single naubs", function () {
            naubino.naub_touches_naub(naub_a, naub_b);
            assert.isTrue(naub_a.is_joined(naub_b))
        })
        it("join two single naubs adds naub joint", function () {
            let called = 0
            naubino.ee.on("add_naub_joint", () => ++called)
            naubino.naub_touches_naub(naub_a, naub_b);
            assert.equal(called, 1, "add_naub_joint called")
        })
        it("join single naub with naub pair", function () {
            naubino.naub_touches_naub(naub_a, naubs_a[0])
            assert.isTrue(naub_a.is_joined(naubs_a[0]))
        })
        it("merge two naub pairs to a chain", function () {
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].is_joined(naubs_a[1]))
            assert.isTrue(naubs_a[0].is_joined(naubs_b[1]))
            assert.isFalse(naubs_a[0].is_joined(naubs_b[0]))
        })
        it("merge two naub paris to a chain adds naub joint", function () {
            let called = 0
            naubino.ee.on("add_naub_joint", () => ++called)
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            assert.equal(called, 1, "add_naub_joint called")
        })
        it("merge two naub pairs and kill naub_b", function () {
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].alive, "naub a 0 alive")
            assert.isTrue(naubs_a[1].alive, "naub a 1 alive")
            assert.isTrue(naubs_b[1].alive, "naub b 1 alive")
            assert.isFalse(naubs_b[0].alive, "naub b 0 dead")
        })
        it("merge two naub chains, cycle removed", function () {
            const naubs_a = naubino.create_naub_chain(3)
            const naubs_b = naubino.create_naub_chain(3)
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            naubino.naub_touches_naub(naubs_a[2], naubs_b[2])
            for (const naub of naubs_a.concat(naubs_b)) {
                assert.isFalse(naub.alive, "naub alive")
            }
        })
    })

    describe("on naub_naub_collision", function () {
        it("calls on collision", function () {
            const naub_a = naubino.create_naub({ x: 0, y: 0 });
            const naub_b = naubino.create_naub({ x: naub_a.radius * 3, y: 0 })
            Matter.Body.applyForce(naub_a.body, naub_a.body.position, { x: naub_a.body.mass * 0.01, y: 0 })
            let called = 0
            naubino.ee.on("naub_naub_collision", () => ++called)
            _.times(10, () => naubino.step())
            assert.equal(called, 1, "called once")
        })
    })

    describe("Pointer and Naubs", function () {
        it("merges naub pairs next to each other", function () {
            const naubs_a = naubino.create_naub_chain(2, { x: 0, y: 0 })
            const naubs_b = naubino.create_naub_chain(2, { x: 0, y: naubs_a[0].radius * 3 })
            const pointer = naubino.connect_pointer_naub(naubs_a[0])
            pointer.moveTo(naubs_b[0].pos)
            _.times(100, () => naubino.step())
            assert.equal(naubino.naubs.size, 3, "one naub removed")
        })
        it("dont merge naubs without pointer", function () {
            const naubs_a = naubino.create_naub_chain(2, { x: 0, y: 2 })
            const pos_diff = Vector.sub(naubs_a[1].pos, naubs_a[0].pos)
            const naubs_b = naubino.create_naub_chain(2, { x: pos_diff.x, y: 0 })
            assert.equal(naubs_b[0].pos.x, naubs_a[1].pos.x, "naubs over another")
            assert.isAbove(naubs_b[0].pos.x, 0, "naub not at 0x0")

            const pointer = naubino.connect_pointer_naub(naubs_a[0])
            pointer.pos = { x: -pos_diff.x, y: 0 }
            _.times(100, () => naubino.step())
            assert.equal(naubino.naubs.size, 4, "no naub merged")
        })
        it("merge naub transfers pointers to remaining naub", function () {
            const [naub_a, _a] = naubino.create_naub_chain(2, { x: 0, y: 0 })
            const [naub_b, _b] = naubino.create_naub_chain(2, { x: 0, y: naub_a.radius * 3 })
            const pointer_a = naubino.connect_pointer_naub(naub_a)
            const pointer_b = naubino.connect_pointer_naub(naub_b)
            pointer_a.moveTo(naub_b.pos)
            pointer_b.moveTo(naub_a.pos)
            _.times(100, () => naubino.step())
            assert.isFalse(naub_a.alive && naub_b.alive, "naubs merged")
            const remaining_naub = naub_a.alive ? naub_a : naub_b
            assert.isTrue(remaining_naub.pointers.has(pointer_a), "pointer_a transfered")
            assert.isTrue(remaining_naub.pointers.has(pointer_b), "pointer_b transfered")
        })
    })

    describe("create_naub_chain", function () {
        it("creates naubs", () => {
            const chain = naubino.create_naub_chain(10);
            assert.equal(naubino.naubs.size, 10, "all naubs there")
        })
        it("creates naub joints", () => {
            const chain = naubino.create_naub_chain(10);
            assert.equal(naubino.naub_joints.size, 9, "all naub_joints there")
        })
        it("creates physics objects", () => {
            const chain = naubino.create_naub_chain(10);
            assert.isAtLeast(naubino.engine.world.bodies.length, 10, "all bodies are there")
            assert.isAtLeast(naubino.engine.world.constraints.length, 9, "all constraints are there")
        })
        it("creates naubs around 0x0 horizontally", () => {
            const chain = naubino.create_naub_chain(11);
            const left = _.filter(chain, (naub) => naub.pos.x < 0).length
            const right = _.filter(chain, (naub) => naub.pos.x > 0).length
            console.assert(left == 5, "left == 5")
            console.assert(right == 5, "right == 5")
        })
        it("creates naubs around 0x0 vertically when rotated 90°", () => {
            const chain = naubino.create_naub_chain(11, { x: 0, y: 0 }, 0.5 * Math.PI);
            const above = _.filter(chain, (naub) => naub.pos.y < 0).length
            const below = _.filter(chain, (naub) => naub.pos.y > 0).length
            console.assert(above == 5, "above == 5")
            console.assert(below == 5, "below == 5")
        })
        it("creates naubs around -10x-10 vertically when rotated 90°", () => {
            const chain = naubino.create_naub_chain(11, { x: 10, y: -10 }, 0.5 * Math.PI);
            const above = _.filter(chain, (naub) => naub.pos.y < -10).length
            const below = _.filter(chain, (naub) => naub.pos.y > -10).length
            console.assert(above == 5, "above == 5")
            console.assert(below == 5, "below == 5")
            for (const naub of chain) {
                assert.closeTo(naub.pos.x, 10, 0.0001)
            }
        })
    })

    describe("Naub", function () {
        describe("find_cycles", function () {
            it("finds no cycle on beginning of naub chain", function () {
                const chain = naubino.create_naub_chain(3);
                const cycles = chain[0].find_cycles()
                assert.isEmpty(cycles)
            })
            it("finds no cycle in middle of naub chain", function () {
                const chain = naubino.create_naub_chain(5);
                const cycles = chain[2].find_cycles()
                assert.isEmpty(cycles)
            })
            it("finds cycle of three in triangle", function () {
                const test_cycle = naubino.create_naub_chain(3);
                const reachable_a = test_cycle[0].reachable_naubs()

                test_cycle[0].join_naub(test_cycle[test_cycle.length - 1])
                const reachable_b = test_cycle[0].reachable_naubs()
                assert.deepEqual(reachable_a, reachable_b, "reachable_naubs after join_naub differs")

                const cycles = test_cycle[0].find_cycles()
                assert.isNotEmpty(cycles, "no cycles found")

                assert.deepEqual(new Set(test_cycle), new Set(cycles[0]))
            })
            it("finds cycle of three from tristar end", function () {
                const test_cycle = naubino.create_naub_chain(3);
                test_cycle[0].join_naub(test_cycle[test_cycle.length - 1])
                const spike_a = naubino.create_naub_chain(2)
                test_cycle[0].join_naub(spike_a[0])
                const spike_b = naubino.create_naub_chain(2)
                test_cycle[1].join_naub(spike_b[0])
                const spike_c = naubino.create_naub_chain(2)
                test_cycle[2].join_naub(spike_c[0])
                const cycles = spike_a[1].find_cycles()
                assert.deepEqual(new Set(test_cycle), new Set(cycles[0]))
            })
        })
    })
})