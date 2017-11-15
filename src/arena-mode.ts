import { Naubino, Naub } from "./naubino"
import { Matter, Vector } from "./matter-js"
import { Timer } from "./timer"
import * as _ from "lodash"


interface ArenaModeNaub {
    CenterJoint: Matter.Constraint
}


export class ArenaMode {
    min_naubs = 0
    max_naubs = -1
    private spammer = new Timer(3, () => this.spam_naub_bunch()).start()
    public doSpam = true
    naubMap = new Map<Naub, ArenaModeNaub>()

    constructor(private naubino: Naubino) {
        console.assert(naubino)
        naubino.ee.on("naub_removed", this.on_naub_removed, this)
    }
    spam_naub_bunch() {
        if (this.max_naubs >= 0 && this.naubino.naubs.size + 2 > this.max_naubs) return
        do {
            this.spam_naub_pair()
        } while (this.naubino.naubs.size < this.min_naubs)
    }
    spam_naub_pair(): Naub[] {
        const pos = this.random_naub_pos()
        //const rot = 2 * Math.PI * Math.random()
        const naubs = this.naubino.create_naub_chain(2, pos, Math.random() * 2 * Math.PI)
        for (const naub of naubs) {
            const constraint = Matter.Constraint.create({
                bodyA: naub.body,
                pointB: this.center_pos(),
                length: 0,
                stiffness: 0.00001
            })
            constraint.userData = { type: "ArenaMode.CenterJoint" }
            Matter.World.add(this.naubino.engine.world, constraint)
            this.naubMap.set(naub, { CenterJoint: constraint })
            const palette = "red pink green blue purple yellow".split(" ")
            naub.color = _.sample(palette)
        }
        return naubs
    }
    on_naub_removed(naub: Naub) {
        const my_naub = this.naubMap.get(naub)
        this.naubMap.delete(naub)
        if (my_naub) {
            Matter.World.remove(this.naubino.engine.world, my_naub.CenterJoint)
        }
    }
    random_naub_pos(): Vector {
        const { sin, cos, max, random, PI } = Math
        const { x, y } = this.naubino.size
        const radius = Math.sqrt(x * x + y * y) / 2 + Naub.default_radius * 2
        const angle = random() * 2 * PI
        return {
            x: (cos(angle) * radius + x / 2),
            y: (sin(angle) * radius + y / 2)
        }
    }
    set_center_pos() {
        for (const my_naub of this.naubMap.values()) {
            my_naub.CenterJoint.pointB = this.center_pos()
        }
    }
    center_pos() {
        return Vector.mult(this.naubino.size, 0.5)
    }
    step() {
        if (this.doSpam) {
            this.spammer.step(1 / 60)
            const i = this.spammer.interval
            this.spammer.interval = i - ((i - 0.5) / 1200)
        }
    }
}

