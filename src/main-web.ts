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
}

function naubino_init() {
    naubino = new Naubino()
    naubino.size = { x: 600, y: 400 }
    mode = new ArenaMode(naubino)
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
    ctx.fillStyle = "black"
    for (const naub of update.naubs) {
        ctx.beginPath()
        ctx.arc(naub.pos.x, naub.pos.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }
    ctx.restore()

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