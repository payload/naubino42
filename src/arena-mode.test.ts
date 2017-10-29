import { ArenaMode } from "./arena-mode"
import { Naubino } from "./naubino"
import { Vector } from "./matter-js"
import { assert } from "chai"
import * as _ from "lodash"


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