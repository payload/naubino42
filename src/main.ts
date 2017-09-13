import Matter = require("matter-js")
import { Vector } from "matter-js"
import _ = require("lodash")
import { assert } from "chai"

function fail_condition(condition: boolean) {
    const throw_error = true
    if (throw_error && !condition) {
        throw Error("fail_condition")
    }
    return !condition
}

function naub_joint_rest_length(a: Naub, b: Naub) {
    return (a.radius + b.radius) * 2
}

class Naub {
    _naubino: Naubino = null
    _radius = 1
    alive = true
    naubs_joints = new Map<Naub, NaubJoint>()
    body = Matter.Bodies.circle(0, 0, this._radius)
    color = "red"

    get pos() { return this.body.position }
    set pos(pos) { Matter.Body.setPosition(this.body, pos) }

    get radius() { return this._radius }

    get naubino() { return this._naubino }
    set naubino(naubino) {
        if (this._naubino === naubino) return
        if (this._naubino) this._remove_from_naubino()
        this._naubino = naubino
        if (this._naubino) this._add_to_naubino()
    }

    _add_to_naubino() {
        Matter.World.add(this._naubino.engine.world, this.body)
        this._naubino.add_naub(this)
    }

    _remove_from_naubino() {
        Matter.World.remove(this._naubino.engine.world, this.body)
        this._naubino.remove_naub(this)
    }

    join_naub(other: Naub, joint: NaubJoint = null) {
        if (fail_condition(this.alive && other.alive)) return
        if (fail_condition(this != other)) return
        if (this.naubs_joints.has(other)) return
        //console.log("Naub.join_naub")
        if (joint == null) {
            if (!this.naubino) {
                joint = new NaubJoint(this, other)
            } else {
                joint = this.naubino.create_naub_joint(this, other)
            }
        }
        this.naubs_joints.set(other, joint)
        other.join_naub(this, joint)
        /* python
        if fail_condition(self.alive and naub.alive): return
        if not joint:
            joint = NaubJoint(self, naub, self.naubino)
        if naub not in self.naubs_joints:
            self.naubs_joints[naub] = joint
            naub.join_naub(self, joint)
        */
    }

    unjoin_naub(other: Naub) {
        if (fail_condition(this != other)) return
        if (!this.naubs_joints.has(other)) return
        const joint = this.naubs_joints.get(other)
        joint.naubino = null
        this.naubs_joints.delete(other)
        other.unjoin_naub(this)
    }

    merge_naub(other: Naub) {
        const other_naubs_joints = new Map(other.naubs_joints)
        for (const joined_naub of other_naubs_joints.keys()) {
            other.unjoin_naub(joined_naub)
            this.join_naub(joined_naub)
        }
        other.remove()
    }

    remove() {
        this.alive = false
    }

    is_joined(other: Naub) {
        return this.naubs_joints.has(other)
    }

    // like pynaubino good_merge_naub
    merges_with(naub: Naub) {
        const alive = this.alive
        const joker = this.naubs_joints.size == 0
        const colors_alike = this.color == naub.color
        const naub_is_far = !this.is_naub_near(naub)
        return alive && (joker || (colors_alike && naub_is_far))
    }

    is_naub_near(naub: Naub) {
        if (this.naubs_joints.has(naub)) return true
        for (let neighbor of this.naubs_joints.keys()) {
            if (neighbor.naubs_joints.has(naub)) return true
        }
        return false
    }
}

class NaubJoint {
    _naubino: any = null
    _constraint: Matter.Constraint

    constructor(naub_a: Naub, naub_b: Naub) {
        this._constraint = Matter.Constraint.create({
            bodyA: naub_a.body,
            bodyB: naub_b.body,
            //stiffness: 2,
            //damping: 0.1,
            length: naub_joint_rest_length(naub_a, naub_b)
        })
    }

    get naubino() { return this._naubino }
    set naubino(naubino) {
        if (this._naubino === naubino) return
        if (this._naubino) this._remove_from_naubino()
        this._naubino = naubino
        if (this._naubino) this._add_to_naubino()
    }

    _add_to_naubino() {
        Matter.World.add(this._naubino.engine.world, this._constraint)
        this._naubino.add_naub_joint(this)
    }

    _remove_from_naubino() {
        Matter.World.remove(this._naubino.engine.world, this._constraint)
        this._naubino.remove_naub_joint(this)
    }
}

class Hunter {
    _naubino: Naubino
    _naub_a: Naub
    _naub_b: Naub
    _touch: Pointer
    _force = _.random(8, 12)
    finished = false

    constructor(naubino: Naubino, naub_a: Naub, naub_b: Naub) {
        this._naubino = naubino
        this._naub_a = naub_a
        this._naub_b = naub_b
        this._touch = naubino.touch_down(naub_a.pos)
        console.assert(this._naubino)
        console.assert(this._naub_a)
        console.assert(this._naub_b)
        console.assert(this._touch)
    }

    step() {
        // TODO this.finished could be a cb or promise
        const { _touch, _naub_a, _naub_b } = this
        if (this.finished) {
            return // already finished
        }
        if (!_touch) {
            this.finished = true
            return // no touch
        }
        if (!_naub_a.alive) {
            _touch.up()
            this.finished = true
            return // naub_a not alive
        }
        if (!_naub_a.merges_with(_naub_b)) {
            _touch.up()
            this.finished = true
            return // naub_a doesn't merge with naub_b
        }
        const a = _naub_a.pos
        const b = _naub_b.pos
        const direction = Vector.normalise(Vector.sub(b, a))
        const forward = Vector.mult(direction, this._force)
        _touch.move(forward)
    }
}

class Naubino {
    size: Vector = { x: 1, y: 1 }

    naubs = new Set<Naub>()
    naub_joints = new Set<NaubJoint>()
    pointers = new Set<Pointer>()
    map_naub_pointer = new Map<Naub, Pointer>();

    engine: Matter.Engine = Matter.Engine.create()

    create_naub(pos?: Vector) {
        let naub = new Naub()
        if (pos) naub.pos = Vector.clone(pos)
        naub.naubino = this
        return naub
    }

    create_naub_joint(naub_a: Naub, naub_b: Naub) {
        let joint = new NaubJoint(naub_a, naub_b)
        joint.naubino = this
        return joint
    }

    create_pointer(pos: Vector) {
        let pointer = new Pointer(pos)
        this.pointers.add(pointer)
        return pointer
    }

    create_naub_chain(n: number, chain_center: Vector = { x: 0, y: 0 }, rot: number = 0): Naub[] {
        //console.log("Naubino.create_naub_chain")
        let naubs = _.times(n, () => { return this.create_naub() })

        // distance between each naub pair
        let rest_lens = []
        for (let i = 0; i < naubs.length - 1; ++i) {
            const rest_len = naub_joint_rest_length(naubs[i], naubs[i + 1])
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
            naub.pos = Vector.add(chain_center, positions[i])
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
        //console.log("Naubino.add_naub")
        naub.naubino = this
        this.naubs.add(naub)
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
    remove_naub(naub: Naub) {
        this.naubs.delete(naub)
        naub.naubino = null
    }

    add_naub_joint(joint: NaubJoint) {
        this.naub_joints.add(joint)
    }
    remove_naub_joint(joint: NaubJoint) {
        this.naub_joints.delete(joint)
    }

    // like pynaubino Naubino.touch_down
    touch_down(pos: Vector) {
        const naub = this.find_naub(pos)
        if (naub) {
            return this.connect_pointer_naub(naub)
        }
        return null
    }

    find_naub(pos: Vector): Naub {
        const hits = Matter.Query.point(this.engine.world.bodies, pos)
        for (const body of hits) {
            for (const naub of this.naubs) {
                if (naub.body == body) return naub
            }
        }
        return null
    }

    // like pynaubino Naub.select
    connect_pointer_naub(naub: Naub, pos?: Vector, pointer?: Pointer) {
        //console.log("connect_pointer_naub")
        console.assert(naub.alive)
        if (!pos) pos = _.clone(naub.pos)
        if (!pointer) pointer = this.create_pointer(pos)
        console.assert(this.map_naub_pointer.get(naub) != pointer)
        pointer.constraint = Matter.Constraint.create({
            bodyA: pointer.body,
            bodyB: naub.body,
            pointB: Matter.Vector.sub(pointer.pos, naub.body.position),
            length: 2
        })
        Matter.World.add(this.engine.world, pointer.constraint)
        this.map_naub_pointer.set(naub, pointer)
        return pointer
    }

    join_or_merge_naubs(naub_a: Naub, naub_b: Naub) {
        if (!naub_a.merges_with(naub_b)) return false
        if (naub_a.naubs_joints.size == 0) {
            naub_a.join_naub(naub_b)
            return true
        }
        naub_a.merge_naub(naub_b)
        //const cycle = this.test_cycle(naub_a)
        //if (cycle) this.pop_cycle(cycle)
    }

    step() {
        //console.log("Naubino.step")
        for (const pointer of this.pointers) {
            pointer.step()
        }

        Matter.Engine.update(this.engine)

        const bodies = this.engine.world.bodies
        const speed = _.sumBy(bodies, (body) => { return body.speed }) / bodies.length
        //console.log("world speed", speed)
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

function Vector_interpolate_to(a: Vector, b: Vector, ratio: number, out?: Vector) {
    const diff = Matter.Vector.sub(b, a)
    const norm = Matter.Vector.normalise(diff)
    const forward = Matter.Vector.mult(norm, ratio)
    return Matter.Vector.add(a, forward, out)
}

class Pointer {

    body = Matter.Body.create({})
    pos: Vector
    constraint: Matter.Constraint

    constructor(pos: Vector) {
        Matter.Body.setStatic(this.body, true)
        Matter.Body.setPosition(this.body, pos)
        this.pos = pos
    }

    up() {

    }

    move(to_move: Vector) {
        Vector.add(this.pos, to_move, this.pos)
    }

    step() {
        const body_pos = Vector_interpolate_to(this.body.position, this.pos, 0.25)
        this.body.velocity = Matter.Vector.sub(body_pos, this.body.position)
        this.body.position = body_pos
    }
}

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

    describe("join_or_merge_naubs", function () {
        it("join two single naubs", function () {
            const naub_a = naubino.create_naub();
            const naub_b = naubino.create_naub();
            naubino.join_or_merge_naubs(naub_a, naub_b);
            assert.isTrue(naub_a.is_joined(naub_b))
        })
        it("join single naub with naub pair", function () {
            const naub_a = naubino.create_naub()
            const naubs = naubino.create_naub_chain(2)
            naubino.join_or_merge_naubs(naub_a, naubs[0])
            assert.isTrue(naub_a.is_joined(naubs[0]))
        })
        it("merge two naub pairs to a chain", function () {
            const naubs_a = naubino.create_naub_chain(2)
            const naubs_b = naubino.create_naub_chain(2)
            naubino.join_or_merge_naubs(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].is_joined(naubs_a[1]))
            assert.isTrue(naubs_a[0].is_joined(naubs_b[1]))
            assert.isFalse(naubs_a[0].is_joined(naubs_b[0]))
        })
        it("merge two naub pairs and kill naub_b", function () {
            const naubs_a = naubino.create_naub_chain(2)
            const naubs_b = naubino.create_naub_chain(2)
            naubino.join_or_merge_naubs(naubs_a[0], naubs_b[0])
            assert.isTrue(naubs_a[0].alive)
            assert.isTrue(naubs_a[1].alive)
            assert.isTrue(naubs_b[1].alive)
            assert.isFalse(naubs_b[0].alive)
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
            pointer.pos = Vector.clone(naub_b.pos)
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