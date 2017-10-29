import { Hunter } from "./hunter"
import { Naubino } from "./naubino"
import { WorldState } from "./matter-js"
import { assert } from "chai"


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
        const naub_a = naubino.create_naub({ x: 0, y: 0 });
        const naub_b = naubino.create_naub({ x: naub_a.radius * 100, y: 0 });
        const hunter = new Hunter(naubino, naub_a, naub_b)
        // TODO bounce back undesired (naub_a.pos.x < -10)
        // TODO sometimes doesn't move right
        for (let i = 0; i < 30; i++) {
            hunter.step()
            naubino.step()
        }
        assert.isAbove(naub_a.pos.x, naub_a.radius, "moved naub significantly")
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