import { Vector, Matter, WorldState } from "./matter-js"
import { Naubino, Naub, NaubJoint, Pointer, Hunter, ArenaMode } from "./naubino"

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

class ScenarioPopNaubChainsClearsNaubino {
    naubino: Naubino
    hunters = new Array<Hunter>()
    constructor(naubino: Naubino) {
        this.naubino = naubino
        const chain_a = naubino.create_naub_chain(100, { x: 0, y: -10 })
        const chain_b = naubino.create_naub_chain(100, { x: 0, y: 10 })
        const hunter_0 = new Hunter(naubino, chain_a[0], chain_b[0])
        const hunter_1 = new Hunter(naubino, chain_a[chain_a.length - 1], chain_b[chain_b.length - 1])
        this.hunters.push(hunter_0, hunter_1)
    }
    run() {
        for (let i = 0; i < 500 && this.hunters.length > 0; ++i) {
            this.hunters = this.hunters.filter((hunter) => {
                hunter.step()
                return !hunter.finished
            })
            this.naubino.step()
        }
    }
}

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
        }
        console.assert(naub_a.pos.x > -10)
    })

    it("pop naub chains clears naubino", () => {
        const scene = new ScenarioPopNaubChainsClearsNaubino(naubino)
        scene.run()
        console.assert(naubino.naubs.size == 0, "postcondition: naubs == 0")
        console.assert(naubino.pointers.pointers.size == 0, "postcondition: pointers == 0")
    })

    it("pop naub chains clears physics", () => {
        const world = naubino.engine.world
        const before = new WorldState(world)
        const scene = new ScenarioPopNaubChainsClearsNaubino(naubino)
        const in_scene = new WorldState(world)
        assert.ok(in_scene.someGt(before), "some physics objects created")
        assert.ok(in_scene.allGte(before), "no physics objects gone")
        scene.run()
        const after = new WorldState(world)
        assert.ok(after.eq(before), `number of physics objects as before\nbefore ${before}\nafter ${after}`)
    })
})

describe("ArenaMode", function () {
    let naubino: Naubino
    let arena_mode: ArenaMode

    beforeEach(function () {
        naubino = new Naubino()
        naubino.size = { x: 200, y: 200 }
        arena_mode = new ArenaMode(naubino)
    })
    describe("constructor", function () {
        it("checks parameters", function () {
            assert.doesNotThrow(() => new ArenaMode(naubino))
            assert.throws(() => new ArenaMode(null))
        })
    })
    describe("spam_naub_pair", function () {
        it("creates pair of naubs", function () {
            const naubs = arena_mode.spam_naub_pair()
            assert.isTrue(naubino.naubs.has(naubs[0]), "naub 0 in naubino")
            assert.isTrue(naubino.naubs.has(naubs[1]), "naub 1 in naubino")
        })
        it("positions naubs outside", function () {
            for (let i = 0; i < 50; i++) {
                for (const naub of arena_mode.spam_naub_pair()) {
                    assert.isTrue(
                        naub.pos.x < 0 || naub.pos.x > naubino.size.x ||
                        naub.pos.y < 0 || naub.pos.y > naubino.size.y,
                        `naub y ${naub.pos.y} outside [0,${naubino.size.y}]\n` +
                        `naub x ${naub.pos.x} outside [0,${naubino.size.x}]`)
                }
            }
        })
        it("positions naub pairs randomly", function () {
            const coords = []
            for (let i = 0; i < 10; i++) {
                for (const naub of arena_mode.spam_naub_pair()) {
                    coords.push(naub.pos.x, naub.pos.y)
                }
            }
            assert.isAtLeast(_.uniq(coords).length, 15, "random naub positions")
        })
        it("naub pair moves towards center", function () {
            const distanceToCenter = (pos: Vector) => {
                const diff = Vector.sub(arena_mode.center_pos(), pos)
                return Vector.magnitude(diff)
            }
            const naubs = arena_mode.spam_naub_pair()
            const dist_before = _.map(naubs, (naub) => distanceToCenter(naub.pos))
            _.times(20, () => naubino.step())
            const dist_after = _.map(naubs, (naub) => distanceToCenter(naub.pos))
            assert.isBelow(dist_after[0], dist_before[0] - 1, `naub 0 distance to center gets lower`)
            assert.isBelow(dist_after[1], dist_before[1] - 1, `naub 1 distance to center gets lower`)
        })
        it("naub pair approaches center in 5 seconds", function () {
            const distanceToCenter = (pos: Vector) => {
                const diff = Vector.sub(arena_mode.center_pos(), pos)
                return Vector.magnitude(diff)
            }
            const naubs = arena_mode.spam_naub_pair()
            const dist_before = _.map(naubs, (naub) => distanceToCenter(naub.pos))
            _.times(60 * 5, () => naubino.step())
            const dist_after = _.map(naubs, (naub) => distanceToCenter(naub.pos))
            assert.isBelow(dist_after[0], naubs[0].radius * 4, `naub 0 is near center`)
            assert.isBelow(dist_after[1], naubs[1].radius * 4, `naub 1 is near center`)
        })
    })
    describe("step", function () {
        it("spams naubs over time", function () {
            const before = naubino.naubs.size
            _.times(60 * 10, () => arena_mode.step())
            const after = naubino.naubs.size
            assert.isAbove(after, before, "more naubs than before")
        })
        it("spams not too much naubs", function () {
            const max_naubs = 80
            arena_mode.max_naubs = max_naubs
            naubino.create_naub_chain(max_naubs - 1)
            _.times(60 * 10, () => arena_mode.step())
            assert.isAtMost(naubino.naubs.size, max_naubs, `at most ${max_naubs} naubs`)
        })
        it("doesnt spam when spammer disabled", function () {
            arena_mode.spammer = false
            const before = naubino.naubs.size
            _.times(60 * 10, () => arena_mode.step())
            const after = naubino.naubs.size
            assert.equal(after, before, "no more naubs than before")
        })
    })
})