import { fail_condition } from "./utils"

import * as Matter from "matter-js"
import { Vector } from "matter-js"
import * as _ from "lodash"

function naub_joint_rest_length(a: Naub, b: Naub) {
    return (a.radius + b.radius) * 2
}

class Update {
    naubs: Set<Naub>
    naub_joints: Set<NaubJoint>
}

const bodyNaubMap = new Map<number, Naub>();

class Naub {
    _naubino: Naubino = null
    _radius = 1
    alive = true
    naubs_joints = new Map<Naub, NaubJoint>()
    pointers = new Set<Pointer>()
    body = Matter.Bodies.circle(0, 0, this._radius)
    color = "red"
    cycle_check = 0
    cycle_number = 0
    id = Math.random()

    constructor() {
        bodyNaubMap.set(this.body.id, this)
    }

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
        if (joint.naubino) joint.naubino.remove_naub_joint(joint)
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
        // TODO remove registered pointers
        this.alive = false
        bodyNaubMap.delete(this.body.id)
        this.naubs_joints.forEach((joint, naub) => {
            this.unjoin_naub(naub)
        })
    }

    is_joined(other: Naub) {
        return this.naubs_joints.has(other)
    }

    // like pynaubino good_merge_naub
    merges_with(naub: Naub) {
        const alive = this.alive && naub.alive
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

    find_cycles() {
        const naubs = this.reachable_naubs()
        for (const naub of naubs) {
            naub.cycle_check = 0
            naub.cycle_number = 0
        }
        const progress = 1
        for (const naub of naubs) {
            if (naub.cycle_number == 0) {
                const cycle = this._find_cycles(naub, null, progress, naubs)
                if (cycle.length > 0) return [cycle]
            }
        }
        return []
    }

    _find_cycles(v: Naub, pre: Naub, progress: number, naubs: Naub[]): Naub[] {
        v.cycle_number = progress;
        progress += 1;
        v.cycle_check = 1;
        const post = new Set(v.naubs_joints.keys())
        if (pre) post.delete(pre)
        for (const w of post) {
            if (w.cycle_number == 0) {
                const cycle = this._find_cycles(w, v, progress, naubs)
                if (cycle.length > 0) return cycle
            }
            else if (w.cycle_check == 1) {
                const cycle = []
                for (const naub of naubs) {
                    if (naub.cycle_number >= w.cycle_number
                        && naub.cycle_check == 1) {
                        cycle.push(naub)
                    }
                }
                if (cycle.length > 1) return cycle
            }
            v.cycle_check = 2
        }
        return []
    }

    reachable_naubs(visited = new Array<Naub>()) {
        if (visited.lastIndexOf(this) >= 0) return []
        visited.push(this)
        const nodes = [this]
        for (const naub of this.naubs_joints.keys()) {
            nodes.push.apply(nodes, naub.reachable_naubs(visited))
        }
        return nodes
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
            this._naubino.remove_pointer(_touch)
            this.finished = true
            return // naub_a not alive
        }
        if (!_naub_a.merges_with(_naub_b)) {
            _touch.up()
            this._naubino.remove_pointer(_touch)
            this.finished = true
            return // naub_a doesn't merge with naub_b
        }
        const a = _naub_a.pos
        const b = _naub_b.pos
        const diff = Vector.sub(b, a)
        if (Vector.magnitudeSquared(diff) > 1) {
            const direction = Vector.normalise(diff)
            const forward = Vector.mult(direction, this._force)
            _touch.move(forward)
        } else {
            _touch.move(diff)
        }
    }
}

class NaubColliderSystem {

    naubino: Naubino

    constructor(naubino: Naubino, engine: Matter.Engine) {
        this.naubino = naubino
        Matter.Events.on(engine, "collisionStart", (e) => this.on_collision_start(e))
    }

    on_collision_start({ name, pairs, source, timestamp }: Matter.IEventCollision<Matter.Engine>) {
        for (const pair of pairs) {
            const naub_a = bodyNaubMap.get(pair.bodyA.id)
            const naub_b = bodyNaubMap.get(pair.bodyB.id)
            if (naub_a && naub_b) {
                if (naub_a.pointers.size > 0) {
                    this.naub_touches_naub(naub_a, naub_b)
                }
            }
        }
    }

    naub_touches_naub(naub_a: Naub, naub_b: Naub) {
        if (!naub_a.merges_with(naub_b)) return false
        if (naub_a.naubs_joints.size == 0) {
            naub_a.join_naub(naub_b)
            return true
        }
        naub_a.merge_naub(naub_b)
        naub_b.naubino = null
        const cycles = naub_a.find_cycles()
        for (const cycle of cycles) {
            this.pop_cycle(cycle)
        }
    }

    pop_cycle(cycle: Naub[]) {
        for (const naub of cycle) {
            // TODO conceptualize removal
            naub.remove()
            this.naubino.remove_naub(naub)
            naub.naubino = null
        }
    }
}

class PointerSystem {

    naubino: Naubino
    engine: Matter.Engine
    pointers = new Set<Pointer>()
    map_naub_pointer = new Map<Naub, Pointer>();

    constructor(naubino: Naubino, engine: Matter.Engine) {
        this.naubino = naubino
        this.engine = engine
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
            for (const naub of this.naubino.naubs) {
                if (naub.body == body) return naub
            }
        }
        return null
    }

    // like pynaubino Naub.select
    connect_pointer_naub(naub: Naub, pos?: Vector, pointer?: Pointer) {
        console.assert(naub.alive)
        if (!pos) pos = _.clone(naub.pos)
        if (!pointer) pointer = this.naubino.create_pointer(pos)
        console.assert(this.map_naub_pointer.get(naub) != pointer)
        pointer.constraint = Matter.Constraint.create({
            bodyA: pointer.body,
            bodyB: naub.body,
            pointB: Matter.Vector.sub(pointer.pos, naub.body.position),
            length: 2
        })
        Matter.World.add(this.engine.world, pointer.constraint)
        // TODO map_naub_pointer unused
        this.map_naub_pointer.set(naub, pointer)
        naub.pointers.add(pointer)
        return pointer
    }

    step() {
        for (const pointer of this.pointers) {
            pointer.step()
        }
    }
}

class Naubino {
    size: Vector = { x: 1, y: 1 }

    naubs = new Set<Naub>()
    naub_joints = new Set<NaubJoint>()

    engine = Matter.Engine.create()
    collider = new NaubColliderSystem(this, this.engine)
    pointers = new PointerSystem(this, this.engine)

    constructor() {
        this.engine.world.gravity.x = 0
        this.engine.world.gravity.y = 0
    }

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
        this.pointers.pointers.add(pointer)
        return pointer
    }

    remove_pointer(pointer: Pointer) {
        this.pointers.pointers.delete(pointer)
    }

    create_naub_chain(n: number, chain_center: Vector = { x: 0, y: 0 }, rot: number = 0): Naub[] {
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
    }

    add_naub_joint(joint: NaubJoint) {
        this.naub_joints.add(joint)
    }
    remove_naub_joint(joint: NaubJoint) {
        this.naub_joints.delete(joint)
    }

    touch_down(pos: Vector) {
        return this.pointers.touch_down(pos)
    }

    find_naub(pos: Vector): Naub {
        return this.pointers.find_naub(pos)
    }

    connect_pointer_naub(naub: Naub, pos?: Vector, pointer?: Pointer) {
        return this.pointers.connect_pointer_naub(naub, pos, pointer)
    }

    naub_touches_naub(naub_a: Naub, naub_b: Naub) {
        this.collider.naub_touches_naub(naub_a, naub_b)
    }

    step(): Update {
        this.pointers.step()
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
        return <Update>{
            naubs: this.naubs,
            naub_joints: this.naub_joints
        }
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
        // TODO unregister from naub
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

export { Naubino, Naub, NaubJoint, Pointer, Hunter, Update }
