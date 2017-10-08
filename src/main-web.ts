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
        const pointer = naubino.touch_down({ x: ev.x, y: ev.y })
        if (pointer) {
            pointerMap.set(ev.pointerId, pointer)
        }
    })
    canvas.addEventListener("pointermove", (ev) => {
        const pointer = pointerMap.get(ev.pointerId)
        if (pointer) {
            pointer.moveTo({ x: ev.x, y: ev.y })
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

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "black"
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

    ctx.fillStyle = "black"
    for (const naub of update.naubs) {
        ctx.beginPath()
        ctx.arc(naub.pos.x, naub.pos.y, naub.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    }

    window.requestAnimationFrame(() => {
        main_loop()
    })
}