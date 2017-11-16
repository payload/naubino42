import { fail_condition, delegate_event } from "./utils"
import { Timer } from "./timer"
import { Vector, Matter } from "./matter-js"
import { PointerSystem, Pointer } from "./pointer-system"
import { NaubFactory } from "./naub-factory"

import * as _ from "lodash"
import { EventEmitter } from "eventemitter3"

export { Pointer, PointerSystem }

export class Update {
    naubs: Set<Naub>
    naub_joints: Set<NaubJoint>
    score: number
}

const bodyNaubMap = new Map<number, Naub>();

export class Naub {
    static id_generator = 0
    static default_radius = 15

    _id = Naub.id_generator++
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
        for (const pointer of other.pointers) {
            pointer.transfer(this)
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
        Matter.World.remove(this.engine.world, this.body)
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

    naub_a: Naub
    naub_b: Naub
    alive = true

    constraint: Matter.Constraint

    constructor(naub_a: Naub, naub_b: Naub) {
        this.naub_a = naub_a
        this.naub_b = naub_b
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

class NaubColliderSystem {

    naubino: Naubino
    ee = new EventEmitter()
    score = 0

    constructor(naubino: Naubino, engine: Matter.Engine) {
        this.naubino = naubino
        Matter.Events.on(engine, "collisionStart", (e) => this.on_collision_start(e))
    }

    on_collision_start({ name, pairs, source, timestamp }: Matter.IEventCollision<Matter.Engine>) {
        for (const pair of pairs) {
            const label_a = pair.bodyA.label
            const label_b = pair.bodyB.label
            if (label_a) {
                this.ee.emit(label_a, label_a, label_b, pair)
            }
            if (label_b && label_b != label_a) {
                this.ee.emit(label_b, label_b, label_a, pair)
            }

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
            this.score += cycle.length * 1.25
        }
    }

    pop_cycle(cycle: Naub[]) {
        for (const naub of cycle) {
            naub.remove()
        }
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
    game_over = false

    constructor() {
        this.engine.world.gravity.x = 0
        this.engine.world.gravity.y = 0
        delegate_event("naub_naub_collision", this.collider.ee, this.ee)
        delegate_event("join_naubs", this.collider.ee, this.ee)
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
        for (const naub of this.naubs) {
            if (!naub.alive) {
                this.naubs.delete(naub)
                this.ee.emit("naub_removed", naub)
            }
        }
        for (const joint of this.naub_joints) {
            if (!joint.alive) this.naub_joints.delete(joint)
        }
        if (this.world_is_exploding()) {
            console.warn("WARN world is exploding")
        }
        return {
            naubs: this.naubs,
            naub_joints: this.naub_joints,
            score: this.collider.score,
        }
    }

    world_is_exploding() {
        const bodies = this.engine.world.bodies
        const speed = _.sumBy(bodies, (body) => { return body.speed }) / bodies.length
        return speed > 10000
    }
}

