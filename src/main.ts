import Matter = require("matter-js")
import { Vector } from "matter-js"

class Naub {

}

class Naubino {
    size: Vector
    naubs: Naub[]

    create_naub_chain(n: number, pos: Vector, rot: number = 0): Naub[] {
        console.log("Naubino.create_naub_chain")
        return []
        /* python
        pos             = Vec2d(*pos)
        naubs           = [Naub(self) for i in xrange(n)]
        restl           = Config.naub_joint_rest_length
        restl           = [restl(a, b) for a, b in zip(naubs, naubs[1:])]
        restl           = tuple(sum(restl[:i]) for i in xrange(len(restl)+1))
        v               = Vec2d(1, 0).rotated(rot)
        for i, naub in enumerate(naubs):
            naub.pos    = pos + v * (-(restl[-1] * 0.5) + restl[i])
        for a, b in zip(naubs, naubs[1:]):
            a.join_naub(b)
        return naubs
        */
    }

    add_naub(naub: Naub) {
        console.log("Naubino.add_naub")
        /* python
        naub.naubino = self

        if naub not in self.naubs:
            self.naubs.append(naub)

        if self.mode: self.mode.add_naub(naub)

        self.cb.add_naub(naub)
        */
    }

    step(dt: number) {
        console.log("Naubino.step")
        /* python
        for pointer in self.pointers:
            pointer.step(dt)
        if self.mode: self.mode.step(dt)
        self.space.step(dt)
        for naub in self.naubs:
            naub.time   = naub.time + dt
        danger = self.danger()
        self.warn = Config.warn(danger)
        if Config.fail(danger):
            self.stop()
            self.cb.fail()
        */
    }

    naubs() { return true }
    pointers() { return true }
}

class Hunter {
    constructor(naubino: Naubino, a: Naub, b: Naub) {
        console.log("Hunter.constructor")
    }
    step() {
        console.log("Hunter.step")
    }
}

function main() {
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
    naubino.step(0.0166)
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
    let hunters = [hunter_0, hunter_1]
    for (let i = 0; i < 100 && hunters; ++i) {
        hunters = hunters.filter((hunter) => { return hunter.step() })
        naubino.step(0.0166)
    }
    console.assert(!naubino.naubs())
    console.assert(!naubino.pointers())
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

main()