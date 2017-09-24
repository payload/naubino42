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
        const x1 = joint._constraint.bodyA.position.x
        const y1 = joint._constraint.bodyA.position.y
        const x2 = joint._constraint.bodyB.position.x
        const y2 = joint._constraint.bodyB.position.y
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
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

function hunter_example() {
    let chain_a = naubino.create_naub_chain(100, { x: 0, y: -10 })
    let chain_b = naubino.create_naub_chain(100, { x: 0, y: 10 })

    let chain_naubs = chain_a.concat(chain_b)
    for (let naub of chain_naubs) {
        naubino.add_naub(naub)
    }
    console.assert(naubino.naubs.size == 200)
    naubino.step()
    console.assert(naubino.engine.world.bodies.length >= 200)

    let hunter_0 = new Hunter(naubino, chain_a[0], chain_b[0])
    let hunter_1 = new Hunter(naubino, chain_a[chain_a.length - 1], chain_b[chain_b.length - 1])

    let hunters = [hunter_0, hunter_1]
    for (let i = 0; i < 500 && hunters.length > 0; ++i) {
        hunters = hunters.filter((hunter) => {
            hunter.step()
            return !hunter.finished
        })
        naubino.step()
    }
}