import { fail_condition } from "./utils"
import { Timer } from "./timer"
import { Vector, Matter } from "./matter-js"
import { PointerSystem, Pointer } from "./pointer-system"
export { Pointer, PointerSystem }

import * as _ from "lodash"
import { EventEmitter } from "eventemitter3"

export class Update {
    naubs: Set<Naub>
    naub_joints: Set<NaubJoint>
    removed_naubs: Set<Naub>
}

const bodyNaubMap = new Map<number, Naub>();

export class Naub {
    static default_radius = 15
    _radius = Naub.default_radius
    alive = true
    naubs_joints = new Map<Naub, NaubJoint>()
    pointers = new Set<Pointer>()
    body = Matter.Bodies.circle(0, 0, this._radius, { density: 1 })
    color = "red"
    cycle_check = 0
    cycle_number = 0
    id = Math.random()
    engine: Matter.Engine

    constructor(engine: Matter.Engine) {
        this.engine = engine
        Matter.World.add(this.engine.world, this.body)
        bodyNaubMap.set(this.body.id, this)
    }

    get pos() { return this.body.position }
    set pos(pos) { Matter.Body.setPosition(this.body, pos) }

    get radius() { return this._radius }

    join_naub(other: Naub, joint: NaubJoint = null) {
        if (fail_condition(this.alive && other.alive)) return
        if (fail_condition(this != other)) return
        if (this.naubs_joints.has(other)) return
        if (joint == null) {
            joint = new NaubJoint(this, other)
        }
        this.naubs_joints.set(other, joint)
        other.join_naub(this, joint)
        return joint
    }

    unjoin_naub(other: Naub) {
        if (fail_condition(this != other)) return
        if (!this.naubs_joints.has(other)) return
        const joint = this.naubs_joints.get(other)
        joint.remove()
        this.naubs_joints.delete(other)
        other.unjoin_naub(this)
    }

    merge_naub(other: Naub) {
        const joints = []
        const other_naubs_joints = new Map(other.naubs_joints)
        for (const joined_naub of other_naubs_joints.keys()) {
            other.unjoin_naub(joined_naub)
            const joint = this.join_naub(joined_naub)
            joints.push(joint)
        }
        other.remove()
        return joints
    }

    remove() {
        this.alive = false
        bodyNaubMap.delete(this.body.id)
        for (const [naub, _] of this.naubs_joints) {
            this.unjoin_naub(naub)
        }
        for (const pointer of this.pointers) {
            pointer.remove()
        }
        this.pointers.clear()
        const vel = _.clone(this.body.velocity)
        Matter.World.remove(this.engine.world, this.body)
        this.body.velocity = vel
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


export class NaubJoint {

    alive = true

    constraint: Matter.Constraint

    constructor(public naub_a: Naub, public naub_b: Naub) {
        console.assert(this.naub_a)
        console.assert(this.naub_b)
        this.constraint = Matter.Constraint.create({
            bodyA: naub_a.body,
            bodyB: naub_b.body,
            stiffness: 0.05,
            length: NaubJoint.targetLength(this.naub_a, this.naub_b)
        })
        this.constraint.userData = { type: "NaubJoint", NaubJoint: this }
        const { engine } = this.naub_a
        Matter.World.add(engine.world, this.constraint)
    }

    static targetLength(naub_a: Naub, naub_b: Naub) {
        return naub_a.radius + naub_b.radius * 2
    }

    remove() {
        this.alive = false
        const { engine } = this.naub_a
        Matter.World.remove(engine.world, this.constraint)
    }
}

export class Hunter {
    public finished = false

    private touch: Pointer
    private force = _.random(9, 12)

    constructor(private naubino: Naubino, private naub_a: Naub, private naub_b: Naub) {
        this.touch = naubino.touch_down(naub_a.pos)

        console.assert(this.naubino)
        console.assert(this.naub_a)
        console.assert(this.naub_b)
        console.assert(this.touch)
    }

    step() {
        // TODO this.finished could be a cb or promise
        const { touch, naub_a, naub_b } = this
        if (this.finished) {
            return // already finished
        }
        if (!touch) {
            this.finished = true
            return // no touch
        }
        if (!naub_a.alive) {
            touch.up()
            this.naubino.remove_pointer(touch)
            this.finished = true
            return // naub_a not alive
        }
        if (!naub_a.merges_with(naub_b)) {
            touch.up()
            this.naubino.remove_pointer(touch)
            this.finished = true
            return // naub_a doesn't merge with naub_b
        }
        const a = naub_a.pos
        const b = naub_b.pos
        const diff = Vector.sub(b, a)
        if (Vector.magnitudeSquared(diff) > 1) {
            const direction = Vector.normalise(diff)
            const forward = Vector.mult(direction, this.force)
            touch.move(forward)
        } else {
            touch.move(diff)
        }
    }
}

class NaubColliderSystem {

    naubino: Naubino
    ee = new EventEmitter()

    constructor(naubino: Naubino, engine: Matter.Engine) {
        this.naubino = naubino
        Matter.Events.on(engine, "collisionStart", (e) => this.on_collision_start(e))
    }

    on_collision_start({ name, pairs, source, timestamp }: Matter.IEventCollision<Matter.Engine>) {
        for (const pair of pairs) {
            const naub_a = bodyNaubMap.get(pair.bodyA.id)
            const naub_b = bodyNaubMap.get(pair.bodyB.id)
            if (naub_a && naub_b) {
                this.ee.emit("naub_naub_collision", naub_a, naub_b, pair)
                if (naub_a.pointers.size > 0 || naub_b.pointers.size > 0) {
                    this.naub_touches_naub(naub_a, naub_b)
                }
            }
        }
    }

    naub_touches_naub(naub_a: Naub, naub_b: Naub) {
        if (!naub_a.merges_with(naub_b)) return false
        if (naub_a.naubs_joints.size == 0) {
            this.ee.emit("join_naubs", naub_a, naub_b)
            const joint = naub_a.join_naub(naub_b)
            this.naubino.add_naub_joint(joint)
            return true
        }
        const joints = naub_a.merge_naub(naub_b)
        for (const joint of joints) {
            this.naubino.add_naub_joint(joint)
        }
        naub_b.remove()
        const cycles = naub_a.find_cycles()
        for (const cycle of cycles) {
            this.pop_cycle(cycle)
        }
    }

    pop_cycle(cycle: Naub[]) {
        for (const naub of cycle) {
            naub.remove()
        }
    }
}

class NaubFactory {

    naubino: Naubino

    constructor(naubino: Naubino) {
        this.naubino = naubino
    }

    create_naub(pos?: Vector) {
        let naub = new Naub(this.naubino.engine)
        if (pos) naub.pos = Vector.clone(pos)
        this.naubino.add_naub(naub)
        return naub
    }

    create_naub_chain(n: number, chain_center: Vector = { x: 0, y: 0 }, rot: number = 0): Naub[] {
        let naubs = _.times(n, () => { return this.create_naub() })

        // distance between each naub pair
        let rest_lens = []
        for (let i = 0; i < naubs.length - 1; ++i) {
            const rest_len = NaubJoint.targetLength(naubs[i], naubs[i + 1])
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
            this.naubino.add_naub_joint(naubs[i].join_naub(naubs[i + 1]))
        }

        return naubs
    }
}

interface NaubinoEventEmitter extends EventEmitter {
    on(event:
        "naub_naub_collision" |
        "join_naubs" |
        "add_naub_joint" |
        "naub_removed",
        fn: EventEmitter.ListenerFn,
        context?: any,
    ): this;
}

export class Naubino {
    size: Vector = { x: 1, y: 1 }

    naubs = new Set<Naub>()
    naub_joints = new Set<NaubJoint>()

    engine = Matter.Engine.create()
    collider = new NaubColliderSystem(this, this.engine)
    pointers = new PointerSystem(this, this.engine)
    naub_fac = new NaubFactory(this)
    ee: NaubinoEventEmitter = new EventEmitter()
    debug_matter_queries = new Array<Matter.Vertices>()

    constructor() {
        this.engine.world.gravity.x = 0
        this.engine.world.gravity.y = 0
        this.collider.ee.on("naub_naub_collision", (...args) => this.ee.emit("naub_naub_collision", ...args))
        this.collider.ee.on("join_naubs", (...args) => this.ee.emit("join_naubs", ...args))
    }

    create_naub(pos?: Vector) {
        return this.naub_fac.create_naub(pos)
    }

    create_naub_chain(n: number, chain_center: Vector = { x: 0, y: 0 }, rot: number = 0): Naub[] {
        return this.naub_fac.create_naub_chain(n, chain_center, rot)
    }

    create_naub_joint(naub_a: Naub, naub_b: Naub) {
        let joint = new NaubJoint(naub_a, naub_b)
        this.add_naub_joint(joint)
        return joint
    }

    create_pointer(naub: Naub, pos: Vector) {
        let pointer = new Pointer(naub, pos)
        this.pointers.pointers.add(pointer)
        return pointer
    }

    remove_pointer(pointer: Pointer) {
        this.pointers.remove_pointer(pointer)
    }

    add_naub(naub: Naub) {
        this.naubs.add(naub)
    }
    remove_naub(naub: Naub) {
        this.naubs.delete(naub)
    }

    add_naub_joint(joint: NaubJoint) {
        this.naub_joints.add(joint)
        this.ee.emit("add_naub_joint", joint)
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

    connect_pointer_naub(naub: Naub, pos?: Vector) {
        return this.pointers.connect_pointer_naub(naub, pos)
    }

    naub_touches_naub(naub_a: Naub, naub_b: Naub) {
        this.collider.naub_touches_naub(naub_a, naub_b)
    }

    debug_matter_query(vertices: Matter.Vertices) {
        this.debug_matter_queries.push(vertices)
    }

    step(): Update {
        this.pointers.step()
        Matter.Engine.update(this.engine)
        const removed_naubs = new Set<Naub>()
        for (const naub of this.naubs) {
            if (!naub.alive) {
                this.naubs.delete(naub)
                this.ee.emit("naub_removed", naub)
                removed_naubs.add(naub)
            }
        }
        for (const joint of this.naub_joints) {
            if (!joint.alive) this.naub_joints.delete(joint)
        }
        if (this.world_is_exploding()) {
            console.warn("WARN world is exploding")
        }
        return <Update>{
            naubs: this.naubs,
            naub_joints: this.naub_joints,
            removed_naubs: removed_naubs
        }
    }

    world_is_exploding() {
        const bodies = this.engine.world.bodies
        const speed = _.sumBy(bodies, (body) => { return body.speed }) / bodies.length
        return speed > 10000
    }
}


interface ArenaModeNaub {
    CenterJoint: Matter.Constraint
}

export
class ArenaMode {
    max_naubs = 80
    _naubino: Naubino
    _spammer = new Timer(3, () => this.spam_naub_bunch()).start()
    spammer = true
    naubMap = new Map<Naub, ArenaModeNaub>()

    constructor(naubino: Naubino) {
        console.assert(naubino)
        this._naubino = naubino
        naubino.ee.on("naub_removed", this.on_naub_removed, this)
    }
    spam_naub_bunch(): Naub[] {
        if (this._naubino.naubs.size > this.max_naubs - 2) return
        this.spam_naub_pair()
    }
    spam_naub_pair(): Naub[] {
        const pos = this.random_naub_pos()
        //const rot = 2 * Math.PI * Math.random()
        const naubs = this._naubino.create_naub_chain(2, pos, Math.random() * 2 * Math.PI)
        for (const naub of naubs) {
            const constraint = Matter.Constraint.create({
                bodyA: naub.body,
                pointB: this.center_pos(),
                length: 0,
                stiffness: 0.00001
            })
            constraint.userData = { type: "ArenaMode.CenterJoint" }
            Matter.World.add(this._naubino.engine.world, constraint)
            this.naubMap.set(naub, { CenterJoint: constraint })
            const palette = "red pink green blue purple yellow".split(" ")
            naub.color = _.sample(palette)
        }
        return naubs
    }
    on_naub_removed(naub: Naub) {
        const my_naub = this.naubMap.get(naub)
        if (my_naub) {
            Matter.World.remove(this._naubino.engine.world, my_naub.CenterJoint)
        }
    }
    random_naub_pos(): Vector {
        const { sin, cos, max, random, PI } = Math
        const { x, y } = this._naubino.size
        const magic = 20
        const radius = Math.sqrt(x * x + y * y) / 2
        const angle = random() * 2 * PI
        return {
            x: (cos(angle) * (radius + magic) + x / 2),
            y: (sin(angle) * (radius + magic) + y / 2)
        }
    }
    set_center_pos() {
        for (const my_naub of this.naubMap.values()) {
            my_naub.CenterJoint.pointB = this.center_pos()
        }
    }
    center_pos() {
        return Vector.mult(this._naubino.size, 0.5)
    }
    step() {
        if (this.spammer) this._spammer.step(1 / 60)
    }
}