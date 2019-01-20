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
    arena = { x: 0, y: 0, radius: 100 }
    private arena_body: Matter.Body
    naubs_until_game_over = 100;

    constructor(private naubino: Naubino) {
        console.assert(naubino)
        naubino.ee.on("naub_removed", this.on_naub_removed, this)

        this.arena_body = Matter.Bodies.circle(
            this.arena.x,
            this.arena.y,
            this.arena.radius,
            {
                label: "arena.sensor",
                isSensor: true,
            }
        )
        Matter.World.add(this.naubino.engine.world, this.arena_body)
        naubino.collider.ee.on(
            this.arena_body.label,
            (label_a, label_b, pair) => this.on_arena_sensor(label_a, label_b, pair)
        )
    }
    on_arena_sensor(label_a: string, label_b: string, pair: Matter.IPair) {
        let naubs = 0
        const center = { x: this.arena.x, y: this.arena.y }
        for (const naub of this.naubino.naubs) {
            const d = Vector.distance(center, { x: naub.pos.x, y: naub.pos.y })
            if (d < this.arena.radius) {
                naubs++;
            }
        }
        if (naubs >= this.naubs_until_game_over) {
            this.naubino.game_over = true
        }
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

        const { x, y } = this.naubino.size
        const d = Math.min(x, y)
        this.arena = {
            x: x / 2,
            y: y / 2,
            radius: 0.5 * Math.sqrt(d * d / 4)
        }
        Matter.Body.setPosition(this.arena_body, { x: this.arena.x, y: this.arena.y })
        // there is no easier way to generate circle vertices for Matter
        Matter.Body.setVertices(this.arena_body, Matter.Bodies.circle(0, 0, this.arena.radius).vertices)
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

