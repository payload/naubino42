import { Naubino, Naub } from "./naubino"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"
import { EventEmitter } from "eventemitter3"

export class PointerSystem {

    naubino: Naubino
    engine: Matter.Engine
    pointers = new Set<Pointer>()
    map_naub_pointer = new Map<Pointer, Naub>();
    ee = new EventEmitter()

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

    connect_pointer_naub(naub: Naub, pos?: Vector) {
        console.assert(naub.alive)
        if (!pos) pos = _.clone(naub.pos)
        const pointer = this.naubino.create_pointer(naub, pos)
        this.pointers.add(pointer)
        return pointer
    }

    remove_pointer(pointer: Pointer) {
        this.pointers.delete(pointer)
        this.ee.emit("remove_pointer", pointer)
    }

    step() {
        for (const pointer of this.pointers) {
            if (!pointer.alive) this.remove_pointer(pointer)
        }
    }
}


export class Pointer {

    engine: Matter.Engine
    constraint: Matter.Constraint
    alive = true

    constructor(public naub: Naub, public pos: Vector) {
        this.engine = naub.engine
        this.constraint = Matter.Constraint.create({
            bodyA: naub.body,
            pointA: Matter.Vector.sub(this.pos, naub.body.position),
            pointB: this.pos,
            length: 0,
        })
        Matter.World.add(this.engine.world, this.constraint)
        this.naub.pointers.add(this)
    }

    remove() {
        this.alive = false
        Matter.World.remove(this.engine.world, this.constraint)
        this.naub.pointers.delete(this)
    }

    up() {
        this.remove()
    }

    move(to_move: Vector) {
        Vector.add(this.constraint.pointB, to_move, this.constraint.pointB)
    }

    moveTo(pos: Vector) {
        this.constraint.pointB = pos
    }
}