import * as _ from "lodash"
import * as Matter from "matter-js"
import { Vector } from "matter-js"

declare module "matter-js" {
    interface Constraint {
        userData?: any
    }
    namespace Vector {
        let distance: (a: Vector, b: Vector) => number
    }
}

Vector.distance = function (a: Vector, b: Vector): number {
    return Vector.magnitude(Vector.sub(b, a))
}


class WorldState {
    state: number[]
    constructor(world: Matter.World) {
        this.state = [world.bodies.length, world.constraints.length, world.composites.length]
    }
    someGt(other: WorldState): boolean {
        return _.some(_.zip(this.state, other.state), ([a, b]) => _.gt(a, b))
    }
    allGte(other: WorldState): boolean {
        return _.every(_.zip(this.state, other.state), ([a, b]) => _.gte(a, b))
    }
    eq(other: WorldState): boolean {
        return _.every(_.zip(this.state, other.state), ([a, b]) => _.eq(a, b))
    }
    toString(): string {
        return JSON.stringify(_.zipObject("bodies constraints composites".split(" "), this.state))
    }
}

export { Matter, Vector, WorldState }