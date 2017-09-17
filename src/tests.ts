import { Naubino, Naub, NaubJoint, Pointer, Hunter } from "./naubino"

import { assert } from "chai"
import * as _ from "lodash"

function test_200naubs() {
    let naubino = new Naubino()
    naubino.size = { x: 200, y: 200 }

    let chain_a = naubino.create_naub_chain(100, { x: 0, y: -10 })
    let chain_b = naubino.create_naub_chain(100, { x: 0, y: 10 })
    /* python
    chain_a         = naubino.create_naub_chain(100, (0, -10))
    chain_b         = naubino.create_naub_chain(100, (0,  10))
    */
    let chain_naubs = chain_a.concat(chain_b)
    for (let naub of chain_naubs) {
        naubino.add_naub(naub)
    }
    console.assert(naubino.naubs.size == 200)
    naubino.step()
    console.assert(naubino.engine.world.bodies.length >= 200)
    /* python
    for naub in chain_a + chain_b:
        naubino.add_naub(naub)
    naubino.step(0.0166)
    */
    let hunter_0 = new Hunter(naubino, chain_a[0], chain_b[0])
    let hunter_1 = new Hunter(naubino, chain_a[chain_a.length - 1], chain_b[chain_b.length - 1])
    /* python
    hunter_0        = autoplay.Hunter(naubino, chain_a[ 0], chain_b[ 0])
    hunter_1        = autoplay.Hunter(naubino, chain_a[-1], chain_b[-1])
    */
    //console.log("hunting")
    let hunters = [hunter_0, hunter_1]
    for (let i = 0; i < 10 && hunters.length > 0; ++i) {
        hunters = hunters.filter((hunter) => {
            hunter.step()
            return !hunter.finished
        })
        naubino.step()
    }
    console.assert(naubino.naubs.size == 0, "naubs == 0")
    console.assert(naubino.pointers.size == 0, "pointers == 0")
    /* python
    hunters         = [hunter_0, hunter_1]
    while hunters:
        for h in hunters[:]:
            if not h.step():
                hunters.remove(h)
        naubino.step(0.0166)
    assert not naubino.naubs
    assert not naubino.pointers
    */
}

describe("Pointer", () => {
    it("moves", () => {
        const pointer = new Pointer({ x: 0, y: 0 })
        pointer.pos = { x: 10, y: 0 }
        pointer.step()
        console.assert(pointer.body.position.x > 0)
    })
})

describe("Naub", function () {
    let naub_a: Naub
    let naub_b: Naub
    beforeEach(function () {
        naub_a = new Naub()
        naub_b = new Naub()
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
            naub_b.join_naub(new Naub())
            naub_b.join_naub(new Naub())
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

    describe("find_naub", function () {
        let naub_a: Naub
        let naub_b: Naub
        beforeEach(function () {
            naub_a = naubino.create_naub({ x: 10, y: 10 })
            naub_b = naubino.create_naub({ x: -10, y: -10 })
        })
        it("finds naub at naub center", function () {
            const naub = naubino.find_naub(naub_a.pos)
            assert.equal(naub, naub_a)
        })
        it("finds naub near border", function () {
            const naub = naubino.find_naub({ x: naub_a.pos.x + naub_a.radius * 0.9, y: naub_a.pos.y })
            assert.equal(naub, naub_a)
        })
        it("finds nothing at nothing", function () {
            const naub = naubino.find_naub({ x: -20, y: 0 })
            assert.isNull(naub)
        })
    })

    describe("naub_touches_naub", function () {
        it("join two single naubs", function () {
            const naub_a = naubino.create_naub();
            const naub_b = naubino.create_naub();
            naubino.naub_touches_naub(naub_a, naub_b);
            assert.isTrue(naub_a.is_joined(naub_b))
        })
        it("join single naub with naub pair", function () {
            const naub_a = naubino.create_naub()
            const naubs = naubino.create_naub_chain(2)
            naubino.naub_touches_naub(naub_a, naubs[0])
            assert.isTrue(naub_a.is_joined(naubs[0]))
        })
        it("merge two naub pairs to a chain", function () {
            const naubs_a = naubino.create_naub_chain(2)
            const naubs_b = naubino.create_naub_chain(2)
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].is_joined(naubs_a[1]))
            assert.isTrue(naubs_a[0].is_joined(naubs_b[1]))
            assert.isFalse(naubs_a[0].is_joined(naubs_b[0]))
        })
        it("merge two naub pairs and kill naub_b", function () {
            const naubs_a = naubino.create_naub_chain(2)
            const naubs_b = naubino.create_naub_chain(2)
            naubino.naub_touches_naub(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].alive)
            assert.isTrue(naubs_a[1].alive)
            assert.isTrue(naubs_b[1].alive)
            assert.isFalse(naubs_b[0].alive)
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

    describe("Pointer and Naubs", function () {
        let naub_a: Naub
        let naub_b: Naub
        beforeEach(function () {
            naub_a = naubino.create_naub({ x: 10, y: 10 })
            const pos_b = { x: naub_a.pos.x + 2 * naub_a.radius + 1, y: 10 }
            naub_b = naubino.create_naub(pos_b)
        })
        it("connects naub", function () {
            const pointer = naubino.connect_pointer_naub(naub_a)
            assert(pointer)
        })
        it("moves naub", function () {
            const x_before = naub_a.pos.x
            const pointer = naubino.connect_pointer_naub(naub_a)
            pointer.pos.x = x_before - 10
            // TODO first, naub bounces back. the pointer constraint moves not good
            for (let i = 0; i < 10; i++) {
                pointer.step()
                naubino.step()
                //console.log("naub.pos.x", naub.pos.x)
            }
            console.assert(naub_a.pos.x < x_before)
        })
        it("merges naubs next to each other", function () {
            const pointer = naubino.connect_pointer_naub(naub_a)
            pointer.pos = _.clone(naub_b.pos)
            for (let i = 0; i < 100; i++) {
                pointer.step()
                naubino.step()
            }
            assert.equal(naubino.naubs.size, 0)
        })
    })

    describe("create_naub_chain", function () {
        it("creates naubs and joints", () => {
            const chain = naubino.create_naub_chain(10);
            console.assert(naubino.naubs.size == 10)
            console.assert(naubino.naub_joints.size == 9)
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
            it("finds no cycle when there is none", function () {
                const chain = naubino.create_naub_chain(3);
                const cycles = chain[0].find_cycles()
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

                console.log(test_cycle.length, cycles[0].length)
                assert.deepEqual(new Set(test_cycle), new Set(cycles[0]))
            })
            it("finds cycle of three in triangle star", function () {
                const test_cycle = naubino.create_naub_chain(3);
                test_cycle[0].join_naub(test_cycle[test_cycle.length - 1])
                const spike_a = naubino.create_naub_chain(2)
                test_cycle[0].join_naub(spike_a[0])
                const spike_b = naubino.create_naub_chain(2)
                test_cycle[1].join_naub(spike_b[0])
                const spike_c = naubino.create_naub_chain(2)
                test_cycle[2].join_naub(spike_c[0])
                const cycles = test_cycle[0].find_cycles()
                assert.deepEqual(new Set(test_cycle), new Set(cycles[0]))
            })
        })
    })

    it("connecting naub chains with hunters leaves nothing behind", () => {
        let chain_a = naubino.create_naub_chain(100, { x: 0, y: -10 })
        let chain_b = naubino.create_naub_chain(100, { x: 0, y: 10 })
        /* python
        chain_a         = naubino.create_naub_chain(100, (0, -10))
        chain_b         = naubino.create_naub_chain(100, (0,  10))
        */
        let chain_naubs = chain_a.concat(chain_b)
        for (let naub of chain_naubs) {
            naubino.add_naub(naub)
        }
        console.assert(naubino.naubs.size == 200)
        naubino.step()
        console.assert(naubino.engine.world.bodies.length >= 200)
        /* python
        for naub in chain_a + chain_b:
            naubino.add_naub(naub)
        naubino.step(0.0166)
        */
        let hunter_0 = new Hunter(naubino, chain_a[0], chain_b[0])
        let hunter_1 = new Hunter(naubino, chain_a[chain_a.length - 1], chain_b[chain_b.length - 1])
        /* python
        hunter_0        = autoplay.Hunter(naubino, chain_a[ 0], chain_b[ 0])
        hunter_1        = autoplay.Hunter(naubino, chain_a[-1], chain_b[-1])
        */
        //console.log("hunting")
        let hunters = [hunter_0, hunter_1]
        for (let i = 0; i < 10 && hunters.length > 0; ++i) {
            hunters = hunters.filter((hunter) => {
                hunter.step()
                return !hunter.finished
            })
            naubino.step()
        }
        console.assert(naubino.naubs.size == 0, "postcondition: naubs == 0")
        console.assert(naubino.pointers.size == 0, "postcondition: pointers == 0")
        /* python
        hunters         = [hunter_0, hunter_1]
        while hunters:
            for h in hunters[:]:
                if not h.step():
                    hunters.remove(h)
            naubino.step(0.0166)
        assert not naubino.naubs
        assert not naubino.pointers
        */
    })
})

describe("Hunter", () => {
    let naubino: Naubino;

    beforeEach(function () {
        naubino = new Naubino()
        naubino.size = { x: 200, y: 200 }
    })

    it("moves naub", () => {
        const naub_a = naubino.create_naub({ x: -10, y: 0 });
        const naub_b = naubino.create_naub({ x: 0, y: 0 });
        console.assert(naubino.naubs.size == 2)
        const hunter = new Hunter(naubino, naub_a, naub_b)
        // TODO bounce back undesired (naub_a.pos.x < -10)
        // TODO sometimes doesn't move right
        for (let i = 0; i < 10; i++) {
            hunter.step()
            naubino.step()
            //console.log("naub_a.pos.x", naub_a.pos.x, hunter._touch.pos.x)
        }
        console.assert(naub_a.pos.x > -10)
    })
})