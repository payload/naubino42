import { Naubino, Naub, Hunter, Update, ArenaMode, Pointer } from "./naubino"
import { Vector, Matter } from "./matter-js"

import * as _ from "lodash"

require("pepjs")

let naubino: Naubino
let mode: ArenaMode
let canvas: HTMLCanvasElement

window.addEventListener("load", () => {
    canvas_init()
    naubino_init()
    naubino_start()
    window.setTimeout(() => {
        main_loop()
    }, 1000)
})

const pointerMap = new Map<number, Pointer>()

function canvas_init() {
    canvas = <HTMLCanvasElement>document.querySelector("#naubino42")
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "black"
    ctx.fillText("naubino", canvas.width / 2, canvas.height / 2)

    canvas.addEventListener("pointerdown", (ev) => {
        const rect = canvas.getBoundingClientRect()
        const pointer = naubino.touch_down({ x: -rect.left + ev.x, y: -rect.top + ev.y })
        if (pointer) {
            pointerMap.set(ev.pointerId, pointer)
        }
    })
    canvas.addEventListener("pointermove", (ev) => {
        const pointer = pointerMap.get(ev.pointerId)
        if (pointer) {
            const rect = canvas.getBoundingClientRect()
            pointer.moveTo({ x: -rect.left + ev.x, y: -rect.top + ev.y })
        }
    })
    canvas.addEventListener("pointerup", (ev) => {
        const pointer = pointerMap.get(ev.pointerId)
        if (pointer) {
            pointer.up()
            pointerMap.delete(ev.pointerId)
        }
    })
    window.addEventListener("keypress", (ev) => {
        if (ev.key == " ") mode.spam_naub_pair()
    })
}

function naubino_init() {
    naubino = new Naubino()
    naubino.size = { x: 600, y: 400 }
    mode = new ArenaMode(naubino)
    mode.spammer = false;
}

function naubino_start() {

}

function main_loop() {
    mode.step()
    const update = naubino.step()
    main_loop_render(update)
    window.requestAnimationFrame(() => {
        main_loop()
    })
}

const palette = new Map<string, number[]>([
    ["red", [229, 53, 23]],
    ["pink", [226, 0, 122]],
    ["green", [151, 190, 13]],
    ["blue", [0, 139, 208]],
    ["purple", [100, 31, 128]],
    ["yellow", [255, 204, 0]]])


interface NState {
    x: number
    y: number
    radius: number
    color: string
    alpha: number
}
class NAnimState {
    a: NState
    b: NState
    time: number
    duration: number
}
class NAnim extends NAnimState {
    constructor(state: NAnimState) {
        super()
        this.a = state.a
        this.b = state.b
        this.time = state.time
        this.duration = state.duration
    }
    interpolate(): NState {
        const { a, b, time, duration } = this
        const f = time / duration
        const interp = (field: 'x' | 'y' | 'radius' | 'alpha') => a[field] + (b[field] - a[field]) * f
        return {
            x: interp('x'),
            y: interp('y'),
            radius: interp('radius'),
            color: b.color,
            alpha: interp('alpha')
        }
    }
}
let naub_anims = new Set<NAnim>()

function main_loop_render(update: Update) {
    const ctx = canvas.getContext("2d")
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.strokeStyle = "black"
    for (const joint of update.naub_joints) {
        const { x: xa, y: ya } = joint.naub_a.pos
        const { x: xb, y: yb } = joint.naub_b.pos
        ctx.lineWidth = joint.naub_a.radius * 0.212 * 2
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.lineTo(xb, yb)
        ctx.closePath()
        ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    for (const naub of update.naubs) {
        const color = "rgb(" + palette.get(naub.color).join(",") + ")"
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(naub.pos.x, naub.pos.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }
    ctx.restore()

    for (const naub of update.removed_naubs) {
        const duration = 1
        naub_anims.add(new NAnim({
            a: {
                x: naub.pos.x,
                y: naub.pos.y,
                radius: naub.radius,
                color: naub.color,
                alpha: 1
            },
            b: {
                x: naub.pos.x + naub.body.velocity.x * duration,
                y: naub.pos.y + naub.body.velocity.y * duration,
                radius: 0,
                color: naub.color,
                alpha: 0
            },
            time: 0,
            duration: duration
        }))
    }
    ctx.save()
    for (const anim of naub_anims) {
        anim.time = Math.min(anim.time + 0.016666, anim.duration)
        const naub = anim.interpolate()
        const color = "rgba(" + palette.get(naub.color).join(",") + "," + naub.alpha + ")"
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(naub.x, naub.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }
    for (const anim of naub_anims) {
        if (anim.time == anim.duration) {
            naub_anims.delete(anim)
        }
    }

    const world = naubino.engine.world

    ctx.save()
    for (const constraint of world.constraints) {
        const { pointA, pointB, bodyA, bodyB, userData } = constraint
        const xa = pointA.x + (bodyA ? bodyA.position.x : 0)
        const ya = pointA.y + (bodyA ? bodyA.position.y : 0)
        const xb = pointB.x + (bodyB ? bodyB.position.x : 0)
        const yb = pointB.y + (bodyB ? bodyB.position.y : 0)

        ctx.save()
        if (userData) {
            switch (userData.type) {
                case "ArenaMode.CenterJoint":
                    ctx.setLineDash([1, 5])
                    ctx.strokeStyle = "lightgray"
                    ctx.lineWidth = 1
                    break
                case "NaubJoint":
                    ctx.strokeStyle = "gray"
                    ctx.lineWidth = 1
                    break
                default:
                    ctx.strokeStyle = "red"
                    ctx.lineWidth = 2
            }
        } else {
            ctx.strokeStyle = "red"
            ctx.lineWidth = 2
        }
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.lineTo(xb, yb)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
    }
    ctx.restore()

    ctx.restore()
}