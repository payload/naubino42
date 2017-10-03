import * as _ from "lodash"
import { Vector } from "matter-js"
import { Naubino, Naub, Hunter, Update } from "./naubino"

let naubino: Naubino
let canvas: HTMLCanvasElement

window.addEventListener("load", () => {
    canvas_init()
    naubino_init()
    naubino_start()
    window.setTimeout(() => {
        main_loop()
    }, 1000)
})

function canvas_init() {
    canvas = <HTMLCanvasElement>document.querySelector("#naubino42")
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "black"
    ctx.fillText("naubino", canvas.width / 2, canvas.height / 2)
}

function naubino_init() {
    naubino = new Naubino()
    naubino.size = { x: 600, y: 400 }
}

let hunters = new Set<Hunter>()
function naubino_start() {
    const chain_a = naubino.create_naub_chain(100, { x: naubino.size.x / 2, y: naubino.size.y * 1 / 3 })
    const chain_b = naubino.create_naub_chain(100, { x: naubino.size.x / 2, y: naubino.size.y * 2 / 3 })
    const hunter_0 = new Hunter(naubino, chain_a[0], chain_b[10])
    const hunter_1 = new Hunter(naubino, chain_a[chain_a.length - 1], chain_b[chain_b.length - 10])
    hunters.add(hunter_0)
    hunters.add(hunter_1)
}

function main_loop() {
    const update = naubino.step()

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "black"
    for (const joint of update.naub_joints) {
        const { x: xa, y: ya } = joint.naub_a.pos
        const { x: xb, y: yb } = joint.naub_b.pos
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

    for (const hunter of hunters) {
        hunter.step()
    }
    window.requestAnimationFrame(() => {
        main_loop()
    })
}