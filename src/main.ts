import Matter = require("matter-js")
import { Vector } from "matter-js"
import _ = require("lodash")

class NaubJoint {

}

class Naub {
    naubino: any = null
    pos: Vector = { x: 0, y: 0 }
    radius: number = 1

    join_naub(other: Naub, joint: NaubJoint = null) {
        console.log("Naub.join_naub")
        /* python
        if fail_condition(self.alive and naub.alive): return
        if not joint:
            joint = NaubJoint(self, naub, self.naubino)
        if naub not in self.naubs_joints:
            self.naubs_joints[naub] = joint
            naub.join_naub(self, joint)
        */
    }
}

class Naubino {
    size: Vector = { x: 1, y: 1 }

    naubs: Naub[] = []
    pointers: Pointer[] = []

    engine: Matter.Engine = Matter.Engine.create()

    naub_joint_rest_length(a: Naub, b: Naub) {
        return (a.radius + b.radius) * 2
    }

    create_naub_chain(n: number, chain_center: Vector, rot: number = 0): Naub[] {
        console.log("Naubino.create_naub_chain")
        let naubs = _.times(n, () => { return new Naub() })

        // distance between each naub pair
        let rest_lens = []
        for (let i = 0; i < naubs.length - 1; ++i) {
            const rest_len = this.naub_joint_rest_length(naubs[i], naubs[i + 1])
            rest_lens.push(rest_len)
        }

        // running sum of distances from 0 to total
        let len_sums = [0]
        for (let i = 0; i < rest_lens.length; ++i) {
            len_sums.push(len_sums[i] + rest_lens[i])
        }
        let total_len = len_sums[len_sums.length - 1]

        // positions along direction with naub pair distances
        let direction = Vector.rotate({ x: 1, y: 0 }, rot)
        let positions = _.map(len_sums, (len_sum) => {
            return Vector.mult(direction, -0.5 * total_len + len_sum)
        })

        // apply position together with chain_center to naubs
        _.forEach(naubs, (naub, i) => {
            Vector.add(chain_center, positions[i], naub.pos)
        })

        // join naubs
        for (let i = 0; i < naubs.length - 1; ++i) {
            naubs[i].join_naub(naubs[i + 1])
        }

        return naubs
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
        if (naub.naubino === this) return
        naub.naubino = this
        this.naubs.push(naub)
        // TODO mode.add_naub(naub), but do it with cb, different concept
        // TODO cb.add_naub(naub)
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
        Matter.Engine.update(this.engine, dt)
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
}

class Pointer {

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
    console.log(chain_a)
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
    console.assert(naubino.naubs.length == 0, "naubs == 0")
    console.assert(naubino.pointers.length == 0, "pointers == 0")
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